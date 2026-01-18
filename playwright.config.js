/**
 * Playwright configuration for Abacus E2E tests
 */

// @ts-check

const { defineConfig } = require('playwright/test');

const path = require('path');

const PLAYWRIGHT_HOME = path.join(__dirname, '.playwright-home');

const PORT = process.env.PLAYWRIGHT_PORT || '3100';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  // Disable parallel execution because tests share a single server with in-memory state.
  // The server's ProjectsDB loads at startup and doesn't reload when tests reset the config file.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    headless: process.env.PW_HEADLESS ? process.env.PW_HEADLESS !== 'false' : true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node server.js',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      ...process.env,
      PORT,
      // Avoid polluting the developer's home with Abacus config.
      HOME: PLAYWRIGHT_HOME,
      USERPROFILE: PLAYWRIGHT_HOME
    }
  }
});
