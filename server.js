/**
 * Abacus Server
 * A lightweight dashboard for visualizing and monitoring beads across multiple projects
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const chokidar = require('chokidar');
const Database = require('better-sqlite3');

// Configuration
const PORT = process.env.PORT || 3000;
const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.abacus');
const PROJECTS_FILE = path.join(CONFIG_DIR, 'projects.json');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// ============================================
// JSON File-based Database
// ============================================

/**
 * Simple JSON file database for projects
 */
class ProjectsDB {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { projects: [], nextId: 1 };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(content);
      }
    } catch (error) {
      console.error('Error loading projects file:', error);
      this.data = { projects: [], nextId: 1 };
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving projects file:', error);
    }
  }

  getAll() {
    // Reload from file to pick up external changes (e.g., test resets)
    this.load();
    return this.data.projects.sort((a, b) => a.name.localeCompare(b.name));
  }

  getById(id) {
    return this.data.projects.find(p => p.id === parseInt(id));
  }

  getByPath(projectPath) {
    return this.data.projects.find(p => p.path === projectPath);
  }

  add(name, projectPath) {
    const project = {
      id: this.data.nextId++,
      name,
      path: projectPath,
      created_at: new Date().toISOString()
    };
    this.data.projects.push(project);
    this.save();
    return project;
  }

  remove(id) {
    const index = this.data.projects.findIndex(p => p.id === parseInt(id));
    if (index !== -1) {
      this.data.projects.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }
}

// Initialize database
const db = new ProjectsDB(PROJECTS_FILE);

// File watchers for each project (issues.jsonl watchers)
const watchers = new Map();

// Database watchers for each project (beads.db watchers)
const dbWatchers = new Map();

// Debounce timers for db changes
const dbDebounceTimers = new Map();

// Cache of last broadcast data hash per project (to avoid duplicate broadcasts)
const lastBroadcastHash = new Map();

// SSE clients for real-time updates
const sseClients = new Set();

/**
 * MIME types for serving static files
 */
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

/**
 * Read beads from SQLite database
 * @param {string} projectPath - Path to the project directory
 * @returns {Array} - Array of bead objects
 */
function readBeadsFromSQLite(projectPath) {
  const dbPath = path.join(projectPath, '.beads', 'beads.db');
  
  if (!fs.existsSync(dbPath)) {
    return [];
  }

  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    
    // Query issues (exclude deleted/tombstone)
    const issues = db.prepare(`
      SELECT 
        id, title, description, status, priority, 
        issue_type as type, assignee, created_at, updated_at
      FROM issues 
      WHERE status != 'tombstone' 
        AND (deleted_at IS NULL OR deleted_at = '')
      ORDER BY priority ASC, created_at DESC
    `).all();

    // Query dependencies for each issue
    const getDeps = db.prepare(`
      SELECT depends_on_id as target, type 
      FROM dependencies 
      WHERE issue_id = ?
    `);

    // Query labels for each issue
    const getLabels = db.prepare(`
      SELECT label FROM labels WHERE issue_id = ?
    `);

    // Enrich issues with dependencies and labels
    return issues.map(issue => {
      const dependencies = getDeps.all(issue.id);
      const labels = getLabels.all(issue.id).map(l => l.label);
      
      return {
        ...issue,
        dependencies: dependencies.length > 0 ? dependencies : undefined,
        labels: labels.length > 0 ? labels : undefined
      };
    });
  } catch (error) {
    console.error('Error reading beads from SQLite:', error);
    return [];
  } finally {
    if (db) {
      try { db.close(); } catch (e) { /* ignore close errors */ }
    }
  }
}

/**
 * Read and parse issues.jsonl file from a project path
 * @param {string} projectPath - Path to the project directory
 * @returns {Array} - Array of bead objects
 */
function readBeadsFromJSONL(projectPath) {
  const beadsPath = path.join(projectPath, '.beads', 'issues.jsonl');

  if (!fs.existsSync(beadsPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(beadsPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.error('Error parsing bead line:', e);
        return null;
      }
    }).filter(bead => bead !== null);
  } catch (error) {
    console.error('Error reading beads file:', error);
    return [];
  }
}

/**
 * Get the most recent updated_at timestamp from a list of beads
 * @param {Array} beads - Array of bead objects
 * @returns {Date|null} - Most recent timestamp or null
 */
function getNewestTimestamp(beads) {
  if (!beads || beads.length === 0) return null;
  
  let newest = null;
  for (const bead of beads) {
    if (bead.updated_at) {
      const ts = new Date(bead.updated_at);
      if (!newest || ts > newest) {
        newest = ts;
      }
    }
  }
  return newest;
}

