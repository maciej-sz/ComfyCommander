const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('App UI', () => {
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

  test('should display file list from MemoryFileSystem', async () => {
    // Wait for the list to be populated
    const leftList = window.locator('#left-list');
    await expect(leftList).toBeVisible();

    // Check for specific files we injected in main.js
    // initialFiles = {
    //     [homeDir/file1.txt]: 'file',
    //     [homeDir/folder1]: 'dir',
    //     ...
    // };
    
    // Note: renderer adds [ ] around directories
    await expect(leftList.locator('.file-item', { hasText: 'file1.txt' })).toBeVisible();
    await expect(leftList.locator('.file-item', { hasText: '[folder1]' })).toBeVisible();
  });

  test('should navigate into directory on double click', async () => {
    const leftList = window.locator('#left-list');
    const folderItem = leftList.locator('.file-item', { hasText: '[folder1]' });

    await folderItem.dblclick();

    // Expect to see subfile.txt
    await expect(leftList.locator('.file-item', { hasText: 'subfile.txt' })).toBeVisible();
    
    // Expect to see '..'
    await expect(leftList.locator('.file-item', { hasText: '[..]' })).toBeVisible();
  });
});
