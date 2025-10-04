import { test, expect } from '@playwright/test';

test('search results should scroll independently of map', async ({ page }) => {
  // Navigate to search page
  await page.goto('http://localhost:3000/search');

  // Wait for page structure to load
  await page.waitForSelector('[data-id="flight-search-container"]', { timeout: 10000 });
  await page.waitForSelector('[data-id="search-map-panel"]', { timeout: 10000 });

  // Get container dimensions
  const dimensions = await page.evaluate(() => {
    const resultsPanel = document.querySelector('[data-id="search-results-panel"]') as HTMLElement;
    const resultsList = document.querySelector('[data-id="search-results-list"]') as HTMLElement;
    const mapPanel = document.querySelector('[data-id="search-map-panel"]') as HTMLElement;
    const viewportHeight = window.innerHeight;

    // Get computed styles
    const resultsStyle = resultsPanel ? window.getComputedStyle(resultsPanel) : null;
    const listStyle = resultsList ? window.getComputedStyle(resultsList) : null;

    return {
      viewportHeight,
      resultsPanel: {
        height: resultsPanel?.offsetHeight || 0,
        maxHeight: resultsStyle?.maxHeight || 'none',
        hasMaxHeight: resultsStyle?.maxHeight?.includes('vh') || resultsStyle?.maxHeight?.includes('px'),
        className: resultsPanel?.className || ''
      },
      resultsList: {
        hasOverflow: listStyle?.overflowY === 'auto' || listStyle?.overflowY === 'scroll',
        overflowY: listStyle?.overflowY || 'none'
      },
      mapPanel: {
        height: mapPanel?.offsetHeight || 0,
        maxHeight: mapPanel ? window.getComputedStyle(mapPanel).maxHeight : 'none'
      }
    };
  });

  console.log('Scroll test dimensions:', dimensions);

  // Panels should be height-constrained to fit within viewport
  expect(dimensions.resultsPanel.height).toBeLessThanOrEqual(dimensions.viewportHeight * 0.8); // Should use most of viewport
  expect(dimensions.resultsPanel.height).toBeGreaterThan(400); // But should be reasonably sized

  // Results list should have overflow scroll
  expect(dimensions.resultsList.hasOverflow).toBe(true);

  // Map should also be height constrained
  expect(dimensions.mapPanel.height).toBeLessThanOrEqual(dimensions.viewportHeight * 0.8);

  // Both panels should have similar heights
  const heightDiff = Math.abs(dimensions.resultsPanel.height - dimensions.mapPanel.height);
  expect(heightDiff).toBeLessThanOrEqual(50); // Allow small difference for padding/borders
});