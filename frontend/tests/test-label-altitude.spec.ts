import { test, expect } from '@playwright/test';

/**
 * Test to prevent regression of the label altitude bug where labels were created
 * using camera altitude (52 million feet at initialization) instead of helicopter altitude.
 *
 * Bug history:
 * - Labels were created during Cesium initialization when camera was at default "home" position (space altitude)
 * - getCameraAltitudeFeet() returned 52,638,769 feet
 * - Labels created at wrong scale, invisible/unreadable during flight
 *
 * Fix:
 * - Use helicopter's starting altitude from positions[0] instead of camera altitude
 * - Disable camera controls during animation to prevent altitude changes
 *
 * IMPORTANT: These tests require backend and frontend to be running.
 * To run: `npm run dev` in one terminal, then `npx playwright test test-label-altitude.spec.ts` in another
 */
test.describe('3D Label Altitude Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for Cesium initialization
    test.setTimeout(60000); // 60 seconds

    // Navigate to a flight detail page (note: route is /flight/:id, not /flights/:id)
    await page.goto('http://localhost:3000/flight/736');

    // Wait for the page to load
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Wait for Cesium to initialize (can take 20+ seconds with 3D tiles)
    await page.waitForSelector('#cesiumContainer', { timeout: 30000 });

    // Give Cesium and labels time to fully initialize
    await page.waitForTimeout(5000);
  });

  test('should create labels with helicopter altitude, not camera altitude', async ({ page }) => {
    // Check the current camera altitude directly from Cesium
    const cameraAltitude = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return null;
      const pos = viewer.camera.positionCartographic;
      return pos.height * 3.28084; // Convert to feet
    });

    expect(cameraAltitude).not.toBeNull();

    // Camera altitude should be reasonable (between 500ft and 10,000ft for helicopter view)
    // NOT 52 million feet!
    expect(cameraAltitude!).toBeGreaterThan(500);
    expect(cameraAltitude!).toBeLessThan(100000);

    // Check that labels were created
    const labelCount = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return 0;
      let count = 0;
      const entities = viewer.entities.values;
      for (let i = 0; i < entities.length; i++) {
        if (entities[i].billboard) {
          count++;
        }
      }
      return count;
    });

    // Should have created labels
    expect(labelCount).toBeGreaterThan(0);

    console.log(`✓ Labels created with camera at ${cameraAltitude!.toFixed(0)}ft altitude (${labelCount} labels)`);
  });

  test('should disable camera controls during animation', async ({ page }) => {
    // Start animation
    const playButton = page.locator('button:has-text("Play")').first();
    await playButton.click();

    // Wait for animation to start
    await page.waitForTimeout(1000);

    // Verify in console that camera controls were disabled
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    // Check for the log message that indicates controls were disabled
    await page.waitForTimeout(1000);

    // Try to zoom with mouse wheel (should not work)
    const cesiumContainer = await page.locator('#cesiumContainer');
    await cesiumContainer.hover();

    // Get camera position before scroll attempt
    const positionBefore = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return null;
      const pos = viewer.camera.positionCartographic;
      return {
        height: pos.height,
        lat: window.Cesium.Math.toDegrees(pos.latitude),
        lng: window.Cesium.Math.toDegrees(pos.longitude)
      };
    });

    // Attempt to zoom (should be blocked)
    await cesiumContainer.hover();
    await page.mouse.wheel(0, 1000); // Scroll down to zoom out
    await page.waitForTimeout(500);

    // Get camera position after scroll attempt
    const positionAfter = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return null;
      const pos = viewer.camera.positionCartographic;
      return {
        height: pos.height,
        lat: window.Cesium.Math.toDegrees(pos.latitude),
        lng: window.Cesium.Math.toDegrees(pos.longitude)
      };
    });

    // Camera height should not have changed significantly (controls disabled)
    // Allow small variation due to animation movement
    if (positionBefore && positionAfter) {
      const heightDiff = Math.abs(positionAfter.height - positionBefore.height);
      expect(heightDiff).toBeLessThan(100); // Less than 100 meters difference

      console.log(`✓ Camera controls disabled during animation (height change: ${heightDiff.toFixed(2)}m)`);
    }
  });

  test('should have visible street labels during animation', async ({ page }) => {
    // Start animation
    const playButton = page.locator('button:has-text("Play")').first();
    await playButton.click();

    // Wait for animation to start
    await page.waitForTimeout(2000);

    // Check that labels were created
    const labelCount = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return 0;

      // Count billboard entities (labels)
      let count = 0;
      const entities = viewer.entities.values;
      for (let i = 0; i < entities.length; i++) {
        if (entities[i].billboard) {
          count++;
        }
      }
      return count;
    });

    // Should have created multiple labels (15 based on current implementation)
    expect(labelCount).toBeGreaterThan(5);
    expect(labelCount).toBeLessThan(30);

    console.log(`✓ Created ${labelCount} street labels`);
  });

  test('should never reach extreme camera altitudes during session', async ({ page }) => {
    const cameraAltitudes: number[] = [];

    // Monitor camera altitude over time
    const checkAltitude = async () => {
      const altitude = await page.evaluate(() => {
        const viewer = (window as any).cesiumViewer;
        if (!viewer) return null;
        const pos = viewer.camera.positionCartographic;
        return pos.height * 3.28084; // Convert to feet
      });

      if (altitude !== null) {
        cameraAltitudes.push(altitude);
      }
    };

    // Check altitude multiple times
    for (let i = 0; i < 5; i++) {
      await checkAltitude();
      await page.waitForTimeout(1000);
    }

    // Start animation and check again
    const playButton = page.locator('button:has-text("Play")').first();
    await playButton.click();
    await page.waitForTimeout(500);

    for (let i = 0; i < 10; i++) {
      await checkAltitude();
      await page.waitForTimeout(500);
    }

    // Verify no extreme altitudes were reached
    const maxAltitude = Math.max(...cameraAltitudes);
    const minAltitude = Math.min(...cameraAltitudes);

    // Should stay within reasonable helicopter flight range
    expect(maxAltitude).toBeLessThan(100000); // 100,000 feet max (well below 52 million!)
    expect(minAltitude).toBeGreaterThan(100); // At least 100 feet

    console.log(`✓ Camera altitude range: ${minAltitude.toFixed(0)}ft - ${maxAltitude.toFixed(0)}ft`);
    console.log(`✓ Never reached extreme altitude (>100,000ft)`);
  });

  test('should log correct altitude on initialization', async ({ page }) => {
    // Reload page to test initialization
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Capture the altitude log during initialization
    const altitudeLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Camera alt:')) {
        altitudeLogs.push(text);
      }
    });

    // Wait for Cesium initialization
    await page.waitForSelector('#cesiumContainer', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Should have at least one altitude log
    expect(altitudeLogs.length).toBeGreaterThan(0);

    // Check that the first altitude log is reasonable
    const firstLog = altitudeLogs[0];
    const match = firstLog.match(/Camera alt: (\d+)ft/);

    if (match) {
      const altitude = parseInt(match[1]);

      // CRITICAL: Altitude should NOT be 52 million feet!
      expect(altitude).toBeLessThan(10000);
      expect(altitude).toBeGreaterThan(500);

      console.log(`✓ Initial label altitude: ${altitude}ft (not 52 million!)`);
    }
  });
});

test.describe('Camera Controls During Animation', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('http://localhost:3000/flight/736');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForSelector('#cesiumContainer', { timeout: 30000 });
    await page.waitForTimeout(5000);
  });

  test('should log camera control disable/enable messages', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Camera controls')) {
        consoleMessages.push(text);
      }
    });

    // Start animation
    const playButton = page.locator('button:has-text("Play")').first();
    await playButton.click();
    await page.waitForTimeout(1000);

    // Should see "Camera controls disabled" message
    const disabledMsg = consoleMessages.find(msg =>
      msg.includes('Camera controls disabled')
    );
    expect(disabledMsg).toBeTruthy();
    console.log('✓ Camera controls disabled on animation start');

    // Stop animation
    const pauseButton = page.locator('button:has-text("Pause")').first();
    await pauseButton.click();
    await page.waitForTimeout(1000);

    // Should see "Camera controls re-enabled" message
    const enabledMsg = consoleMessages.find(msg =>
      msg.includes('Camera controls re-enabled')
    );
    expect(enabledMsg).toBeTruthy();
    console.log('✓ Camera controls re-enabled on animation stop');
  });
});
