const { test, expect } = require('playwright/test');
const { resetAbacusConfig, waitForProjectsLoaded } = require('./_helpers');

test.describe('startup', () => {
  test.beforeEach(async ({ page }) => {
    resetAbacusConfig();
    await page.goto('/');
    await waitForProjectsLoaded(page);
  });

  test('homepage loads and shows empty state + theme toggle', async ({ page }) => {
    await expect(page).toHaveTitle(/Abacus/i);

    // Theme toggle is inside abacus-header shadow DOM
    const header = page.locator('abacus-header');
    await expect(header.locator('#theme-toggle')).toBeVisible();

    // Empty state is inside abacus-sidebar shadow DOM
    const sidebar = page.locator('abacus-sidebar');
    const emptyState = sidebar.locator('.empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No projects registered');

    // Kanban should be hidden until a project is selected
    await expect(page.locator('#kanban-board')).toHaveClass(/hidden/);
    await expect(page.locator('#welcome-state')).toBeVisible();
  });
});
