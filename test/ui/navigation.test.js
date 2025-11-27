const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Navigation Behavior', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        USE_MEMORY_FS: 'true',
      },
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('should focus on exited directory when going up using double-click', async () => {
    const leftList = window.locator('#left-list');
    const leftPanel = window.locator('#left-panel');

    // 1. Ensure we are in root and see 'folder1'
    const folder1 = leftList.locator('.file-item', { hasText: '[folder1]' });
    await expect(folder1).toBeVisible();

    // 2. Enter 'folder1'
    await folder1.dblclick();
    
    // Verify we are inside (look for subfile.txt)
    await expect(leftList.locator('.file-item', { hasText: 'subfile.txt' })).toBeVisible();

    // 3. Go up ('..')
    const dotdot = leftList.locator('.file-item', { hasText: '[..]' });
    await dotdot.dblclick();

    // 4. Verify we are back in root
    await expect(folder1).toBeVisible();

    // 5. Verify '[folder1]' is now focused
    // The 'focused' class should be applied to '[folder1]'
    await expect(folder1).toHaveClass(/focused/);
  });

  test('should go up a directory using Backspace key and focus on exited directory', async () => {
    const leftList = window.locator('#left-list');
    const leftPanel = window.locator('#left-panel');

    // 1. Ensure we are in root and see 'folder1'
    const folder1 = leftList.locator('.file-item', { hasText: '[folder1]' });
    await expect(folder1).toBeVisible();

    // 2. Enter 'folder1'
    await folder1.dblclick();
    
    // Verify we are inside (look for subfile.txt)
    await expect(leftList.locator('.file-item', { hasText: 'subfile.txt' })).toBeVisible();

    // 3. Press Backspace
    await window.keyboard.press('Backspace');

    // 4. Verify we are back in root
    await expect(folder1).toBeVisible();

    // 5. Verify '[folder1]' is now focused
    await expect(folder1).toHaveClass(/focused/);
  });
});