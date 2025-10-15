import { test, expect } from '@playwright/test';

test.describe('Hover Location Visualization for Flight 76', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the specific flight
    await page.goto('https://helos.maxandbramble.org/flight/76');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Wait for flight data to load
    await page.waitForSelector('text=/Flight.*76|Flight #76/i', { timeout: 10000 });
  });

  test('should visualize hover areas during flight animation', async ({ page }) => {
    // Expand details if collapsed
    const detailsButton = page.locator('button:has-text("Flight")').first();
    await detailsButton.click();

    // Wait a moment for the details to expand
    await page.waitForTimeout(500);

    // Take a screenshot of the initial state
    await page.screenshot({
      path: 'tests/screenshots/flight-76-initial.png',
      fullPage: true
    });

    // Scroll to the map section
    await page.locator('[data-map-section]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Ensure we're in 3D view mode
    const viewToggle = page.locator('button:has-text("3D View"), button:has-text("Standard View")');
    const toggleText = await viewToggle.textContent();

    if (toggleText?.includes('Standard View')) {
      // We're in 2D, switch to 3D
      await viewToggle.click();
      await page.waitForTimeout(2000); // Wait for 3D view to initialize
    }

    // Wait for Cesium to load
    await page.waitForSelector('text=/CesiumJS/i', { timeout: 15000 });
    await page.waitForTimeout(3000); // Extra time for 3D tiles to load

    // Take a screenshot of the 3D view before animation
    await page.screenshot({
      path: 'tests/screenshots/flight-76-3d-ready.png',
      fullPage: false
    });

    // Set playback speed to 2x for faster testing
    const speedSelector = page.locator('select').filter({ hasText: '0.5x' }).or(
      page.locator('select:has(option:text("0.5x"))')
    ).first();
    await speedSelector.selectOption('2');

    await page.waitForTimeout(500);

    // Click the "Start Animation" button at the top of the page
    const startButton = page.locator('button:has-text("Start Animation")').first();
    await startButton.click();

    // Wait for animation to start
    await page.waitForTimeout(2000);

    // Take screenshots at different points during the animation
    console.log('Taking screenshot at 5 seconds...');
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: 'tests/screenshots/flight-76-animation-5s.png',
      fullPage: false
    });

    console.log('Taking screenshot at 10 seconds...');
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: 'tests/screenshots/flight-76-animation-10s.png',
      fullPage: false
    });

    console.log('Taking screenshot at 15 seconds...');
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: 'tests/screenshots/flight-76-animation-15s.png',
      fullPage: false
    });

    console.log('Taking screenshot at 20 seconds...');
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: 'tests/screenshots/flight-76-animation-20s.png',
      fullPage: false
    });

    console.log('Taking screenshot at 25 seconds...');
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: 'tests/screenshots/flight-76-animation-25s.png',
      fullPage: false
    });

    // Pause the animation
    const pauseButton = page.locator('button:has-text("Pause")').first();
    await pauseButton.click();

    await page.waitForTimeout(1000);

    // Take a final screenshot showing the pause state
    await page.screenshot({
      path: 'tests/screenshots/flight-76-paused.png',
      fullPage: false
    });

    // Scroll down to see the hover location details
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);

    // Take a screenshot of the surveillance analysis section
    await page.screenshot({
      path: 'tests/screenshots/flight-76-hover-details.png',
      fullPage: false
    });

    // Log hover location information from the page
    const hoverLocationText = await page.locator('text=/Hover Locations.*Pattern Detection/i').textContent();
    console.log('Hover locations info:', hoverLocationText);

    // Check if there are hover locations displayed
    const hoverCount = await page.locator('text=/\\d+ locations/i').first().textContent();
    console.log('Hover count:', hoverCount);

    // Try to get specific hover location details
    const hoverDetails = await page.locator('.bg-gray-100.dark\\:bg-gray-700.p-2.rounded').allTextContents();
    console.log('Hover location details:', hoverDetails);
  });

  test('should show hover areas in console logs', async ({ page }) => {
    // Collect console logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('hover') || msg.text().includes('Hover')) {
        logs.push(msg.text());
      }
    });

    // Scroll to map
    await page.locator('[data-map-section]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    // Wait for 3D view to load
    await page.waitForSelector('text=/CesiumJS/i', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Log collected messages
    console.log('\n=== Console messages about hover locations ===');
    logs.forEach(log => console.log(log));
    console.log('=== End of console messages ===\n');

    // Verify we got some hover-related logs
    expect(logs.length).toBeGreaterThan(0);
  });

  test('should verify hover location data from API', async ({ page }) => {
    // Intercept the patterns API call
    let patternsData: any = null;

    await page.route('**/api/v1/flights/76/patterns', async (route) => {
      const response = await route.fetch();
      patternsData = await response.json();
      await route.fulfill({ response });
    });

    // Reload to trigger API calls
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for the patterns API to be called
    await page.waitForTimeout(2000);

    // Log the patterns data
    console.log('\n=== Flight 76 Patterns API Response ===');
    console.log(JSON.stringify(patternsData, null, 2));
    console.log('=== End of API Response ===\n');

    // Verify we got hover locations
    expect(patternsData).toBeTruthy();
    if (patternsData && patternsData.hover_locations) {
      console.log(`\nFound ${patternsData.hover_locations.length} hover locations:`);
      patternsData.hover_locations.forEach((loc: any, idx: number) => {
        console.log(`  Hover ${idx + 1}:`);
        console.log(`    Position: ${loc.latitude}, ${loc.longitude}`);
        console.log(`    Duration: ${loc.duration_minutes} minutes`);
        console.log(`    Positions: ${loc.position_count}`);
        console.log(`    Time: ${loc.start_time} to ${loc.end_time}`);
      });
    }
  });

  test('should compare hover locations with actual flight positions', async ({ page }) => {
    // Intercept both API calls
    let patternsData: any = null;
    let positionsData: any = null;

    await page.route('**/api/v1/flights/76/patterns', async (route) => {
      const response = await route.fetch();
      patternsData = await response.json();
      await route.fulfill({ response });
    });

    await page.route('**/api/v1/flights/76/positions', async (route) => {
      const response = await route.fetch();
      positionsData = await response.json();
      await route.fulfill({ response });
    });

    // Reload to trigger API calls
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('\n=== Comparing Hover Locations with Flight Positions ===\n');

    if (patternsData?.hover_locations && positionsData) {
      console.log(`Total positions: ${positionsData.length}`);
      console.log(`Hover locations detected: ${patternsData.hover_locations.length}\n`);

      patternsData.hover_locations.forEach((hover: any, idx: number) => {
        console.log(`\nHover Location ${idx + 1}:`);
        console.log(`  Centroid: ${hover.latitude.toFixed(6)}, ${hover.longitude.toFixed(6)}`);
        console.log(`  Duration: ${hover.duration_minutes.toFixed(2)} min (${hover.position_count} positions)`);

        // Find positions near this hover location (within ~200m)
        const nearbyPositions = positionsData.filter((pos: any) => {
          const latDiff = Math.abs(pos.latitude - hover.latitude);
          const lonDiff = Math.abs(pos.longitude - hover.longitude);
          // Rough approximation: 0.001 degrees ≈ 111 meters
          const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111000;
          return distance < 200; // within 200 meters
        });

        console.log(`  Nearby positions (within 200m): ${nearbyPositions.length}`);

        if (nearbyPositions.length > 0) {
          const avgLat = nearbyPositions.reduce((sum: number, p: any) => sum + p.latitude, 0) / nearbyPositions.length;
          const avgLon = nearbyPositions.reduce((sum: number, p: any) => sum + p.longitude, 0) / nearbyPositions.length;
          console.log(`  Actual position average: ${avgLat.toFixed(6)}, ${avgLon.toFixed(6)}`);

          // Calculate discrepancy
          const latDiff = Math.abs(hover.latitude - avgLat) * 111000;
          const lonDiff = Math.abs(hover.longitude - avgLon) * 111000 * Math.cos(hover.latitude * Math.PI / 180);
          const discrepancy = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
          console.log(`  Discrepancy: ${discrepancy.toFixed(1)} meters`);

          if (discrepancy > 100) {
            console.log(`  ⚠️  WARNING: Large discrepancy detected (>${discrepancy.toFixed(0)}m)`);
          }
        } else {
          console.log(`  ⚠️  WARNING: No positions found near this hover location!`);
        }
      });
    }

    console.log('\n=== End of Comparison ===\n');
  });
});
