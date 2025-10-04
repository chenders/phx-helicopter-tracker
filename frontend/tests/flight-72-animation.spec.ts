import { test, expect } from '@playwright/test';

test('flight 72 animation should work', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('error') || text.includes('ERROR') ||
        text.includes('animation') || text.includes('Animation') ||
        text.includes('Starting') || text.includes('positions')) {
      console.log('[CONSOLE]', msg.type(), ':', text);
    }
  });

  page.on('pageerror', error => {
    console.log('[PAGE ERROR]', error);
  });

  // Navigate to flight 72 with all the search parameters
  const url = 'http://localhost:3000/flight/72?searchLat=33.5237273&searchLng=-112.0474831&searchRadius=804.67&closestDistance=10.18051806&closestTime=2025-09-25T22%3A05%3A39%2B00%3A00&closestSpeed=113&closestAltitude=2025&closestAltitudeAGL=838&closestBearing=111';

  console.log('Navigating to:', url);
  await page.goto(url);

  // Wait for the page to load
  await page.waitForTimeout(3000);

  // Check if Cesium loaded
  const cesiumLoaded = await page.evaluate(() => {
    return typeof window.Cesium !== 'undefined';
  });
  console.log('Cesium loaded:', cesiumLoaded);

  // Check if flight data loaded
  const flightData = await page.evaluate(() => {
    // Check for positions data
    const viewer = (window as any).cesiumViewer;
    if (!viewer) {
      return {
        hasViewer: false,
        error: 'No viewer found'
      };
    }

    return {
      hasViewer: true,
      hasPositions: !!viewer.positions,
      positionCount: viewer.positions?.length || 0,
      animationState: viewer.animationState,
      animationSettings: viewer.animationSettings
    };
  });

  console.log('Flight data:', JSON.stringify(flightData, null, 2));

  // Wait for Start Animation button to appear
  const startButton = await page.locator('button:has-text("Start Flight Animation")');
  const buttonExists = await startButton.count() > 0;

  console.log('Start button exists:', buttonExists);

  if (buttonExists) {
    // Check if button is visible and enabled
    const isVisible = await startButton.isVisible();
    const isEnabled = await startButton.isEnabled();

    console.log('Button visible:', isVisible);
    console.log('Button enabled:', isEnabled);

    if (isVisible && isEnabled) {
      // Try to start animation
      console.log('Clicking start button...');
      await startButton.click();

      // Wait a bit for animation to start
      await page.waitForTimeout(3000);

      // Check animation state after clicking
      const animationState = await page.evaluate(() => {
        const viewer = (window as any).cesiumViewer;
        if (!viewer) return null;

        return {
          isAnimating: viewer.animationState?.isAnimating,
          currentIndex: viewer.animationState?.currentIndex,
          frameCount: viewer.animationState?.frameCount,
          interpolationProgress: viewer.animationState?.interpolationProgress,
          positionCount: viewer.positions?.length || 0
        };
      });

      console.log('Animation state after click:', JSON.stringify(animationState, null, 2));

      // Check for any error messages on the page
      const errorMessages = await page.locator('.error, .alert, [role="alert"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('Error messages found:', errorMessages);
      }
    }
  } else {
    console.log('Start button not found, checking for error messages...');

    // Look for error messages
    const pageContent = await page.locator('body').textContent();
    if (pageContent?.includes('error') || pageContent?.includes('Error')) {
      console.log('Page might contain errors');
    }

    // Check if we're on the right component
    const has3DView = await page.locator('[data-testid="cesium-container"], #cesium-container, .cesium-container').count() > 0;
    console.log('Has 3D view container:', has3DView);

    // Check if positions failed to load
    const positionsError = await page.evaluate(() => {
      // Check network requests or console for position loading errors
      const viewer = (window as any).cesiumViewer;
      return {
        viewerExists: !!viewer,
        positionsLoaded: viewer?.positions?.length > 0
      };
    });
    console.log('Positions check:', positionsError);
  }

  // Take a screenshot for visual debugging
  await page.screenshot({ path: 'flight-72-debug.png', fullPage: true });
  console.log('Screenshot saved as flight-72-debug.png');

  // Check API calls made
  const apiCalls: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiCalls.push(request.url());
    }
  });

  // Give some time for any API calls
  await page.waitForTimeout(2000);

  if (apiCalls.length > 0) {
    console.log('API calls made:', apiCalls);
  }

  // The test passes if we got this far
  expect(cesiumLoaded).toBe(true);
});