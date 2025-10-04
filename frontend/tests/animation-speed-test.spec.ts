import { test, expect } from '@playwright/test';

test('monitor animation speed over time', async ({ page }) => {
  // Navigate to flight 72
  await page.goto('http://localhost:3000/flight/72');

  // Wait for page to load
  await page.waitForTimeout(3000);

  // Start animation
  const startButton = await page.locator('button:has-text("Start Flight Animation")');
  if (await startButton.count() > 0) {
    await startButton.click();
    console.log('Animation started');

    // Monitor animation progress every second for 10 seconds
    for (let i = 1; i <= 10; i++) {
      await page.waitForTimeout(1000);

      const state = await page.evaluate(() => {
        const viewer = (window as any).cesiumViewer;
        if (!viewer || !viewer.animationState) return null;

        const positions = viewer.positions || [];
        const currentPos = positions[viewer.animationState.currentIndex];

        return {
          second: 0, // Will be filled
          frameCount: viewer.animationState.frameCount,
          currentIndex: viewer.animationState.currentIndex,
          interpolationProgress: viewer.animationState.interpolationProgress,
          totalPositions: positions.length,
          percentComplete: positions.length > 0 ?
            (viewer.animationState.currentIndex / positions.length * 100).toFixed(2) : 0,
          framesPerSecond: 0, // Will be calculated
          positionsPerSecond: 0, // Will be calculated
          estimatedTimeToComplete: 0, // Will be calculated
          currentLat: currentPos?.latitude,
          currentLon: currentPos?.longitude
        };
      });

      if (state && i > 1) {
        // Calculate rates
        state.second = i;
        state.framesPerSecond = state.frameCount / i;
        state.positionsPerSecond = state.currentIndex / i;

        if (state.positionsPerSecond > 0) {
          state.estimatedTimeToComplete = (state.totalPositions - state.currentIndex) / state.positionsPerSecond;
        }

        console.log(`[${i}s] Position ${state.currentIndex}/${state.totalPositions} (${state.percentComplete}%)`, {
          fps: state.framesPerSecond.toFixed(1),
          posPerSec: state.positionsPerSecond.toFixed(1),
          etaSeconds: Math.round(state.estimatedTimeToComplete),
          lat: state.currentLat?.toFixed(4),
          lon: state.currentLon?.toFixed(4)
        });
      }
    }

    // After 10 seconds, check if we've made reasonable progress
    const finalState = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer || !viewer.animationState) return null;

      return {
        frameCount: viewer.animationState.frameCount,
        currentIndex: viewer.animationState.currentIndex,
        totalPositions: viewer.positions?.length || 0,
        settings: viewer.animationSettings
      };
    });

    console.log('\n=== Final Animation State ===');
    console.log('Total frames processed:', finalState?.frameCount);
    console.log('Positions traversed:', finalState?.currentIndex);
    console.log('Total positions:', finalState?.totalPositions);
    console.log('Animation settings:', finalState?.settings);

    // We should have made some progress in 10 seconds
    if (finalState) {
      expect(finalState.currentIndex).toBeGreaterThan(0);

      // At ~3 FPS with 5 interpolation steps, we should advance ~6 positions in 10 seconds
      console.log('\n=== Analysis ===');
      const expectedMinPositions = 5; // Conservative estimate
      if (finalState.currentIndex < expectedMinPositions) {
        console.log(`WARNING: Animation too slow! Only ${finalState.currentIndex} positions in 10 seconds`);
        console.log(`Expected at least ${expectedMinPositions} positions`);
      } else {
        console.log(`✓ Animation speed acceptable: ${finalState.currentIndex} positions in 10 seconds`);
      }
    }
  } else {
    console.log('No start button found - animation may have auto-started or failed to load');
  }
});