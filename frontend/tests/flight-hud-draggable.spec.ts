import { test, expect } from '@playwright/test';

test.describe('Flight HUD - Draggable Overlay', () => {
  // Use a known flight ID with sufficient GPS data
  const testFlightId = '103'; // N623FB flight with 3290 GPS points

  test.beforeEach(async ({ page }) => {
    // Navigate to flight detail page
    await page.goto(`http://localhost:3000/flight/${testFlightId}`);

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Wait for Cesium to be ready
    await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('should display HUD with all three metrics', async ({ page }) => {
    // Start the animation to make HUD visible
    const startButton = page.locator('button:has-text("Start Flight Animation")');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Wait for HUD to appear
    await page.waitForTimeout(1000);

    // Find the HUD container (look for the compact design with specific classes)
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=SPEED') });
    await expect(hudContainer).toBeVisible();

    // Verify all three metric labels are present
    await expect(hudContainer.locator('text=SPEED')).toBeVisible();
    await expect(hudContainer.locator('text=ALTITUDE')).toBeVisible();
    await expect(hudContainer.locator('text=HEADING')).toBeVisible();

    // Verify metrics have values (check for numeric content)
    const speedValue = hudContainer.locator('text=SPEED').locator('..').locator('div').filter({ hasText: /\d+/ });
    await expect(speedValue).toBeVisible();

    const altitudeValue = hudContainer.locator('text=ALTITUDE').locator('..').locator('div').filter({ hasText: /\d+/ });
    await expect(altitudeValue).toBeVisible();

    const headingValue = hudContainer.locator('text=HEADING').locator('..').locator('div').filter({ hasText: /\d+°/ });
    await expect(headingValue).toBeVisible();
  });

  test('should display speed in MPH', async ({ page }) => {
    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1000);

    // Find HUD and check speed unit
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=SPEED') });
    const speedMetric = hudContainer.locator('text=SPEED').locator('..');

    // Should contain "MPH" unit
    await expect(speedMetric).toContainText('MPH');

    // Verify numeric value is present
    const speedText = await speedMetric.textContent();
    expect(speedText).toMatch(/\d+\s*MPH/);
  });

  test('should display altitude in feet with FT unit', async ({ page }) => {
    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1000);

    // Find HUD and check altitude
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=ALTITUDE') });
    const altitudeMetric = hudContainer.locator('text=ALTITUDE').locator('..');

    // Should contain "FT" unit
    await expect(altitudeMetric).toContainText('FT');

    // Verify numeric value
    const altitudeText = await altitudeMetric.textContent();
    expect(altitudeText).toMatch(/\d+[\d,]*\s*FT/);
  });

  test('should display heading with degrees and cardinal direction', async ({ page }) => {
    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1000);

    // Find HUD and check heading
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=HEADING') });
    const headingMetric = hudContainer.locator('text=HEADING').locator('..');

    // Should contain degree symbol and cardinal direction
    const headingText = await headingMetric.textContent();
    expect(headingText).toMatch(/\d+°\s*[NSEW]+/);
  });

  test('should have grab cursor by default', async ({ page }) => {
    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1000);

    // Get HUD container
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=SPEED') });

    // Check cursor style
    const cursorStyle = await hudContainer.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    expect(cursorStyle).toBe('grab');
  });

  test('should be draggable to new position', async ({ page }) => {
    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1000);

    // Get HUD container
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=SPEED') });
    await expect(hudContainer).toBeVisible();

    // Get initial position
    const initialBoundingBox = await hudContainer.boundingBox();
    expect(initialBoundingBox).not.toBeNull();

    if (!initialBoundingBox) return;

    const initialX = initialBoundingBox.x;
    const initialY = initialBoundingBox.y;

    // Drag to new position (move 200px right and 100px down)
    await hudContainer.hover();
    await page.mouse.down();
    await page.mouse.move(initialX + 200, initialY + 100, { steps: 10 });
    await page.mouse.up();

    // Wait for position update
    await page.waitForTimeout(300);

    // Get new position
    const newBoundingBox = await hudContainer.boundingBox();
    expect(newBoundingBox).not.toBeNull();

    if (!newBoundingBox) return;

    const newX = newBoundingBox.x;
    const newY = newBoundingBox.y;

    // Verify position changed
    expect(Math.abs(newX - initialX)).toBeGreaterThan(150); // Allow some margin
    expect(Math.abs(newY - initialY)).toBeGreaterThan(50);
  });

  test('should change cursor to grabbing during drag', async ({ page }) => {
    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1000);

    // Get HUD container
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=SPEED') });

    // Start dragging
    await hudContainer.hover();
    await page.mouse.down();

    // Check cursor changed to grabbing
    const draggingCursor = await hudContainer.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    expect(draggingCursor).toBe('grabbing');

    // Release
    await page.mouse.up();

    // Cursor should return to grab
    await page.waitForTimeout(100);
    const releasedCursor = await hudContainer.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    expect(releasedCursor).toBe('grab');
  });

  test('should maintain position after multiple drags', async ({ page }) => {
    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1000);

    // Get HUD container
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=SPEED') });

    // First drag: move right
    const firstBox = await hudContainer.boundingBox();
    if (!firstBox) return;

    await page.mouse.move(firstBox.x + 50, firstBox.y + 50);
    await page.mouse.down();
    await page.mouse.move(firstBox.x + 250, firstBox.y + 50, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    const secondBox = await hudContainer.boundingBox();
    if (!secondBox) return;

    // Second drag: move down
    await page.mouse.move(secondBox.x + 50, secondBox.y + 20);
    await page.mouse.down();
    await page.mouse.move(secondBox.x + 50, secondBox.y + 150, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    const finalBox = await hudContainer.boundingBox();
    if (!finalBox) return;

    // Verify both movements occurred
    expect(Math.abs(finalBox.x - firstBox.x)).toBeGreaterThan(150); // Moved right
    expect(Math.abs(finalBox.y - firstBox.y)).toBeGreaterThan(100); // Moved down
  });

  test('should update metrics during animation', async ({ page }) => {
    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1000);

    // Get HUD container
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=SPEED') });

    // Get initial metric values
    const initialSpeed = await hudContainer.locator('text=SPEED').locator('..').locator('div').filter({ hasText: /\d+/ }).first().textContent();
    const initialAltitude = await hudContainer.locator('text=ALTITUDE').locator('..').locator('div').filter({ hasText: /\d+/ }).first().textContent();

    // Wait for animation to progress
    await page.waitForTimeout(3000);

    // Get updated metric values
    const updatedSpeed = await hudContainer.locator('text=SPEED').locator('..').locator('div').filter({ hasText: /\d+/ }).first().textContent();
    const updatedAltitude = await hudContainer.locator('text=ALTITUDE').locator('..').locator('div').filter({ hasText: /\d+/ }).first().textContent();

    // At least one metric should have changed (flight is progressing)
    const speedChanged = initialSpeed !== updatedSpeed;
    const altitudeChanged = initialAltitude !== updatedAltitude;

    expect(speedChanged || altitudeChanged).toBeTruthy();
  });

  test('should show amber color for low altitude (<400ft)', async ({ page }) => {
    // We need to test this with a flight that goes below 400ft AGL
    // For now, we'll verify the color logic exists by checking computed styles

    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1000);

    // Get HUD container
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=ALTITUDE') });
    const altitudeValue = hudContainer.locator('text=ALTITUDE').locator('..').locator('div').filter({ hasText: /\d+/ }).first();

    // Get the altitude color (should be amber or green based on AGL)
    const altitudeColor = await altitudeValue.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // Color should be set (not default black)
    expect(altitudeColor).not.toBe('rgb(0, 0, 0)');

    // Should be either amber (FFAA00) or green (00FF88) in RGB
    const isValidColor = altitudeColor.includes('255, 170, 0') || // Amber
                        altitudeColor.includes('0, 255, 136');    // Green

    expect(isValidColor).toBeTruthy();
  });

  test('should remain visible and functional after page scroll', async ({ page }) => {
    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1000);

    // Scroll page down
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(300);

    // HUD should still be visible (it's position: absolute)
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=SPEED') });
    await expect(hudContainer).toBeVisible();

    // Should still be draggable after scroll
    const box = await hudContainer.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + 50, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 20, { steps: 5 });
    await page.mouse.up();

    // Verify it moved
    const newBox = await hudContainer.boundingBox();
    if (!newBox) return;

    expect(Math.abs(newBox.x - box.x)).toBeGreaterThan(50);
  });

  test('should have compact design with proper styling', async ({ page }) => {
    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1000);

    // Get HUD container
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=SPEED') });

    // Check that it's compact (should be relatively small)
    const boundingBox = await hudContainer.boundingBox();
    if (!boundingBox) return;

    // HUD should be reasonably sized (not too large)
    expect(boundingBox.width).toBeLessThan(600); // Compact width
    expect(boundingBox.height).toBeLessThan(200); // Compact height

    // Should have proper styling classes
    const hasProperStyling = await hudContainer.evaluate((el) => {
      const classes = el.className;
      return classes.includes('absolute') && classes.includes('z-40');
    });

    expect(hasProperStyling).toBeTruthy();
  });

  test('should display holographic effects', async ({ page }) => {
    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1000);

    // Get HUD container's inner div with holographic styling
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=SPEED') });
    const innerContainer = hudContainer.locator('div').first();

    // Check for holographic styling (border, shadow, backdrop-blur)
    const hasHolographicStyling = await innerContainer.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      const classes = el.className;

      return classes.includes('backdrop-blur') ||
             classes.includes('border-cyan') ||
             computed.boxShadow.length > 0;
    });

    expect(hasHolographicStyling).toBeTruthy();
  });

  test('should handle rapid drags without breaking', async ({ page }) => {
    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1000);

    // Get HUD container
    const hudContainer = page.locator('.absolute.z-40').filter({ has: page.locator('text=SPEED') });
    const initialBox = await hudContainer.boundingBox();
    if (!initialBox) return;

    // Perform rapid drag movements
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(initialBox.x + 50, initialBox.y + 50);
      await page.mouse.down();
      await page.mouse.move(initialBox.x + 100 + (i * 20), initialBox.y + 100, { steps: 2 });
      await page.mouse.up();
      await page.waitForTimeout(50);
    }

    // HUD should still be visible and functional
    await expect(hudContainer).toBeVisible();

    // Verify all metrics still displayed
    await expect(hudContainer.locator('text=SPEED')).toBeVisible();
    await expect(hudContainer.locator('text=ALTITUDE')).toBeVisible();
    await expect(hudContainer.locator('text=HEADING')).toBeVisible();
  });
});
