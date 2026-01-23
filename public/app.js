/**
 * Abacus Frontend Application
 * A lightweight dashboard for visualizing and monitoring beads across multiple projects
 */

import './components/base.js';
import './components/abacus-priority-badge.js';
import './components/abacus-type-badge.js';
import './components/abacus-modal.js';
import './components/abacus-add-project-modal.js';
import './components/abacus-bead-detail-modal.js';
import './components/abacus-confirm-dialog.js';
import './components/abacus-bead-card.js';
import './components/abacus-kanban-column.js';
import './components/abacus-kanban-board.js';
import './components/abacus-project-tab.js';
import './components/abacus-sidebar.js';
import './components/abacus-header.js';
import './components/abacus-sort-dropdown.js';
import './components/abacus-toast.js';

// ============================================
// State Management
// ============================================
const state = {
  projects: [],
  currentProject: null,
  beads: [],
  theme: localStorage.getItem('abacus-theme') || 'light',
  eventSource: null,
  loading: {
    projects: false,
    beads: false,
    addProject: false,
    removeProject: false
  },
  sortPreferences: {},      // { [projectId]: sortKey }
  showArchivedPreferences: {}, // { [projectId]: boolean }
  toast: null                // { message: string, beadId: string, action: 'archive' | 'unarchive' }
};

// ============================================
// Sort Comparators
// ============================================
const typeOrder = { bug: 0, feature: 1, task: 2, epic: 3, chore: 4 };

