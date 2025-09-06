import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import CreditUsageWidget from '../CreditUsageWidget';

describe('CreditUsageWidget Component', () => {
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

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CreditUsageWidget />
      </QueryClientProvider>
    );
  };

  const mockCreditData = {
    monthly_used: 15000,
    monthly_limit: 60000,
    monthly_remaining: 45000,
    monthly_percentage: 25.0,
    daily_used: 500,
    daily_average: 500,
    projected_monthly: 15000,
  };

  test('renders loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    
    renderComponent();
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  test('displays credit usage data correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCreditData,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('FlightRadar24 API Credits')).toBeInTheDocument();
      expect(screen.getByText('15,000 / 60,000')).toBeInTheDocument();
      expect(screen.getByText('25.0%')).toBeInTheDocument();
      expect(screen.getByText('45,000')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
    });
  });

  test('shows green color for low usage', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCreditData,
    });

    renderComponent();

    await waitFor(() => {
      const percentageElement = screen.getByText('25.0%');
      expect(percentageElement.closest('div')).toHaveClass('text-green-600', 'bg-green-100');
    });

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-green-500');
  });

  test('shows yellow color for medium usage', async () => {
    const mediumUsageData = {
      ...mockCreditData,
      monthly_used: 45000,
      monthly_percentage: 75.0,
      monthly_remaining: 15000,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mediumUsageData,
    });

    renderComponent();

    await waitFor(() => {
      const percentageElement = screen.getByText('75.0%');
      expect(percentageElement.closest('div')).toHaveClass('text-yellow-600', 'bg-yellow-100');
    });

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-yellow-500');
  });

  test('shows red color and warning for high usage', async () => {
    const highUsageData = {
      ...mockCreditData,
      monthly_used: 57000,
      monthly_percentage: 95.0,
      monthly_remaining: 3000,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => highUsageData,
    });

    renderComponent();

    await waitFor(() => {
      const percentageElement = screen.getByText('95.0%');
      expect(percentageElement.closest('div')).toHaveClass('text-red-600', 'bg-red-100');
      
      expect(screen.getByText('Credit Usage Warning')).toBeInTheDocument();
      expect(screen.getByText(/Critical: Credit limit nearly exhausted/)).toBeInTheDocument();
    });

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-red-500');
  });

  test('displays warning alert at 85% usage', async () => {
    const warningUsageData = {
      ...mockCreditData,
      monthly_used: 51000,
      monthly_percentage: 85.0,
      monthly_remaining: 9000,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => warningUsageData,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Credit Usage Warning')).toBeInTheDocument();
      expect(screen.getByText(/You have used over 85% of your monthly credits/)).toBeInTheDocument();
    });
  });

  test('handles API error gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Unable to load credit usage')).toBeInTheDocument();
      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    });
  });

  test('auto-refreshes data every minute', async () => {
    vi.useFakeTimers();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockCreditData,
    });

    renderComponent();

    // Initial load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Advance 60 seconds
    vi.advanceTimersByTime(60000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  test('formats large numbers with commas', async () => {
    const largeNumberData = {
      ...mockCreditData,
      monthly_used: 45678,
      monthly_remaining: 14322,
      daily_used: 1234,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => largeNumberData,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('45,678 / 60,000')).toBeInTheDocument();
      expect(screen.getByText('14,322')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });
  });

  test('displays environment indicator', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCreditData,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Data Source: FlightRadar24 API')).toBeInTheDocument();
      expect(screen.getByText('Environment: Sandbox')).toBeInTheDocument();
    });
  });

  test('calculates progress bar width correctly', async () => {
    const testData = {
      ...mockCreditData,
      monthly_percentage: 75.0,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => testData,
    });

    renderComponent();

    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '75%' });
    });
  });

  test('limits progress bar to 100% max', async () => {
    const overLimitData = {
      ...mockCreditData,
      monthly_used: 65000,
      monthly_percentage: 108.3,
      monthly_remaining: -5000,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => overLimitData,
    });

    renderComponent();

    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });
});