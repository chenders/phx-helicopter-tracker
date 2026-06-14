import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, TrendingUp, Activity, DollarSign } from 'lucide-react';

interface CreditUsageData {
  monthly_used: number;
  monthly_limit: number;
  monthly_remaining: number;
  monthly_percentage: number;
  daily_used: number;
  daily_average: number;
  projected_monthly: number;
}

const CreditUsageWidget: React.FC = () => {
  const { data, isLoading, error } = useQuery<CreditUsageData>({
    queryKey: ['creditUsage'],
    queryFn: async () => {
      const response = await fetch('/api/v1/tracking/sources/fr24/credits');
      if (!response.ok) throw new Error('Failed to fetch credit usage');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center text-red-500">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Unable to load credit usage</span>
        </div>
      </div>
    );
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-blue-600" />
          FlightRadar24 API Credits
        </h3>
      </div>

      {/* Main Usage Display */}
      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-sm text-gray-600">Monthly Usage</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.monthly_used.toLocaleString()} / {data.monthly_limit.toLocaleString()}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full ${getUsageColor(data.monthly_percentage)}`}>
            <span className="font-semibold">{data.monthly_percentage.toFixed(1)}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getProgressBarColor(data.monthly_percentage)}`}
            style={{ width: `${Math.min(data.monthly_percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded p-3">
          <div className="flex items-center text-gray-600 mb-1">
            <DollarSign className="h-4 w-4 mr-1" />
            <span className="text-xs">Remaining</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {data.monthly_remaining.toLocaleString()}
          </p>
        </div>

        <div className="bg-gray-50 rounded p-3">
          <div className="flex items-center text-gray-600 mb-1">
            <Activity className="h-4 w-4 mr-1" />
            <span className="text-xs">Today's Usage</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {data.daily_used.toLocaleString()}
          </p>
        </div>

        <div className="bg-gray-50 rounded p-3">
          <div className="flex items-center text-gray-600 mb-1">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span className="text-xs">Daily Average</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {Math.round(data.daily_average).toLocaleString()}
          </p>
        </div>

        <div className="bg-gray-50 rounded p-3">
          <div className="flex items-center text-gray-600 mb-1">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span className="text-xs">Projected Monthly</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {Math.round(data.projected_monthly).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {data.monthly_percentage >= 85 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Credit Usage Warning</p>
              <p className="text-xs text-yellow-700 mt-1">
                {data.monthly_percentage >= 95
                  ? 'Critical: Credit limit nearly exhausted. API calls may be throttled.'
                  : 'You have used over 85% of your monthly credits. Consider reducing usage.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data Source Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Data Source: FlightRadar24 API</span>
          <span>Environment: Sandbox</span>
        </div>
      </div>
    </div>
  );
};

export default CreditUsageWidget;