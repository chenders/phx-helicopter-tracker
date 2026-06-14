import { test, expect } from '@playwright/test';

test.describe('Minimap Position Debug', () => {
  test('visual check of minimap position on test page', async ({ page }) => {
    // Navigate to test page
    await page.goto('http://localhost:3000/minimap-test');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Click absolute positioning
    await page.click('button:has-text("Absolute")');
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({
      path: '/home/phx/phx-helicopter-tracker/frontend/minimap-test-absolute.png',
      fullPage: true
    });

    // Get minimap position
    const minimap = page.locator('canvas').first();
    const box = await minimap.boundingBox();

    if (box) {
      console.log('Minimap position (Absolute):', {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height
      });

      // Log whether it's in bottom-right
      const viewportSize = page.viewportSize();
      if (viewportSize) {
        const isBottomRight = box.x > viewportSize.width / 2 && box.y > viewportSize.height / 2;
        console.log('Is in bottom-right quadrant:', isBottomRight);
      }
    }

    expect(minimap).toBeVisible();
  });

  test('visual check of minimap on actual flight page', async ({ page }) => {
    // Get a flight to test with
    const response = await page.request.get('http://localhost:8001/api/v1/flights?limit=1');
    const data = await response.json();

    if (data.flights && data.flights.length > 0) {
      const flightId = data.flights[0].id;
      console.log('Testing with flight ID:', flightId);

      // Navigate to flight detail
      await page.goto(`http://localhost:3000/flight/${flightId}`);

      // Wait for 3D view to load
      await page.waitForTimeout(5000);

      // Take screenshot
      await page.screenshot({
        path: '/home/phx/phx-helicopter-tracker/frontend/flight-minimap.png',
        fullPage: false
      });

      // Find all canvases
      const canvases = await page.locator('canvas').all();
      console.log('Found canvases:', canvases.length);

      // Check each canvas
      for (let i = 0; i < canvases.length; i++) {
        const box = await canvases[i].boundingBox();
        if (box) {
          console.log(`Canvas ${i}:`, {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height
          });

          // Check if it's likely the minimap (200x200)
          if (box.width > 150 && box.width < 250) {
            console.log('^ This is likely the minimap');

            const viewportSize = page.viewportSize();
            if (viewportSize) {
              console.log('Viewport size:', viewportSize);

              // Calculate position relative to viewport
              const fromRight = viewportSize.width - box.x - box.width;
              const fromBottom = viewportSize.height - box.y - box.height;

              console.log('Distance from bottom-right:', {
                fromRight: `${fromRight}px`,
                fromBottom: `${fromBottom}px`
              });

              // Should be around 16px from bottom and right (Tailwind's bottom-4 and right-4)
              const isBottomRight = fromRight < 50 && fromBottom < 50;
              console.log('Is positioned bottom-right:', isBottomRight);

              if (!isBottomRight) {
                console.error('❌ MINIMAP NOT IN BOTTOM-RIGHT!');
              } else {
                console.log('✅ Minimap correctly positioned');
              }
            }
          }
        }
      }
    }
  });
});
