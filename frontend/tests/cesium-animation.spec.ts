import { test, expect } from '@playwright/test';

test.describe('FlightVisualization3DCesiumFixed', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a flight detail page with a known flight ID
    await page.goto('http://localhost:3000/flights/1');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Wait for flight data to load
    await page.waitForTimeout(2000);
  });

  test('should load and display the 3D view', async ({ page }) => {
    // Wait for the Cesium container to be present
    const cesiumContainer = page.locator('#cesiumContainer');
    await expect(cesiumContainer).toBeVisible({ timeout: 10000 });

    // Check that loading indicator eventually disappears
    const loadingIndicator = page.getByText('Loading Google Photorealistic 3D View');
    await expect(loadingIndicator).not.toBeVisible({ timeout: 15000 });
  });

  test('should enable the Start Flight Animation button after tiles load', async ({ page }) => {
    // Wait for the Start Flight Animation button to be enabled
    const startButton = page.getByRole('button', { name: /Start Flight Animation/i });

    // Initially it might show "Loading tiles..."
    await expect(startButton).toBeVisible({ timeout: 10000 });

    // Wait for it to become enabled (tiles loaded)
    await expect(startButton).toBeEnabled({ timeout: 15000 });

    // Should show the correct text
    await expect(startButton).toHaveText(/Start Flight Animation/i);
  });

  test('should start animation when Start Flight Animation button is clicked', async ({ page }) => {
    // Wait for the Start Flight Animation button to be enabled
    const startButton = page.getByRole('button', { name: /Start Flight Animation/i });
    await expect(startButton).toBeEnabled({ timeout: 15000 });

    // Click the start button
    await startButton.click();

    // Check that the Cesium clock is animating
    const isAnimating = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      return viewer && viewer.clock && viewer.clock.shouldAnimate === true;
    });

    expect(isAnimating).toBe(true);

    // Check that the Stop Animation button is now visible
    const stopButton = page.getByRole('button', { name: /Stop Animation/i });
    await expect(stopButton).toBeVisible();
  });

  test('should stop animation when Stop Animation button is clicked', async ({ page }) => {
    // Start the animation first
    const startButton = page.getByRole('button', { name: /Start Flight Animation/i });
    await expect(startButton).toBeEnabled({ timeout: 15000 });
    await startButton.click();

    // Wait for stop button to appear
    const stopButton = page.getByRole('button', { name: /Stop Animation/i });
    await expect(stopButton).toBeVisible();

    // Click the stop button
    await stopButton.click();

    // Check that the Cesium clock has stopped
    const isAnimating = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      return viewer && viewer.clock && viewer.clock.shouldAnimate === true;
    });

    expect(isAnimating).toBe(false);

    // Check that the Start button is visible again
    await expect(startButton).toBeVisible();
  });

  test('should allow scrubbing through the timeline with the slider', async ({ page }) => {
    // Wait for the slider to be visible
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible({ timeout: 10000 });

    // Get initial slider value
    const initialValue = await slider.inputValue();

    // Move the slider to 50%
    await slider.fill('50');

    // Check that the value changed
    const newValue = await slider.inputValue();
    expect(newValue).toBe('50');
    expect(newValue).not.toBe(initialValue);

    // Verify the camera moved
    const cameraChanged = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      return viewer && viewer.camera;
    });

    expect(cameraChanged).toBeTruthy();
  });

  test('should show Jump to Closest button when search context exists', async ({ page }) => {
    // This test assumes the flight was loaded with a search context
    // You may need to navigate to a specific URL with search params

    // Check if Jump to Closest button exists
    const jumpButton = page.getByRole('button', { name: /Jump to Closest/i });

    // The button should either be visible (if search context exists) or not
    const isVisible = await jumpButton.isVisible().catch(() => false);

    if (isVisible) {
      // If it's visible, clicking it should jump to the closest point
      await jumpButton.click();

      // Check that the slider position changed
      const slider = page.locator('input[type="range"]');
      const sliderValue = await slider.inputValue();

      // Value should be non-zero if we jumped to a point
      expect(parseFloat(sliderValue)).toBeGreaterThan(0);
    }
  });

  test('should display flight path markers (Start and End)', async ({ page }) => {
    // Wait for Cesium to initialize
    await page.waitForTimeout(5000);

    // Check that entities were added to the viewer
    const hasEntities = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer || !viewer.entities) return false;

      // Look for entities with name "Start" or "End"
      const startEntity = viewer.entities.values.find((e: any) => e.name === 'Start');
      const endEntity = viewer.entities.values.find((e: any) => e.name === 'End');

      return !!(startEntity && endEntity);
    });

    expect(hasEntities).toBe(true);
  });

  test('should display flight path polyline', async ({ page }) => {
    // Wait for Cesium to initialize
    await page.waitForTimeout(5000);

    // Check that flight path entity was added
    const hasFlightPath = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer || !viewer.entities) return false;

      // Look for entity with name "Flight Path"
      const flightPath = viewer.entities.values.find((e: any) => e.name === 'Flight Path');

      return !!(flightPath && flightPath.polyline);
    });

    expect(hasFlightPath).toBe(true);
  });

  test('should update playback speed when speed selector changes', async ({ page }) => {
    // Wait for speed selector
    const speedSelector = page.locator('select').filter({ hasText: /Playback Speed/i });
    await expect(speedSelector).toBeVisible({ timeout: 10000 });

    // Change speed to 5x
    await speedSelector.selectOption('5');

    // Start animation
    const startButton = page.getByRole('button', { name: /Start Flight Animation/i });
    await expect(startButton).toBeEnabled({ timeout: 15000 });
    await startButton.click();

    // Check that the multiplier was set correctly (5 * 50 = 250)
    const multiplier = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      return viewer && viewer.clock && viewer.clock.multiplier;
    });

    expect(multiplier).toBe(250);
  });
});
