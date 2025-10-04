import { test, expect } from '@playwright/test';

test('verify animation progresses through multiple positions', async ({ page }) => {
  // Navigate to flight page
  await page.goto('http://localhost:3000/flight/103');

  // Wait for Cesium
  await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 20000 });
  await page.waitForTimeout(3000);

  // Start animation
  const startButton = page.locator('button:has-text("Start Flight Animation")');
  await expect(startButton).toBeVisible({ timeout: 10000 });
  await startButton.click();

  // Track progress over 20 seconds
  const progressData: any[] = [];
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1000);

    const state = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return null;

      const pos = viewer.animationState?.currentIndex || 0;
      const positions = viewer.positions || [];
      const currentPos = positions[pos];

      return {
        second: 0,  // Will be filled in
        frameCount: viewer.animationState?.frameCount || 0,
        currentIndex: pos,
        progress: viewer.animationState?.interpolationProgress || 0,
        totalPositions: positions.length,
        percentComplete: positions.length > 0 ? (pos / positions.length * 100).toFixed(2) : 0,
        lat: currentPos?.latitude?.toFixed(4),
        lon: currentPos?.longitude?.toFixed(4)
      };
    });

    if (state) {
      state.second = i + 1;
      progressData.push(state);
      console.log(`[${state.second}s] Position ${state.currentIndex}/${state.totalPositions} (${state.percentComplete}%) - Lat: ${state.lat}, Lon: ${state.lon}`);
    }
  }

  // Calculate statistics
  const firstState = progressData[0];
  const lastState = progressData[progressData.length - 1];

  const positionsAdvanced = lastState.currentIndex - firstState.currentIndex;
  const framesProcessed = lastState.frameCount - firstState.frameCount;
  const timeElapsed = progressData.length;

  console.log('\n=== Animation Statistics ===');
  console.log(`Time elapsed: ${timeElapsed} seconds`);
  console.log(`Positions advanced: ${positionsAdvanced}`);
  console.log(`Frames processed: ${framesProcessed}`);
  console.log(`Average FPS: ${(framesProcessed / timeElapsed).toFixed(1)}`);
  console.log(`Positions per second: ${(positionsAdvanced / timeElapsed).toFixed(1)}`);
  console.log(`Estimated time to complete: ${Math.round(lastState.totalPositions / (positionsAdvanced / timeElapsed))} seconds`);

  // Verify animation is actually progressing
  expect(positionsAdvanced).toBeGreaterThan(5); // Should advance at least 5 positions in 20 seconds
  expect(lastState.lat).not.toBe(firstState.lat); // Position should have changed
});