const { test, expect } = require('playwright/test');
const {
  TEST_PROJECT_PATH,
  resetAbacusConfig,
  resetFixtures,
  waitForProjectsLoaded,
  addProjectViaUI
} = require('./_helpers');

test.describe('bead detail modal', () => {
  test.beforeEach(async ({ page }) => {
    resetAbacusConfig();
    resetFixtures();
    await page.goto('/');
    await waitForProjectsLoaded(page);
    await addProjectViaUI(page, TEST_PROJECT_PATH);
  });

  test('clicking a bead opens modal with full fields and dependency navigation', async ({ page }) => {
    const board = page.locator('abacus-kanban-board');
    const openColumn = board.locator('abacus-kanban-column[status="open"]');
    const openCard = openColumn.locator('abacus-bead-card[bead-id="bd-0001"]');
    await openCard.click();

    const modal = page.locator('#bead-detail-modal');
    await expect(modal).toBeVisible();

    // Check modal title (bead title in header)
    await expect(modal.locator('.modal-title')).toContainText('Login form fails on Safari');

    // Check body content
    const body = modal.locator('.bead-detail');
    await expect(body).toContainText('Description');
    await expect(body).toContainText('Repro: open /login');
    await expect(body).toContainText('Status');
    await expect(body).toContainText('Open');
    await expect(body).toContainText('Priority');
    await expect(body).toContainText('P0');
    await expect(body).toContainText('Type');
    await expect(body).toContainText('bug');
    await expect(body).toContainText('Assignee');
    await expect(body).toContainText('alice');

    // Dependencies section exists and has clickable dependency
    const dep = modal.locator('.dependency', { hasText: 'bd-0003' });
    await expect(dep).toBeVisible();
    await dep.click();

    // After clicking dependency, modal shows that bead
    await expect(modal.locator('.modal-title')).toContainText('Epic: Authentication overhaul');
    await expect(modal.locator('.bead-detail')).toContainText('Blocked');
  });

  test('modal closes via X, Escape, and overlay click', async ({ page }) => {
    const board = page.locator('abacus-kanban-board');
    const openColumn = board.locator('abacus-kanban-column[status="open"]');
    const openCard = openColumn.locator('abacus-bead-card[bead-id="bd-0001"]');
    const modal = page.locator('#bead-detail-modal');

    // Close via X
    await openCard.click();
    await expect(modal).toBeVisible();
    await modal.locator('.modal-close').click();
    await expect(modal).toBeHidden();

    // Close via Escape
    await openCard.click();
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();

    // Close via overlay (click at top-left corner to avoid modal content)
    await openCard.click();
    await expect(modal).toBeVisible();
    await modal.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });
    await expect(modal).toBeHidden();
  });
});
