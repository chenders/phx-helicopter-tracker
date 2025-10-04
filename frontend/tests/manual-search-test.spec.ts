import { test, expect } from '@playwright/test';

test('manual test - check map height behavior', async ({ page }) => {
  // Navigate to search page
  await page.goto('http://localhost:3000/search');

  // Wait for page to load
  await page.waitForSelector('[data-id="flight-search-container"]', { timeout: 10000 });

  // Pause for manual testing
  console.log('\n=== MANUAL TEST MODE ===');
  console.log('1. Enter search criteria manually');
  console.log('2. Click Search button');
  console.log('3. Observe if map height changes');
  console.log('4. Check if page scrolls');
  console.log('\nWaiting 60 seconds for manual testing...\n');

  // Give time for manual testing
  await page.waitForTimeout(60000);

  // Get final dimensions
  const dimensions = await page.evaluate(() => {
    const mapPanel = document.querySelector('[data-id="search-map-panel"]') as HTMLElement;
    const resultsPanel = document.querySelector('[data-id="search-results-panel"]') as HTMLElement;
    const resultItems = document.querySelectorAll('[data-id^="search-result-item-"]');

    return {
      mapHeight: mapPanel?.offsetHeight || 0,
      resultsHeight: resultsPanel?.offsetHeight || 0,
      viewportHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      resultsCount: resultItems.length,
      needsScroll: document.documentElement.scrollHeight > window.innerHeight
    };
  });

  console.log('\n=== Final State ===');
  console.log('Map height:', dimensions.mapHeight);
  console.log('Results height:', dimensions.resultsHeight);
  console.log('Results found:', dimensions.resultsCount);
  console.log('Page needs scroll:', dimensions.needsScroll);
  console.log('Scroll height:', dimensions.scrollHeight);
  console.log('Viewport height:', dimensions.viewportHeight);

  // The test should always pass for manual inspection
  expect(true).toBe(true);
});