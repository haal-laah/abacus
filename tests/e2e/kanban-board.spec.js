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

    // Use custom element selector with status attribute
    const column = (status) => board.locator(`abacus-kanban-column[status="${status}"]`);

    // Check columns have correct header text (pierces shadow DOM automatically)
    await expect(column('open')).toContainText('Open');
    await expect(column('in_progress')).toContainText('In Progress');
    await expect(column('blocked')).toContainText('Blocked');
    await expect(column('closed')).toContainText('Closed');

    // From fixtures: open:2 (bd-0001, bd-0005), in_progress:1, blocked:1, closed:1
    // Check count via attribute on the custom element
    await expect(column('open')).toHaveAttribute('count', '2');
    await expect(column('in_progress')).toHaveAttribute('count', '1');
    await expect(column('blocked')).toHaveAttribute('count', '1');
    await expect(column('closed')).toHaveAttribute('count', '1');
  });

  test('bead cards render key fields (id, title, priority, type, assignee/labels)', async ({ page }) => {
    const board = page.locator('#kanban-board');
    const openColumn = board.locator('abacus-kanban-column[status="open"]');

    // Find card by bead-id attribute
    const card1 = openColumn.locator('abacus-bead-card[bead-id="bd-0001"]');
    await expect(card1).toBeVisible();
    // Check attributes on the custom element
    await expect(card1).toHaveAttribute('bead-id', 'bd-0001');
    await expect(card1).toHaveAttribute('title', 'Login form fails on Safari');
    await expect(card1).toHaveAttribute('priority', '0');
    await expect(card1).toHaveAttribute('type', 'bug');
    await expect(card1).toHaveAttribute('assignee', 'alice');
    // Labels is a JSON array attribute
    const labelsAttr = await card1.getAttribute('labels');
    expect(labelsAttr).toContain('frontend');

    const card5 = openColumn.locator('abacus-bead-card[bead-id="bd-0005"]');
    await expect(card5).toBeVisible();
    await expect(card5).toHaveAttribute('priority', '4');
    await expect(card5).toHaveAttribute('type', 'task');
    // Unassigned - no assignee attribute
    await expect(card5).not.toHaveAttribute('assignee');
  });
});
