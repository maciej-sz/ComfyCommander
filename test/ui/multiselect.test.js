const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Multi-File Selection', () => {
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

  test('should toggle selection with Ctrl+Click', async () => {
    const leftList = window.locator('#left-list');
    
    // files: 'file1.txt', 'folder1', ... and '..' (in some order)
    // We need to find two distinct items.
    
    const item1 = leftList.locator('.file-item').nth(1); // Skipping 0 because it might be '..' or folder
    const item2 = leftList.locator('.file-item').nth(2); 

    // Ensure they are visible
    await expect(item1).toBeVisible();
    await expect(item2).toBeVisible();

    // Click item1 (Selects/Focuses it)
    await item1.click();
    
    // Check it's focused. Our code doesn't strictly add 'selected' on simple click based on latest logic (only focus),
    // BUT we decided simple click clears selection. 
    // Wait, renderer logic: if !ctrlKey -> clear selection.
    // So simple click -> Not selected class, just focused class?
    // Let's check focused class.
    await expect(item1).toHaveClass(/focused/);

    // Ctrl+Click item1 -> Toggle Selection (Add)
    await item1.click({ modifiers: ['Control'] });
    await expect(item1).toHaveClass(/selected/);
    
    // Ctrl+Click item2 -> Toggle Selection (Add)
    await item2.click({ modifiers: ['Control'] });
    await expect(item2).toHaveClass(/selected/);
    
    // Ensure item1 is STILL selected
    await expect(item1).toHaveClass(/selected/);
  });

  test('should copy multiple selected files', async () => {
    const leftList = window.locator('#left-list');
    const rightList = window.locator('#right-list');
    
    // 1. Focus Right Panel and Navigate to 'folder1'
    // Click on right panel to activate it
    await window.locator('#right-panel').click();
    
    // Find 'folder1' in right list and double click
    const folder1 = rightList.locator('.file-item', { hasText: '[folder1]' });
    await folder1.dblclick();
    
    // Verify right path changed (optional but good)
    // await expect(window.locator('#right-path')).toContainText('folder1');

    // 2. Focus Left Panel and Select Files
    await window.locator('#left-panel').click();
    
    // Select 'file1.txt'
    const file1 = leftList.locator('.file-item', { hasText: 'file1.txt' });
    await file1.click({ modifiers: ['Control'] }); // Toggle Select
    // Check if it was already selected from previous test? 
    // To be safe, let's ensure it IS selected. 
    // If it wasn't, it is now. If it was, it is now deselected.
    // Better: Reset selection first by simple click on something else or '..'
    const dotdot = leftList.locator('.file-item').first(); 
    await dotdot.click(); // Clears selection, sets focus
    
    // Now select file1
    await file1.click({ modifiers: ['Control'] });
    await expect(file1).toHaveClass(/selected/);

    // Also select folder1
    const folder1Item = leftList.locator('.file-item', { hasText: '[folder1]' });
    await folder1Item.click({ modifiers: ['Control'] });
    await expect(folder1Item).toHaveClass(/selected/);

    // 3. Trigger Copy
    await window.keyboard.press('F5');
    
    // 4. Verify items appear in Right List
    // Wait a bit for async op and refresh
    await expect(rightList.locator('.file-item', { hasText: 'file1.txt' })).toBeVisible();
    await expect(rightList.locator('.file-item', { hasText: '[folder1]' })).toBeVisible();
  });
});