/**
 * Read beads from a project
 * Compares timestamps from both sources and uses whichever has newer data
 * This handles both SQLite mode and no-db mode (JSONL-only)
 * @param {string} projectPath - Path to the project directory
 * @returns {Array} - Array of bead objects
 */
function readBeads(projectPath) {
  const jsonlBeads = readBeadsFromJSONL(projectPath);
  const sqliteBeads = readBeadsFromSQLite(projectPath);
  
  // If only one source has data, use it
  if (jsonlBeads.length === 0 && sqliteBeads.length === 0) {
    return [];
  }
  if (jsonlBeads.length > 0 && sqliteBeads.length === 0) {
    return jsonlBeads;
  }
  if (sqliteBeads.length > 0 && jsonlBeads.length === 0) {
    return sqliteBeads;
  }
  
  // Both have data - compare timestamps to find newest
  const jsonlNewest = getNewestTimestamp(jsonlBeads);
  const sqliteNewest = getNewestTimestamp(sqliteBeads);
  
  // If we can't determine timestamps, prefer SQLite (more likely to be current)
  if (!jsonlNewest && !sqliteNewest) {
    return sqliteBeads;
  }
  if (!jsonlNewest) {
    return sqliteBeads;
  }
  if (!sqliteNewest) {
    return jsonlBeads;
  }
  
  // Use whichever source has the most recently updated bead
  if (sqliteNewest >= jsonlNewest) {
    return sqliteBeads;
  } else {
    return jsonlBeads;
  }
}

/**
 * Validate that a path contains a valid beads project
 * Accepts projects with either issues.jsonl OR beads.db (SQLite)
 * @param {string} projectPath - Path to validate
 * @returns {boolean} - True if valid beads project
 */
function isValidBeadsProject(projectPath) {
  const beadsDir = path.join(projectPath, '.beads');
  
  if (!fs.existsSync(beadsDir)) {
    return false;
  }

  const beadsFile = path.join(beadsDir, 'issues.jsonl');
  const beadsDb = path.join(beadsDir, 'beads.db');

  // Valid if has JSONL file OR SQLite database
  return fs.existsSync(beadsFile) || fs.existsSync(beadsDb);
}

/**
 * Set up file watcher for a project
 * @param {string} projectPath - Path to the project
 */
function watchProject(projectPath) {
  if (watchers.has(projectPath)) {
    return; // Already watching
  }

  const beadsDir = path.join(projectPath, '.beads');
  const beadsPath = path.join(beadsDir, 'issues.jsonl');
  const dbPath = path.join(beadsDir, 'beads.db');

  if (fs.existsSync(beadsPath)) {
    // Watch the JSONL file for changes
    const watcher = chokidar.watch(beadsPath, {
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', () => {
      // Notify all SSE clients about the change
      const beads = readBeads(projectPath);
      const projectName = path.basename(projectPath);

      sseClients.forEach(client => {
        client.write(`data: ${JSON.stringify({ type: 'update', project: projectPath, name: projectName, beads })}\n\n`);
      });
    });

    watchers.set(projectPath, watcher);
    console.log(`Watching JSONL: ${beadsPath}`);
  }

  // Also watch the SQLite database for changes
  // When the database changes, read directly from SQLite and broadcast
  // Watch all SQLite files: .db, .db-wal, .db-shm (SQLite writes to WAL first)
  if (fs.existsSync(dbPath)) {
    const dbFiles = [
      dbPath,
      `${dbPath}-wal`,
      `${dbPath}-shm`
    ].filter(f => fs.existsSync(f));

    const dbWatcher = chokidar.watch(dbFiles, {
      persistent: true,
      ignoreInitial: true,
      // Use polling for SQLite files as they may not trigger normal fs events
      usePolling: true,
      interval: 500 // Check every 500ms for faster response
    });

    dbWatcher.on('change', (changedPath) => {
      // Debounce rapid changes
      const existingTimer = dbDebounceTimers.get(projectPath);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        dbDebounceTimers.delete(projectPath);
        
        // Read directly from SQLite and broadcast to clients
        const beads = readBeadsFromSQLite(projectPath);
        const projectName = path.basename(projectPath);

        if (beads.length > 0) {
          // Create a hash of the data to detect actual changes
          const dataHash = JSON.stringify(beads.map(b => `${b.id}:${b.updated_at}`).sort());
          const lastHash = lastBroadcastHash.get(projectPath);
          
          // Only broadcast if data actually changed
          if (dataHash !== lastHash) {
            lastBroadcastHash.set(projectPath, dataHash);
            sseClients.forEach(client => {
              client.write(`data: ${JSON.stringify({ type: 'update', project: projectPath, name: projectName, beads })}\n\n`);
            });
            console.log(`Broadcast ${beads.length} beads from SQLite for: ${projectPath}`);
          }
        }
      }, 300); // 300ms debounce for faster response

      dbDebounceTimers.set(projectPath, timer);
    });

    dbWatchers.set(projectPath, dbWatcher);
    console.log(`Watching DB files: ${dbFiles.join(', ')}`);
  }
}

