const { test, expect } = require('playwright/test');
const {
  TEST_PROJECT_PATH,
  resetAbacusConfig,
  resetFixtures,
  waitForProjectsLoaded,
  addProjectViaUI
} = require('./_helpers');

test.describe('kanban board', () => {
  test.beforeEach(async ({ page }) => {
    resetAbacusConfig();
    resetFixtures();
    await page.goto('/');
    await waitForProjectsLoaded(page);
    await addProjectViaUI(page, TEST_PROJECT_PATH);
  });

  test('shows 4 columns with correct counts', async ({ page }) => {
    const board = page.locator('#kanban-board');
    await expect(board).toBeVisible();

    const column = (status) => page.locator(`.kanban-column[data-status="${status}"]`);
    const count = (status) => page.locator(`.bead-count[data-count="${status}"]`);

    await expect(column('open')).toContainText('Open');
    await expect(column('in_progress')).toContainText('In Progress');
    await expect(column('blocked')).toContainText('Blocked');
    await expect(column('closed')).toContainText('Closed');

    // From fixtures: open:2 (bd-0001, bd-0005), in_progress:1, blocked:1, closed:1
    await expect(count('open')).toHaveText('2');
    await expect(count('in_progress')).toHaveText('1');
    await expect(count('blocked')).toHaveText('1');
    await expect(count('closed')).toHaveText('1');
  });

  test('bead cards render key fields (id, title, priority, type, assignee/labels)', async ({ page }) => {
    const openColumn = page.locator('.column-cards[data-status="open"]');

    const card1 = openColumn.locator('.bead-card', { hasText: 'bd-0001' });
    await expect(card1).toBeVisible();
    await expect(card1.locator('.bead-id')).toHaveText('bd-0001');
    await expect(card1.locator('.bead-title')).toContainText('Login form fails on Safari');
    await expect(card1.locator('.bead-priority')).toHaveText('P0');
    await expect(card1.locator('.bead-type')).toHaveText('bug');
    await expect(card1.locator('.bead-assignee')).toHaveText('@alice');
    await expect(card1.locator('.bead-labels')).toContainText('frontend');

    const card5 = openColumn.locator('.bead-card', { hasText: 'bd-0005' });
    await expect(card5).toBeVisible();
    await expect(card5.locator('.bead-priority')).toHaveText('P4');
    await expect(card5.locator('.bead-type')).toHaveText('task');
    // Unassigned (no assignee element)
    await expect(card5.locator('.bead-assignee')).toHaveCount(0);
  });
});
