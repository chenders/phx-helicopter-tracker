import { test, expect } from '@playwright/test';

test.describe('Phoenix Minimap Positioning', () => {
  test('minimap should be positioned in bottom-right of test container with absolute positioning', async ({ page }) => {
    // Navigate to test page
    await page.goto('http://localhost:3000/minimap-test');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Select absolute positioning
    await page.click('button:has-text("Absolute")');

    // Wait a moment for the component to re-render and position to calculate
    await page.waitForTimeout(500);

    // Get the minimap canvas element
    const minimap = page.locator('canvas').first();
    await expect(minimap).toBeVisible();

    // Get the bounding box of the minimap
    const minimapBox = await minimap.boundingBox();
    expect(minimapBox).not.toBeNull();

    if (minimapBox) {
      console.log('Minimap position with ABSOLUTE:', {
        x: minimapBox.x,
        y: minimapBox.y,
        width: minimapBox.width,
        height: minimapBox.height
      });

      // The minimap should be near the bottom-right (calculated position or default with 16px margin)
      // Allow some tolerance for browser rendering differences
      expect(minimapBox.x).toBeGreaterThan(500); // Should be on right side
      expect(minimapBox.y).toBeGreaterThan(400); // Should be on bottom half
    }
  });

  test('minimap should be positioned in bottom-right of viewport with fixed positioning', async ({ page }) => {
    // Navigate to test page
    await page.goto('http://localhost:3000/minimap-test');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Select fixed positioning (should be default)
    await page.click('button:has-text("Fixed")');

    // Wait a moment for the component to re-render and position to calculate
    await page.waitForTimeout(500);

    // Get the minimap canvas element
    const minimap = page.locator('canvas').first();
    await expect(minimap).toBeVisible();

    // Get the bounding box of the minimap
    const minimapBox = await minimap.boundingBox();
    expect(minimapBox).not.toBeNull();

    if (minimapBox) {
      console.log('Minimap position with FIXED:', {
        x: minimapBox.x,
        y: minimapBox.y,
        width: minimapBox.width,
        height: minimapBox.height
      });

      // With fixed positioning, it should be at viewport coordinates (bottom-right with fallback or calculated)
      // Should be on the right side and bottom of viewport
      expect(minimapBox.x).toBeGreaterThan(400); // Should be on right side
      expect(minimapBox.y).toBeGreaterThan(300); // Should be on bottom half
    }

    // Scroll down and verify fixed position stays the same
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(200);

    const minimapBoxAfterScroll = await minimap.boundingBox();
    if (minimapBox && minimapBoxAfterScroll) {
      // Fixed position should stay in same viewport location
      expect(Math.abs(minimapBoxAfterScroll.y - minimapBox.y)).toBeLessThan(5);
    }
  });

  test('minimap on actual flight detail page', async ({ page }) => {
    // First, get a list of flights to find one with positions
    const response = await page.request.get('http://localhost:8001/api/v1/flights?limit=10');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log('Fetched flights:', data.flights?.length || 0);

    if (data.flights && data.flights.length > 0) {
      const flightId = data.flights[0].id;
      console.log('Testing with flight ID:', flightId);

      // Navigate to flight detail page
      await page.goto(`http://localhost:3000/flight/${flightId}`);

      // Wait for the 3D view to load
      await page.waitForTimeout(3000);

      // Look for the minimap canvas
      const minimaps = page.locator('canvas').filter({ hasText: /Phoenix Metro/i }).or(
        page.locator('div:has-text("Phoenix Metro")').locator('canvas')
      );

      // Try to find any canvas that looks like our minimap (200x200px)
      const allCanvases = await page.locator('canvas').all();
      console.log('Found canvases:', allCanvases.length);

      for (let i = 0; i < allCanvases.length; i++) {
        const canvas = allCanvases[i];
        const box = await canvas.boundingBox();
        if (box) {
          console.log(`Canvas ${i} position:`, {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height
          });

          // If this is likely the minimap (200x200 or close)
          if (box.width > 150 && box.width < 250 && box.height > 150 && box.height < 250) {
            console.log(`Canvas ${i} is likely the minimap`);

            // Check if it's in the top-left area (allowing for some margin)
            const isTopLeft = box.y < 100 && box.x < 100;
            const isBottomLeft = box.y > 500 && box.x < 100;
            const isBottomRight = box.y > 500 && box.x > 500;

            console.log('Minimap position analysis:', {
              isTopLeft,
              isBottomLeft,
              isBottomRight,
              actualPosition: `x=${box.x}, y=${box.y}`
            });

            if (!isTopLeft) {
              console.error('❌ MINIMAP IS NOT IN TOP-LEFT! Current position:', {
                x: box.x,
                y: box.y
              });
            } else {
              console.log('✅ Minimap is correctly positioned in top-left');
            }
          }
        }
      }
    } else {
      console.log('No flights found to test with');
    }
  });

  test('check minimap z-index layering', async ({ page }) => {
    await page.goto('http://localhost:3000/minimap-test');
    await page.waitForLoadState('networkidle');

    // Set z-index to 9999
    await page.locator('input[type="range"]').fill('9999');
    await page.waitForTimeout(500);

    // Get the minimap element
    const minimap = page.locator('canvas').first();
    await expect(minimap).toBeVisible();

    // Check computed z-index
    const zIndex = await minimap.evaluate((el) => {
      return window.getComputedStyle(el.parentElement!).zIndex;
    });

    console.log('Minimap parent z-index:', zIndex);
    expect(parseInt(zIndex)).toBeGreaterThan(1000);
  });
});
