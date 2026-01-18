const { test, expect } = require('playwright/test');
const path = require('path');
const {
  TEST_PROJECT_PATH,
  resetAbacusConfig,
  resetFixtures,
  waitForProjectsLoaded,
  addProjectViaUI
} = require('./_helpers');

test.describe('project management', () => {
  test.beforeEach(async ({ page }) => {
    resetAbacusConfig();
    resetFixtures();
    await page.goto('/');
    await waitForProjectsLoaded(page);
  });

  test('Add Project button opens modal and can be closed (X/Cancel/Escape/overlay)', async ({ page }) => {
    await page.getByRole('button', { name: /add project/i }).click();
    await expect(page.locator('#add-project-modal')).toBeVisible();

    // Close via X
    await page.locator('#close-add-modal').click();
    await expect(page.locator('#add-project-modal')).toBeHidden();

    // Close via Cancel
    await page.getByRole('button', { name: /add project/i }).click();
    await expect(page.locator('#add-project-modal')).toBeVisible();
    await page.locator('#cancel-add-project').click();
    await expect(page.locator('#add-project-modal')).toBeHidden();

    // Close via Escape
    await page.getByRole('button', { name: /add project/i }).click();
    await expect(page.locator('#add-project-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#add-project-modal')).toBeHidden();

    // Close via overlay click (click at top-left corner to avoid modal content)
    await page.getByRole('button', { name: /add project/i }).click();
    await expect(page.locator('#add-project-modal')).toBeVisible();
    await page.locator('#add-project-modal .modal-overlay').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#add-project-modal')).toBeHidden();
  });

  test('adding empty path shows validation error', async ({ page }) => {
    await page.getByRole('button', { name: /add project/i }).click();
    await page.locator('#project-path').fill('');
    await page.getByRole('button', { name: /^add project$/i }).click();

    await expect(page.locator('#add-project-error')).toBeVisible();
    await expect(page.locator('#add-project-error')).toContainText('Please enter a project path');
  });

  test('adding invalid path shows error', async ({ page }) => {
    await page.getByRole('button', { name: /add project/i }).click();
    await page.locator('#project-path').fill(path.join(TEST_PROJECT_PATH, 'does-not-exist'));
    await page.getByRole('button', { name: /^add project$/i }).click();

    await expect(page.locator('#add-project-error')).toBeVisible();
    await expect(page.locator('#add-project-error')).toContainText('Path does not exist');
  });

  test('adding path without .beads/issues.jsonl shows validation error', async ({ page }) => {
    await page.getByRole('button', { name: /add project/i }).click();
    await page.locator('#project-path').fill(path.join(__dirname, '..'));
    await page.getByRole('button', { name: /^add project$/i }).click();

    await expect(page.locator('#add-project-error')).toBeVisible();
    await expect(page.locator('#add-project-error')).toContainText('valid beads project');
  });

  test('adding valid beads project appears in sidebar and updates badge count', async ({ page }) => {
    await addProjectViaUI(page, TEST_PROJECT_PATH);

    const tab = page.locator('.project-tab', { hasText: 'test-project' });
    await expect(tab).toBeVisible();

    // Count badge should match fixtures (5 lines)
    await expect(tab.locator('.project-count')).toHaveText('5');

    // Welcome should be hidden after auto-select
    await expect(page.locator('#kanban-board')).toBeVisible();
    await expect(page.locator('#welcome-state')).toHaveClass(/hidden/);
  });

  test('duplicate project path shows already registered error', async ({ page }) => {
    await addProjectViaUI(page, TEST_PROJECT_PATH);

    // open modal again and add same path
    await page.getByRole('button', { name: /add project/i }).click();
    await page.locator('#project-path').fill(TEST_PROJECT_PATH);
    await page.getByRole('button', { name: /^add project$/i }).click();

    await expect(page.locator('#add-project-error')).toBeVisible();
    await expect(page.locator('#add-project-error')).toContainText('Project already registered');
  });

  test('remove project confirmation can be canceled and confirmed', async ({ page }) => {
    await addProjectViaUI(page, TEST_PROJECT_PATH);

    // Open remove modal
    await page.locator('#remove-project-btn').click();
    await expect(page.locator('#confirm-remove-modal')).toBeVisible();

    // Cancel keeps project
    await page.locator('#cancel-remove').click();
    await expect(page.locator('#confirm-remove-modal')).toBeHidden();
    await expect(page.locator('.project-tab', { hasText: 'test-project' })).toBeVisible();

    // Confirm removes project
    await page.locator('#remove-project-btn').click();
    await expect(page.locator('#confirm-remove-modal')).toBeVisible();
    await page.locator('#confirm-remove').click();

    await expect(page.locator('#confirm-remove-modal')).toBeHidden();
    await expect(page.locator('.project-tab', { hasText: 'test-project' })).toHaveCount(0);
    await expect(page.locator('#welcome-state')).toBeVisible();
  });
});
