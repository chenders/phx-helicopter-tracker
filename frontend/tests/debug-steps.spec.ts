import { test, expect } from '@playwright/test';

test('debug exact interpolation steps issue', async ({ page }) => {
  // Navigate to flight page
  await page.goto('http://localhost:3000/flight/103');

  // Wait for Cesium
  await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 20000 });
  await page.waitForTimeout(3000);

  // Start animation
  const startButton = page.locator('button:has-text("Start Flight Animation")');
  await expect(startButton).toBeVisible({ timeout: 10000 });
  await startButton.click();

  // Wait exactly 3.5 seconds (35 frames at 100ms interval)
  await page.waitForTimeout(3500);

  // Get the state after 35 frames (should have advanced once)
  const state = await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    if (!viewer) return null;

    // Check the exact values
    const interpolationSteps = viewer.animationSettings?.interpolationSteps || 30;
    const progress = viewer.animationState?.interpolationProgress || 0;
    const currentIndex = viewer.animationState?.currentIndex || 0;
    const frameCount = viewer.animationState?.frameCount || 0;

    // Do the check manually
    const shouldAdvance = progress >= interpolationSteps;

    return {
      frameCount,
      currentIndex,
      progress,
      interpolationSteps,
      shouldAdvance,
      comparison: `${progress} >= ${interpolationSteps} = ${shouldAdvance}`,
      expectedIndex: Math.floor(frameCount / interpolationSteps)
    };
  });

  console.log('\n=== After ~35 frames ===');
  console.log(JSON.stringify(state, null, 2));

  // Now inject logging into the animate function to see what's happening
  await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    if (!viewer || !viewer.animationState) return;

    // Create a custom logger
    const originalProgress = viewer.animationState.interpolationProgress;
    const originalIndex = viewer.animationState.currentIndex;

    // Manually advance a few frames
    for (let i = 0; i < 15; i++) {
      viewer.animationState.interpolationProgress++;
      const steps = viewer.animationSettings?.interpolationSteps || 30;

      console.log(`Manual Frame ${i}: progress=${viewer.animationState.interpolationProgress}, steps=${steps}, check=${viewer.animationState.interpolationProgress >= steps}`);

      if (viewer.animationState.interpolationProgress >= steps) {
        console.log(`SHOULD ADVANCE NOW! Resetting progress and incrementing index`);
        viewer.animationState.interpolationProgress = 0;
        viewer.animationState.currentIndex++;
      }
    }

    return {
      startProgress: originalProgress,
      endProgress: viewer.animationState.interpolationProgress,
      startIndex: originalIndex,
      endIndex: viewer.animationState.currentIndex
    };
  });

  // The test passes if we got data
  expect(state).toBeTruthy();

  // We expect the animation to have advanced at least once after 35 frames
  if (state) {
    console.log('\n=== Analysis ===');
    console.log(`After ${state.frameCount} frames:`);
    console.log(`- Position index: ${state.currentIndex} (expected: ${state.expectedIndex})`);
    console.log(`- Progress: ${state.progress}/${state.interpolationSteps}`);

    if (state.currentIndex < state.expectedIndex) {
      console.log('\n❌ BUG CONFIRMED: Animation is not advancing positions correctly!');
      console.log(`The condition "${state.comparison}" should trigger advancement but isn't.`);
    }
  }
});