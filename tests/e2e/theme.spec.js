const { test, expect } = require('playwright/test');
const { resetAbacusConfig, waitForProjectsLoaded } = require('./_helpers');

test.describe('theme', () => {
  test.beforeEach(async ({ page }) => {
    resetAbacusConfig();
    await page.goto('/');
    await waitForProjectsLoaded(page);
  });

  test('toggle switches theme and persists after reload', async ({ page }) => {
    const html = page.locator('html');
    const header = page.locator('abacus-header');
    const themeToggle = header.locator('#theme-toggle');
    const themeLabel = header.locator('.theme-label');

    await expect(html).toHaveAttribute('data-theme', /light|dark/);

    const initialTheme = await html.getAttribute('data-theme');
    const initialLabel = await themeLabel.textContent();

    await themeToggle.click();

    const nextTheme = initialTheme === 'light' ? 'dark' : 'light';
    await expect(html).toHaveAttribute('data-theme', nextTheme);

    const nextLabel = await themeLabel.textContent();
    expect(nextLabel).not.toBe(initialLabel);

    // Reload and verify persistence
    await page.reload();
    await waitForProjectsLoaded(page);
    await expect(html).toHaveAttribute('data-theme', nextTheme);
  });
});
