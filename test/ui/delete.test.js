const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Delete Functionality', () => {
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

  test('should move file to trash with F8', async () => {
    const leftList = window.locator('#left-list');
    const fileItem = leftList.locator('.file-item', { hasText: 'file1.txt' });
    
    // Select file (click)
    await fileItem.click();
    await expect(fileItem).toHaveClass(/focused/);

    // Press F8
    await window.keyboard.press('F8');

    // Check Modal
    const modal = window.locator('#modal-overlay');
    await expect(modal).toBeVisible();
    await expect(window.locator('#modal-message')).toContainText('move to TRASH');

    // Confirm
    await window.locator('#modal-confirm').click();

    // Expect modal hidden
    await expect(modal).toBeHidden();

    // Expect file gone
    await expect(fileItem).toBeHidden();
  });

  test('should permanently delete file with Shift+Delete', async () => {
    const leftList = window.locator('#left-list');
    
    // Navigate to folder1
    const folderItem = leftList.locator('.file-item', { hasText: '[folder1]' });
    await folderItem.dblclick();
    
    // Wait for subfile
    const subfile = leftList.locator('.file-item', { hasText: 'subfile.txt' });
    await expect(subfile).toBeVisible();

    // Select
    await subfile.click();

    // Press Shift+Delete
    await window.keyboard.press('Shift+Delete');

    // Check Modal
    const modal = window.locator('#modal-overlay');
    await expect(modal).toBeVisible();
    await expect(window.locator('#modal-message')).toContainText('permanently DELETE');

    // Confirm
    await window.locator('#modal-confirm').click();

    // Expect file gone
    await expect(subfile).toBeHidden();
  });
});
