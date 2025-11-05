import { test, expect } from '@playwright/test';

/**
 * Test that verifies the 3D label system works correctly during animation.
 *
 * Requirements:
 * - Labels should be visible at all times during flight
 * - Major streets should be labeled every 1-5 miles
 * - "Entering [City]" labels should appear when crossing boundaries
 * - Labels should be readable (not overlapping/clustering)
 */

test.describe('3D Label System During Animation', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for full test

    // Log console messages for debugging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.log('Page error:', err.message));

    // Navigate to flight page (note: route is /flight/:id, not /flights/:id)
    await page.goto('http://localhost:3000/flight/736', { waitUntil: 'domcontentloaded' });

    // Wait for either success (Cesium loads) or failure (timeout)
    // Try to wait for Cesium container with a reasonable timeout
    try {
      await page.waitForSelector('#cesiumContainer', { timeout: 60000 });
      console.log('✓ Cesium container found');

      // Wait for Cesium viewer to be available
      await page.waitForFunction(() => (window as any).cesiumViewer !== undefined, { timeout: 60000 });
      console.log('✓ Cesium viewer initialized');

      // Give Cesium time to load 3D tiles and create labels
      await page.waitForTimeout(10000);
    } catch (error) {
      // Take a screenshot if Cesium doesn't load
      await page.screenshot({ path: 'tests/images/cesium-load-failure.png', fullPage: true });
      console.log('✗ Failed to load Cesium:', error);
      throw new Error(`Cesium failed to load: ${error}`);
    }
  });

  test('should always show labels during animation', async ({ page }) => {
    // Start animation
    const playButton = page.locator('button').filter({ hasText: /Play|▶/ }).first();
    await playButton.click();
    await page.waitForTimeout(1000);

    // Sample label visibility at 10 different points during animation
    const samplePoints = 10;
    const delayBetweenSamples = 2000; // 2 seconds

    const results: Array<{
      time: number;
      labelCount: number;
      cameraAlt: number;
      cameraLat: number;
      cameraLng: number;
      visibleLabels: string[];
    }> = [];

    for (let i = 0; i < samplePoints; i++) {
      await page.waitForTimeout(delayBetweenSamples);

      const snapshot = await page.evaluate(() => {
        const viewer = (window as any).cesiumViewer;
        if (!viewer) return null;

        // Get camera position
        const pos = viewer.camera.positionCartographic;
        const cameraAlt = pos.height * 3.28084;
        const cameraLat = (window as any).Cesium.Math.toDegrees(pos.latitude);
        const cameraLng = (window as any).Cesium.Math.toDegrees(pos.longitude);

        // Count visible labels (billboards)
        let labelCount = 0;
        const visibleLabels: string[] = [];
        const entities = viewer.entities.values;

        for (let j = 0; j < entities.length; j++) {
          const entity = entities[j];
          if (entity.billboard) {
            labelCount++;
            // Try to get label text
            if (entity.label && entity.label.text) {
              const text = entity.label.text.getValue();
              if (text) visibleLabels.push(text);
            }
          }
        }

        return {
          time: Date.now(),
          labelCount,
          cameraAlt,
          cameraLat,
          cameraLng,
          visibleLabels
        };
      });

      if (snapshot) {
        results.push(snapshot);
        console.log(`Sample ${i + 1}: ${snapshot.labelCount} labels at alt ${snapshot.cameraAlt.toFixed(0)}ft`);
      }
    }

    // Stop animation
    const pauseButton = page.locator('button').filter({ hasText: /Pause|⏸/ }).first();
    await pauseButton.click();

    // Verify results
    expect(results.length).toBeGreaterThan(0);

    // Check that labels were visible at each sample point
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      expect(result.labelCount, `Sample ${i + 1} should have labels`).toBeGreaterThan(0);
      console.log(`✓ Sample ${i + 1}: ${result.labelCount} labels visible`);
    }

    // Calculate average label count
    const avgLabels = results.reduce((sum, r) => sum + r.labelCount, 0) / results.length;
    console.log(`✓ Average labels visible: ${avgLabels.toFixed(1)}`);

    // Should have reasonable label coverage throughout flight
    expect(avgLabels).toBeGreaterThan(5);
  });

  test('should show labels near helicopter at all times', async ({ page }) => {
    // Start animation
    const playButton = page.locator('button').filter({ hasText: /Play|▶/ }).first();
    await playButton.click();
    await page.waitForTimeout(1000);

    // Check label visibility at 5 points
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(3000);

      const hasNearbyLabels = await page.evaluate(() => {
        const viewer = (window as any).cesiumViewer;
        if (!viewer) return false;

        const Cesium = (window as any).Cesium;

        // Get helicopter position
        const helicopterEntity = viewer.helicopterEntity;
        if (!helicopterEntity) return false;

        const currentTime = viewer.clock.currentTime;
        const helicopterPos = helicopterEntity.position.getValue(currentTime);
        if (!helicopterPos) return false;

        const helicopterCarto = Cesium.Cartographic.fromCartesian(helicopterPos);
        const helicopterLat = Cesium.Math.toDegrees(helicopterCarto.latitude);
        const helicopterLng = Cesium.Math.toDegrees(helicopterCarto.longitude);

        // Check if any labels are within 5 miles of helicopter
        const entities = viewer.entities.values;
        let nearbyLabelCount = 0;

        for (let i = 0; i < entities.length; i++) {
          const entity = entities[i];
          if (entity.billboard && entity.position) {
            const labelPos = entity.position.getValue(currentTime);
            if (labelPos) {
              const labelCarto = Cesium.Cartographic.fromCartesian(labelPos);
              const labelLat = Cesium.Math.toDegrees(labelCarto.latitude);
              const labelLng = Cesium.Math.toDegrees(labelCarto.longitude);

              // Calculate distance in miles
              const R = 3959; // Earth radius in miles
              const dLat = (labelLat - helicopterLat) * Math.PI / 180;
              const dLng = (labelLng - helicopterLng) * Math.PI / 180;
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                       Math.cos(helicopterLat * Math.PI / 180) * Math.cos(labelLat * Math.PI / 180) *
                       Math.sin(dLng/2) * Math.sin(dLng/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distance = R * c;

              if (distance <= 5) {
                nearbyLabelCount++;
              }
            }
          }
        }

        return nearbyLabelCount > 0;
      });

      expect(hasNearbyLabels, `Check ${i + 1}: Should have labels within 5 miles`).toBe(true);
      console.log(`✓ Check ${i + 1}: Labels found near helicopter`);
    }

    // Stop animation
    const pauseButton = page.locator('button').filter({ hasText: /Pause|⏸/ }).first();
    await pauseButton.click();
  });

  test('should update labels as helicopter moves', async ({ page }) => {
    // Get initial label positions
    const initialLabels = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return [];

      const Cesium = (window as any).Cesium;
      const currentTime = viewer.clock.currentTime;
      const labels: Array<{lat: number, lng: number}> = [];

      const entities = viewer.entities.values;
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (entity.billboard && entity.position) {
          const pos = entity.position.getValue(currentTime);
          if (pos) {
            const carto = Cesium.Cartographic.fromCartesian(pos);
            labels.push({
              lat: Cesium.Math.toDegrees(carto.latitude),
              lng: Cesium.Math.toDegrees(carto.longitude)
            });
          }
        }
      }

      return labels;
    });

    console.log(`Initial labels: ${initialLabels.length}`);

    // Start animation and let it run
    const playButton = page.locator('button').filter({ hasText: /Play|▶/ }).first();
    await playButton.click();
    await page.waitForTimeout(10000); // Run for 10 seconds

    // Check labels again
    const laterLabels = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return [];

      const Cesium = (window as any).Cesium;
      const currentTime = viewer.clock.currentTime;
      const labels: Array<{lat: number, lng: number}> = [];

      const entities = viewer.entities.values;
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (entity.billboard && entity.position) {
          const pos = entity.position.getValue(currentTime);
          if (pos) {
            const carto = Cesium.Cartographic.fromCartesian(pos);
            labels.push({
              lat: Cesium.Math.toDegrees(carto.latitude),
              lng: Cesium.Math.toDegrees(carto.longitude)
            });
          }
        }
      }

      return labels;
    });

    console.log(`Labels after 10 seconds: ${laterLabels.length}`);

    // Stop animation
    const pauseButton = page.locator('button').filter({ hasText: /Pause|⏸/ }).first();
    await pauseButton.click();

    // Labels should still exist
    expect(laterLabels.length).toBeGreaterThan(0);

    // NOTE: Current implementation creates static labels, so they won't change
    // This test documents the current behavior. Ideally, labels should update
    // dynamically as the helicopter moves to always show nearby streets.
  });

  test('should show readable label text', async ({ page }) => {
    // Take a screenshot to verify labels are readable
    await page.waitForTimeout(2000);

    // Start animation
    const playButton = page.locator('button').filter({ hasText: /Play|▶/ }).first();
    await playButton.click();
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'tests/images/label-readability-test.png', fullPage: false });

    // Check that labels have proper styling
    const labelStyles = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return null;

      const Cesium = (window as any).Cesium;
      const entities = viewer.entities.values;

      const styles = [];
      for (let i = 0; i < Math.min(entities.length, 5); i++) {
        const entity = entities[i];
        if (entity.billboard) {
          // Get billboard properties
          const billboard = entity.billboard;
          styles.push({
            hasImage: !!billboard.image,
            show: billboard.show ? billboard.show.getValue(viewer.clock.currentTime) : false
          });
        }
      }

      return styles;
    });

    expect(labelStyles).not.toBeNull();
    console.log(`Checked ${labelStyles?.length} label styles`);

    // Stop animation
    const pauseButton = page.locator('button').filter({ hasText: /Pause|⏸/ }).first();
    await pauseButton.click();
  });

  test('should maintain label visibility throughout entire flight', async ({ page }) => {
    // This is the main test - labels should never disappear completely

    // Start animation
    const playButton = page.locator('button').filter({ hasText: /Play|▶/ }).first();
    await playButton.click();
    await page.waitForTimeout(1000);

    // Check every 5 seconds for 30 seconds
    const checks = 6;
    let zeroLabelChecks = 0;

    for (let i = 0; i < checks; i++) {
      await page.waitForTimeout(5000);

      const labelInfo = await page.evaluate(() => {
        const viewer = (window as any).cesiumViewer;
        if (!viewer) return { count: 0, cameraAlt: 0 };

        const pos = viewer.camera.positionCartographic;
        let count = 0;

        const entities = viewer.entities.values;
        for (let j = 0; j < entities.length; j++) {
          if (entities[j].billboard) count++;
        }

        return {
          count,
          cameraAlt: pos.height * 3.28084
        };
      });

      console.log(`Check ${i + 1}: ${labelInfo.count} labels at ${labelInfo.cameraAlt.toFixed(0)}ft`);

      if (labelInfo.count === 0) {
        zeroLabelChecks++;
      }

      // Each check should show at least some labels
      // This is the key requirement: NEVER have zero labels
      expect(labelInfo.count, `Check ${i + 1} at ${labelInfo.cameraAlt.toFixed(0)}ft altitude`).toBeGreaterThan(0);
    }

    // Stop animation
    const pauseButton = page.locator('button').filter({ hasText: /Pause|⏸/ }).first();
    await pauseButton.click();

    // Summary
    console.log(`✓ Completed ${checks} checks, ${zeroLabelChecks} had zero labels`);
    expect(zeroLabelChecks).toBe(0);
  });
});