/**
 * Stop watching a project
 * @param {string} projectPath - Path to stop watching
 */
function unwatchProject(projectPath) {
  // Stop JSONL watcher
  const watcher = watchers.get(projectPath);
  if (watcher) {
    watcher.close();
    watchers.delete(projectPath);
    console.log(`Stopped watching JSONL: ${projectPath}`);
  }

  // Stop DB watcher
  const dbWatcher = dbWatchers.get(projectPath);
  if (dbWatcher) {
    dbWatcher.close();
    dbWatchers.delete(projectPath);
    console.log(`Stopped watching DB: ${projectPath}`);
  }

  // Clear any pending debounce timers
  const timer = dbDebounceTimers.get(projectPath);
  if (timer) {
    clearTimeout(timer);
    dbDebounceTimers.delete(projectPath);
  }
}

/**
 * Parse JSON body from request
 * @param {http.IncomingMessage} req - HTTP request
 * @returns {Promise<Object>} - Parsed JSON body
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 * @param {http.ServerResponse} res - HTTP response
 * @param {number} statusCode - HTTP status code
 * @param {Object} data - Data to send as JSON
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Serve static files
 * @param {http.ServerResponse} res - HTTP response
 * @param {string} filePath - Path to the file
 */
function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath);
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
}

/**
 * API Routes Handler
 */
const apiRoutes = {
  // GET /api/browse - Browse filesystem directories
  'GET /api/browse': (req, pathParts, query) => {
    const requestedPath = query.path || (process.env.HOME || process.env.USERPROFILE || '/');
    const resolvedPath = path.resolve(requestedPath);
    
    // Security: basic path validation
    if (!fs.existsSync(resolvedPath)) {
      return { error: 'Path does not exist', status: 404 };
    }
    
    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      return { error: 'Path is not a directory', status: 400 };
    }
    
    try {
      const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
      const directories = [];
      
      for (const entry of entries) {
        // Skip hidden files/folders (starting with .) except .beads
        if (entry.name.startsWith('.') && entry.name !== '.beads') {
          continue;
        }
        
        if (entry.isDirectory()) {
          const fullPath = path.join(resolvedPath, entry.name);
          const hasBeads = fs.existsSync(path.join(fullPath, '.beads'));
          directories.push({
            name: entry.name,
            path: fullPath,
            hasBeads
          });
        }
      }
      
      // Sort: folders with .beads first, then alphabetically
      directories.sort((a, b) => {
        if (a.hasBeads && !b.hasBeads) return -1;
        if (!a.hasBeads && b.hasBeads) return 1;
        return a.name.localeCompare(b.name);
      });
      
      // Get parent directory (unless at root)
      const parentPath = path.dirname(resolvedPath);
      const hasParent = parentPath !== resolvedPath;
      
      return {
        current: resolvedPath,
        parent: hasParent ? parentPath : null,
        directories,
        isBeadsProject: fs.existsSync(path.join(resolvedPath, '.beads'))
      };
    } catch (error) {
      console.error('Browse error:', error);
      return { error: 'Cannot read directory', status: 403 };
    }
  },

  // GET /api/projects - List all projects
  'GET /api/projects': () => {
    const projects = db.getAll();
    return projects.map(project => ({
      ...project,
      beadCount: readBeads(project.path).length
    }));
  },

  // POST /api/projects - Add a new project
  'POST /api/projects': async (req) => {
    const body = await parseJsonBody(req);
    const { path: projectPath } = body;

    if (!projectPath) {
      return { error: 'Project path is required', status: 400 };
    }

    // Resolve and normalize the path
    const resolvedPath = path.resolve(projectPath);

    // Check if path exists
    if (!fs.existsSync(resolvedPath)) {
      return { error: 'Path does not exist', status: 400 };
    }

    // Check if it's a valid beads project
    if (!isValidBeadsProject(resolvedPath)) {
      return { error: 'Path does not contain a valid beads project (.beads/issues.jsonl)', status: 400 };
    }

    // Check if project already exists
    const existing = db.getByPath(resolvedPath);
    if (existing) {
      return { error: 'Project already registered', status: 409 };
    }

    // Get project name from directory name
    const name = path.basename(resolvedPath);

    // Add to database
    const project = db.add(name, resolvedPath);

    // Start watching the project
    watchProject(resolvedPath);

    return { ...project, beadCount: readBeads(resolvedPath).length };
  },

  // DELETE /api/projects/:id - Remove a project
  'DELETE /api/projects': (req, pathParts) => {
    const id = pathParts[3];

    if (!id) {
      return { error: 'Project ID is required', status: 400 };
    }

    const project = db.getById(id);

    if (!project) {
      return { error: 'Project not found', status: 404 };
    }

    // Stop watching the project
    unwatchProject(project.path);

    // Remove from database
    db.remove(id);

    return { success: true, message: 'Project removed' };
  },

  // GET /api/projects/:id/beads - Get beads for a project
  'GET /api/projects/:id/beads': (req, pathParts) => {
    const id = pathParts[3];

    const project = db.getById(id);

    if (!project) {
      return { error: 'Project not found', status: 404 };
    }

    const beads = readBeads(project.path);
    return { project, beads };
  }
};

