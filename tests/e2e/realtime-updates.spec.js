const { test, expect } = require('playwright/test');
const {
  TEST_PROJECT_PATH,
  resetAbacusConfig,
  resetFixtures,
  waitForProjectsLoaded,
  addProjectViaUI,
  readIssuesJsonl,
  writeIssuesJsonl
} = require('./_helpers');

test.describe('real-time updates (SSE)', () => {
  test.beforeEach(async ({ page }) => {
    resetAbacusConfig();
    resetFixtures();
    await page.goto('/');
    await waitForProjectsLoaded(page);
    await addProjectViaUI(page, TEST_PROJECT_PATH);
  });

  test('changing issues.jsonl moves beads between columns and updates counts', async ({ page }) => {
    const count = (status) => page.locator(`.bead-count[data-count="${status}"]`);

    await expect(count('open')).toHaveText('2');
    await expect(count('in_progress')).toHaveText('1');

    // Move bd-0005 from open -> in_progress, and add new bead bd-9999 (blocked)
    const beads = readIssuesJsonl();
    const updated = beads.map(b => (b.id === 'bd-0005' ? { ...b, status: 'in_progress', updated_at: new Date().toISOString() } : b));
    updated.push({
      id: 'bd-9999',
      title: 'Hotfix: rendering glitch',
      description: 'Fix small UI glitch in kanban headers.',
      status: 'blocked',
      priority: 2,
      type: 'bug',
      assignee: 'dave',
      labels: ['ui'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      dependencies: []
    });

    writeIssuesJsonl(updated);

    // Expect UI to update soon.
    await expect(count('open')).toHaveText('1', { timeout: 10_000 });
    await expect(count('in_progress')).toHaveText('2', { timeout: 10_000 });
    await expect(count('blocked')).toHaveText('2', { timeout: 10_000 });

    // New bead appears in blocked column
    const blockedColumn = page.locator('.column-cards[data-status="blocked"]');
    await expect(blockedColumn.locator('.bead-card', { hasText: 'bd-9999' })).toBeVisible();

    // Sidebar count for project updates too
    const tab = page.locator('.project-tab', { hasText: 'test-project' });
    await expect(tab.locator('.project-count')).toHaveText('6', { timeout: 10_000 });
  });
});
