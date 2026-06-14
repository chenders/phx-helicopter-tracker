import { test } from '@playwright/test';

test.describe('Ground Labels Debugging', () => {
  test('verify ground labels are created and 2D list is populated', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log' && (
        msg.text().includes('label') ||
        msg.text().includes('Label') ||
        msg.text().includes('Ground')
      )) {
        console.log('PAGE LOG:', msg.text());
      }
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('PAGE ERROR:', msg.text());
      }
    });

    // Get a flight to test with
    const response = await page.request.get('http://localhost:8001/api/v1/flights?limit=1');
    const data = await response.json();

    if (!data.flights || data.flights.length === 0) {
      console.log('No flights found to test with');
      return;
    }

    const flightId = data.flights[0].id;
    console.log('Testing with flight ID:', flightId);

    // Navigate to flight detail
    await page.goto(`http://localhost:3000/flight/${flightId}`);

    // Wait for the page to load
    await page.waitForTimeout(3000);

    // Wait for Cesium to load
    await page.waitForSelector('canvas', { timeout: 30000 });
    console.log('✓ Cesium canvas loaded');

    // Wait a bit more for entities to be created
    await page.waitForTimeout(3000);

    // Check if 2D label list is visible
    const labelList = page.locator('text=Nearby Locations').first();
    const isLabelListVisible = await labelList.isVisible().catch(() => false);
    console.log('2D Label List visible:', isLabelListVisible);

    if (isLabelListVisible) {
      // Count how many labels are in the list
      const areaLabels = await page.locator('text=Areas').count();
      const streetLabels = await page.locator('text=Streets').count();
      console.log('Area section found:', areaLabels > 0);
      console.log('Street section found:', streetLabels > 0);

      // Try to find specific labels
      const allLabels = await page.locator('[class*="text-"]').allTextContents();
      console.log('Sample labels found:', allLabels.slice(0, 10));
    }

    // Check window.phoenixLabelsData
    const phoenixLabelsData = await page.evaluate(() => {
      return (window as any).phoenixLabelsData ? (window as any).phoenixLabelsData.length : 0;
    });
    console.log('Phoenix labels data loaded:', phoenixLabelsData, 'labels');

    // Check Cesium entities for ground labels
    const groundLabelInfo = await page.evaluate(() => {
      const Cesium = (window as any).Cesium;
      if (!Cesium) return { error: 'Cesium not loaded' };

      const viewer = (window as any).viewer;
      if (!viewer) return { error: 'Viewer not found' };

      const allEntities = viewer.entities.values;
      const groundLabels = allEntities.filter((e: any) =>
        e.name && e.name.startsWith('Ground Label:')
      );

      const labelDetails = groundLabels.map((e: any) => ({
        name: e.name,
        hasLabel: !!e.label,
        labelText: e.label ? e.label.text._value : null,
        position: e.position ? 'has position' : 'no position',
        heightReference: e.label?.heightReference?._value
      }));

      return {
        totalEntities: allEntities.length,
        groundLabelCount: groundLabels.length,
        labelDetails: labelDetails.slice(0, 5),
        helicopterFound: allEntities.some((e: any) => e.name === 'Helicopter')
      };
    });

    console.log('\nCesium Entity Analysis:');
    console.log('Total entities:', groundLabelInfo.totalEntities);
    console.log('Ground labels found:', groundLabelInfo.groundLabelCount);
    console.log('Helicopter entity:', groundLabelInfo.helicopterFound);
    console.log('Ground label details:', JSON.stringify(groundLabelInfo.labelDetails, null, 2));

    // Click the Animate button to start animation
    const animateButton = page.locator('button:has-text("Animate")').first();
    const animateButtonVisible = await animateButton.isVisible().catch(() => false);

    if (animateButtonVisible) {
      console.log('\n✓ Animate button found');
      await animateButton.click();
      console.log('Clicked Animate button');
      await page.waitForTimeout(2000);

      // Check again after animation starts
      const groundLabelsAfterAnimation = await page.evaluate(() => {
        const viewer = (window as any).viewer;
        if (!viewer) return 0;

        return viewer.entities.values.filter((e: any) =>
          e.name && e.name.startsWith('Ground Label:')
        ).length;
      });

      console.log('Ground labels after animation:', groundLabelsAfterAnimation);
    } else {
      console.log('⚠ Animate button not found');
    }

    // Check for Look Down checkbox
    const lookDownCheckbox = page.locator('input[type="checkbox"]').filter({
      has: page.locator('text=/Look.*[Dd]own/i')
    });
    const lookDownCount = await lookDownCheckbox.count();
    console.log('\nLook Down checkbox count:', lookDownCount);

    if (lookDownCount > 0) {
      const isChecked = await lookDownCheckbox.first().isChecked();
      console.log('Look Down checkbox checked:', isChecked);

      if (!isChecked) {
        console.log('Clicking Look Down checkbox...');
        await lookDownCheckbox.first().click();
        await page.waitForTimeout(1000);
        console.log('Look Down enabled');
      }
    }

    // Check camera pitch
    const cameraPitch = await page.evaluate(() => {
      const viewer = (window as any).viewer;
      if (!viewer) return null;

      const Cesium = (window as any).Cesium;
      const pitch = Cesium.Math.toDegrees(viewer.camera.pitch);
      return pitch;
    });
    console.log('Camera pitch (degrees):', cameraPitch);

    // Check if nearbyLabels state is populated
    const nearbyLabelsInfo = await page.evaluate(() => {
      // Try to access React state through the DOM
      const labelList = document.querySelector('[class*="right-4"][class*="top-"]');
      if (labelList) {
        const labels = labelList.querySelectorAll('[class*="truncate"]');
        return {
          found: true,
          count: labels.length,
          sample: Array.from(labels).slice(0, 5).map(l => l.textContent)
        };
      }
      return { found: false };
    });

    console.log('\n2D Label List Analysis:');
    console.log('Label list DOM:', nearbyLabelsInfo);

    // Take screenshot for manual inspection
    await page.screenshot({
      path: '/home/phx/phx-helicopter-tracker/frontend/ground-labels-debug.png',
      fullPage: false
    });
    console.log('\nScreenshot saved to: ground-labels-debug.png');

    // Final diagnostic
    console.log('\n=== DIAGNOSTIC SUMMARY ===');
    console.log('✓ Cesium loaded:', await page.evaluate(() => !!(window as any).Cesium));
    console.log('✓ Viewer loaded:', await page.evaluate(() => !!(window as any).viewer));
    console.log('✓ Phoenix labels data:', phoenixLabelsData > 0);
    console.log('✓ Ground labels created:', groundLabelInfo.groundLabelCount > 0);
    console.log('✓ 2D label list visible:', isLabelListVisible);
    console.log('✓ Animation started:', animateButtonVisible);

    if (groundLabelInfo.groundLabelCount === 0) {
      console.error('\n❌ NO GROUND LABELS FOUND!');
      console.log('Possible issues:');
      console.log('1. window.phoenixLabelsData not set');
      console.log('2. Label update code not triggering');
      console.log('3. Distance threshold not met (>1.5 miles movement)');
      console.log('4. Animation not started');
    }
  });

  test('force ground label creation by waiting for movement', async ({ page }) => {
    page.on('console', msg => {
      if (msg.text().includes('Regenerating labels') ||
          msg.text().includes('Removed') ||
          msg.text().includes('Ground Label')) {
        console.log('LABEL UPDATE:', msg.text());
      }
    });

    // Get a flight
    const response = await page.request.get('http://localhost:8001/api/v1/flights?limit=1');
    const data = await response.json();

    if (!data.flights || data.flights.length === 0) {
      console.log('No flights found');
      return;
    }

    const flightId = data.flights[0].id;
    await page.goto(`http://localhost:3000/flight/${flightId}`);

    // Wait for load
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('Starting animation to trigger label updates...');

    // Start animation
    const animateButton = page.locator('button:has-text("Animate")').first();
    if (await animateButton.isVisible()) {
      await animateButton.click();
      console.log('Animation started');

      // Wait for helicopter to move (labels should update every 1.5 miles)
      // At 50x speed, this should happen within a few seconds
      await page.waitForTimeout(10000);

      // Check for ground labels
      const labelCount = await page.evaluate(() => {
        const viewer = (window as any).viewer;
        if (!viewer) return 0;

        return viewer.entities.values.filter((e: any) =>
          e.name && e.name.startsWith('Ground Label:')
        ).length;
      });

      console.log('Ground labels after 10 seconds of animation:', labelCount);

      if (labelCount > 0) {
        console.log('✅ SUCCESS: Ground labels were created during animation');

        // Get details
        const labelDetails = await page.evaluate(() => {
          const viewer = (window as any).viewer;
          const groundLabels = viewer.entities.values.filter((e: any) =>
            e.name && e.name.startsWith('Ground Label:')
          );

          return groundLabels.map((e: any) => ({
            name: e.name,
            text: e.label?.text?._value,
            visible: e.show,
          }));
        });

        console.log('Label details:', labelDetails);
      } else {
        console.log('❌ FAIL: No ground labels created even after animation');
      }
    }
  });
});
