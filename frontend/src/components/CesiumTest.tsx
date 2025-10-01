import React, { useEffect, useState } from 'react';
import * as Cesium from 'cesium';

export const CesiumTest: React.FC = () => {
  const [cesiumVersion, setCesiumVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (Cesium && Cesium.VERSION) {
        setCesiumVersion(Cesium.VERSION);
        console.log('CesiumJS loaded successfully!', {
          version: Cesium.VERSION,
          hasViewer: !!Cesium.Viewer,
          hasCesium3DTileset: !!Cesium.Cesium3DTileset,
          hasCartesian3: !!Cesium.Cartesian3,
          hasIon: !!Cesium.Ion
        });
      } else {
        setError('Cesium not loaded');
      }
    } catch (err) {
      setError(`Error loading Cesium: ${err.message}`);
      console.error('Cesium load error:', err);
    }
  }, []);

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="font-semibold mb-2">CesiumJS Test</h3>
      {cesiumVersion ? (
        <div className="text-green-600 dark:text-green-400">
          ✅ CesiumJS v{cesiumVersion} loaded successfully!
        </div>
      ) : error ? (
        <div className="text-red-600 dark:text-red-400">
          ❌ {error}
        </div>
      ) : (
        <div className="text-gray-600 dark:text-gray-400">
          Loading CesiumJS...
        </div>
      )}
    </div>
  );
};

export default CesiumTest;