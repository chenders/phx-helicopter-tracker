import { test } from '@playwright/test';

test('debug ground labels on flight 6661', async ({ page }) => {
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (
      text.includes('Updating') ||
      text.includes('labels') ||
      text.includes('Removed') ||
      text.includes('Ground Label') ||
      text.includes('Regenerating')
    ) {
      console.log('🔍', text);
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('❌ ERROR:', msg.text());
    }
  });

  console.log('\n=== Starting Ground Labels Test ===\n');

  // Navigate to specific flight
  await page.goto('http://localhost:3000/flight/6661');
  console.log('✓ Navigated to flight 6661');

  // Wait for Cesium to load
  await page.waitForSelector('canvas', { timeout: 30000 });
  console.log('✓ Cesium canvas loaded');

  await page.waitForTimeout(5000);
  console.log('✓ Waited 5s for initialization');

  // Check if phoenixLabelsData is set
  const phoenixLabelsCount = await page.evaluate(() => {
    const data = (window as any).phoenixLabelsData;
    return data ? data.length : 0;
  });
  console.log(`✓ Phoenix labels data: ${phoenixLabelsCount} labels`);

  // Check 2D label list visibility
  const labelListVisible = await page.locator('text=Nearby Locations').isVisible();
  console.log(`✓ 2D Label list visible: ${labelListVisible}`);

  if (labelListVisible) {
    // Get text content from the label list
    const labelTexts = await page.evaluate(() => {
      const container = document.querySelector('[class*="right-4"][class*="top-"]');
      if (!container) return [];

      const labels = container.querySelectorAll('[class*="truncate"]');
      return Array.from(labels).map(l => l.textContent?.trim()).filter(Boolean);
    });

    console.log(`✓ 2D List has ${labelTexts.length} labels`);
    if (labelTexts.length > 0) {
      console.log('   Sample labels:', labelTexts.slice(0, 5));
    }
  }

  // Check Cesium entities
  const entityInfo = await page.evaluate(() => {
    try {
      const viewer = (window as any).viewer;
      if (!viewer) return { error: 'No viewer' };

      const entities = viewer.entities.values;
      const groundLabels = entities.filter((e: any) =>
        e.name && e.name.startsWith('Ground Label:')
      );

      const helicopter = entities.find((e: any) => e.name === 'Helicopter');
      const searchMarker = entities.find((e: any) => e.name === 'Search Location');

      return {
        total: entities.length,
        groundLabels: groundLabels.length,
        hasHelicopter: !!helicopter,
        hasSearchMarker: !!searchMarker,
        groundLabelNames: groundLabels.slice(0, 5).map((e: any) => e.name)
      };
    } catch (e: any) {
      return { error: `Exception: ${e.message}` };
    }
  });

  console.log('\nCesium Entities:');
  if (entityInfo.error) {
    console.log('  ERROR:', entityInfo.error);
  } else {
    console.log('  Total entities:', entityInfo.total);
    console.log('  Ground labels:', entityInfo.groundLabels);
    console.log('  Has helicopter:', entityInfo.hasHelicopter);
    console.log('  Has search marker:', entityInfo.hasSearchMarker);
    if (entityInfo.groundLabelNames && entityInfo.groundLabelNames.length > 0) {
      console.log('  Ground label names:', entityInfo.groundLabelNames);
    }
  }

  // Try to start animation
  const animateButton = page.locator('button:has-text("Animate")').first();
  const animateVisible = await animateButton.isVisible();

  if (animateVisible) {
    console.log('\n✓ Clicking Animate button...');
    await animateButton.click();
    await page.waitForTimeout(1000);

    // Wait for animation to progress
    console.log('✓ Waiting 15 seconds for helicopter movement...');
    await page.waitForTimeout(15000);

    // Check again
    const afterAnimation = await page.evaluate(() => {
      try {
        const viewer = (window as any).viewer;
        if (!viewer) return { error: 'No viewer' };

        const groundLabels = viewer.entities.values.filter((e: any) =>
          e.name && e.name.startsWith('Ground Label:')
        );

        return {
          groundLabels: groundLabels.length,
          labels: groundLabels.map((e: any) => ({
            name: e.name,
            text: e.label?.text?._value || 'no text',
            visible: e.show
          })).slice(0, 5)
        };
      } catch (e: any) {
        return { error: `Exception: ${e.message}`, groundLabels: 0 };
      }
    });

    console.log('\nAfter Animation:');
    if (afterAnimation.error) {
      console.log('  ERROR:', afterAnimation.error);
    }
    console.log('  Ground labels:', afterAnimation.groundLabels);
    if (afterAnimation.labels && afterAnimation.labels.length > 0) {
      console.log('  Label details:', JSON.stringify(afterAnimation.labels, null, 2));
    } else {
      console.log('  ⚠️  Still no ground labels created!');
    }
  } else {
    console.log('  ⚠️  Animate button not found');
  }

  // Check React component state by looking at DOM
  const listState = await page.evaluate(() => {
    const areaElements = Array.from(document.querySelectorAll('*')).filter(el => el.textContent?.includes('Areas'));
    const streetElements = Array.from(document.querySelectorAll('*')).filter(el => el.textContent?.includes('Streets'));
    return { areas: areaElements.length, streets: streetElements.length };
  });
  console.log('\n2D List sections:', listState);

  // Take screenshot
  await page.screenshot({
    path: '/home/phx/phx-helicopter-tracker/frontend/ground-labels-test.png',
    fullPage: false
  });
  console.log('\n✓ Screenshot saved: ground-labels-test.png');

  console.log('\n=== Test Complete ===\n');
});
