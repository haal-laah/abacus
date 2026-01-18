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
    const openCard = page.locator('.column-cards[data-status="open"] .bead-card', { hasText: 'bd-0001' });
    await openCard.click();

    await expect(page.locator('#bead-detail-modal')).toBeVisible();
    await expect(page.locator('#bead-detail-title')).toContainText('bd-0001');

    const body = page.locator('#bead-detail-body');
    await expect(body).toContainText('Description');
    await expect(body).toContainText('Repro: open /login');
    await expect(body).toContainText('Status');
    await expect(body).toContainText('Open');
    await expect(body).toContainText('Priority');
    await expect(body).toContainText('P0');
    await expect(body).toContainText('Type');
    await expect(body).toContainText('bug');
    await expect(body).toContainText('Assignee');
    await expect(body).toContainText('@alice');

    // Dependencies section exists and has clickable dependency
    const dep = body.locator('.bead-dependency', { hasText: 'bd-0003' });
    await expect(dep).toBeVisible();
    await dep.click();

    await expect(page.locator('#bead-detail-title')).toContainText('bd-0003');
    await expect(page.locator('#bead-detail-body')).toContainText('Blocked');
  });

  test('modal closes via X, Escape, and overlay click', async ({ page }) => {
    const openCard = page.locator('.column-cards[data-status="open"] .bead-card', { hasText: 'bd-0001' });

    // Close via X
    await openCard.click();
    await expect(page.locator('#bead-detail-modal')).toBeVisible();
    await page.locator('#close-bead-modal').click();
    await expect(page.locator('#bead-detail-modal')).toBeHidden();

    // Close via Escape
    await openCard.click();
    await expect(page.locator('#bead-detail-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#bead-detail-modal')).toBeHidden();

    // Close via overlay (click at top-left corner to avoid modal content)
    await openCard.click();
    await expect(page.locator('#bead-detail-modal')).toBeVisible();
    await page.locator('#bead-detail-modal .modal-overlay').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#bead-detail-modal')).toBeHidden();
  });
});
