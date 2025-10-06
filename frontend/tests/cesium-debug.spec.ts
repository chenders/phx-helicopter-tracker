import { test, expect } from '@playwright/test';

test('debug cesium component state', async ({ page }) => {
  // Navigate to flight detail page
  await page.goto('http://localhost:3000/flights/1');
  await page.waitForLoadState('networkidle');

  // Wait a bit for component to render
  await page.waitForTimeout(5000);

  // Take a screenshot to see what's on the page
  await page.screenshot({ path: 'test-results/cesium-debug-screenshot.png', fullPage: true });

  // Log all text content on the page
  const bodyText = await page.locator('body').textContent();
  console.log('Page content:', bodyText);

  // Check for loading indicator
  const loadingIndicator = page.getByText('Loading Google Photorealistic 3D View');
  const isLoadingVisible = await loadingIndicator.isVisible().catch(() => false);
  console.log('Loading indicator visible:', isLoadingVisible);

  // Check for start button
  const startButton = page.getByRole('button', { name: /Start Flight Animation/i });
  const isStartButtonVisible = await startButton.isVisible().catch(() => false);
  console.log('Start button visible:', isStartButtonVisible);

  // Check for Cesium container
  const cesiumContainer = page.locator('#cesiumContainer');
  const isCesiumVisible = await cesiumContainer.isVisible().catch(() => false);
  console.log('Cesium container visible:', isCesiumVisible);

  // Check if viewer exists in global scope
  const viewerExists = await page.evaluate(() => {
    return !!(window as any).cesiumViewer;
  });
  console.log('Cesium viewer exists:', viewerExists);

  // Get all buttons on the page
  const allButtons = await page.locator('button').allTextContents();
  console.log('All buttons on page:', allButtons);

  // Check for any error messages
  const errorText = await page.locator('text=/error/i').textContent().catch(() => null);
  console.log('Error messages:', errorText);

  // Check if flight details are visible
  const flightDetailsVisible = await page.locator('text=/Flight Details/i').isVisible().catch(() => false);
  console.log('Flight Details visible:', flightDetailsVisible);

  // Check the URL
  console.log('Current URL:', page.url());

  // Wait for any API calls
  await page.waitForTimeout(2000);

  // Check console logs
  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));
  console.log('Console logs:', logs);
});
