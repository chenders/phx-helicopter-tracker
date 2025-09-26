import React from 'react';
import { LoadScript } from '@react-google-maps/api';

const libraries: ("visualization" | "places" | "drawing" | "geometry")[] = ["visualization", "places"];

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
  // Always use LoadScript to ensure proper context for @react-google-maps/api components
  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
      libraries={libraries}
      loadingElement={
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading maps...</div>
        </div>
      }
      // Prevent re-loading if already loaded
      preventGoogleFontsLoading={true}
    >
      {children}
    </LoadScript>
  );
};