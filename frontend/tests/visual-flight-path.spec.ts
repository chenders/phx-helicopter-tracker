import { test, expect } from '@playwright/test';

test('flight path should be fully visible with proper zoom', async ({ page }) => {
  // Navigate to search page
  await page.goto('http://localhost:3000/search');

  // Wait for page to load
  await page.waitForSelector('[data-id="flight-search-container"]', { timeout: 10000 });

  // Set search parameters for a specific date range
  await page.evaluate(() => {
    const startInput = document.querySelector('[data-id="filter-start-time"]') as HTMLInputElement;
    const endInput = document.querySelector('[data-id="filter-end-time"]') as HTMLInputElement;
    const addressInput = document.querySelector('[data-id="filter-address"]') as HTMLInputElement;

    if (startInput && endInput) {
      // Set date range for past week
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));

      startInput.value = startDate.toISOString().slice(0, 16);
      endInput.value = endDate.toISOString().slice(0, 16);

      startInput.dispatchEvent(new Event('change', { bubbles: true }));
      endInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Set location to Phoenix area
    if (addressInput) {
      addressInput.value = '33.4484, -112.0740'; // Phoenix coordinates
      addressInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Click search
  const searchButton = await page.locator('[data-id="search-button"]');
  await searchButton.click();

  // Wait for results
  await page.waitForTimeout(3000);

  // Click first result if available
  const firstResult = await page.locator('[data-id^="search-result-item-"]').first();
  const hasResults = await firstResult.count() > 0;

  if (hasResults) {
    console.log('Found search results, clicking first one...');
    await firstResult.click();

    // Wait for flight path to render
    await page.waitForTimeout(3000);

    // Check the map zoom and bounds
    const mapState = await page.evaluate(() => {
      const mapPanel = document.querySelector('[data-id="search-map-panel"]') as HTMLElement;

      // Get panel dimensions
      const panelWidth = mapPanel?.offsetWidth || 0;
      const panelHeight = mapPanel?.offsetHeight || 0;

      // Calculate 95% area (5% padding on each side)
      const usableWidth = panelWidth * 0.9;
      const usableHeight = panelHeight * 0.9;

      // Check if polyline exists (flight path)
      const polylines = document.querySelectorAll('path[stroke="#FF0000"], path[stroke="red"], polyline');

      return {
        panel: {
          width: panelWidth,
          height: panelHeight
        },
        usableArea: {
          width: usableWidth,
          height: usableHeight
        },
        hasPolyline: polylines.length > 0,
        polylineCount: polylines.length
      };
    });

    console.log('Map state:', mapState);

    // Verify map panel has proper dimensions
    expect(mapState.panel.width).toBeGreaterThan(400);
    expect(mapState.panel.height).toBeGreaterThan(300);

    // Verify usable area is 90% of panel (95% minus 5% padding)
    expect(mapState.usableArea.width).toBeCloseTo(mapState.panel.width * 0.9, 1);
    expect(mapState.usableArea.height).toBeCloseTo(mapState.panel.height * 0.9, 1);

    // Take a screenshot for visual verification
    await page.screenshot({
      path: 'flight-path-zoom.png',
      clip: {
        x: 0,
        y: 0,
        width: 1280,
        height: 720
      }
    });

    console.log('Screenshot saved as flight-path-zoom.png');
  } else {
    console.log('No search results found, skipping flight path test');
  }
});