import { test, expect } from '@playwright/test';

test('debug search page structure', async ({ page }) => {
  // Navigate to search page
  await page.goto('http://localhost:3000');

  // Wait a bit for page to load
  await page.waitForTimeout(3000);

  // Get page structure
  const structure = await page.evaluate(() => {
    // Find all data-id elements
    const dataIdElements = Array.from(document.querySelectorAll('[data-id]')).map(el => ({
      dataId: el.getAttribute('data-id'),
      tagName: el.tagName.toLowerCase(),
      className: el.className,
      visible: (el as HTMLElement).offsetHeight > 0
    }));

    // Find the main container
    const container = document.querySelector('[data-id="flight-search-container"]');
    const mapPanel = document.querySelector('[data-id="search-map-panel"]');

    // Check for Google Maps
    const googleMaps = document.querySelector('[role="application"]');
    const mapCanvas = document.querySelector('.gm-style');

    return {
      hasContainer: !!container,
      hasMapPanel: !!mapPanel,
      hasGoogleMaps: !!googleMaps,
      hasMapCanvas: !!mapCanvas,
      dataIdElements,
      bodyClasses: document.body.className,
      title: document.title,
      url: window.location.pathname
    };
  });

  console.log('Page structure:', JSON.stringify(structure, null, 2));

  // Also take a screenshot
  await page.screenshot({ path: 'search-page-debug.png', fullPage: true });

  expect(structure.url).toBe('/');
});