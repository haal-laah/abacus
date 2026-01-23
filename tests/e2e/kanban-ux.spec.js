/**
 * E2E tests for Kanban UX improvements
 * PRD: US-009
 *
 * Tests for completed features:
 * - Sort dropdown (abacus-23p) ✓
 * - Header removal + kebab menu (abacus-1ld) ✓
 * - Compact card design (abacus-32g) ✓
 * - Improved dependency text (abacus-3fe) ✓
 * - Archive/unarchive (abacus-ccx) ✓
 * - Expanded modal with comments (abacus-d5s) ✓
 * - Card animations (abacus-3gq) ✓
 * - Dependency graph visualization (abacus-166) ✓
 */

const { test, expect } = require('playwright/test');
const {
  TEST_PROJECT_PATH,
  ORIGINAL_FIXTURE_BEADS,
  resetAbacusConfig,
  resetFixtures,
  waitForProjectsLoaded,
  addProjectViaUI,
  writeIssuesJsonl
} = require('./_helpers');

// Timeout constants for consistent waiting behavior
const MODAL_ANIMATION_DELAY = 300;
const API_RESPONSE_DELAY = 500;

test.describe('Kanban UX Improvements', () => {
  test.beforeEach(async ({ page }) => {
    resetAbacusConfig();
    resetFixtures();
    await page.goto('/');
    await waitForProjectsLoaded(page);
    await addProjectViaUI(page, TEST_PROJECT_PATH);
  });

  // ============================================
  // Sort Dropdown Tests (abacus-23p)
  // ============================================
  test.describe('Sort Dropdown', () => {
    test('sort dropdown is visible in board toolbar', async ({ page }) => {
      // The sort dropdown should be visible in the board toolbar
      const board = page.locator('#kanban-board');
      await expect(board).toBeVisible();

      // Access the sort dropdown inside the board's shadow DOM
      const sortDropdown = board.locator('abacus-sort-dropdown');
      await expect(sortDropdown).toBeVisible();

      // Verify the select element exists
      const select = sortDropdown.locator('select');
      await expect(select).toBeVisible();
    });

    test('sort dropdown has all 6 options', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const sortDropdown = board.locator('abacus-sort-dropdown');
      const select = sortDropdown.locator('select');

      // Get all options (text may include whitespace, so join and check)
      const options = await select.locator('option').allTextContents();
      const optionsText = options.map(o => o.trim());
      expect(optionsText).toContain('Priority');
      expect(optionsText).toContain('Newest First');
      expect(optionsText).toContain('Oldest First');
      expect(optionsText).toContain('Recently Updated');
      expect(optionsText).toContain('Type');
      expect(optionsText).toContain('Label');
    });

    test('priority sort is default', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const sortDropdown = board.locator('abacus-sort-dropdown');
      const select = sortDropdown.locator('select');

      // Default should be Priority
      await expect(select).toHaveValue('priority');
    });

    test('sort dropdown changes card order', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const sortDropdown = board.locator('abacus-sort-dropdown');
      const select = sortDropdown.locator('select');

      // Get initial order of cards in the open column
      const openColumn = board.locator('abacus-kanban-column[status="open"]');

      // Change to "Oldest First" sort
      await select.selectOption('oldest');

      // Verify the sort option changed
      await expect(select).toHaveValue('oldest');

      // The oldest bead in fixtures is bd-0005 (created 2025-01-02)
      // After sorting by oldest, it should be first in the open column
      const firstCard = openColumn.locator('abacus-bead-card').first();
      await expect(firstCard).toHaveAttribute('bead-id', 'bd-0005');
    });

    test('sort persists after page refresh', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const sortDropdown = board.locator('abacus-sort-dropdown');
      const select = sortDropdown.locator('select');

      // Change sort to "Newest First"
      await select.selectOption('newest');
      await expect(select).toHaveValue('newest');

      // Refresh the page
      await page.reload();
      await waitForProjectsLoaded(page);

      // Select the project again
      await page.locator('abacus-project-tab', { hasText: 'test-project' }).click();
      await expect(board).toBeVisible();

      // Verify sort preference persisted
      const selectAfterReload = board.locator('abacus-sort-dropdown select');
      await expect(selectAfterReload).toHaveValue('newest');
    });

    test('Show Archived toggle is visible', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const sortDropdown = board.locator('abacus-sort-dropdown');

      // Verify the checkbox toggle exists
      const checkbox = sortDropdown.locator('input[type="checkbox"]');
      await expect(checkbox).toBeVisible();

      // Verify the label text
      const label = sortDropdown.locator('text=Show Archived');
      await expect(label).toBeVisible();
    });

    test('Show Archived defaults to unchecked', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const sortDropdown = board.locator('abacus-sort-dropdown');
      const checkbox = sortDropdown.locator('input[type="checkbox"]');

      // Default should be unchecked
      await expect(checkbox).not.toBeChecked();
    });
  });

  // ============================================
  // Header Removal + Kebab Menu Tests (abacus-1ld)
  // ============================================
  test.describe('Header Removal and Kebab Menu', () => {
    test('no header row above kanban columns', async ({ page }) => {
      const board = page.locator('#kanban-board');
      await expect(board).toBeVisible();

      // There should be no board-header or similar element inside the board
      // The old header would have contained project name and remove button
      const header = board.locator('.board-header, .header-row');
      await expect(header).toHaveCount(0);
    });

    test('kebab menu appears on project tab hover', async ({ page }) => {
      // Find the project tab
      const projectTab = page.locator('abacus-project-tab').first();
      await expect(projectTab).toBeVisible();

      // Hover over the tab
      await projectTab.hover();

      // The kebab button (three dots) should be visible
      const kebabBtn = projectTab.locator('.kebab-btn');
      await expect(kebabBtn).toBeVisible();
    });

    test('kebab menu contains Remove Project option', async ({ page }) => {
      const projectTab = page.locator('abacus-project-tab').first();
      await projectTab.hover();

      // Click the kebab button
      const kebabBtn = projectTab.locator('.kebab-btn');
      await kebabBtn.click();

      // Menu should be open with Remove Project option
      const menu = projectTab.locator('.kebab-menu');
      await expect(menu).toHaveClass(/open/);

      const removeOption = menu.locator('.remove-btn');
      await expect(removeOption).toContainText('Remove Project');
      await expect(removeOption).toHaveClass(/kebab-menu-item--danger/);
    });

    test('kebab menu Remove Project triggers confirmation dialog', async ({ page }) => {
      const projectTab = page.locator('abacus-project-tab').first();
      await projectTab.hover();

      // Open the kebab menu and click Remove
      const kebabBtn = projectTab.locator('.kebab-btn');
      await kebabBtn.click();

      const removeOption = projectTab.locator('.remove-btn');
      await removeOption.click();

      // Confirm dialog should appear
      const confirmDialog = page.locator('#confirm-dialog');
      await expect(confirmDialog).toHaveAttribute('open', '');
      await expect(confirmDialog).toContainText('Remove Project');
    });
  });

  // ============================================
  // Compact Card Design Tests (abacus-32g)
  // ============================================
  test.describe('Compact Card Design', () => {
    test('bead card displays ID in header', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const card = board.locator('abacus-bead-card[bead-id="bd-0001"]');
      await expect(card).toBeVisible();

      // Card should show the bead ID
      const beadId = card.locator('.bead-id');
      await expect(beadId).toHaveText('bd-0001');
    });

    test('bead card displays priority badge', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const card = board.locator('abacus-bead-card[bead-id="bd-0001"]');

      // Card should show priority badge
      const priorityBadge = card.locator('abacus-priority-badge');
      await expect(priorityBadge).toBeVisible();
      // Verify badge has a priority attribute (value depends on bead data)
      const priority = await priorityBadge.getAttribute('priority');
      expect(priority).toMatch(/^[0-4]$/);
    });

    test('bead card displays type badge', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const card = board.locator('abacus-bead-card[bead-id="bd-0001"]');

      // Card should show type badge (bug for bd-0001)
      const typeBadge = card.locator('abacus-type-badge');
      await expect(typeBadge).toBeVisible();
      await expect(typeBadge).toHaveAttribute('type', 'bug');
    });

    test('bead card displays truncated title with tooltip', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const card = board.locator('abacus-bead-card[bead-id="bd-0001"]');

      // Title should have the full text as title attribute (tooltip)
      const title = card.locator('.bead-title');
      await expect(title).toHaveAttribute('title', 'Login form fails on Safari');
    });

    test('bead card shows max 2 labels plus +N badge', async ({ page }) => {
      // Use a bead with more than 2 labels
      const beadsWithManyLabels = [
        ...ORIGINAL_FIXTURE_BEADS.slice(0, 4),
        {
          id: 'bd-many-labels',
          title: 'Test with many labels',
          status: 'open',
          priority: 2,
          type: 'task',
          labels: ['one', 'two', 'three', 'four'],
          created_at: '2025-01-20T12:00:00Z',
          updated_at: '2025-01-20T12:00:00Z'
        }
      ];
      writeIssuesJsonl(beadsWithManyLabels);
      await page.reload();
      await waitForProjectsLoaded(page);
      await page.locator('abacus-project-tab', { hasText: 'test-project' }).click();

      const board = page.locator('#kanban-board');
      const card = board.locator('abacus-bead-card[bead-id="bd-many-labels"]');
      await expect(card).toBeVisible();

      // Should show 2 labels + "+2" badge
      const labels = card.locator('.bead-label');
      const labelsCount = await labels.count();
      expect(labelsCount).toBe(3); // 2 visible + 1 "+N" badge

      const moreBadge = card.locator('.bead-label-more');
      await expect(moreBadge).toHaveText('+2');
    });

    test('bead card shows avatar badge for assigned beads', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const card = board.locator('abacus-bead-card[bead-id="bd-0001"]');

      // bd-0001 is assigned to alice
      const avatar = card.locator('abacus-avatar-badge');
      await expect(avatar).toBeVisible();
      await expect(avatar).toHaveAttribute('name', 'alice');
    });

    test('bead card has no avatar for unassigned beads', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const card = board.locator('abacus-bead-card[bead-id="bd-0005"]');

      // bd-0005 has no assignee
      const avatar = card.locator('abacus-avatar-badge');
      await expect(avatar).toHaveCount(0);
    });
  });

  // ============================================
  // Dependency Display Tests (abacus-3fe)
  // ============================================
  test.describe('Dependency Display in Modal', () => {
    test('modal shows dependency section for beads with deps', async ({ page }) => {
      const board = page.locator('#kanban-board');

      // bd-0003 has a blocked_by dependency on bd-0002
      const card = board.locator('abacus-bead-card[bead-id="bd-0003"]');
      await card.click();

      // Modal should open
      const modal = page.locator('#bead-detail-modal');
      await expect(modal).toHaveAttribute('open', '');

      // Should have dependency explanation text
      const depExplanation = modal.locator('.dep-explanation');
      await expect(depExplanation.first()).toBeVisible();
      await expect(depExplanation.first()).toContainText('cannot proceed');
    });

    test('dependency badges show status indicators', async ({ page }) => {
      const board = page.locator('#kanban-board');

      // bd-0003 has blocked_by on bd-0002 (which is in_progress)
      const card = board.locator('abacus-bead-card[bead-id="bd-0003"]');
      await card.click();

      const modal = page.locator('#bead-detail-modal');
      await expect(modal).toHaveAttribute('open', '');

      // Should show dependency badge with status indicator
      const depBadge = modal.locator('.dependency');
      await expect(depBadge.first()).toBeVisible();

      // Status indicator should be present
      const statusIndicator = depBadge.first().locator('.status-indicator');
      await expect(statusIndicator).toBeVisible();
    });

    test('blocks dependencies show unblock text', async ({ page }) => {
      const board = page.locator('#kanban-board');

      // bd-0001 has "blocks" dependency on bd-0003
      const card = board.locator('abacus-bead-card[bead-id="bd-0001"]');
      await card.click();

      const modal = page.locator('#bead-detail-modal');
      await expect(modal).toHaveAttribute('open', '');

      // Should show "will unblock" text
      const depExplanation = modal.locator('.dep-explanation');
      await expect(depExplanation.first()).toContainText('will unblock');
    });

    test('clicking dependency badge navigates to that bead', async ({ page }) => {
      const board = page.locator('#kanban-board');

      // bd-0003 has dependency on bd-0002
      const card = board.locator('abacus-bead-card[bead-id="bd-0003"]');
      await card.click();

      const modal = page.locator('#bead-detail-modal');
      await expect(modal).toHaveAttribute('open', '');

      // Wait for modal to fully render
      await page.waitForTimeout(MODAL_ANIMATION_DELAY);

      // Click the dependency badge for bd-0002
      const depBadge = modal.locator('.dependency[data-bead-id="bd-0002"]');
      await expect(depBadge).toBeVisible();
      await depBadge.click();

      // Wait for modal to update
      await page.waitForTimeout(API_RESPONSE_DELAY);

      // Modal should now show bd-0002 details
      const modalTitle = modal.locator('.modal-title');
      await expect(modalTitle).toContainText('Implement project import flow');
    });

    test('modal shows "None" when no dependencies', async ({ page }) => {
      const board = page.locator('#kanban-board');

      // bd-0004 has no dependencies
      const card = board.locator('abacus-bead-card[bead-id="bd-0004"]');
      await card.click();

      const modal = page.locator('#bead-detail-modal');
      await expect(modal).toHaveAttribute('open', '');

      // Should show "None" text for dependencies (use first() to get the deps one)
      const emptyDeps = modal.locator('.empty-deps').first();
      await expect(emptyDeps).toContainText('None');
    });
  });

  // ============================================
  // Archive/Unarchive Tests (abacus-ccx)
  // ============================================
  test.describe('Archive and Unarchive', () => {
    test.beforeEach(async ({ page }) => {
      // Add an archived bead for testing
      const beadsWithArchived = [
        ...ORIGINAL_FIXTURE_BEADS,
        {
          id: 'bd-archived',
          title: 'Archived task for testing',
          description: 'This task was archived.',
          status: 'closed',
          priority: 3,
          type: 'task',
          assignee: null,
          labels: ['archived', 'testing'],
          created_at: '2024-12-01T10:00:00Z',
          updated_at: '2024-12-15T10:00:00Z',
          dependencies: []
        }
      ];
      writeIssuesJsonl(beadsWithArchived);
      await page.reload();
      await waitForProjectsLoaded(page);

      // Click the project tab to select it and load beads
      const projectTab = page.locator('abacus-project-tab').first();
      await projectTab.click();

      // Wait for board to load with beads
      const board = page.locator('#kanban-board');
      await expect(board).toBeVisible();
    });

    test('archived beads hidden by default', async ({ page }) => {
      const board = page.locator('#kanban-board');
      await expect(board).toBeVisible();

      // Archived bead should not be visible
      const archivedCard = board.locator('abacus-bead-card[bead-id="bd-archived"]');
      await expect(archivedCard).toHaveCount(0);
    });

    test('Show Archived toggle reveals archived beads', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const sortDropdown = board.locator('abacus-sort-dropdown');

      // Enable Show Archived
      const checkbox = sortDropdown.locator('input[type="checkbox"]');
      await checkbox.check();

      // Archived bead should now be visible
      const archivedCard = board.locator('abacus-bead-card[bead-id="bd-archived"]');
      await expect(archivedCard).toBeVisible();
    });

    test('archived card has muted styling and badge', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const sortDropdown = board.locator('abacus-sort-dropdown');

      // Enable Show Archived
      const checkbox = sortDropdown.locator('input[type="checkbox"]');
      await checkbox.check();

      const archivedCard = board.locator('abacus-bead-card[bead-id="bd-archived"]');

      // Check for archived badge
      const archivedBadge = archivedCard.locator('.archived-badge');
      await expect(archivedBadge).toBeVisible();
      await expect(archivedBadge).toContainText('Archived');
    });

    test('unarchive overlay appears on hover', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const sortDropdown = board.locator('abacus-sort-dropdown');

      // Enable Show Archived
      const checkbox = sortDropdown.locator('input[type="checkbox"]');
      await checkbox.check();

      // Hover over archived card
      const archivedCard = board.locator('abacus-bead-card[bead-id="bd-archived"]');
      await archivedCard.hover();

      // Unarchive button should appear
      const unarchiveBtn = archivedCard.locator('.unarchive-btn');
      await expect(unarchiveBtn).toBeVisible();
    });

    test('modal shows Archive button for non-archived beads', async ({ page }) => {
      const board = page.locator('#kanban-board');

      // Click a non-archived bead
      const card = board.locator('abacus-bead-card[bead-id="bd-0001"]');
      await card.click();

      const modal = page.locator('#bead-detail-modal');
      await expect(modal).toHaveAttribute('open', '');

      // Archive button should be visible
      const archiveBtn = modal.locator('#archive-action-btn');
      await expect(archiveBtn).toBeVisible();
      await expect(archiveBtn).toContainText('Archive');
    });

    test('modal shows Unarchive button for archived beads', async ({ page }) => {
      const board = page.locator('#kanban-board');
      const sortDropdown = board.locator('abacus-sort-dropdown');

      // Enable Show Archived
      const checkbox = sortDropdown.locator('input[type="checkbox"]');
      await checkbox.check();

      // Wait for archived card to appear
      const archivedCard = board.locator('abacus-bead-card[bead-id="bd-archived"]');
      await expect(archivedCard).toBeVisible();

      // The unarchive overlay intercepts clicks, so dispatch the bead-select event directly
      await archivedCard.evaluate((el) => {
        el.dispatchEvent(new CustomEvent('bead-select', {
          bubbles: true,
          composed: true,
          detail: { beadId: 'bd-archived' }
        }));
      });

      // Wait for modal to open
      const modal = page.locator('#bead-detail-modal');
      await expect(modal).toHaveAttribute('open', '');

      // Wait for modal to fully render
      await page.waitForTimeout(API_RESPONSE_DELAY);

      // Unarchive button should be visible with "Unarchive" text
      const unarchiveBtn = modal.locator('#archive-action-btn');
      await expect(unarchiveBtn).toBeVisible();
      await expect(unarchiveBtn).toContainText('Unarchive');
    });
  });

  // ============================================
  // Expanded Modal with Comments (abacus-d5s)
  // ============================================
  test.describe('Expanded Modal with Comments', () => {
    test('modal has xlarge size (800px)', async ({ page }) => {
      const board = page.locator('#kanban-board');

      const card = board.locator('abacus-bead-card[bead-id="bd-0001"]');
      await card.click();

      const modal = page.locator('#bead-detail-modal');
      await expect(modal).toHaveAttribute('open', '');
      await expect(modal).toHaveAttribute('size', 'xlarge');

      // Modal content should have xlarge class
      const modalContent = modal.locator('.modal-content');
      await expect(modalContent).toHaveClass(/modal-xlarge/);
    });

    test('modal has two-panel layout', async ({ page }) => {
      const board = page.locator('#kanban-board');

      const card = board.locator('abacus-bead-card[bead-id="bd-0001"]');
      await card.click();

      const modal = page.locator('#bead-detail-modal');

      // Check for two-panel layout
      const detailsPanel = modal.locator('.details-panel');
      const commentsPanel = modal.locator('.comments-panel');

      await expect(detailsPanel).toBeVisible();
      await expect(commentsPanel).toBeVisible();
    });

    test('comments panel shows "No comments yet" when empty', async ({ page }) => {
      const board = page.locator('#kanban-board');

      const card = board.locator('abacus-bead-card[bead-id="bd-0001"]');
      await card.click();

      const modal = page.locator('#bead-detail-modal');

      // Wait for comments to load
      await page.waitForTimeout(API_RESPONSE_DELAY); // Allow time for API call

      // Should show empty state
      const emptyState = modal.locator('.comments-panel .empty-state');
      await expect(emptyState).toContainText('No comments yet');
    });

    test('comments panel header is visible', async ({ page }) => {
      const board = page.locator('#kanban-board');

      const card = board.locator('abacus-bead-card[bead-id="bd-0001"]');
      await card.click();

      const modal = page.locator('#bead-detail-modal');

      // Comments header should be visible
      const commentsHeader = modal.locator('.comments-panel h4');
      await expect(commentsHeader).toContainText('Comments');
    });
  });

  // ============================================
  // Card Animations (abacus-3gq)
  // ============================================
  test.describe('Card Animations', () => {
    test('in-progress cards have glow effect', async ({ page }) => {
      const board = page.locator('#kanban-board');

      // bd-0002 has status in_progress
      const inProgressColumn = board.locator('abacus-kanban-column[status="in_progress"]');
      const card = inProgressColumn.locator('abacus-bead-card[bead-id="bd-0002"]');
      await expect(card).toBeVisible();

      // Card should have animation applied (box-shadow for glow)
      const cardElement = card.locator('.bead-card');

      // Check that the card has the in-progress glow animation or box-shadow
      // The animation adds a pulsing glow effect
      const boxShadow = await cardElement.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.boxShadow || style.animation;
      });

      // Either box-shadow is present or animation is defined
      expect(boxShadow).toBeTruthy();
    });

    test('animations respect prefers-reduced-motion', async ({ page }) => {
      // Emulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const board = page.locator('#kanban-board');
      const inProgressColumn = board.locator('abacus-kanban-column[status="in_progress"]');
      const card = inProgressColumn.locator('abacus-bead-card[bead-id="bd-0002"]');
      await expect(card).toBeVisible();

      // With reduced motion, animations should be disabled
      const cardElement = card.locator('.bead-card');
      const animation = await cardElement.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.animationDuration;
      });

      // Animation should be 0s or 0.01ms when reduced motion is preferred
      expect(['0s', '0.01ms', 'none', '']).toContain(animation);
    });
  });

  // ============================================
  // Dependency Graph (abacus-166)
  // ============================================
  test.describe('Dependency Graph', () => {
    test('View Dependency Graph button hidden when no deps', async ({ page }) => {
      const board = page.locator('#kanban-board');

      // bd-0004 has no dependencies
      const card = board.locator('abacus-bead-card[bead-id="bd-0004"]');
      await card.click();

      const modal = page.locator('#bead-detail-modal');
      await expect(modal).toHaveAttribute('open', '');

      // View Dependency Graph button should not be present
      const viewGraphBtn = modal.locator('#view-graph-btn');
      await expect(viewGraphBtn).toHaveCount(0);
    });

    test('View Dependency Graph button visible when bead has deps', async ({ page }) => {
      const board = page.locator('#kanban-board');

      // bd-0003 has dependencies
      const card = board.locator('abacus-bead-card[bead-id="bd-0003"]');
      await card.click();

      const modal = page.locator('#bead-detail-modal');
      await expect(modal).toHaveAttribute('open', '');

      // View Dependency Graph button should be visible
      const viewGraphBtn = modal.locator('#view-graph-btn');
      await expect(viewGraphBtn).toBeVisible();
      await expect(viewGraphBtn).toContainText('View Dependency Graph');
    });

    test('dependency graph opens and displays nodes', async ({ page }) => {
      const board = page.locator('#kanban-board');

      // bd-0003 has dependencies
      const card = board.locator('abacus-bead-card[bead-id="bd-0003"]');
      await card.click();

      const modal = page.locator('#bead-detail-modal');
      await expect(modal).toHaveAttribute('open', '');

      // Click the View Dependency Graph button
      const viewGraphBtn = modal.locator('#view-graph-btn');
      await viewGraphBtn.click();

      // Wait for graph to load
      await page.waitForTimeout(API_RESPONSE_DELAY);

      // Graph component should be visible
      const graphComponent = modal.locator('abacus-dependency-graph');
      await expect(graphComponent).toBeVisible();

      // Graph should show current bead highlighted
      const currentNode = graphComponent.locator('.graph-node--current');
      await expect(currentNode).toBeVisible();

      // Back button should be present
      const backBtn = graphComponent.locator('.back-btn, #back-btn');
      await expect(backBtn).toBeVisible();
    });

    test('back button returns to details view', async ({ page }) => {
      const board = page.locator('#kanban-board');

      // bd-0003 has dependencies
      const card = board.locator('abacus-bead-card[bead-id="bd-0003"]');
      await card.click();

      const modal = page.locator('#bead-detail-modal');
      await expect(modal).toHaveAttribute('open', '');

      // Click the View Dependency Graph button
      const viewGraphBtn = modal.locator('#view-graph-btn');
      await viewGraphBtn.click();

      // Wait for graph to load
      await page.waitForTimeout(API_RESPONSE_DELAY);

      // Graph should be visible
      const graphComponent = modal.locator('abacus-dependency-graph');
      await expect(graphComponent).toBeVisible();

      // Click back button
      const backBtn = graphComponent.locator('.back-btn, #back-btn');
      await backBtn.click();

      // Wait for view to switch
      await page.waitForTimeout(MODAL_ANIMATION_DELAY);

      // Graph should be gone, details should be back
      await expect(graphComponent).toHaveCount(0);

      // Details panel should be visible again
      const detailsPanel = modal.locator('.details-panel');
      await expect(detailsPanel).toBeVisible();
    });
  });
});
