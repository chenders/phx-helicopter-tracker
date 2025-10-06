import { test, expect } from '@playwright/test';

test('Debug Cesium animation', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log' || msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    }
  });

  // Navigate to test page
  await page.goto('http://localhost:3000/3dtest.html');
  console.log('Navigated to 3D test page');

  // Wait for 3D view to load
  await page.waitForTimeout(5000);
  console.log('Waiting for Cesium to initialize...');

  // Wait for the "Start Flight Animation" button to be enabled
  const startButton = page.locator('button:has-text("Start Flight Animation")');
  await expect(startButton).toBeEnabled({ timeout: 30000 });
  console.log('Start button is enabled');

  // Get initial camera position
  const initialCameraPos = await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    if (!viewer) return null;
    return {
      x: viewer.camera.position.x,
      y: viewer.camera.position.y,
      z: viewer.camera.position.z,
      heading: viewer.camera.heading,
      pitch: viewer.camera.pitch
    };
  });
  console.log('Initial camera position:', initialCameraPos);

  // Check helicopter entity
  const helicopterInfo = await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    const Cesium = (window as any).Cesium;
    if (!viewer || !viewer.helicopterEntity) return null;

    const entity = viewer.helicopterEntity;
    const currentTime = viewer.clock.currentTime;

    return {
      hasPosition: !!entity.position,
      hasOrientation: !!entity.orientation,
      positionAtStart: entity.position?.getValue(currentTime),
      orientationAtStart: entity.orientation?.getValue(currentTime),
      clockState: {
        currentTime: viewer.clock.currentTime.toString(),
        startTime: viewer.clock.startTime.toString(),
        stopTime: viewer.clock.stopTime.toString(),
        shouldAnimate: viewer.clock.shouldAnimate,
        multiplier: viewer.clock.multiplier
      }
    };
  });
  console.log('Helicopter entity info:', helicopterInfo);

  // Click the start animation button
  console.log('Clicking start button...');
  await startButton.click();

  // Wait a bit for animation to start
  await page.waitForTimeout(500);

  // Monitor clock and camera for 5 seconds
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(500);

    const state = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return null;

      return {
        clock: {
          currentTime: viewer.clock.currentTime.toString(),
          shouldAnimate: viewer.clock.shouldAnimate,
          multiplier: viewer.clock.multiplier
        },
        camera: {
          x: viewer.camera.position.x,
          y: viewer.camera.position.y,
          z: viewer.camera.position.z,
          heading: viewer.camera.heading,
          pitch: viewer.camera.pitch
        },
        trackedEntity: !!viewer.trackedEntity,
        trackedEntityId: viewer.trackedEntity?.id
      };
    });

    console.log(`State at ${i * 500}ms:`, JSON.stringify(state, null, 2));
  }

  // Check if camera position changed
  const finalCameraPos = await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    if (!viewer) return null;
    return {
      x: viewer.camera.position.x,
      y: viewer.camera.position.y,
      z: viewer.camera.position.z,
      heading: viewer.camera.heading,
      pitch: viewer.camera.pitch
    };
  });
  console.log('Final camera position:', finalCameraPos);

  // Calculate distance moved
  if (initialCameraPos && finalCameraPos) {
    const dx = finalCameraPos.x - initialCameraPos.x;
    const dy = finalCameraPos.y - initialCameraPos.y;
    const dz = finalCameraPos.z - initialCameraPos.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    console.log('Camera moved distance:', distance);

    // Camera should have moved if animation is working
    expect(distance).toBeGreaterThan(10); // Should move at least 10 meters
  }

  // Take screenshot
  await page.screenshot({ path: 'frontend/test-results/cesium-animation-debug.png' });
});
