import { test, expect } from '@playwright/test';

test.describe('Search page map height', () => {
  test('map should not be taller than viewport', async ({ page }) => {
    // Navigate to search page
    await page.goto('http://localhost:3000/search');

    // Wait for page structure to load
    await page.waitForSelector('[data-id="flight-search-container"]', { timeout: 10000 });

    // Wait for map panel to load (don't wait for Google Maps as it may take too long)
    await page.waitForSelector('[data-id="search-map-panel"]', { timeout: 10000 });

    // Get viewport and map dimensions
    const dimensions = await page.evaluate(() => {
      const mapPanel = document.querySelector('[data-id="search-map-panel"]') as HTMLElement;
      const mapElement = mapPanel?.querySelector('[role="application"]') as HTMLElement; // Google Map element
      const mapContainer = mapPanel?.parentElement as HTMLElement;
      const viewportHeight = window.innerHeight;
      const mapPanelHeight = mapPanel?.offsetHeight || 0;
      const mapHeight = mapElement?.offsetHeight || 0;
      const mapContainerHeight = mapContainer?.offsetHeight || 0;

      // Get the computed style
      const mapStyle = mapElement ? window.getComputedStyle(mapElement) : null;
      const containerStyle = mapContainer ? window.getComputedStyle(mapContainer) : null;

      // Check if any results are visible without scrolling
      const resultsSection = document.querySelector('[class*="results"]') ||
                            document.querySelector('[class*="flight"]') ||
                            document.querySelector('h2');

      const resultsBounds = resultsSection?.getBoundingClientRect();
      const resultsVisible = resultsBounds ? resultsBounds.top < viewportHeight : false;

      return {
        viewportHeight,
        mapPanelHeight,
        mapHeight,
        mapContainerHeight,
        mapHeightStyle: mapStyle?.height || 'not found',
        containerHeightStyle: containerStyle?.height || 'not found',
        mapClasses: mapElement?.className || 'not found',
        containerClasses: mapContainer?.className || 'not found',
        resultsVisible,
        resultsTop: resultsBounds?.top || -1,
        scrollHeight: document.documentElement.scrollHeight,
        needsScroll: document.documentElement.scrollHeight > viewportHeight
      };
    });

    console.log('Map dimensions:', dimensions);

    // The map panel should not be taller than the viewport
    expect(dimensions.mapPanelHeight).toBeLessThanOrEqual(dimensions.viewportHeight);

    // Map itself should also not be taller than viewport
    if (dimensions.mapHeight > 0) {
      expect(dimensions.mapHeight).toBeLessThanOrEqual(dimensions.viewportHeight);
    }

    // Results section should be at least partially visible without scrolling
    expect(dimensions.resultsVisible).toBe(true);

    // Map panel should fit within viewport (allowing up to 80% for content area)
    const maxReasonableHeight = dimensions.viewportHeight * 0.8;
    expect(dimensions.mapPanelHeight).toBeLessThanOrEqual(maxReasonableHeight);

    // Most importantly, page should not need scrolling
    expect(dimensions.needsScroll).toBe(false);
  });

  test('flight results should be visible without excessive scrolling', async ({ page }) => {
    // Navigate to search page
    await page.goto('http://localhost:3000/search');

    // Wait for page structure to load
    await page.waitForSelector('[data-id="flight-search-container"]', { timeout: 10000 });

    // Wait for map panel to load (don't wait for Google Maps as it may take too long)
    await page.waitForSelector('[data-id="search-map-panel"]', { timeout: 10000 });

    // Perform a search to get some results
    // Click near a known location to trigger search
    const map = await page.locator('[data-id="search-map-panel"] [role="application"]');
    await map.click({ position: { x: 400, y: 300 } });

    // Wait for potential results
    await page.waitForTimeout(2000);

    // Check if we need to scroll to see content
    const scrollInfo = await page.evaluate(() => {
      const firstHeading = Array.from(document.querySelectorAll('h2, h3')).find(h =>
        h.textContent?.includes('Flight') ||
        h.textContent?.includes('Search') ||
        h.textContent?.includes('Results')
      );

      const headingBounds = firstHeading?.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      return {
        hasHeading: !!firstHeading,
        headingText: firstHeading?.textContent || 'none',
        headingTop: headingBounds?.top || -1,
        viewportHeight,
        headingVisibleWithoutScroll: headingBounds ? headingBounds.top < viewportHeight : false,
        scrollNeeded: headingBounds ? Math.max(0, headingBounds.top - viewportHeight + 100) : 0
      };
    });

    console.log('Scroll info:', scrollInfo);

    // Important content should be visible or require minimal scrolling
    if (scrollInfo.hasHeading) {
      // If there's content, it should require less than 200px of scrolling to see
      expect(scrollInfo.scrollNeeded).toBeLessThanOrEqual(200);
    }
  });

  test('map container should have proper height constraints', async ({ page }) => {
    // Navigate to search page
    await page.goto('http://localhost:3000/search');

    // Wait for page structure to load
    await page.waitForSelector('[data-id="flight-search-container"]', { timeout: 10000 });

    // Wait for map panel to load (don't wait for Google Maps as it may take too long)
    await page.waitForSelector('[data-id="search-map-panel"]', { timeout: 10000 });

    // Check CSS classes and styles
    const mapStyles = await page.evaluate(() => {
      const mapPanel = document.querySelector('[data-id="search-map-panel"]') as HTMLElement;
      const mapElement = mapPanel?.querySelector('[role="application"]') as HTMLElement;
      const container = mapPanel?.closest('[class*="h-screen"], [class*="h-full"], [class*="h-\\["], [class*="max-h-"]') as HTMLElement;

      // Find any height-related tailwind classes
      const heightClasses = Array.from(mapElement?.classList || []).filter(c =>
        c.includes('h-') || c.includes('max-h-') || c.includes('min-h-')
      );

      const containerHeightClasses = Array.from(container?.classList || []).filter(c =>
        c.includes('h-') || c.includes('max-h-') || c.includes('min-h-')
      );

      return {
        mapId: mapElement?.id,
        mapHeightClasses,
        containerHeightClasses,
        hasHeightConstraint: heightClasses.length > 0 || containerHeightClasses.length > 0,
        computedHeight: mapElement ? window.getComputedStyle(mapElement).height : 'none',
        isUsingViewportHeight: heightClasses.some(c => c.includes('vh') || c.includes('screen'))
      };
    });

    console.log('Map styles:', mapStyles);

    // Map should have height constraints
    expect(mapStyles.hasHeightConstraint).toBe(true);

    // Should not be using full viewport height
    expect(mapStyles.isUsingViewportHeight).toBe(false);
  });
});