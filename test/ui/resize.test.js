const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Panel Resizing', () => {
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

  test('should resize panels when dragging separator', async () => {
    const leftPanel = window.locator('#left-panel');
    const separator = window.locator('#separator');

    const initialBox = await leftPanel.boundingBox();
    const separatorBox = await separator.boundingBox();

    if (!initialBox || !separatorBox) {
        throw new Error('Could not find bounding box for panel or separator');
    }

    // Drag separator to the right by 100px
    // We need to be careful with coordinates. Playwright mouse move is absolute.
    const startX = separatorBox.x + separatorBox.width / 2;
    const startY = separatorBox.y + separatorBox.height / 2;
    const endX = startX + 100;

    await window.mouse.move(startX, startY);
    await window.mouse.down();
    await window.mouse.move(endX, startY);
    await window.mouse.up();

    const newBox = await leftPanel.boundingBox();
    
    // Check that width increased
    expect(newBox.width).toBeGreaterThan(initialBox.width);
    // Expect it to be approximately +100px larger
    // Note: CSS width calculations might have sub-pixel differences or box-sizing effects
    const diff = newBox.width - initialBox.width;
    expect(Math.abs(diff - 100)).toBeLessThan(10);
  });
});
