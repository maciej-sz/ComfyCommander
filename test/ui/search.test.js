const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Search by Typing', () => {
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

  test('should navigate to file by typing', async () => {
    const leftList = window.locator('#left-list');
    const searchBar = window.locator('#left-search');

    // Initial state: Search hidden
    await expect(searchBar).toBeHidden();

    // Type 'f'
    await window.keyboard.type('f');
    
    // Search visible
    await expect(searchBar).toBeVisible();
    await expect(searchBar).toHaveText('f');
    
    // Check focus on 'file1.txt' (first match for 'f' usually, assuming sorted: file1.txt, file2.txt, folder1)
    // Actually MemoryFS sort order: folders first? 
    // Let's check MemoryFileSystem or just check what is focused.
    // 'folder1' starts with 'f' too.
    // If folders first, 'folder1' might be first.
    // Let's check which one has class 'focused'.
    
    const focusedItem = leftList.locator('.file-item.focused');
    await expect(focusedItem).toBeVisible();
    
    // We expect it to match something starting with 'f'
    const text = await focusedItem.innerText();
    expect(text.toLowerCase().replace('[','').replace(']','')).toMatch(/^f/);

    // Type 'i' -> 'fi' -> matches 'file1.txt'
    await window.keyboard.type('i');
    await expect(searchBar).toHaveText('fi');
    await expect(focusedItem).toHaveText('file1.txt'); // Assuming file1 comes before file2

    // Type 'l' -> 'fil'
    await window.keyboard.type('l');
    await expect(searchBar).toHaveText('fil');
    await expect(focusedItem).toHaveText('file1.txt');

    // Backspace -> 'fi'
    await window.keyboard.press('Backspace');
    await expect(searchBar).toHaveText('fi');
    await expect(focusedItem).toHaveText('file1.txt');
    
    // Escape -> Close search
    await window.keyboard.press('Escape');
    await expect(searchBar).toBeHidden();
  });
});
