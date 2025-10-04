import { test, expect } from '@playwright/test';

test('test jump to closest functionality', async ({ page }) => {
  // Navigate to flight 72 with search context
  const url = 'http://localhost:3000/flight/72?searchLat=33.5237273&searchLng=-112.0474831&searchRadius=804.67&closestDistance=10.18051806&closestTime=2025-09-25T22%3A05%3A39%2B00%3A00';

  console.log('Loading flight 72...');
  await page.goto(url);

  // Wait for page to load
  await page.waitForTimeout(5000);

  // Get initial camera position
  const initialState = await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    if (!viewer) return { error: 'No viewer' };

    const camera = viewer.camera;
    const cartographic = camera.positionCartographic;

    return {
      hasViewer: true,
      currentIndex: viewer.animationState?.currentIndex || 0,
      cameraLat: cartographic ? Cesium.Math.toDegrees(cartographic.latitude) : 0,
      cameraLon: cartographic ? Cesium.Math.toDegrees(cartographic.longitude) : 0,
      cameraHeight: cartographic ? cartographic.height : 0,
      positionCount: viewer.positions?.length || 0
    };
  });

  console.log('Initial state:', initialState);

  // Try to click "Jump to Closest"
  const jumpButton = await page.locator('button:has-text("Jump to Closest")');
  const buttonExists = await jumpButton.count() > 0;

  if (buttonExists) {
    console.log('Clicking Jump to Closest...');
    await jumpButton.click();

    // Wait for camera to move
    await page.waitForTimeout(3000);

    // Get state after jump
    const afterJumpState = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return { error: 'No viewer' };

      const camera = viewer.camera;
      const cartographic = camera.positionCartographic;

      // Also check the closest point index
      const searchContext = viewer.searchContext || {};
      const positions = viewer.positions || [];

      // Try to find the closest point manually
      let closestIdx = -1;
      let minDist = Infinity;

      if (searchContext.lat && searchContext.lng && positions.length > 0) {
        positions.forEach((pos: any, idx: number) => {
          const latDiff = pos.latitude - searchContext.lat;
          const lngDiff = pos.longitude - searchContext.lng;
          const dist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = idx;
          }
        });
      }

      return {
        hasViewer: true,
        currentIndex: viewer.animationState?.currentIndex || 0,
        closestPointIndex: closestIdx,
        cameraLat: cartographic ? Cesium.Math.toDegrees(cartographic.latitude) : 0,
        cameraLon: cartographic ? Cesium.Math.toDegrees(cartographic.longitude) : 0,
        cameraHeight: cartographic ? cartographic.height : 0,
        helicopterPosition: viewer.helicopterEntity?.position ? 'Set' : 'Not set',
        positionCount: viewer.positions?.length || 0
      };
    });

    console.log('After jump state:', afterJumpState);

    // Check if camera moved
    const latChange = Math.abs(afterJumpState.cameraLat - initialState.cameraLat);
    const lonChange = Math.abs(afterJumpState.cameraLon - initialState.cameraLon);

    console.log('Camera movement:', {
      latChange: latChange.toFixed(6),
      lonChange: lonChange.toFixed(6),
      indexChanged: afterJumpState.currentIndex !== initialState.currentIndex
    });

    // The camera should have moved
    if (latChange < 0.0001 && lonChange < 0.0001) {
      console.log('ERROR: Camera did not move!');
    }
  } else {
    console.log('Jump to Closest button not found');

    // Check why button might not exist
    const debugInfo = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      return {
        hasViewer: !!viewer,
        hasPositions: viewer?.positions?.length > 0,
        searchContext: viewer?.searchContext || 'not set',
        closestPointIndex: viewer?.closestPointIndex
      };
    });

    console.log('Debug info:', debugInfo);
  }

  // Take screenshot for debugging
  await page.screenshot({ path: 'jump-to-closest-test.png', fullPage: true });
  console.log('Screenshot saved');
});