const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Mkdir Functionality', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        USE_MEMORY_FS: 'true', // Reset fs for each test implicitly if we restarted, but we reuse app in beforeAll usually. 
        // If we reuse app, state persists. 
        // MemoryFS is re-instantiated on app launch. 
        // So for isolation, we should probably relaunch or clean up.
        // The delete test launches once in beforeAll.
        // Let's do the same for speed, but ensure unique names.
      },
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should create directory with F7', async () => {
    // Press F7
    await window.keyboard.press('F7');

    // Check Modal
    const modal = window.locator('#modal-overlay');
    await expect(modal).toBeVisible();
    await expect(window.locator('#modal-message')).toContainText('Create new directory');
    const input = window.locator('#modal-input');
    await expect(input).toBeVisible();

    // Type name
    await input.fill('new-folder-f7');
    await window.keyboard.press('Enter');

    // Expect modal hidden
    await expect(modal).toBeHidden();

    // Expect new folder in list
    const leftList = window.locator('#left-list');
    const newFolder = leftList.locator('.file-item', { hasText: '[new-folder-f7]' });
    await expect(newFolder).toBeVisible();
    await expect(newFolder).toHaveClass(/is-directory/);
  });

  test('should create directory with Button', async () => {
    // Click Button
    await window.locator('#mkdir-btn').click();

    // Check Modal
    const modal = window.locator('#modal-overlay');
    await expect(modal).toBeVisible();
    
    // Type name
    const input = window.locator('#modal-input');
    await input.fill('new-folder-btn');
    
    // Click OK
    await window.locator('#modal-confirm').click();

    // Expect new folder in list
    const leftList = window.locator('#left-list');
    const newFolder = leftList.locator('.file-item', { hasText: '[new-folder-btn]' });
    await expect(newFolder).toBeVisible();
  });

  test('should cancel directory creation', async () => {
    await window.keyboard.press('F7');
    
    const modal = window.locator('#modal-overlay');
    await expect(modal).toBeVisible();
    
    await window.locator('#modal-input').fill('cancelled-folder');
    await window.locator('#modal-cancel').click();
    
    await expect(modal).toBeHidden();
    
    const leftList = window.locator('#left-list');
    const folder = leftList.locator('.file-item', { hasText: 'cancelled-folder' });
    await expect(folder).toBeHidden();
  });
});
