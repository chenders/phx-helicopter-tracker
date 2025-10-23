/**
 * React Hook for fetching radio archives by time range
 *
 * Queries the backend API for radio archives that overlap with a flight's time range
 */

import { useState, useEffect } from 'react';
import { RadioArchiveData } from '../components/RadioAudioIndicator';

interface UseRadioArchivesResult {
  archives: RadioArchiveData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch radio archives that overlap with the given time range
 */
export function useRadioArchives(
  startTime: string | undefined,
  endTime: string | undefined,
  enabled: boolean = true
): UseRadioArchivesResult {
  const [archives, setArchives] = useState<RadioArchiveData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    // Don't fetch if not enabled or missing time range
    if (!enabled || !startTime || !endTime) {
      setArchives([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchArchives = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          start_time: startTime,
          end_time: endTime,
        });

        const response = await fetch(`/api/v1/radio/archives/by-timerange?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch radio archives: ${response.statusText}`);
        }

        const data: RadioArchiveData[] = await response.json();
        setArchives(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error fetching radio archives:', err);
        setArchives([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArchives();
  }, [startTime, endTime, enabled, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return {
    archives,
    loading,
    error,
    refetch,
  };
}

export default useRadioArchives;
