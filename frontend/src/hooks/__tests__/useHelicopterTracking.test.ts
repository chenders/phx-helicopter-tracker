import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { useHelicopterTracking } from '../useHelicopterTracking';
import React from 'react';

describe('useHelicopterTracking Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0 },
      },
    });

    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockTrackingData = [
    {
      id: 1,
      registration: 'N624FB',
      latitude: 33.4484,
      longitude: -112.0740,
      altitude: 1500,
      speed: 80,
      heading: 180,
      is_phoenix_pd: true,
      is_hovering: false,
      last_updated: '2025-08-30T12:00:00Z',
    },
    {
      id: 2,
      registration: 'N625FB',
      latitude: 33.5000,
      longitude: -112.1000,
      altitude: 350,
      speed: 15,
      heading: 270,
      is_phoenix_pd: true,
      is_hovering: true,
      last_updated: '2025-08-30T12:00:00Z',
    },
  ];

  test('fetches helicopter tracking data', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrackingData,
    });

    const { result } = renderHook(() => useHelicopterTracking(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.helicopters).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.helicopters).toEqual(mockTrackingData);
    expect(result.current.error).toBeNull();
  });

  test('filters Phoenix PD helicopters', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrackingData,
    });

    const { result } = renderHook(
      () => useHelicopterTracking({ phoenixPdOnly: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('phoenix_pd_only=true'),
      expect.any(Object)
    );
  });

  test('filters active helicopters', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrackingData,
    });

    const { result } = renderHook(
      () => useHelicopterTracking({ activeOnly: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('active_only=true'),
      expect.any(Object)
    );
  });

  test('auto-refreshes at specified interval', async () => {
    vi.useFakeTimers();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockTrackingData,
    });

    const { result } = renderHook(
      () => useHelicopterTracking({ refreshInterval: 10000 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Advance 10 seconds
    vi.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  test('handles API errors', async () => {
    const errorMessage = 'API Error';
    (global.fetch as any).mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useHelicopterTracking(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(new Error(errorMessage));
    expect(result.current.helicopters).toBeUndefined();
  });

  test('provides surveillance statistics', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrackingData,
    });

    const { result } = renderHook(() => useHelicopterTracking(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual({
      total: 2,
      phoenixPd: 2,
      hovering: 1,
      lowAltitude: 1,
      surveillanceScore: 0.5,
    });
  });

  test('provides refetch function', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockTrackingData,
    });

    const { result } = renderHook(() => useHelicopterTracking(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Manually refetch
    result.current.refetch();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  test('calculates hovering helicopters correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrackingData,
    });

    const { result } = renderHook(() => useHelicopterTracking(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const hoveringHelicopters = result.current.getHoveringHelicopters();
    expect(hoveringHelicopters).toHaveLength(1);
    expect(hoveringHelicopters[0].registration).toBe('N625FB');
  });

  test('calculates low altitude helicopters correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrackingData,
    });

    const { result } = renderHook(() => useHelicopterTracking(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const lowAltitudeHelicopters = result.current.getLowAltitudeHelicopters(400);
    expect(lowAltitudeHelicopters).toHaveLength(1);
    expect(lowAltitudeHelicopters[0].registration).toBe('N625FB');
  });

  test('finds helicopter by registration', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrackingData,
    });

    const { result } = renderHook(() => useHelicopterTracking(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const helicopter = result.current.findByRegistration('N624FB');
    expect(helicopter).toBeDefined();
    expect(helicopter?.latitude).toBe(33.4484);
  });

  test('returns undefined for non-existent registration', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrackingData,
    });

    const { result } = renderHook(() => useHelicopterTracking(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const helicopter = result.current.findByRegistration('N999XX');
    expect(helicopter).toBeUndefined();
  });

  test('handles empty response', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useHelicopterTracking(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.helicopters).toEqual([]);
    expect(result.current.stats.total).toBe(0);
  });

  test('handles network failure', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useHelicopterTracking(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.helicopters).toBeUndefined();
  });
});