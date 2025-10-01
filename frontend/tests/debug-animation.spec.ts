import { test, expect } from '@playwright/test';

test('debug animation', async ({ page }) => {
  // Collect console logs
  const logs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    // Log everything for debugging
    logs.push(text);
    console.log('[CONSOLE]', text);
  });

  // Navigate to flight page
  await page.goto('http://localhost:3000/flight/103');

  // Wait for Cesium
  await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 20000 });
  await page.waitForTimeout(3000);

  // Set slowest speed
  const speedSelector = page.locator('select').first();
  await speedSelector.selectOption('0.1');

  // Start animation
  const startButton = page.locator('button:has-text("Start Flight Animation")');
  await expect(startButton).toBeVisible({ timeout: 10000 });
  await startButton.click();

  // Wait and collect logs
  await page.waitForTimeout(5000);

  // Print last 30 logs
  console.log('\n=== Last 30 Animation Logs ===');
  logs.slice(-30).forEach(log => console.log(log));
  console.log(`Total logs: ${logs.length}`);

  // Check viewer state
  const state = await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    if (!viewer) return null;
    return {
      hasViewer: true,
      animationState: viewer.animationState,
      googleTileset: !!viewer.googleTileset,
      tilesetReady: viewer.googleTileset?.ready
    };
  });

  console.log('\n=== Viewer State ===');
  console.log(JSON.stringify(state, null, 2));

  // The test passes as long as we got some debug info
  expect(logs.length).toBeGreaterThan(0);
});