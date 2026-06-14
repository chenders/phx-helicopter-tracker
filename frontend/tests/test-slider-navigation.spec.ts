import { test } from '@playwright/test';

test('flight timeline slider navigation', async ({ page }) => {
  // Navigate to flight 4 which has 5014 positions
  await page.goto('http://localhost:3000/flight/4');

  // Wait for page to load
  await page.waitForTimeout(5000);

  console.log('Page loaded, checking for slider...');

  // Find the slider
  const slider = await page.locator('input[type="range"]');
  const sliderExists = await slider.count() > 0;

  if (!sliderExists) {
    console.error('Slider not found!');
    return;
  }

  console.log('Slider found, testing navigation...');

  // Get initial state
  const initialValue = await slider.inputValue();
  console.log(`Initial slider value: ${initialValue}`);

  // Get initial camera position from Cesium
  const initialCameraState = await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    if (!viewer) return null;

    const camera = viewer.camera;
    const cartographic = camera.positionCartographic;

    return {
      lat: cartographic ? Cesium.Math.toDegrees(cartographic.latitude) : 0,
      lon: cartographic ? Cesium.Math.toDegrees(cartographic.longitude) : 0,
      height: cartographic ? cartographic.height : 0,
      animationState: viewer.animationState,
      sliderPosition: document.querySelector('input[type="range"]')?.value
    };
  });

  console.log('Initial camera state:', initialCameraState);

  // Test 1: Set slider to 25%
  console.log('\nTest 1: Setting slider to 25%...');

  // Use fill to properly trigger React events
  await slider.fill('25');

  await page.waitForTimeout(2000);

  const after25State = await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    if (!viewer) return null;

    const camera = viewer.camera;
    const cartographic = camera.positionCartographic;
    const sliderEl = document.querySelector('input[type="range"]') as HTMLInputElement;

    return {
      lat: cartographic ? Cesium.Math.toDegrees(cartographic.latitude) : 0,
      lon: cartographic ? Cesium.Math.toDegrees(cartographic.longitude) : 0,
      height: cartographic ? cartographic.height : 0,
      animationState: viewer.animationState,
      sliderValue: sliderEl?.value,
      sliderPosition: sliderEl?.style?.cssText,
      continuousPosition: viewer.animationState?.continuousPosition
    };
  });

  console.log('After 25% state:', after25State);

  // Check if camera actually moved
  if (Math.abs(after25State.lat - initialCameraState.lat) < 0.001) {
    console.error('ERROR: Camera did not move when slider changed to 25%!');
  } else {
    console.log('✓ Camera moved to new position');
  }

  // Check if slider stayed at 25%
  if (after25State.sliderValue !== '25') {
    console.error(`ERROR: Slider reset! Expected 25, got ${after25State.sliderValue}`);
  } else {
    console.log('✓ Slider stayed at 25%');
  }

  // Test 2: Set slider to 75%
  console.log('\nTest 2: Setting slider to 75%...');
  await slider.fill('75');

  await page.waitForTimeout(2000);

  const after75State = await page.evaluate(() => {
    const viewer = (window as any).cesiumViewer;
    if (!viewer) return null;

    const camera = viewer.camera;
    const cartographic = camera.positionCartographic;
    const sliderEl = document.querySelector('input[type="range"]') as HTMLInputElement;

    return {
      lat: cartographic ? Cesium.Math.toDegrees(cartographic.latitude) : 0,
      lon: cartographic ? Cesium.Math.toDegrees(cartographic.longitude) : 0,
      height: cartographic ? cartographic.height : 0,
      sliderValue: sliderEl?.value,
      continuousPosition: viewer.animationState?.continuousPosition,
      currentIndex: viewer.animationState?.currentIndex
    };
  });

  console.log('After 75% state:', after75State);

  // Check if slider stayed at 75%
  if (after75State.sliderValue !== '75') {
    console.error(`ERROR: Slider reset! Expected 75, got ${after75State.sliderValue}`);
  } else {
    console.log('✓ Slider stayed at 75%');
  }

  // Test 3: Drag slider manually
  console.log('\nTest 3: Dragging slider to 50%...');
  const sliderBounds = await slider.boundingBox();
  if (sliderBounds) {
    // Click and drag to middle
    await page.mouse.move(sliderBounds.x + sliderBounds.width * 0.25, sliderBounds.y + sliderBounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(sliderBounds.x + sliderBounds.width * 0.5, sliderBounds.y + sliderBounds.height / 2, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(2000);

    const afterDragState = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      const sliderEl = document.querySelector('input[type="range"]') as HTMLInputElement;

      return {
        sliderValue: sliderEl?.value,
        continuousPosition: viewer?.animationState?.continuousPosition,
        isAnimating: (window as any).isAnimating
      };
    });

    console.log('After drag state:', afterDragState);

    const sliderNum = parseFloat(afterDragState.sliderValue);
    if (sliderNum < 40 || sliderNum > 60) {
      console.error(`ERROR: Slider not at expected position after drag! Got ${afterDragState.sliderValue}`);
    } else {
      console.log('✓ Slider at expected position after drag');
    }
  }

  // Test 4: Check position text update
  const positionText = await page.locator('text=/Position \\d+ of \\d+/').textContent();
  console.log('\nPosition text:', positionText);

  // Take screenshot for debugging
  await page.screenshot({ path: 'slider-test-result.png' });
  console.log('\nScreenshot saved as slider-test-result.png');
});