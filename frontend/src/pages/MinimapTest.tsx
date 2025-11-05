/**
 * Minimap Position Test Page
 *
 * This page helps debug the Phoenix Minimap positioning issue.
 * It shows the minimap with different positioning strategies to identify what works.
 */

import React, { useState } from 'react';
import { PhoenixMinimap } from '../components/PhoenixMinimap';

const MinimapTest: React.FC = () => {
  const [positionType, setPositionType] = useState<'fixed' | 'absolute'>('fixed');
  const [zIndex, setZIndex] = useState(9999);

  // Mock flight path data (a simple path across Phoenix)
  const mockFlightPath = [
    { latitude: 33.4484, longitude: -112.0740 }, // Downtown Phoenix
    { latitude: 33.4942, longitude: -111.9261 }, // Scottsdale
    { latitude: 33.4255, longitude: -111.9400 }, // Tempe
    { latitude: 33.4152, longitude: -111.8315 }, // Mesa
  ];

  const mockCurrentPosition = { latitude: 33.4484, longitude: -112.0740 };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Phoenix Minimap Position Test</h1>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Position Controls</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Position Type:</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setPositionType('fixed')}
                  className={`px-4 py-2 rounded ${
                    positionType === 'fixed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Fixed (relative to viewport)
                </button>
                <button
                  onClick={() => setPositionType('absolute')}
                  className={`px-4 py-2 rounded ${
                    positionType === 'absolute'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Absolute (relative to parent)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Z-Index: {zIndex}
              </label>
              <input
                type="range"
                min="1"
                max="10000"
                value={zIndex}
                onChange={(e) => setZIndex(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded">
            <p className="font-mono text-sm">
              Current className: "{positionType} top-4 left-4 z-[{zIndex}]"
            </p>
          </div>
        </div>

        {/* Test Container 1: Relative parent (simulating the Cesium container) */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Test 1: Minimap inside relative container (like Cesium)
          </h2>
          <div className="relative w-full h-[600px] bg-gray-900 rounded-lg">
            <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
              This represents the Cesium 3D view container
              <br />
              (800px height, relative positioning)
            </div>

            {/* Minimap with dynamic positioning */}
            <PhoenixMinimap
              flightPath={mockFlightPath}
              currentPosition={mockCurrentPosition}
              className={positionType}
              style={{ zIndex }}
              size={200}
              onClick={(lat, lng) => console.log('Clicked:', lat, lng)}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            The minimap should appear in the bottom-right corner of the gray box above (with 16px margin).
          </p>
        </div>

        {/* Test Container 2: Fixed positioning (relative to viewport) */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Test 2: Fixed position minimap (viewport-relative)
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            When using "Fixed" position above, the minimap should appear at the top-left
            of your browser window, overlaying everything.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-sm">
              ⚠️ <strong>Note:</strong> If using "fixed" positioning, the minimap will appear
              at the viewport top-left, not inside any container. This might cover other UI elements.
            </p>
          </div>
        </div>

        {/* Test Container 3: Multiple layers to test z-index */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Test 3: Z-index layering test
          </h2>
          <div className="relative w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden">
            {/* Background layer */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-purple-900 opacity-50" />

            {/* Middle layer - simulating Cesium canvas */}
            <div
              className="absolute inset-0 bg-black/30"
              style={{ zIndex: 1000 }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-white">
                This layer has z-index: 1000
                <br />
                (simulating Cesium canvas layer)
              </div>
            </div>

            {/* Minimap should appear on top */}
            <PhoenixMinimap
              flightPath={mockFlightPath}
              currentPosition={mockCurrentPosition}
              className={positionType}
              style={{ zIndex }}
              size={200}
              onClick={(lat, lng) => console.log('Clicked:', lat, lng)}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            The minimap should appear above the semi-transparent layers.
            Try adjusting the z-index slider to see when it appears on top.
          </p>
        </div>

        {/* Diagnostic Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Diagnostic Information</h2>
          <div className="space-y-2 text-sm font-mono">
            <p><strong>Position Type:</strong> {positionType}</p>
            <p><strong>Z-Index:</strong> {zIndex}</p>
            <p><strong>Expected Behavior:</strong></p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Fixed:</strong> Minimap at viewport top-left, stays in place when scrolling</li>
              <li><strong>Absolute:</strong> Minimap at container top-left, scrolls with page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinimapTest;