/**
 * Handle API requests
 * @param {http.IncomingMessage} req - HTTP request
 * @param {http.ServerResponse} res - HTTP response
 * @param {string} pathname - URL pathname
 * @param {Object} query - Parsed query parameters
 */
async function handleApiRequest(req, res, pathname, query = {}) {
  const pathParts = pathname.split('/');
  const method = req.method;

  try {
    // Match routes
    let handler;
    let routeKey;

    if (method === 'GET' && pathname === '/api/browse') {
      routeKey = 'GET /api/browse';
    } else if (method === 'GET' && pathname === '/api/projects') {
      routeKey = 'GET /api/projects';
    } else if (method === 'POST' && pathname === '/api/projects') {
      routeKey = 'POST /api/projects';
    } else if (method === 'DELETE' && pathname.match(/^\/api\/projects\/\d+$/)) {
      routeKey = 'DELETE /api/projects';
    } else if (method === 'GET' && pathname.match(/^\/api\/projects\/\d+\/beads$/)) {
      routeKey = 'GET /api/projects/:id/beads';
    }

    handler = apiRoutes[routeKey];

    if (!handler) {
      return sendJson(res, 404, { error: 'Not Found' });
    }

    const result = await handler(req, pathParts, query);

    if (result && result.error) {
      return sendJson(res, result.status || 500, { error: result.error });
    }

    sendJson(res, 200, result);
  } catch (error) {
    console.error('API Error:', error);
    sendJson(res, 500, { error: 'Internal Server Error' });
  }
}

/**
 * Handle SSE connection for real-time updates
 * @param {http.IncomingMessage} req - HTTP request
 * @param {http.ServerResponse} res - HTTP response
 */
function handleSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no' // Disable buffering for nginx proxies
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Set up heartbeat to keep connection alive
  // SSE connections can be closed by proxies/browsers if no data is sent
  const heartbeatInterval = setInterval(() => {
    // Send a comment line as heartbeat (starts with colon, ignored by EventSource)
    res.write(': heartbeat\n\n');
  }, 30000); // Send heartbeat every 30 seconds

  // Add to clients set
  sseClients.add(res);

  // Remove on close
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    sseClients.delete(res);
  });

  // Handle connection errors
  res.on('error', (err) => {
    console.error('SSE connection error:', err);
    clearInterval(heartbeatInterval);
    sseClients.delete(res);
  });
}

/**
 * Main HTTP server request handler
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // Add CORS headers to all responses
  res.setHeader('Access-Control-Allow-Origin', '*');

  // SSE endpoint for real-time updates
  if (pathname === '/api/events') {
    return handleSSE(req, res);
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    return handleApiRequest(req, res, pathname, parsedUrl.query);
  }

  // Static file serving
  let filePath = path.join(__dirname, 'public', pathname);

  // Default to index.html for root
  if (pathname === '/') {
    filePath = path.join(__dirname, 'public', 'index.html');
  }

  // Security: prevent directory traversal
  const publicDir = path.join(__dirname, 'public');
  if (!path.normalize(filePath).startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  serveStaticFile(res, filePath);
});

// Initialize watchers for existing projects
function initializeWatchers() {
  const projects = db.getAll();
  projects.forEach(project => {
    if (fs.existsSync(project.path)) {
      watchProject(project.path);
    }
  });
}

// Start server
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🧮  Abacus - Beads Dashboard                            ║
  ║                                                           ║
  ║   Server running at http://localhost:${PORT}                 ║
  ║                                                           ║
  ║   Config stored at: ${CONFIG_DIR}
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);

  initializeWatchers();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');

  // Close all JSONL watchers
  watchers.forEach(watcher => watcher.close());

  // Close all DB watchers
  dbWatchers.forEach(watcher => watcher.close());

  // Clear all debounce timers
  dbDebounceTimers.forEach(timer => clearTimeout(timer));

  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
