const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Modal Enter with Cancel Focused', () => {
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

  test('should interrupt operation when Cancel is focused and Enter is pressed', async () => {
    const leftList = window.locator('#left-list');
    const fileItem = leftList.locator('.file-item', { hasText: 'file1.txt' });
    
    // Select file (click)
    await fileItem.click();
    
    // Press F8 to open modal
    await window.keyboard.press('F8');

    // Check Modal
    const modal = window.locator('#modal-overlay');
    await expect(modal).toBeVisible();

    const okBtn = window.locator('#modal-confirm');
    const cancelBtn = window.locator('#modal-cancel');

    // Initially OK button should be focused
    await expect(okBtn).toBeFocused();

    // Press Tab to focus Cancel button
    await window.keyboard.press('Tab');

    // Cancel button should be focused
    await expect(cancelBtn).toBeFocused();

    // Press Enter
    await window.keyboard.press('Enter');

    // Modal should be hidden (operation interrupted)
    await expect(modal).toBeHidden();
  });
});