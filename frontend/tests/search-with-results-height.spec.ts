import { test, expect } from '@playwright/test';

test('map height should remain constant when search results are shown', async ({ page }) => {
  // Listen for API calls
  let apiCallMade = false;
  page.on('request', request => {
    if (request.url().includes('/api/v1/flights/search')) {
      console.log('API call made:', request.url());
      apiCallMade = true;
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/v1/flights/search')) {
      console.log('API response:', response.status(), response.url());
    }
  });

  // Navigate to search page
  await page.goto('http://localhost:3000/search');

  // Wait for page to load
  await page.waitForSelector('[data-id="flight-search-container"]', { timeout: 10000 });
  await page.waitForSelector('[data-id="search-map-panel"]', { timeout: 10000 });

  // Get initial dimensions before search
  const dimensionsBefore = await page.evaluate(() => {
    const mapPanel = document.querySelector('[data-id="search-map-panel"]') as HTMLElement;
    const resultsPanel = document.querySelector('[data-id="search-results-panel"]') as HTMLElement;
    const mainContent = document.querySelector('[data-id="search-main-content"]') as HTMLElement;

    return {
      mapHeight: mapPanel?.offsetHeight || 0,
      resultsHeight: resultsPanel?.offsetHeight || 0,
      mainContentHeight: mainContent?.offsetHeight || 0,
      viewportHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight
    };
  });

  console.log('Dimensions BEFORE search:', dimensionsBefore);

  // Fill in search parameters with better date handling
  const startInput = await page.locator('[data-id="filter-start-time"]');
  const endInput = await page.locator('[data-id="filter-end-time"]');

  // Clear and set date range for last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  await startInput.fill(startDate.toISOString().slice(0, 16));
  await endInput.fill(endDate.toISOString().slice(0, 16));

  console.log('Date range set:', {
    start: startDate.toISOString().slice(0, 16),
    end: endDate.toISOString().slice(0, 16)
  });

  // Set a Phoenix coordinate directly (skip autocomplete complexity)
  const addressInput = await page.locator('[data-id="filter-location"]');
  await addressInput.fill('33.4484, -112.0740');

  // Set radius to 5 miles to get more results
  const radiusInput = await page.locator('[data-id="filter-radius"]');
  await radiusInput.fill('5');

  // Click search button
  const searchButton = await page.locator('[data-id="search-button"]');

  // Verify button exists and is visible
  await expect(searchButton).toBeVisible();
  console.log('Search button found, clicking...');

  await searchButton.click();
  console.log('Search button clicked');

  // Wait for loading to start and complete
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-id="search-button"]');
    return button?.textContent?.includes('Searching');
  }, { timeout: 5000 }).catch(() => console.log('Loading state not detected'));

  // Wait for search to complete and results to load
  await page.waitForTimeout(3000);

  // Check if search actually happened
  const searchState = await page.evaluate(() => {
    const button = document.querySelector('[data-id="search-button"]');
    const resultsList = document.querySelector('[data-id="search-results-list"]');
    return {
      buttonText: button?.textContent || 'not found',
      resultsListExists: !!resultsList
    };
  });

  console.log('Search state after clicking:', searchState);

  // Get dimensions after search with results
  const dimensionsAfter = await page.evaluate(() => {
    const mapPanel = document.querySelector('[data-id="search-map-panel"]') as HTMLElement;
    const resultsPanel = document.querySelector('[data-id="search-results-panel"]') as HTMLElement;
    const resultsList = document.querySelector('[data-id="search-results-list"]') as HTMLElement;
    const mainContent = document.querySelector('[data-id="search-main-content"]') as HTMLElement;

    // Count search results
    const resultItems = document.querySelectorAll('[data-id^="search-result-item-"]');

    return {
      mapHeight: mapPanel?.offsetHeight || 0,
      resultsHeight: resultsPanel?.offsetHeight || 0,
      resultsListHeight: resultsList?.offsetHeight || 0,
      mainContentHeight: mainContent?.offsetHeight || 0,
      viewportHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      resultsCount: resultItems.length,
      needsScroll: document.documentElement.scrollHeight > window.innerHeight
    };
  });

  console.log('Dimensions AFTER search:', dimensionsAfter);

  // Calculate changes
  const mapHeightChange = dimensionsAfter.mapHeight - dimensionsBefore.mapHeight;
  const scrollHeightChange = dimensionsAfter.scrollHeight - dimensionsBefore.scrollHeight;

  console.log('Changes:', {
    mapHeightChange,
    scrollHeightChange,
    resultsFound: dimensionsAfter.resultsCount,
    apiCallMade
  });

  // Map height should remain constant regardless of search results
  expect(Math.abs(mapHeightChange)).toBeLessThanOrEqual(5); // Allow 5px tolerance for borders/padding

  // Page should not require scrolling even with results
  expect(dimensionsAfter.needsScroll).toBe(false);

  // Both panels should remain the same height
  expect(dimensionsAfter.mapHeight).toBe(dimensionsAfter.resultsHeight);

  // Main content area should not have grown
  expect(Math.abs(dimensionsAfter.mainContentHeight - dimensionsBefore.mainContentHeight)).toBeLessThanOrEqual(5);

  // Scroll height should remain roughly the same (within viewport)
  expect(dimensionsAfter.scrollHeight).toBeLessThanOrEqual(dimensionsAfter.viewportHeight + 10); // 10px tolerance

  // Take screenshot for visual verification
  await page.screenshot({
    path: 'search-with-results.png',
    fullPage: true
  });
  console.log('Screenshot saved as search-with-results.png');
});