const sortComparators = {
  priority: (a, b) => (a.priority || 2) - (b.priority || 2),
  newest: (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  oldest: (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
  updated: (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0),
  type: (a, b) => (typeOrder[a.type] ?? 2) - (typeOrder[b.type] ?? 2),
  label: (a, b) => {
    const aLabel = a.labels?.[0] || 'zzz';
    const bLabel = b.labels?.[0] || 'zzz';
    return aLabel.localeCompare(bLabel);
  }
};

/**
 * Sort beads using the specified comparator
 * @param {Array} beads - Array of bead objects
 * @param {string} sortKey - Key for sortComparators
 * @returns {Array} Sorted copy of beads array
 */
function sortBeads(beads, sortKey) {
  const comparator = sortComparators[sortKey] || sortComparators.priority;
  return [...beads].sort(comparator);
}

/**
 * Filter out archived beads (those with "archived" label)
 * @param {Array} beads - Array of bead objects
 * @param {boolean} showArchived - Whether to include archived beads
 * @returns {Array} Filtered beads array
 */
function filterArchived(beads, showArchived) {
  if (showArchived) return beads;
  return beads.filter(bead => !(bead.labels || []).includes('archived'));
}

/**
 * Get sorted and filtered beads for display
 * @param {Array} beads - Raw beads array
 * @param {number} projectId - Project ID for preferences lookup
 * @returns {Array} Processed beads ready for display
 */
function getProcessedBeads(beads, projectId) {
  const sortKey = state.sortPreferences[projectId] || 'priority';
  const showArchived = state.showArchivedPreferences[projectId] || false;

  const filtered = filterArchived(beads, showArchived);
  return sortBeads(filtered, sortKey);
}

// ============================================
// API Functions
// ============================================
const api = {
  /**
   * Fetch all projects
   */
  async getProjects() {
    const response = await fetch('/api/projects');
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  /**
   * Add a new project
   * @param {string} path - Path to the project directory
   */
  async addProject(path) {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add project');
    return data;
  },

  /**
   * Remove a project
   * @param {number} id - Project ID
   */
  async removeProject(id) {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to remove project');
    return data;
  },

  /**
   * Get beads for a project
   * @param {number} id - Project ID
   */
  async getBeads(id) {
    const response = await fetch(`/api/projects/${id}/beads`);
    if (!response.ok) throw new Error('Failed to fetch beads');
    return response.json();
  },

  /**
   * Add a label to a bead
   * @param {number} projectId - Project ID
   * @param {string} beadId - Bead ID
   * @param {string} label - Label to add
   */
  async addLabel(projectId, beadId, label) {
    const response = await fetch(`/api/projects/${projectId}/beads/${beadId}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add label');
    return data;
  },

  /**
   * Remove a label from a bead
   * @param {number} projectId - Project ID
   * @param {string} beadId - Bead ID
   * @param {string} label - Label to remove
   */
  async removeLabel(projectId, beadId, label) {
    const response = await fetch(`/api/projects/${projectId}/beads/${beadId}/labels/${encodeURIComponent(label)}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to remove label');
    return data;
  }
};

// ============================================
// Utility Functions
// ============================================
function showError(message) {
  // Simple alert for now - could be replaced with toast notification
  alert(message);
}

function showToast(message, beadId, action) {
  hideToast();
  state.toast = { message, beadId, action };

  const toast = document.createElement('abacus-toast');
  toast.setAttribute('message', message);
  toast.setAttribute('show-undo', '');
  toast.id = 'archive-toast';
  document.body.appendChild(toast);
}

function hideToast() {
  state.toast = null;
  const existingToast = document.getElementById('archive-toast');
  if (existingToast) {
    existingToast.remove();
  }
}

// ============================================
// UI Updates
// ============================================
function updateTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('abacus-theme', state.theme);
  const header = document.querySelector('abacus-header');
  if (header) {
    header.setAttribute('theme', state.theme);
  }
}

function renderProjectList() {
  const sidebar = document.querySelector('abacus-sidebar');
  if (!sidebar) return;

  // Clear existing content
  sidebar.innerHTML = '';

  state.projects.forEach(project => {
    const tab = document.createElement('abacus-project-tab');
    tab.setAttribute('project-id', project.id);
    tab.setAttribute('name', project.name);
    tab.setAttribute('path', project.path);
    tab.setAttribute('count', project.beadCount || 0);
    
    if (state.currentProject && state.currentProject.id === project.id) {
      tab.setAttribute('active', '');
    }

    sidebar.appendChild(tab);
  });
}

function updateKanbanBoard() {
  const board = document.querySelector('abacus-kanban-board');
  const welcome = document.getElementById('welcome-state');

  if (!state.currentProject) {
    board.classList.add('hidden');
    welcome.classList.remove('hidden');
    return;
  }

  welcome.classList.add('hidden');
  board.classList.remove('hidden');

  // Pass project-id for sort/filter preferences
  board.setAttribute('project-id', state.currentProject.id);

  // Apply sorting and filtering before passing to board
  const processedBeads = getProcessedBeads(state.beads, state.currentProject.id);
  board.setAttribute('beads', JSON.stringify(processedBeads));

  if (state.loading.beads) {
    board.setAttribute('loading', '');
  } else {
    board.removeAttribute('loading');
  }
}

// ============================================
// Event Handlers
// ============================================
async function handleProjectSelect(event) {
  const { projectId, name, path } = event.detail;
  const id = parseInt(projectId);
  
  state.currentProject = { id, name, path };
  
  // Update active state in sidebar
  renderProjectList();
  
  // Show loading state
  state.loading.beads = true;
  updateKanbanBoard();
  
  try {
    const data = await api.getBeads(id);
    state.beads = data.beads || [];
  } catch (error) {
    console.error('Failed to fetch beads:', error);
    showError('Failed to load beads for this project');
    state.beads = [];
  } finally {
    state.loading.beads = false;
    updateKanbanBoard();
  }
}

function handleAddProjectClick() {
  const modal = document.getElementById('add-project-modal');
  modal.setAttribute('open', '');
}

async function handleAddProjectSubmit(event) {
  const { path } = event.detail;
  const modal = document.getElementById('add-project-modal');
  
  state.loading.addProject = true;
  modal.setAttribute('loading', '');
  
  try {
    const project = await api.addProject(path);
    state.projects.push(project);
    renderProjectList();
    modal.removeAttribute('open');
    
    // Automatically select the new project
    handleProjectSelect({ 
      detail: { 
        projectId: project.id, 
        name: project.name, 
        path: project.path 
      } 
    });
  } catch (error) {
    modal.showError(error.message);
  } finally {
    state.loading.addProject = false;
    modal.removeAttribute('loading');
  }
}

let projectToRemove = null;

function handleRemoveProjectClick(event) {
  const { projectId, name, path } = event.detail;
  projectToRemove = { id: parseInt(projectId), name, path };

  const modal = document.getElementById('confirm-dialog');
  modal.setAttribute('title', 'Remove Project');
  modal.setAttribute('message', 'Are you sure you want to remove this project from Abacus? This will only unregister the project. Your beads data will not be deleted.');
  modal.setAttribute('confirm-text', 'Remove Project');
  modal.setAttribute('destructive', '');
  modal.setAttribute('open', '');
}

async function handleRemoveProjectConfirm() {
  if (!projectToRemove) return;

  const modal = document.getElementById('confirm-dialog');
  state.loading.removeProject = true;
  modal.setAttribute('loading', '');

  try {
    await api.removeProject(projectToRemove.id);

    // Remove from state
    state.projects = state.projects.filter(p => p.id !== projectToRemove.id);

    // Clear current project if it was the one removed
    if (state.currentProject && state.currentProject.id === projectToRemove.id) {
      state.currentProject = null;
      state.beads = [];
    }

    projectToRemove = null;
    renderProjectList();
    updateKanbanBoard();
    modal.removeAttribute('open');
  } catch (error) {
    console.error('Failed to remove project:', error);
    showError('Failed to remove project');
    modal.removeAttribute('open');
  } finally {
    state.loading.removeProject = false;
    modal.removeAttribute('loading');
    projectToRemove = null;
  }
}

function handleBeadSelect(event) {
  const { beadId } = event.detail;
  const bead = state.beads.find(b => b.id === beadId);

  if (bead) {
    // Enrich dependencies with target bead status for display
    const enrichedBead = {
      ...bead,
      dependencies: (bead.dependencies || []).map(dep => ({
        ...dep,
        targetStatus: state.beads.find(b => b.id === dep.target)?.status || 'unknown'
      }))
    };
    const modal = document.getElementById('bead-detail-modal');
    modal.setAttribute('project-id', state.currentProject.id);
    modal.setAttribute('bead', JSON.stringify(enrichedBead));
    modal.setAttribute('open', '');
  }
}

function handleDependencyClick(event) {
  const { beadId } = event.detail;
  const bead = state.beads.find(b => b.id === beadId);

  if (bead) {
    // Enrich dependencies with target bead status for display
    const enrichedBead = {
      ...bead,
      dependencies: (bead.dependencies || []).map(dep => ({
        ...dep,
        targetStatus: state.beads.find(b => b.id === dep.target)?.status || 'unknown'
      }))
    };
    const modal = document.getElementById('bead-detail-modal');
    modal.setAttribute('project-id', state.currentProject.id);
    modal.setAttribute('bead', JSON.stringify(enrichedBead));
  }
}

function handleModalClose(event) {
  const modal = event.target;
  modal.removeAttribute('open');
}

function handleThemeToggle() {
  const themes = ['light', 'dark', 'nord', 'warm'];
  const currentIndex = themes.indexOf(state.theme);
  const nextIndex = (currentIndex + 1) % themes.length;
  state.theme = themes[nextIndex];
  updateTheme();
}

function handleSortChange(event) {
  if (!state.currentProject) return;

  const { sortKey } = event.detail;
  state.sortPreferences[state.currentProject.id] = sortKey;
  updateKanbanBoard();
}

function handleArchivedToggle(event) {
  if (!state.currentProject) return;

  const { show } = event.detail;
  state.showArchivedPreferences[state.currentProject.id] = show;
  updateKanbanBoard();
}

async function handleBeadArchive(event) {
  if (!state.currentProject) return;

  const { beadId } = event.detail;
  try {
    await api.addLabel(state.currentProject.id, beadId, 'archived');
    showToast('Bead archived', beadId, 'archive');

    // Close modal if open
    const modal = document.getElementById('bead-detail-modal');
    if (modal.hasAttribute('open')) {
      modal.removeAttribute('open');
    }
  } catch (error) {
    console.error('Failed to archive bead:', error);
    showError('Failed to archive bead');
  }
}

async function handleBeadUnarchive(event) {
  if (!state.currentProject) return;

  const { beadId } = event.detail;
  try {
    await api.removeLabel(state.currentProject.id, beadId, 'archived');
    showToast('Bead unarchived', beadId, 'unarchive');
  } catch (error) {
    console.error('Failed to unarchive bead:', error);
    showError('Failed to unarchive bead');
  }
}

function handleToastDismiss() {
  hideToast();
}

async function handleToastUndo() {
  if (!state.toast || !state.currentProject) return;

  const { beadId, action } = state.toast;
  hideToast();

  try {
    if (action === 'archive') {
      await api.removeLabel(state.currentProject.id, beadId, 'archived');
    } else {
      await api.addLabel(state.currentProject.id, beadId, 'archived');
    }
  } catch (error) {
    console.error('Failed to undo action:', error);
    showError('Failed to undo');
  }
}

// ============================================
// Server-Sent Events
// ============================================
let sseReconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;

function initSSE() {
  if (state.eventSource && state.eventSource.readyState !== EventSource.CLOSED) {
    return;
  }

  state.eventSource = new EventSource('/api/events');

  state.eventSource.onopen = () => {
    console.log('SSE connection established');
    sseReconnectAttempts = 0;
  };

  state.eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'connected') {
        console.log('SSE connected to server');
        return;
      }

      if (data.type === 'update' && state.currentProject) {
        // Check if this update is for the current project
        if (data.project === state.currentProject.path) {
          state.beads = data.beads || [];
          updateKanbanBoard();

          // Update bead count in sidebar
          const projectIndex = state.projects.findIndex(p => p.id === state.currentProject.id);
          if (projectIndex !== -1) {
            state.projects[projectIndex].beadCount = state.beads.length;
            renderProjectList();
          }
        } else {
          // Update the project count in state if it's another project
          const projectIndex = state.projects.findIndex(p => p.path === data.project);
          if (projectIndex !== -1) {
            state.projects[projectIndex].beadCount = data.beads.length;
            renderProjectList();
          }
        }
      }
    } catch (error) {
      console.error('SSE parse error:', error);
    }
  };

  state.eventSource.onerror = (error) => {
    if (state.eventSource.readyState === EventSource.CLOSED) {
      console.log('SSE connection closed, will reconnect...');
    } else {
      console.error('SSE error:', error);
    }

    if (state.eventSource) {
      state.eventSource.close();
      state.eventSource = null;
    }

    sseReconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, sseReconnectAttempts - 1), MAX_RECONNECT_DELAY);

    console.log(`Reconnecting SSE in ${delay}ms (attempt ${sseReconnectAttempts})...`);

    setTimeout(() => {
      initSSE();
    }, delay);
  };
}

