const fs = require('fs');
const path = require('path');

const FIXTURES_ROOT = path.join(__dirname, '..', 'fixtures');
const TEST_PROJECT_PATH = path.join(FIXTURES_ROOT, 'test-project');

// Must match playwright.config.js PLAYWRIGHT_HOME so test and server share config
const PLAYWRIGHT_HOME = path.join(__dirname, '..', '..', '.playwright-home');

// Original fixture data (5 beads: open:2, in_progress:1, blocked:1, closed:1)
const ORIGINAL_FIXTURE_BEADS = [
  {"id":"bd-0001","title":"Login form fails on Safari","description":"Repro: open /login and submit. Should show an error.","status":"open","priority":0,"type":"bug","assignee":"alice","labels":["frontend","urgent"],"created_at":"2025-01-10T14:30:00Z","updated_at":"2025-01-12T09:15:00Z","dependencies":[{"type":"blocks","target":"bd-0003"}]},
  {"id":"bd-0002","title":"Implement project import flow","description":"Allow importing projects from a path.","status":"in_progress","priority":1,"type":"feature","assignee":"bob","labels":["backend"],"created_at":"2025-01-11T08:00:00Z","updated_at":"2025-01-15T10:00:00Z","dependencies":[]},
  {"id":"bd-0003","title":"Epic: Authentication overhaul","description":"Roll up improvements across login/logout/session.","status":"blocked","priority":2,"type":"epic","assignee":null,"labels":["auth"],"created_at":"2025-01-09T12:00:00Z","updated_at":"2025-01-16T12:00:00Z","dependencies":[{"type":"blocked_by","target":"bd-0002"}]},
  {"id":"bd-0004","title":"Update dependencies","description":"Bump minor versions.","status":"closed","priority":3,"type":"chore","assignee":"carol","labels":[],"created_at":"2025-01-05T12:00:00Z","updated_at":"2025-01-06T12:00:00Z","dependencies":[]},
  {"id":"bd-0005","title":"Add onboarding checklist","description":"Write a short onboarding doc and checklist.","status":"open","priority":4,"type":"task","assignee":null,"labels":["docs","good-first-issue"],"created_at":"2025-01-02T12:00:00Z","updated_at":"2025-01-03T12:00:00Z","dependencies":[]}
];

function getConfigDir() {
  // Use the isolated Playwright home directory, matching playwright.config.js
  return path.join(PLAYWRIGHT_HOME, '.abacus');
}

function getProjectsFile() {
  return path.join(getConfigDir(), 'projects.json');
}

function resetAbacusConfig() {
  const configDir = getConfigDir();
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(getProjectsFile(), JSON.stringify({ projects: [], nextId: 1 }, null, 2));
}

async function waitForProjectsLoaded(page) {
  // Wait for initial projects fetch + rendering.
  // NOTE: Cannot use 'networkidle' because SSE keeps a persistent connection open.
  // The app now uses web components with shadow DOM for the sidebar.
  // Wait for the sidebar component to be present and show either empty state or projects.
  const sidebar = page.locator('abacus-sidebar');
  await sidebar.waitFor({ state: 'visible', timeout: 10000 });
  // Wait until either empty state message OR a project tab exists
  await page.locator('abacus-sidebar .empty-state, abacus-project-tab').first().waitFor({ state: 'visible', timeout: 10000 });
}

async function addProjectViaUI(page, projectPath) {
  await page.getByRole('button', { name: /add project/i }).click();
  await page.locator('#add-project-modal').waitFor({ state: 'visible' });
  await page.locator('#project-path').fill(projectPath);
  await page.getByRole('button', { name: /^add project$/i }).click();
  // Modal closes on success.
  await page.locator('#add-project-modal').waitFor({ state: 'hidden' });
}

async function selectProjectByName(page, name) {
  await page.locator('.project-tab', { hasText: name }).click();
  await page.locator('#kanban-board').waitFor({ state: 'visible' });
}

function issuesJsonlPath() {
  return path.join(TEST_PROJECT_PATH, '.beads', 'issues.jsonl');
}

function readIssuesJsonl() {
  const content = fs.readFileSync(issuesJsonlPath(), 'utf-8');
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function writeIssuesJsonl(beads) {
  const beadsDir = path.join(TEST_PROJECT_PATH, '.beads');
  fs.mkdirSync(beadsDir, { recursive: true });
  // Remove beads.db if it exists to ensure server reads from JSONL
  const dbPath = path.join(beadsDir, 'beads.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  const content = beads.map(b => JSON.stringify(b)).join('\n') + '\n';
  fs.writeFileSync(issuesJsonlPath(), content, 'utf-8');
}

function resetFixtures() {
  // Reset the issues.jsonl file to original state
  writeIssuesJsonl(ORIGINAL_FIXTURE_BEADS);
}

module.exports = {
  TEST_PROJECT_PATH,
  ORIGINAL_FIXTURE_BEADS,
  resetAbacusConfig,
  waitForProjectsLoaded,
  addProjectViaUI,
  selectProjectByName,
  readIssuesJsonl,
  writeIssuesJsonl,
  resetFixtures
};
