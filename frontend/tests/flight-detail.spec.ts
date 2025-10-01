import { test, expect } from '@playwright/test';

test.describe('Flight Detail Page', () => {
  // Use a known flight ID with downloaded data
  const testFlightId = '103'; // N623FB flight with 3290 GPS points

  test.beforeEach(async ({ page }) => {
    // Navigate to flight detail page
    await page.goto(`http://localhost:3000/flight/${testFlightId}`);

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should load flight details', async ({ page }) => {
    // Check that basic flight info is displayed
    await expect(page.locator('text=/N\\d{3}FB/')).toBeVisible();

    // Check for key metrics
    await expect(page.locator('text=Duration')).toBeVisible();
    await expect(page.locator('text=Distance')).toBeVisible();
    await expect(page.locator('text=Avg Speed')).toBeVisible();

    // Verify speed is shown in MPH with knots
    const speedElement = await page.locator('text=/\\d+\\.\\d{1,2} mph/');
    await expect(speedElement).toBeVisible();
  });

  test('should load 3D visualization', async ({ page }) => {
    // Wait for Cesium to load
    await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 10000 });

    // Check for the 3D map container
    const cesiumContainer = page.locator('#cesiumContainer');
    await expect(cesiumContainer).toBeVisible();

    // Wait for tiles to load
    await page.waitForTimeout(3000);

    // Check console for tile loading
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    await page.waitForFunction(
      () => {
        const logs = document.querySelector('#cesiumContainer');
        return logs !== null;
      },
      { timeout: 10000 }
    );

    // Verify Google tiles loaded
    expect(consoleMessages.some(msg => msg.includes('Google 3D Tiles ready'))).toBeTruthy();
  });

  test('3D animation should play multiple frames', async ({ page }) => {
    // Wait for Cesium to fully load
    await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Collect console logs
    const animationLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('FRAME') || text.includes('Animation frame')) {
        animationLogs.push(text);
        console.log('Animation log:', text);
      }
    });

    // Click the start animation button
    const startButton = page.locator('button:has-text("Start Flight Animation")');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Wait for animation frames
    await page.waitForTimeout(5000);

    // Check that we got multiple frames
    const frameNumbers = animationLogs
      .filter(log => log.includes('FRAME'))
      .map(log => {
        const match = log.match(/FRAME (\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);

    console.log('Frame numbers detected:', frameNumbers);

    // Verify animation progressed beyond frame 1
    expect(frameNumbers.length).toBeGreaterThan(1);
    expect(Math.max(...frameNumbers)).toBeGreaterThan(1);

    // Check if animation state is updating
    const animationState = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      return viewer?.animationState || null;
    });

    console.log('Animation state:', animationState);

    if (animationState) {
      expect(animationState.frameCount).toBeGreaterThan(1);
    }
  });

  test('should display speed in MPH and knots', async ({ page }) => {
    // Check average speed format
    const avgSpeed = page.locator('text=Avg Speed').locator('..');
    const speedText = await avgSpeed.textContent();

    // Should show format like "XX.XX mph (YY.YY kts)"
    expect(speedText).toMatch(/\d+\.\d{1,2} mph/);
    expect(speedText).toMatch(/\(\d+\.\d{1,2} kts\)/);
  });

  test('all numbers should have max 2 decimal places', async ({ page }) => {
    // Check duration
    const duration = await page.locator('text=Duration').locator('..').textContent();
    const durationMatch = duration?.match(/(\d+\.\d+)/);
    if (durationMatch) {
      const decimals = durationMatch[1].split('.')[1];
      expect(decimals.length).toBeLessThanOrEqual(2);
    }

    // Check distance
    const distance = await page.locator('text=Distance').locator('..').textContent();
    const distanceMatch = distance?.match(/(\d+\.\d+)/);
    if (distanceMatch) {
      const decimals = distanceMatch[1].split('.')[1];
      expect(decimals.length).toBeLessThanOrEqual(2);
    }
  });
});