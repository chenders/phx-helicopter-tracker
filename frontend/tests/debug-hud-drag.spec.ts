import { test, expect } from '@playwright/test';

test.describe('Debug HUD Drag Behavior', () => {
  const testFlightId = '103';

  test('debug HUD position jump on drag start', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('BROWSER:', msg.text()));

    // Navigate to flight detail page
    await page.goto(`http://localhost:3000/flight/${testFlightId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1500);

    // Find HUD
    const hud = page.locator('.absolute.z-40').filter({ has: page.locator('text=SPEED') });
    await expect(hud).toBeVisible();

    // Get initial position
    const initialBox = await hud.boundingBox();
    if (!initialBox) throw new Error('HUD not found');

    console.log('\n=== INITIAL STATE ===');
    console.log('Initial bounding box:', {
      x: initialBox.x,
      y: initialBox.y,
      width: initialBox.width,
      height: initialBox.height
    });

    // Get computed style
    const initialStyle = await hud.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        left: computed.left,
        top: computed.top,
        transform: computed.transform,
        position: computed.position
      };
    });
    console.log('Initial computed style:', initialStyle);

    // Get React state (if accessible)
    const initialState = await hud.evaluate((el) => {
      return {
        styleLeft: (el as HTMLElement).style.left,
        styleTop: (el as HTMLElement).style.top,
        styleTransform: (el as HTMLElement).style.transform
      };
    });
    console.log('Initial inline styles:', initialState);

    // Calculate click point (center of HUD)
    const clickX = initialBox.x + initialBox.width / 2;
    const clickY = initialBox.y + initialBox.height / 2;
    console.log('Click point:', { clickX, clickY });

    // Move mouse to click point
    await page.mouse.move(clickX, clickY);
    await page.waitForTimeout(100);

    console.log('\n=== MOUSE DOWN ===');

    // Mouse down (start drag)
    await page.mouse.down();
    await page.waitForTimeout(50);

    // Get position immediately after mouse down
    const afterMouseDownBox = await hud.boundingBox();
    if (!afterMouseDownBox) throw new Error('HUD disappeared after mouse down');

    console.log('After mouse down bounding box:', {
      x: afterMouseDownBox.x,
      y: afterMouseDownBox.y,
      width: afterMouseDownBox.width,
      height: afterMouseDownBox.height
    });

    const afterMouseDownStyle = await hud.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        left: computed.left,
        top: computed.top,
        transform: computed.transform,
        position: computed.position
      };
    });
    console.log('After mouse down computed style:', afterMouseDownStyle);

    const afterMouseDownState = await hud.evaluate((el) => {
      return {
        styleLeft: (el as HTMLElement).style.left,
        styleTop: (el as HTMLElement).style.top,
        styleTransform: (el as HTMLElement).style.transform
      };
    });
    console.log('After mouse down inline styles:', afterMouseDownState);

    // Calculate position change
    const deltaX = afterMouseDownBox.x - initialBox.x;
    const deltaY = afterMouseDownBox.y - initialBox.y;
    console.log('Position change on mouse down:', { deltaX, deltaY });

    console.log('\n=== MOUSE MOVE (small movement) ===');

    // Move mouse slightly (10px right, 10px down)
    await page.mouse.move(clickX + 10, clickY + 10, { steps: 1 });
    await page.waitForTimeout(50);

    const afterSmallMoveBox = await hud.boundingBox();
    if (!afterSmallMoveBox) throw new Error('HUD disappeared after move');

    console.log('After small move bounding box:', {
      x: afterSmallMoveBox.x,
      y: afterSmallMoveBox.y,
      width: afterSmallMoveBox.width,
      height: afterSmallMoveBox.height
    });

    const smallMoveDeltaX = afterSmallMoveBox.x - afterMouseDownBox.x;
    const smallMoveDeltaY = afterSmallMoveBox.y - afterMouseDownBox.y;
    console.log('Position change during small move:', {
      deltaX: smallMoveDeltaX,
      deltaY: smallMoveDeltaY
    });

    console.log('\n=== ANALYSIS ===');

    // Check if there was a jump on mouse down
    const hasJumpOnMouseDown = Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5;
    console.log('Jump detected on mouse down?', hasJumpOnMouseDown);

    if (hasJumpOnMouseDown) {
      console.log('⚠️  HUD JUMPED ON MOUSE DOWN!');
      console.log(`Jump distance: ${Math.round(Math.sqrt(deltaX * deltaX + deltaY * deltaY))}px`);
      console.log(`Direction: ${deltaX > 0 ? 'right' : 'left'} ${deltaY > 0 ? 'down' : 'up'}`);
    }

    // Check if tracking works after initial jump
    const isTrackingCorrectly = Math.abs(smallMoveDeltaX - 10) < 3 && Math.abs(smallMoveDeltaY - 10) < 3;
    console.log('Tracking mouse correctly after initial position?', isTrackingCorrectly);

    // Release mouse
    await page.mouse.up();
    await page.waitForTimeout(100);

    const finalBox = await hud.boundingBox();
    if (!finalBox) throw new Error('HUD disappeared after mouse up');

    console.log('\n=== FINAL STATE ===');
    console.log('Final bounding box:', {
      x: finalBox.x,
      y: finalBox.y,
      width: finalBox.width,
      height: finalBox.height
    });

    // Assertions
    if (hasJumpOnMouseDown) {
      console.log('\n❌ TEST FAILED: HUD jumped on drag start');
      console.log('Expected: HUD should stay in place when mouse down occurs');
      console.log(`Actual: HUD moved ${deltaX}px right, ${deltaY}px down`);

      // This will fail the test
      expect(Math.abs(deltaX)).toBeLessThan(5);
      expect(Math.abs(deltaY)).toBeLessThan(5);
    } else {
      console.log('\n✅ TEST PASSED: No jump detected');
    }
  });

  test('debug HUD position state transitions', async ({ page }) => {
    // Add script to log state changes
    await page.addInitScript(() => {
      // Intercept position changes
      (window as any).hudPositionLog = [];
    });

    await page.goto(`http://localhost:3000/flight/${testFlightId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Start animation
    await page.locator('button:has-text("Start Flight Animation")').click();
    await page.waitForTimeout(1500);

    // Find HUD
    const hud = page.locator('.absolute.z-40').filter({ has: page.locator('text=SPEED') });
    await expect(hud).toBeVisible();

    // Set up mutation observer to track all style changes
    await page.evaluate(() => {
      const hudElement = document.querySelector('.absolute.z-40');
      if (!hudElement) return;

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const el = mutation.target as HTMLElement;
            const log = {
              timestamp: Date.now(),
              left: el.style.left,
              top: el.style.top,
              transform: el.style.transform,
              boundingBox: el.getBoundingClientRect()
            };
            (window as any).hudPositionLog.push(log);
            console.log('HUD STYLE CHANGE:', JSON.stringify(log, null, 2));
          }
        });
      });

      observer.observe(hudElement, {
        attributes: true,
        attributeFilter: ['style']
      });
    });

    // Get initial position
    const initialBox = await hud.boundingBox();
    if (!initialBox) throw new Error('HUD not found');

    console.log('\n=== Starting drag sequence ===');

    // Perform drag
    const clickX = initialBox.x + initialBox.width / 2;
    const clickY = initialBox.y + initialBox.height / 2;

    await page.mouse.move(clickX, clickY);
    await page.waitForTimeout(100);

    console.log('Mouse down...');
    await page.mouse.down();
    await page.waitForTimeout(200);

    console.log('Moving mouse...');
    await page.mouse.move(clickX + 50, clickY + 50, { steps: 5 });
    await page.waitForTimeout(200);

    console.log('Mouse up...');
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Get all logged position changes
    const positionLog = await page.evaluate(() => (window as any).hudPositionLog);

    console.log('\n=== POSITION CHANGE LOG ===');
    console.log(`Total style changes: ${positionLog.length}`);

    if (positionLog.length > 0) {
      console.log('\nFirst change (on mouse down):');
      console.log(JSON.stringify(positionLog[0], null, 2));

      if (positionLog.length > 1) {
        console.log('\nSecond change:');
        console.log(JSON.stringify(positionLog[1], null, 2));
      }

      // Analyze the transition from centered to positioned
      const firstChange = positionLog[0];
      if (firstChange.left && firstChange.left !== '50%') {
        console.log('\n⚠️  ISSUE FOUND: HUD transitioned from centered to absolute positioning');
        console.log(`Changed from "left: 50%, transform: translateX(-50%)" to "left: ${firstChange.left}"`);

        // Calculate what the centered position should have been
        console.log('\nExpected behavior:');
        console.log('- Should calculate screen position including transform');
        console.log('- Should maintain visual position on transition');
      }
    }
  });
});
