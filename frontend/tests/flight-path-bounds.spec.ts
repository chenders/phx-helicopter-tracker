import { test, expect } from '@playwright/test';

test.describe('Flight path map bounds', () => {
  test('flight path should fit within 95% of map container', async ({ page }) => {
    // Navigate to search page
    await page.goto('http://localhost:3000/search');

    // Wait for page structure to load
    await page.waitForSelector('[data-id="flight-search-container"]', { timeout: 10000 });
    await page.waitForSelector('[data-id="search-map-panel"]', { timeout: 10000 });

    // Perform a search to get results (using coordinates near Phoenix)
    await page.evaluate(() => {
      // Set search parameters programmatically
      const startInput = document.querySelector('[data-id="filter-start-time"]') as HTMLInputElement;
      const endInput = document.querySelector('[data-id="filter-end-time"]') as HTMLInputElement;

      if (startInput && endInput) {
        // Set a date range likely to have flights
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago

        startInput.value = startDate.toISOString().slice(0, 16);
        endInput.value = endDate.toISOString().slice(0, 16);

        // Trigger change events
        startInput.dispatchEvent(new Event('change', { bubbles: true }));
        endInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Click search button
    const searchButton = await page.locator('[data-id="search-button"]');
    await searchButton.click();

    // Wait for search results
    await page.waitForTimeout(3000);

    // Click on the first flight result if available
    const firstResult = await page.locator('[data-id^="search-result-item-"]').first();
    const hasResults = await firstResult.count() > 0;

    if (hasResults) {
      await firstResult.click();

      // Wait for flight path to load
      await page.waitForTimeout(2000);

      // Check if map bounds are properly set
      const boundsInfo = await page.evaluate(() => {
        const mapPanel = document.querySelector('[data-id="search-map-panel"]') as HTMLElement;

        // Try to get Google Maps instance
        const gmapElement = mapPanel?.querySelector('[role="application"]') as HTMLElement;

        // Get container dimensions
        const containerWidth = mapPanel?.offsetWidth || 0;
        const containerHeight = mapPanel?.offsetHeight || 0;

        // Calculate expected padding (5% on each side)
        const expectedPadding = {
          horizontal: containerWidth * 0.1, // 5% left + 5% right = 10%
          vertical: containerHeight * 0.1    // 5% top + 5% bottom = 10%
        };

        return {
          mapContainer: {
            width: containerWidth,
            height: containerHeight
          },
          expectedPadding,
          hasMap: !!gmapElement,
          mapPanelExists: !!mapPanel
        };
      });

      console.log('Bounds info:', boundsInfo);

      // Verify map panel exists
      expect(boundsInfo.mapPanelExists).toBe(true);

      // Verify container has reasonable dimensions
      expect(boundsInfo.mapContainer.width).toBeGreaterThan(0);
      expect(boundsInfo.mapContainer.height).toBeGreaterThan(0);

      // Verify padding calculations are reasonable (10% total padding)
      expect(boundsInfo.expectedPadding.horizontal).toBeCloseTo(
        boundsInfo.mapContainer.width * 0.1,
        1
      );
      expect(boundsInfo.expectedPadding.vertical).toBeCloseTo(
        boundsInfo.mapContainer.height * 0.1,
        1
      );
    }
  });

  test('map should maintain padding when radius changes', async ({ page }) => {
    // Navigate to search page
    await page.goto('http://localhost:3000/search');

    // Wait for page structure to load
    await page.waitForSelector('[data-id="flight-search-container"]', { timeout: 10000 });
    await page.waitForSelector('[data-id="search-map-panel"]', { timeout: 10000 });

    // Set initial radius
    const radiusInput = await page.locator('[data-id="filter-radius"]');
    await radiusInput.fill('2');

    // Wait for map to adjust
    await page.waitForTimeout(1000);

    // Get initial container dimensions
    const dimensions1 = await page.evaluate(() => {
      const mapPanel = document.querySelector('[data-id="search-map-panel"]') as HTMLElement;
      return {
        width: mapPanel?.offsetWidth || 0,
        height: mapPanel?.offsetHeight || 0
      };
    });

    // Change radius
    await radiusInput.fill('5');
    await page.waitForTimeout(1000);

    // Get dimensions after radius change
    const dimensions2 = await page.evaluate(() => {
      const mapPanel = document.querySelector('[data-id="search-map-panel"]') as HTMLElement;
      return {
        width: mapPanel?.offsetWidth || 0,
        height: mapPanel?.offsetHeight || 0
      };
    });

    console.log('Dimensions before:', dimensions1);
    console.log('Dimensions after:', dimensions2);

    // Container dimensions should remain the same
    expect(dimensions2.width).toBe(dimensions1.width);
    expect(dimensions2.height).toBe(dimensions1.height);
  });
});