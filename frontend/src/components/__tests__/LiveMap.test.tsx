import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import LiveMap from '../LiveMap';

// Mock Google Maps
const mockMap = {
  setCenter: vi.fn(),
  setZoom: vi.fn(),
  panTo: vi.fn(),
};

const mockMarker = {
  setMap: vi.fn(),
  setPosition: vi.fn(),
  addListener: vi.fn(),
};

const mockInfoWindow = {
  open: vi.fn(),
  close: vi.fn(),
  setContent: vi.fn(),
};

const mockPolyline = {
  setMap: vi.fn(),
  setPath: vi.fn(),
};

// Mock @react-google-maps/api
vi.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children, onLoad }: any) => {
    React.useEffect(() => {
      onLoad?.(mockMap);
    }, [onLoad]);
    return <div data-testid="google-map">{children}</div>;
  },
  Marker: ({ position, onClick }: any) => (
    <div
      data-testid="map-marker"
      data-position={JSON.stringify(position)}
      onClick={onClick}
    />
  ),
  InfoWindow: ({ children }: any) => (
    <div data-testid="info-window">{children}</div>
  ),
  Polyline: ({ path }: any) => (
    <div data-testid="polyline" data-path={JSON.stringify(path)} />
  ),
  useJsApiLoader: () => ({ isLoaded: true, loadError: null }),
}));

// Mock API responses
const mockHelicopters = [
  {
    id: 1,
    registration: 'N624FB',
    latitude: 33.4484,
    longitude: -112.0740,
    altitude: 1500,
    speed: 80,
    heading: 180,
    is_phoenix_pd: true,
    last_updated: '2025-08-30T12:00:00Z',
  },
  {
    id: 2,
    registration: 'N625FB',
    latitude: 33.5000,
    longitude: -112.1000,
    altitude: 2000,
    speed: 90,
    heading: 270,
    is_phoenix_pd: true,
    last_updated: '2025-08-30T12:00:00Z',
  },
];

const mockFlightPath = [
  { lat: 33.4484, lng: -112.0740 },
  { lat: 33.4500, lng: -112.0750 },
  { lat: 33.4520, lng: -112.0760 },
];

describe('LiveMap Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <LiveMap />
      </QueryClientProvider>
    );
  };

  test('renders map container', () => {
    renderComponent();
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
  });

  test('loads and displays helicopters on map', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHelicopters,
    });

    renderComponent();

    await waitFor(() => {
      const markers = screen.getAllByTestId('map-marker');
      expect(markers).toHaveLength(2);
    });

    const markers = screen.getAllByTestId('map-marker');
    const firstMarkerPosition = JSON.parse(markers[0].getAttribute('data-position') || '{}');
    expect(firstMarkerPosition.lat).toBe(33.4484);
    expect(firstMarkerPosition.lng).toBe(-112.0740);
  });

  test('shows helicopter details on marker click', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHelicopters,
    });

    renderComponent();

    await waitFor(() => {
      const markers = screen.getAllByTestId('map-marker');
      expect(markers).toHaveLength(2);
    });

    const firstMarker = screen.getAllByTestId('map-marker')[0];
    fireEvent.click(firstMarker);

    await waitFor(() => {
      expect(screen.getByTestId('info-window')).toBeInTheDocument();
      expect(screen.getByText(/N624FB/)).toBeInTheDocument();
      expect(screen.getByText(/1500 ft/)).toBeInTheDocument();
      expect(screen.getByText(/80 knots/)).toBeInTheDocument();
    });
  });

  test('displays flight path when helicopter is selected', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockHelicopters,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFlightPath,
      });

    renderComponent();

    await waitFor(() => {
      const markers = screen.getAllByTestId('map-marker');
      expect(markers).toHaveLength(2);
    });

    const firstMarker = screen.getAllByTestId('map-marker')[0];
    fireEvent.click(firstMarker);

    await waitFor(() => {
      const polyline = screen.getByTestId('polyline');
      expect(polyline).toBeInTheDocument();
      
      const path = JSON.parse(polyline.getAttribute('data-path') || '[]');
      expect(path).toHaveLength(3);
      expect(path[0].lat).toBe(33.4484);
    });
  });

  test('filters Phoenix PD helicopters', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHelicopters,
    });

    renderComponent();

    // Find and click the Phoenix PD filter checkbox
    const filterCheckbox = screen.getByLabelText(/Phoenix PD Only/i);
    expect(filterCheckbox).toBeChecked(); // Should be checked by default

    // Uncheck to show all helicopters
    fireEvent.click(filterCheckbox);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('phoenix_pd_only=false'),
        expect.any(Object)
      );
    });
  });

  test('auto-refreshes helicopter positions', async () => {
    vi.useFakeTimers();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockHelicopters,
    });

    renderComponent();

    // Initial load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Fast forward 30 seconds (default refresh interval)
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  test('handles API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Error loading helicopter data/i)).toBeInTheDocument();
    });
  });

  test('shows loading state initially', () => {
    (global.fetch as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderComponent();

    expect(screen.getByText(/Loading helicopters/i)).toBeInTheDocument();
  });

  test('displays surveillance alert for low altitude', async () => {
    const lowAltitudeHelicopter = [{
      ...mockHelicopters[0],
      altitude: 350, // Low altitude
      speed: 15, // Hovering speed
    }];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => lowAltitudeHelicopter,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('surveillance-alert')).toBeInTheDocument();
      expect(screen.getByText(/Surveillance Pattern Detected/i)).toBeInTheDocument();
    });
  });

  test('toggles heatmap overlay', async () => {
    renderComponent();

    const heatmapToggle = screen.getByLabelText(/Show Heatmap/i);
    expect(heatmapToggle).not.toBeChecked();

    fireEvent.click(heatmapToggle);

    await waitFor(() => {
      expect(screen.getByTestId('heatmap-layer')).toBeInTheDocument();
    });
  });

  test('centers map on selected helicopter', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHelicopters,
    });

    renderComponent();

    await waitFor(() => {
      const markers = screen.getAllByTestId('map-marker');
      expect(markers).toHaveLength(2);
    });

    const firstMarker = screen.getAllByTestId('map-marker')[0];
    fireEvent.click(firstMarker);

    expect(mockMap.panTo).toHaveBeenCalledWith({
      lat: 33.4484,
      lng: -112.0740,
    });
  });
});