// ============================================
// Initialization
// ============================================
async function init() {
  // Initialize theme
  updateTheme();

  // Event Listeners
  document.addEventListener('theme-toggle', handleThemeToggle);
  document.addEventListener('add-project-click', handleAddProjectClick);
  document.addEventListener('project-select', handleProjectSelect);
  document.addEventListener('remove-project-click', handleRemoveProjectClick);
  document.addEventListener('bead-select', handleBeadSelect);
  document.addEventListener('dependency-click', handleDependencyClick);
  document.addEventListener('modal-submit', handleAddProjectSubmit);
  document.addEventListener('modal-confirm', handleRemoveProjectConfirm);
  document.addEventListener('modal-close', handleModalClose);
  document.addEventListener('sort-change', handleSortChange);
  document.addEventListener('archived-toggle', handleArchivedToggle);
  document.addEventListener('bead-archive', handleBeadArchive);
  document.addEventListener('bead-unarchive', handleBeadUnarchive);
  document.addEventListener('toast-dismiss', handleToastDismiss);
  document.addEventListener('toast-undo', handleToastUndo);

  // Initialize SSE
  initSSE();

  // Load projects
  state.loading.projects = true;
  
  try {
    state.projects = await api.getProjects();
    renderProjectList();
  } catch (error) {
    console.error('Failed to load projects:', error);
    showError('Failed to load projects');
  } finally {
    state.loading.projects = false;
  }
}

// Start the application
init();
