import { test, expect } from '@playwright/test';

test('debug interpolation steps', async ({ page }) => {
  // Collect console logs
  const logs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('[CONSOLE]', text);
  });

  // Navigate to flight page
  await page.goto('http://localhost:3000/flight/103');

  // Wait for Cesium
  await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 20000 });
  await page.waitForTimeout(3000);

  // Start animation
  const startButton = page.locator('button:has-text("Start Flight Animation")');
  await expect(startButton).toBeVisible({ timeout: 10000 });
  await startButton.click();

  // Wait a bit for animation to run
  await page.waitForTimeout(5000);

  // Get animation state details
  const animationData = await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    if (!viewer) return null;

    return {
      hasViewer: true,
      animationState: viewer.animationState,
      animationSettings: viewer.animationSettings,
      currentInterpolationSteps: viewer.animationSettings?.interpolationSteps,
      currentIntervalMs: viewer.animationSettings?.intervalMs,
      playbackSpeed: viewer.animationSettings?.playbackSpeed,
      frameCount: viewer.animationState?.frameCount,
      currentIndex: viewer.animationState?.currentIndex,
      interpolationProgress: viewer.animationState?.interpolationProgress,
    };
  });

  console.log('\n=== Animation Data ===');
  console.log(JSON.stringify(animationData, null, 2));

  // Check specific values
  if (animationData && animationData.animationState) {
    console.log('\n=== Key Values ===');
    console.log('Frame Count:', animationData.frameCount);
    console.log('Current Index:', animationData.currentIndex);
    console.log('Interpolation Progress:', animationData.interpolationProgress);
    console.log('Interpolation Steps Setting:', animationData.currentInterpolationSteps);
    console.log('Should advance when progress >=', animationData.currentInterpolationSteps);

    // Log calculation
    const shouldHaveAdvanced = Math.floor(animationData.frameCount / (animationData.currentInterpolationSteps || 30));
    console.log('Expected position advances:', shouldHaveAdvanced);
    console.log('Actual position (currentIndex):', animationData.currentIndex);
  }

  // Run a manual test of the interpolation logic
  const manualTest = await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    if (!viewer || !viewer.animationState || !viewer.animationSettings) return null;

    const results: any[] = [];

    // Simulate 100 frames
    let testIndex = 0;
    let testProgress = 0;
    const testSteps = viewer.animationSettings.interpolationSteps || 30;

    for (let frame = 0; frame < 100; frame++) {
      testProgress++;

      if (testProgress >= testSteps) {
        results.push({
          frame,
          action: 'advance',
          fromProgress: testProgress,
          toIndex: testIndex + 1,
          interpolationSteps: testSteps
        });
        testProgress = 0;
        testIndex++;
      }
    }

    return {
      testSteps,
      expectedAdvances: results.length,
      advances: results.slice(0, 3), // First 3 advances
      finalIndex: testIndex
    };
  });

  console.log('\n=== Manual Interpolation Test ===');
  console.log(JSON.stringify(manualTest, null, 2));

  // Print relevant logs
  console.log('\n=== Animation Logs ===');
  const animLogs = logs.filter(log =>
    log.includes('Frame') ||
    log.includes('Position') ||
    log.includes('interpolation') ||
    log.includes('Animation settings')
  );
  animLogs.slice(-20).forEach(log => console.log(log));

  // Test should pass if we got data
  expect(animationData).toBeTruthy();
});