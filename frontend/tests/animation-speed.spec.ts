import { test, expect } from '@playwright/test';

test.describe('Animation Speed Control', () => {
  test('animation runs at appropriate slow speed for tile loading', async ({ page }) => {
    // Navigate to flight with many positions
    await page.goto('http://localhost:3000/flight/103');

    // Wait for Cesium to load
    await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 20000 });

    // Wait for tiles to start loading
    await page.waitForTimeout(5000);

    // Set to slowest speed for tile loading
    const speedSelector = page.locator('select').first();
    await speedSelector.selectOption('0.1');

    // Monitor console for animation frames
    const frameTimestamps: number[] = [];

    page.on('console', msg => {
      if (msg.text().includes('FRAME')) {
        frameTimestamps.push(Date.now());
        console.log(msg.text());
      }
    });

    // Start animation
    const startButton = page.locator('button:has-text("Start Flight Animation")');
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click();

    // Let animation run for 10 seconds
    await page.waitForTimeout(10000);

    // Calculate frame intervals
    const intervals: number[] = [];
    for (let i = 1; i < frameTimestamps.length; i++) {
      intervals.push(frameTimestamps[i] - frameTimestamps[i - 1]);
    }

    if (intervals.length > 0) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      console.log(`\nAnimation Stats:`);
      console.log(`  Frames captured: ${frameTimestamps.length}`);
      console.log(`  Average interval: ${avgInterval.toFixed(2)}ms`);
      console.log(`  Min interval: ${Math.min(...intervals)}ms`);
      console.log(`  Max interval: ${Math.max(...intervals)}ms`);

      // At 0.1x speed with 2 FPS base, expect ~5000ms between position changes
      // But with 60+ interpolation steps, expect smooth frame updates
      // Should be at least 100ms between frames for tile loading
      expect(avgInterval).toBeGreaterThan(100);

      // Should have generated multiple frames
      expect(frameTimestamps.length).toBeGreaterThan(5);
    }

    // Check that tiles are visible
    const viewerState = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return null;

      return {
        hasViewer: true,
        globeHidden: !viewer.scene.globe.show,
        hasTileset: !!viewer.googleTileset,
        animationState: viewer.animationState
      };
    });

    expect(viewerState).not.toBeNull();
    expect(viewerState?.hasViewer).toBe(true);
    expect(viewerState?.globeHidden).toBe(true); // Globe should be hidden
    expect(viewerState?.hasTileset).toBe(true); // Should have Google tileset

    // Check animation state
    if (viewerState?.animationState) {
      console.log(`\nAnimation State:`);
      console.log(`  Current index: ${viewerState.animationState.currentIndex}`);
      console.log(`  Frame count: ${viewerState.animationState.frameCount}`);

      expect(viewerState.animationState.frameCount).toBeGreaterThan(0);
    }
  });

  test('speed selector changes animation pace', async ({ page }) => {
    await page.goto('http://localhost:3000/flight/103');
    await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 20000 });
    await page.waitForTimeout(3000);

    // Test different speeds
    const speeds = ['0.1', '1', '2'];
    const results: Record<string, number> = {};

    for (const speed of speeds) {
      // Select speed
      await page.selectOption('select', speed);

      // Count frames in 5 seconds
      let frameCount = 0;
      page.on('console', msg => {
        if (msg.text().includes('FRAME')) {
          frameCount++;
        }
      });

      // Start animation
      const startButton = page.locator('button:has-text("Start Flight Animation")');
      await startButton.click();

      // Run for 5 seconds
      await page.waitForTimeout(5000);

      results[speed] = frameCount;
      console.log(`Speed ${speed}x: ${frameCount} frames in 5 seconds`);

      // Stop animation
      const stopButton = page.locator('button:has-text("Stop Animation")');
      if (await stopButton.isVisible()) {
        await stopButton.click();
      }

      // Reset for next test
      await page.reload();
      await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 20000 });
      await page.waitForTimeout(2000);
    }

    // Faster speeds should have more frames
    expect(results['2']).toBeGreaterThan(results['0.1']);
  });
});