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
    const modal = page.locator('#add-project-modal');
    await page.getByRole('button', { name: /add project/i }).click();
    await expect(modal).toHaveAttribute('open', '');

    // Close via X (inside shadow DOM)
    await modal.locator('.modal-close').click();
    await expect(modal).not.toHaveAttribute('open');

    // Close via Cancel (inside shadow DOM)
    await page.getByRole('button', { name: /add project/i }).click();
    await expect(modal).toHaveAttribute('open', '');
    await modal.locator('.cancel-btn').click();
    await expect(modal).not.toHaveAttribute('open');

    // Close via Escape
    await page.getByRole('button', { name: /add project/i }).click();
    await expect(modal).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(modal).not.toHaveAttribute('open');

    // Close via overlay click (click at top-left corner to avoid modal content)
    await page.getByRole('button', { name: /add project/i }).click();
    await expect(modal).toHaveAttribute('open', '');
    await modal.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });
    await expect(modal).not.toHaveAttribute('open');
  });

  test('adding empty path shows validation error', async ({ page }) => {
    const modal = page.locator('#add-project-modal');
    await page.getByRole('button', { name: /add project/i }).click();
    await modal.locator('#project-path').fill('');
    await page.getByRole('button', { name: /^add project$/i }).click();

    const errorEl = modal.locator('.form-error');
    await expect(errorEl).toBeVisible();
    await expect(errorEl).toContainText('Please enter a project path');
  });

  test('adding invalid path shows error', async ({ page }) => {
    const modal = page.locator('#add-project-modal');
    await page.getByRole('button', { name: /add project/i }).click();
    await modal.locator('#project-path').fill(path.join(TEST_PROJECT_PATH, 'does-not-exist'));
    await page.getByRole('button', { name: /^add project$/i }).click();

    const errorEl = modal.locator('.form-error');
    await expect(errorEl).toBeVisible();
    await expect(errorEl).toContainText('Path does not exist');
  });

  test('adding path without .beads/issues.jsonl shows validation error', async ({ page }) => {
    const modal = page.locator('#add-project-modal');
    await page.getByRole('button', { name: /add project/i }).click();
    await modal.locator('#project-path').fill(path.join(__dirname, '..'));
    await page.getByRole('button', { name: /^add project$/i }).click();

    const errorEl = modal.locator('.form-error');
    await expect(errorEl).toBeVisible();
    await expect(errorEl).toContainText('valid beads project');
  });

  test('adding valid beads project appears in sidebar and updates badge count', async ({ page }) => {
    await addProjectViaUI(page, TEST_PROJECT_PATH);

    const tab = page.locator('abacus-project-tab', { hasText: 'test-project' });
    await expect(tab).toBeVisible();

    // Count badge should match fixtures (5 lines) - check attribute on the custom element
    await expect(tab).toHaveAttribute('count', '5');

    // Welcome should be hidden after auto-select
    await expect(page.locator('#kanban-board')).toBeVisible();
    await expect(page.locator('#welcome-state')).toHaveClass(/hidden/);
  });

  test('duplicate project path shows already registered error', async ({ page }) => {
    await addProjectViaUI(page, TEST_PROJECT_PATH);

    const modal = page.locator('#add-project-modal');
    // open modal again and add same path
    await page.getByRole('button', { name: /add project/i }).click();
    await modal.locator('#project-path').fill(TEST_PROJECT_PATH);
    await page.getByRole('button', { name: /^add project$/i }).click();

    const errorEl = modal.locator('.form-error');
    await expect(errorEl).toBeVisible();
    await expect(errorEl).toContainText('Project already registered');
  });

  test('remove project confirmation can be canceled and confirmed', async ({ page }) => {
    await addProjectViaUI(page, TEST_PROJECT_PATH);

    const projectTab = page.locator('abacus-project-tab', { hasText: 'test-project' });
    const confirmDialog = page.locator('#confirm-dialog');

    // Open remove dialog via kebab menu
    await projectTab.hover();
    await projectTab.locator('.kebab-btn').click();
    await projectTab.locator('.remove-btn').click();
    await expect(confirmDialog).toHaveAttribute('open', '');

    // Cancel keeps project
    await confirmDialog.locator('.cancel-btn').click();
    await expect(confirmDialog).not.toHaveAttribute('open');
    await expect(projectTab).toBeVisible();

    // Open again and confirm removes project
    await projectTab.hover();
    await projectTab.locator('.kebab-btn').click();
    await projectTab.locator('.remove-btn').click();
    await expect(confirmDialog).toHaveAttribute('open', '');
    await confirmDialog.locator('.confirm-btn').click();

    await expect(confirmDialog).not.toHaveAttribute('open');
    await expect(page.locator('abacus-project-tab', { hasText: 'test-project' })).toHaveCount(0);
    await expect(page.locator('#welcome-state')).toBeVisible();
  });
});
