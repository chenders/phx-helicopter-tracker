import { test, expect } from '@playwright/test';

test('minimap position on flight detail page', async ({ page }) => {
  // Navigate directly to flight 471
  await page.goto('http://localhost:3000/flight/471');

  // Wait for the page to load
  await page.waitForTimeout(2000);

  // Wait for at least one canvas to appear (Cesium viewer)
  await page.waitForSelector('canvas', { timeout: 30000 });

  // Wait a bit more for the minimap to render
  await page.waitForTimeout(3000);

  // Find all canvases
  const canvases = await page.locator('canvas').all();
  console.log('Found', canvases.length, 'canvases');

  let minimapFound = false;

  for (let i = 0; i < canvases.length; i++) {
    const box = await canvases[i].boundingBox();
    if (box) {
      console.log(`Canvas ${i}:`, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height
      });

      // Check if this is likely the minimap (200x200px)
      if (box.width > 150 && box.width < 250 && box.height > 150 && box.height < 250) {
        console.log(`✓ Canvas ${i} is the minimap (200x200)`);
        minimapFound = true;

        const viewportSize = page.viewportSize();
        if (viewportSize) {
          console.log('Viewport:', viewportSize);

          // Calculate distance from edges
          const fromRight = viewportSize.width - box.x - box.width;
          const fromBottom = viewportSize.height - box.y - box.height;

          console.log('Minimap positioning:', {
            fromRight: `${fromRight}px`,
            fromBottom: `${fromBottom}px`,
            expectedMargin: '16px (bottom-4 right-4 in Tailwind)'
          });

          // Check if it's within the bottom-right area
          // Tailwind's bottom-4 and right-4 = 16px margin
          const isBottomRight = fromRight >= 0 && fromRight < 100 && fromBottom >= 0 && fromBottom < 100;

          if (isBottomRight) {
            console.log('✅ MINIMAP IS CORRECTLY POSITIONED IN BOTTOM-RIGHT');
          } else {
            console.error('❌ MINIMAP IS NOT IN BOTTOM-RIGHT!');
            console.error('Expected: ~16px from right and bottom');
            console.error('Actual:', { fromRight, fromBottom });
          }

          // Assert it's positioned correctly
          expect(fromRight).toBeGreaterThanOrEqual(0);
          expect(fromRight).toBeLessThan(100);
          expect(fromBottom).toBeGreaterThanOrEqual(0);
          expect(fromBottom).toBeLessThan(100);
        }
      }
    }
  }

  if (!minimapFound) {
    console.error('❌ NO MINIMAP FOUND (expected 200x200 canvas)');
  }

  expect(minimapFound).toBe(true);

  // Take screenshot
  await page.screenshot({
    path: '/home/phx/phx-helicopter-tracker/frontend/minimap-position-check.png',
    fullPage: false
  });
  console.log('Screenshot saved to: minimap-position-check.png');
});
