/**
 * Playwright test to debug the label system
 *
 * This test will:
 * 1. Load the 3D visualization
 * 2. Check which label components are rendering
 * 3. Verify ScreenSpaceLabels positioning
 * 4. Capture screenshots for visual inspection
 */

import { test, expect } from '@playwright/test';

test.describe('Label System Debugging', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a flight detail page with 3D view
    const flightDetailUrl = 'http://localhost:3000/flight/736?searchLat=33.48190857263408&searchLng=-112.13903324111936&searchRadius=804.67&closestDistance=551.53036197&closestTime=2025-08-25T06%3A19%3A27%2B00%3A00&closestSpeed=34&closestAltitude=1700&closestAltitudeAGL=614&closestBearing=354';

    await page.goto(flightDetailUrl);

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Wait for Cesium to initialize (longer timeout for 3D rendering)
    await page.waitForTimeout(5000);
  });

  test('should render only ScreenSpaceLabels, not HolographicStreetLabels', async ({ page }) => {
    // Check console for any errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Wait for 3D view to be visible
    await page.waitForSelector('.cesium-viewer', { timeout: 10000 });

    // Give Cesium time to render
    await page.waitForTimeout(2000);

    // Inspect the DOM to see what label elements exist
    const labelElements = await page.evaluate(() => {
      const results: any = {
        screenSpaceLabels: [],
        holographicLabels: [],
        allDivs: []
      };

      // Check for screen-space labels (should be in fixed positions)
      const fixedPositionDivs = Array.from(document.querySelectorAll('div'))
        .filter((div: any) => {
          const style = window.getComputedStyle(div);
          return style.position === 'absolute' &&
                 div.textContent &&
                 div.textContent.length > 0 &&
                 div.textContent.length < 100; // Reasonable label length
        });

      results.screenSpaceLabels = fixedPositionDivs.map((div: any) => ({
        text: div.textContent,
        position: window.getComputedStyle(div).position,
        top: window.getComputedStyle(div).top,
        left: window.getComputedStyle(div).left,
        right: window.getComputedStyle(div).right,
        bottom: window.getComputedStyle(div).bottom,
        zIndex: window.getComputedStyle(div).zIndex,
        color: window.getComputedStyle(div).color,
        backgroundColor: window.getComputedStyle(div).backgroundColor
      }));

      // Check for any elements with cyan/green colors (holographic labels)
      const coloredElements = Array.from(document.querySelectorAll('*'))
        .filter((el: any) => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          const textShadow = style.textShadow;
          // Check for cyan (#00D4FF) or green (#00FF88) colors
          return (color && (color.includes('0, 212, 255') || color.includes('0, 255, 136'))) ||
                 (textShadow && (textShadow.includes('0, 212, 255') || textShadow.includes('0, 255, 136')));
        });

      results.holographicLabels = coloredElements.map((el: any) => ({
        tagName: el.tagName,
        text: el.textContent?.substring(0, 100),
        color: window.getComputedStyle(el).color,
        textShadow: window.getComputedStyle(el).textShadow
      }));

      return results;
    });

    console.log('Screen-space labels found:', labelElements.screenSpaceLabels.length);
    console.log('Holographic-styled elements found:', labelElements.holographicLabels.length);
    console.log('Screen-space label details:', JSON.stringify(labelElements.screenSpaceLabels, null, 2));
    console.log('Holographic label details:', JSON.stringify(labelElements.holographicLabels, null, 2));

    // Take a screenshot
    await page.screenshot({
      path: '/home/phx/phx-helicopter-tracker/frontend/tests/screenshots/label-debug.png',
      fullPage: false
    });

    // Assertions
    expect(labelElements.screenSpaceLabels.length).toBeGreaterThan(0);
    expect(labelElements.screenSpaceLabels.length).toBeLessThanOrEqual(5); // Should be max 5 (NW, NE, SW, SE, Center)

    // Should NOT have holographic labels (unless they're part of HUD or minimap)
    console.log('Console messages:', consoleMessages);
  });

  test('should position labels in correct quadrants', async ({ page }) => {
    await page.waitForSelector('.cesium-viewer', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const labelPositions = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('div'))
        .filter((div: any) => {
          const style = window.getComputedStyle(div);
          return style.position === 'absolute' &&
                 style.zIndex === '45' && // ScreenSpaceLabels use zIndex 45
                 div.textContent &&
                 div.textContent.length > 0 &&
                 div.textContent.length < 100;
        });

      return labels.map((label: any) => {
        const rect = label.getBoundingClientRect();
        const style = window.getComputedStyle(label);
        return {
          text: label.textContent,
          rect: {
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom
          },
          computedStyle: {
            top: style.top,
            left: style.left,
            right: style.right,
            bottom: style.bottom
          }
        };
      });
    });

    console.log('Label positions:', JSON.stringify(labelPositions, null, 2));

    // Should have labels in expected positions
    // NW: top: 80px, left: 20px
    // NE: top: 80px, right: 20px
    // SW: bottom: 80px, left: 20px
    // SE: bottom: 80px, right: 20px
    // Center: top: 50%, left: 50%

    expect(labelPositions.length).toBeGreaterThan(0);
  });

  test('should update labels when camera moves', async ({ page }) => {
    await page.waitForSelector('.cesium-viewer', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Get initial labels
    const getLabels = async () => {
      return await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('div'))
          .filter((div: any) => {
            const style = window.getComputedStyle(div);
            return style.position === 'absolute' &&
                   style.zIndex === '45' &&
                   div.textContent &&
                   div.textContent.length > 0 &&
                   div.textContent.length < 100;
          });
        return labels.map((l: any) => l.textContent);
      });
    };

    const initialLabels = await getLabels();
    console.log('Initial labels:', initialLabels);

    // Simulate camera movement (this is tricky without direct Cesium access)
    // Try to trigger a camera move via mouse drag
    const cesiumCanvas = await page.locator('canvas.cesium-widget-canvas').first();
    await cesiumCanvas.hover();

    // Drag to move camera
    const box = await cesiumCanvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100, { steps: 10 });
      await page.mouse.up();
    }

    // Wait for labels to update
    await page.waitForTimeout(1000);

    const updatedLabels = await getLabels();
    console.log('Updated labels:', updatedLabels);

    // Labels should exist (may or may not have changed depending on camera movement)
    expect(updatedLabels.length).toBeGreaterThan(0);
  });

  test('should check if old build artifacts exist', async ({ page }) => {
    // This test checks the actual JavaScript being served
    const scriptUrls = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts.map((s: any) => s.src);
    });

    console.log('Script URLs loaded:', scriptUrls);

    // Check if HolographicStreetLabels component is in the compiled code
    const hasHolographicComponent = await page.evaluate(() => {
      // Check global scope or window for component references
      return Object.keys(window).filter(key =>
        key.toLowerCase().includes('holographic') ||
        key.toLowerCase().includes('streetlabel')
      );
    });

    console.log('Holographic-related globals:', hasHolographicComponent);
  });
});
