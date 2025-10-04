import { test, expect } from '@playwright/test';

test('wait for position advance', async ({ page }) => {
  // Navigate to flight page
  await page.goto('http://localhost:3000/flight/103');

  // Wait for Cesium
  await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 20000 });
  await page.waitForTimeout(3000);

  // Start animation
  const startButton = page.locator('button:has-text("Start Flight Animation")');
  await expect(startButton).toBeVisible({ timeout: 10000 });
  await startButton.click();

  // Monitor progress every second
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000);

    const state = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return null;

      return {
        frameCount: viewer.animationState?.frameCount || 0,
        currentIndex: viewer.animationState?.currentIndex || 0,
        progress: viewer.animationState?.interpolationProgress || 0,
        steps: viewer.animationSettings?.interpolationSteps || 30,
        intervalMs: viewer.animationSettings?.intervalMs || 100
      };
    });

    console.log(`[${i+1}s] Frame ${state?.frameCount}, Index ${state?.currentIndex}, Progress ${state?.progress}/${state?.steps}`);

    if (state && state.currentIndex > 0) {
      console.log(`\n✅ Animation advanced to position ${state.currentIndex} after ${i+1} seconds!`);
      break;
    }
  }

  // Final state check
  const finalState = await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    if (!viewer) return null;

    const state = viewer.animationState;
    const settings = viewer.animationSettings;

    // Calculate expected values
    const expectedFramesPerSecond = 1000 / (settings?.intervalMs || 100);
    const expectedAdvancesPerSecond = expectedFramesPerSecond / (settings?.interpolationSteps || 30);

    return {
      frameCount: state?.frameCount || 0,
      currentIndex: state?.currentIndex || 0,
      progress: state?.interpolationProgress || 0,
      steps: settings?.interpolationSteps || 30,
      intervalMs: settings?.intervalMs || 100,
      expectedFPS: expectedFramesPerSecond,
      expectedAdvancesPerSec: expectedAdvancesPerSecond,
      actualFPS: (state?.frameCount || 0) / 10
    };
  });

  console.log('\n=== Final Analysis ===');
  console.log(JSON.stringify(finalState, null, 2));

  expect(finalState).toBeTruthy();
});