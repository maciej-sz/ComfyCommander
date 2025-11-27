const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Ctrl+Arrow Navigation', () => {
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

  test('Ctrl+Right should open selected directory from Left panel in Right panel', async () => {
    const leftList = window.locator('#left-list');
    const rightPath = window.locator('#right-path');
    const rightList = window.locator('#right-list');

    // 1. Focus 'folder1' in Left panel
    // Initial state: Left active. List: [..], [folder1], file1.txt
    // Press ArrowDown to select [folder1]
    await window.keyboard.press('ArrowDown');
    
    const folder1 = leftList.locator('.file-item.focused');
    await expect(folder1).toContainText('[folder1]');

    // 2. Press Ctrl+ArrowRight
    await window.keyboard.press('Control+ArrowRight');

    // 3. Verify Right panel path changes
    // Expect path to end with 'folder1'
    await expect(rightPath).toHaveText(/folder1$/);
    
    // 4. Verify Right panel content
    await expect(rightList.locator('.file-item', { hasText: 'subfile.txt' })).toBeVisible();
  });

  test('Ctrl+Left should open selected directory from Right panel in Left panel', async () => {
    // Setup: 
    // We need to be in Right panel.
    // Let's assume previous test passed and Right is in 'folder1'.
    // Let's reset or just navigate.
    
    // Switch to Right panel
    await window.keyboard.press('Tab');
    
    // Right panel is active.
    // Check if we are in 'folder1' (from previous test) or root.
    // If tests run in sequence, state persists unless we restart app.
    // Playwright 'beforeAll' runs once per describe block.
    // So Right panel is likely in 'folder1'.
    
    const rightPath = window.locator('#right-path');
    const leftPath = window.locator('#left-path');
    
    await expect(rightPath).toHaveText(/folder1$/);
    
    // Navigate Right panel back to root to test opening 'folder1' again? 
    // Or let's use '..' to open root in Left (which is already there, so hard to observe change).
    // Let's try to find a scenario that changes Left.
    // Left is at root.
    // If Right is at 'folder1'. 
    // We want to open a dir from Right in Left.
    // Let's open '..' (which is root) from Right in Left. 
    // Left is already at root.
    // This doesn't prove much.
    
    // Better: Navigate Left to 'folder1' first (manually).
    // Then use Right (at root) to open 'folder1' in Left again? No.
    
    // Let's reset both to root first.
    // Right is at 'folder1'. Go up.
    await window.keyboard.press('Home'); // Go to ..
    await window.keyboard.press('Enter'); // Go up
    
    // Now Right is at Root. Left is at Root.
    // Select 'folder1' in Right.
    await window.keyboard.press('Home'); // Ensure we start at top [..]
    await window.keyboard.press('ArrowDown'); // Select [folder1]
    const folder1 = window.locator('#right-list .file-item.focused');
    await expect(folder1).toContainText('[folder1]');
    
    // Press Ctrl+Left
    await window.keyboard.press('Control+ArrowLeft');
    
    // Verify Left panel is now at 'folder1'
    await expect(leftPath).toHaveText(/folder1$/);
    await expect(window.locator('#left-list .file-item', { hasText: 'subfile.txt' })).toBeVisible();
  });
});
