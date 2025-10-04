import { test, expect } from '@playwright/test';

test.describe('Flight Detail Page Performance Tests', () => {
  let apiCallLog: { url: string; timestamp: number; method: string }[] = [];
  let consoleMessages: string[] = [];
  let memoryWarnings: string[] = [];

  test('should not make duplicate API calls and handle memory properly', async ({ page }) => {
    // Set up request interception to log API calls
    apiCallLog = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/v1/flights') || url.includes('tile.googleapis.com')) {
        apiCallLog.push({
          url: url,
          timestamp: Date.now(),
          method: request.method()
        });
      }
    });

    // Capture console messages, especially memory warnings
    consoleMessages = [];
    memoryWarnings = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);

      // Check for memory-related messages
      if (text.toLowerCase().includes('memory') ||
          text.toLowerCase().includes('cache') ||
          text.toLowerCase().includes('tiles') && text.toLowerCase().includes('loaded')) {
        memoryWarnings.push(text);
      }
    });

    // Navigate to flight detail page
    await page.goto('http://localhost:3000/flight/11');

    // Wait for the page to fully load
    await page.waitForTimeout(5000);

    // Analyze API calls for duplicates
    const apiCallGroups = apiCallLog.reduce((acc, call) => {
      const key = `${call.method}_${call.url}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(call);
      return acc;
    }, {} as Record<string, typeof apiCallLog>);

    console.log('\n=== API Call Analysis ===');
    let hasDuplicates = false;

    for (const [key, calls] of Object.entries(apiCallGroups)) {
      // Ignore tile requests as they are expected to have many calls
      if (key.includes('tile.googleapis.com')) continue;

      if (calls.length > 1) {
        // Check if calls are within 1 second of each other (likely duplicates)
        const timeDiffs = calls.slice(1).map((call, i) => call.timestamp - calls[i].timestamp);
        const suspiciousDuplicates = timeDiffs.filter(diff => diff < 1000);

        if (suspiciousDuplicates.length > 0) {
          hasDuplicates = true;
          console.error(`DUPLICATE API CALLS DETECTED for ${key}:`);
          console.error(`  - Called ${calls.length} times`);
          console.error(`  - Time between calls: ${timeDiffs.map(d => `${d}ms`).join(', ')}`);
        }
      }
    }

    // Check for Google Tiles loading issues
    const tileRequests = apiCallLog.filter(call => call.url.includes('tile.googleapis.com'));
    const rootJsonRequests = tileRequests.filter(call => call.url.includes('root.json'));

    console.log('\n=== Google 3D Tiles Analysis ===');
    console.log(`Total tile requests: ${tileRequests.length}`);
    console.log(`Root.json requests: ${rootJsonRequests.length}`);

    if (rootJsonRequests.length > 1) {
      console.error('WARNING: Google 3D Tiles root.json loaded multiple times!');
      rootJsonRequests.forEach((req, i) => {
        console.error(`  Request ${i + 1}: ${new Date(req.timestamp).toISOString()}`);
      });
    }

    // Check memory usage from console
    console.log('\n=== Memory and Tile Loading ===');
    if (memoryWarnings.length > 0) {
      console.log('Memory-related messages:');
      memoryWarnings.forEach(msg => console.log(`  - ${msg}`));
    }

    // Check for Cesium viewer and tileset status
    const cesiumStatus = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer) return { error: 'Cesium viewer not found' };

      const tileset = viewer.googleTileset;
      if (!tileset) return { error: 'Google tileset not found' };

      return {
        tilesLoaded: tileset.statistics?.numberOfTilesLoaded || 0,
        tilesTotal: tileset.statistics?.numberOfTilesTotal || 0,
        memoryUsageBytes: tileset.totalMemoryUsageInBytes || 0,
        memoryUsageMB: (tileset.totalMemoryUsageInBytes || 0) / 1048576,
        maximumMemoryMB: tileset.maximumMemoryUsage || 0,
        cacheSize: tileset.cacheBytes || 0,
        cacheSizeMB: (tileset.cacheBytes || 0) / 1048576,
        maximumScreenSpaceError: tileset.maximumScreenSpaceError,
        viewReady: tileset.ready
      };
    });

    console.log('\n=== Cesium Tileset Status ===');
    console.log(cesiumStatus);

    // Check if memory is exceeding limits
    if (cesiumStatus && !cesiumStatus.error) {
      const memoryUsage = cesiumStatus.memoryUsageMB;
      const maxMemory = cesiumStatus.maximumMemoryMB;

      if (memoryUsage > maxMemory * 0.9) {
        console.error(`MEMORY WARNING: Using ${memoryUsage.toFixed(1)}MB of ${maxMemory}MB (${(memoryUsage/maxMemory*100).toFixed(1)}%)`);
      }

      // Check tile loading efficiency
      const loadRatio = cesiumStatus.tilesLoaded / (cesiumStatus.tilesTotal || 1);
      console.log(`Tile loading: ${cesiumStatus.tilesLoaded}/${cesiumStatus.tilesTotal} (${(loadRatio * 100).toFixed(1)}%)`);
    }

    // Start animation and monitor tile quality
    const startButton = await page.locator('button:has-text("Start Animation")');
    if (await startButton.isVisible()) {
      await startButton.click();

      // Monitor for 10 seconds
      console.log('\n=== Monitoring Animation (10 seconds) ===');
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(1000);

        const animStatus = await page.evaluate(() => {
          const viewer = (window as any).cesiumViewer;
          if (!viewer || !viewer.googleTileset) return null;

          return {
            second: i + 1,
            tilesLoaded: viewer.googleTileset.statistics?.numberOfTilesLoaded || 0,
            memoryMB: (viewer.googleTileset.totalMemoryUsageInBytes || 0) / 1048576,
            screenSpaceError: viewer.googleTileset.maximumScreenSpaceError,
            tilesRendered: viewer.googleTileset.statistics?.numberOfTilesStyled || 0
          };
        });

        if (animStatus) {
          console.log(`Second ${i+1}: Tiles=${animStatus.tilesLoaded}, Memory=${animStatus.memoryMB.toFixed(1)}MB, SSE=${animStatus.screenSpaceError}`);
        }
      }
    }

    // Final assertions
    expect(hasDuplicates, 'Should not have duplicate API calls').toBe(false);
    expect(rootJsonRequests.length, 'Google tiles root.json should load once').toBeLessThanOrEqual(1);

    // Check final memory status
    const finalStatus = await page.evaluate(() => {
      const viewer = (window as any).cesiumViewer;
      if (!viewer || !viewer.googleTileset) return null;
      return {
        memoryMB: (viewer.googleTileset.totalMemoryUsageInBytes || 0) / 1048576,
        maxMemoryMB: viewer.googleTileset.maximumMemoryUsage || 0
      };
    });

    if (finalStatus) {
      const memoryPercentage = (finalStatus.memoryMB / finalStatus.maxMemoryMB) * 100;
      console.log(`\n=== Final Memory Usage: ${finalStatus.memoryMB.toFixed(1)}MB / ${finalStatus.maxMemoryMB}MB (${memoryPercentage.toFixed(1)}%) ===`);

      // Memory should not exceed configured limit
      expect(finalStatus.memoryMB).toBeLessThanOrEqual(finalStatus.maxMemoryMB);
    }

    // Save screenshot for debugging
    await page.screenshot({ path: 'memory-test-result.png', fullPage: true });
  });

  test('should handle memory limits when moving away from start zone', async ({ page }) => {
    // Navigate to flight with longer path
    await page.goto('http://localhost:3000/flight/4');
    await page.waitForTimeout(3000);

    // Start animation
    const startButton = await page.locator('button:has-text("Start Animation")');
    if (await startButton.isVisible()) {
      await startButton.click();

      // Skip ahead to middle of flight
      await page.waitForTimeout(2000);
      const slider = await page.locator('input[type="range"]');
      if (await slider.isVisible()) {
        await slider.fill('50');
      }

      // Wait for tiles to load at new position
      await page.waitForTimeout(5000);

      // Check tile quality
      const tileQuality = await page.evaluate(() => {
        const viewer = (window as any).cesiumViewer;
        if (!viewer || !viewer.googleTileset) return null;

        const tileset = viewer.googleTileset;
        return {
          currentSSE: tileset.maximumScreenSpaceError,
          tilesLoaded: tileset.statistics?.numberOfTilesLoaded || 0,
          memoryMB: (tileset.totalMemoryUsageInBytes || 0) / 1048576,
          maxMemoryMB: tileset.maximumMemoryUsage || 0,
          tilesToRender: tileset.statistics?.numberOfTilesWithContentReady || 0,
          tilesProcessing: tileset.statistics?.numberOfTilesProcessing || 0
        };
      });

      console.log('\n=== Tile Quality After Moving Away From Start ===');
      console.log(tileQuality);

      if (tileQuality) {
        // Check if we're hitting memory limits
        if (tileQuality.memoryMB >= tileQuality.maxMemoryMB * 0.95) {
          console.error('MEMORY LIMIT REACHED - This causes blurry tiles!');
          console.error(`Need to increase maximumMemoryUsage beyond ${tileQuality.maxMemoryMB}MB`);
        }

        // Check if tiles are still processing
        if (tileQuality.tilesProcessing > 0) {
          console.log(`Still loading ${tileQuality.tilesProcessing} tiles...`);
        }
      }

      // Take screenshot of potentially blurry tiles
      await page.screenshot({ path: 'blurry-tiles-test.png' });
    }
  });
});