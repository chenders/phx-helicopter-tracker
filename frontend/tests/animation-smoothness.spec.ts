import { test, expect } from '@playwright/test';

test.describe('3D Animation Smoothness', () => {
  const testFlightId = '103';

  test.beforeEach(async ({ page }) => {
    // Navigate to flight detail page
    await page.goto(`http://localhost:3000/flight/${testFlightId}`);

    // Wait for Cesium to load
    await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 15000 });

    // Wait for initial tiles
    await page.waitForTimeout(3000);
  });

  test('should have appropriate playback speed options', async ({ page }) => {
    // Check that speed selector exists
    const speedSelector = page.locator('select').filter({ hasText: 'Very Slow' });
    await expect(speedSelector).toBeVisible();

    // Verify all speed options are present
    const options = await page.locator('select option').allTextContents();
    expect(options).toContain('0.1x (Very Slow - Best for Tiles)');
    expect(options).toContain('0.25x (Slow)');
    expect(options).toContain('0.5x (Medium)');
    expect(options).toContain('1x (Normal)');
  });

  test('animation should progress smoothly at slow speed', async ({ page }) => {
    // Set to slowest speed
    await page.selectOption('select', '0.1');

    // Collect console logs
    const frameTimes: number[] = [];
    let lastFrameTime = Date.now();

    page.on('console', msg => {
      if (msg.text().includes('FRAME')) {
        const currentTime = Date.now();
        const deltaTime = currentTime - lastFrameTime;
        frameTimes.push(deltaTime);
        lastFrameTime = currentTime;
      }
    });

    // Start animation
    const startButton = page.locator('button:has-text("Start Flight Animation")');
    await startButton.click();

    // Wait for animation to run
    await page.waitForTimeout(10000); // 10 seconds

    // Check that frames are spaced appropriately
    // At 0.1x speed with 10 FPS, expect ~100ms between frames minimum
    const averageFrameTime = frameTimes.slice(1).reduce((a, b) => a + b, 0) / (frameTimes.length - 1);

    console.log(`Average frame time: ${averageFrameTime}ms`);
    console.log(`Frame count: ${frameTimes.length}`);

    // Should have smooth frame timing
    expect(averageFrameTime).toBeGreaterThan(80); // At least 80ms between frames
    expect(averageFrameTime).toBeLessThan(200); // But not too slow

    // Should have generated multiple frames
    expect(frameTimes.length).toBeGreaterThan(10);
  });

  test('tiles should load properly during slow playback', async ({ page }) => {
    // Set to recommended tile-loading speed
    await page.selectOption('select', '0.1');

    // Monitor for tile loading
    const tileLoadEvents: string[] = [];

    page.on('console', msg => {
      if (msg.text().includes('Google 3D Tiles') || msg.text().includes('tile')) {
        tileLoadEvents.push(msg.text());
      }
    });

    // Start animation
    const startButton = page.locator('button:has-text("Start Flight Animation")');
    await startButton.click();

    // Wait for some animation
    await page.waitForTimeout(5000);

    // Check if we're pausing for tile loading (at slow speeds)
    const pauseEvents = tileLoadEvents.filter(e => e.includes('Pausing for tile loading'));
    console.log(`Tile loading pauses: ${pauseEvents.length}`);

    // Check that tiles remain visible
    const globeStatus = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return null;
      return {
        globeVisible: viewer.scene.globe.show,
        tilesetExists: !!viewer.googleTileset,
        primitiveCount: viewer.scene.primitives.length
      };
    });

    expect(globeStatus?.globeVisible).toBe(false); // Globe should be hidden
    expect(globeStatus?.tilesetExists).toBe(true); // Tileset should exist
    expect(globeStatus?.primitiveCount).toBeGreaterThan(0); // Should have primitives
  });

  test('animation state should persist throughout playback', async ({ page }) => {
    // Set to medium speed for testing
    await page.selectOption('select', '0.5');

    // Start animation
    const startButton = page.locator('button:has-text("Start Flight Animation")');
    await startButton.click();

    // Wait a bit
    await page.waitForTimeout(3000);

    // Check animation state
    const animationState = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      return viewer?.animationState || null;
    });

    expect(animationState).not.toBeNull();
    expect(animationState.frameCount).toBeGreaterThan(1);
    expect(animationState.currentIndex).toBeGreaterThanOrEqual(0);

    // Wait more
    await page.waitForTimeout(3000);

    // Check state again - should have progressed
    const newAnimationState = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      return viewer?.animationState || null;
    });

    expect(newAnimationState.frameCount).toBeGreaterThan(animationState.frameCount);
    expect(newAnimationState.currentIndex).toBeGreaterThanOrEqual(animationState.currentIndex);
  });

  test('should complete animation without errors', async ({ page }) => {
    // Set to fast speed to complete quickly
    await page.selectOption('select', '2');

    // Collect any errors
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    // Start animation
    const startButton = page.locator('button:has-text("Start Flight Animation")');
    await startButton.click();

    // Wait for animation to progress significantly or complete
    await page.waitForTimeout(15000);

    // Check for errors
    expect(errors).toHaveLength(0);

    // Verify animation is still running or completed
    const isAnimating = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      const state = viewer?.animationState;
      return state && (state.frameCount > 0);
    });

    expect(isAnimating).toBeTruthy();
  });

  test('frame timing should scale with playback speed', async ({ page }) => {
    const testSpeeds = [0.1, 0.5, 1, 2];
    const timingResults: Record<number, number> = {};

    for (const speed of testSpeeds) {
      // Reload page for fresh test
      await page.reload();
      await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 15000 });
      await page.waitForTimeout(2000);

      // Set speed
      await page.selectOption('select', speed.toString());

      // Measure frame timing
      const frameTimes: number[] = [];
      let lastTime = Date.now();

      page.on('console', msg => {
        if (msg.text().includes('FRAME')) {
          const now = Date.now();
          frameTimes.push(now - lastTime);
          lastTime = now;
        }
      });

      // Start animation
      const startButton = page.locator('button:has-text("Start Flight Animation")');
      await startButton.click();

      // Collect frames for 3 seconds
      await page.waitForTimeout(3000);

      // Calculate average (skip first frame)
      if (frameTimes.length > 1) {
        const avg = frameTimes.slice(1).reduce((a, b) => a + b, 0) / (frameTimes.length - 1);
        timingResults[speed] = avg;
        console.log(`Speed ${speed}x: Average frame time ${avg.toFixed(2)}ms`);
      }
    }

    // Verify that slower speeds have more time between frames
    if (timingResults[0.1] && timingResults[2]) {
      expect(timingResults[0.1]).toBeGreaterThan(timingResults[2]);
    }
  });
});