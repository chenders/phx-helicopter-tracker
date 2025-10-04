import { test, expect } from '@playwright/test';

test('test visual rendering and animation movement', async ({ page }) => {
  // Navigate to flight 72
  const url = 'http://localhost:3000/flight/72';

  console.log('Loading flight 72...');
  await page.goto(url);

  // Wait for page to load
  await page.waitForTimeout(5000);

  // Get initial state
  const initialState = await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    if (!viewer) return { error: 'No viewer' };

    const camera = viewer.camera;
    const cartographic = camera.positionCartographic;

    return {
      hasViewer: true,
      requestRenderMode: viewer.scene.requestRenderMode,
      maximumRenderTimeChange: viewer.scene.maximumRenderTimeChange,
      currentIndex: viewer.animationState?.currentIndex || 0,
      cameraLat: cartographic ? Cesium.Math.toDegrees(cartographic.latitude) : 0,
      cameraLon: cartographic ? Cesium.Math.toDegrees(cartographic.longitude) : 0,
      cameraHeight: cartographic ? cartographic.height : 0,
      frameNumber: viewer.scene.frameState?.frameNumber || 0
    };
  });

  console.log('Initial state:', initialState);

  // Start animation
  const startButton = await page.locator('button:has-text("Start Flight Animation")');
  if (await startButton.count() > 0) {
    console.log('Starting animation...');
    await startButton.click();

    // Monitor frames and camera positions for 5 seconds
    let previousFrameNumber = initialState.frameNumber;
    let previousLat = initialState.cameraLat;
    let previousLon = initialState.cameraLon;
    let frameChanges = 0;
    let positionChanges = 0;

    for (let i = 1; i <= 5; i++) {
      await page.waitForTimeout(1000);

      const state = await page.evaluate(() => {
        const viewer = (window as any).cesiumViewer;
        if (!viewer) return null;

        const camera = viewer.camera;
        const cartographic = camera.positionCartographic;

        // Force a render to ensure we get the latest frame
        viewer.scene.requestRender();
        viewer.scene.render();

        return {
          currentIndex: viewer.animationState?.currentIndex || 0,
          cameraLat: cartographic ? Cesium.Math.toDegrees(cartographic.latitude) : 0,
          cameraLon: cartographic ? Cesium.Math.toDegrees(cartographic.longitude) : 0,
          cameraHeight: cartographic ? cartographic.height : 0,
          frameNumber: viewer.scene.frameState?.frameNumber || 0,
          requestRenderMode: viewer.scene.requestRenderMode,
          isRendering: viewer.scene._renderRequested || false
        };
      });

      if (state) {
        // Check if frame number changed
        if (state.frameNumber !== previousFrameNumber) {
          frameChanges++;
          console.log(`[${i}s] Frame changed: ${previousFrameNumber} -> ${state.frameNumber}`);
        }

        // Check if camera position changed
        const latDiff = Math.abs(state.cameraLat - previousLat);
        const lonDiff = Math.abs(state.cameraLon - previousLon);
        if (latDiff > 0.00001 || lonDiff > 0.00001) {
          positionChanges++;
          console.log(`[${i}s] Camera moved:`, {
            latChange: latDiff.toFixed(6),
            lonChange: lonDiff.toFixed(6),
            newLat: state.cameraLat.toFixed(4),
            newLon: state.cameraLon.toFixed(4),
            index: state.currentIndex
          });
        }

        console.log(`[${i}s] Render mode: ${state.requestRenderMode}, Frame: ${state.frameNumber}, Index: ${state.currentIndex}`);

        previousFrameNumber = state.frameNumber;
        previousLat = state.cameraLat;
        previousLon = state.cameraLon;
      }
    }

    console.log('\n=== Rendering Summary ===');
    console.log('Frame changes:', frameChanges);
    console.log('Position changes:', positionChanges);

    // We should see both frame and position changes
    expect(frameChanges).toBeGreaterThan(0);
    expect(positionChanges).toBeGreaterThan(0);
  }

  // Take final screenshot
  await page.screenshot({ path: 'visual-rendering-test.png', fullPage: false });
});