/**
 * React Hook for fetching radio activity (segments with locations) by time range
 *
 * Queries the backend API for radio segments containing location mentions
 * during the flight time range - used for CAD activity visualization
 */

import { useState, useEffect } from 'react';

export interface RadioActivitySegment {
  id: number;
  timestamp: string;  // ISO timestamp
  text: string;
  urgency_score: number | null;  // 0.0 - 1.0
  locations: string[];  // Street names, intersections
  incident_codes: string[];  // 10-codes, Code 1/2/3, etc.
  tail_numbers: string[];  // Aircraft mentions
  contains_tail_number: boolean;
  contains_location: boolean;
  contains_incident_code: boolean;
  start_time: number;  // Seconds from start of audio
  duration_seconds: number;
}

interface UseRadioActivityResult {
  segments: RadioActivitySegment[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch radio activity segments that overlap with the given time range
 */
export function useRadioActivity(
  startTime: string | undefined,
  endTime: string | undefined,
  includeLocations: boolean = true,
  enabled: boolean = true
): UseRadioActivityResult {
  const [segments, setSegments] = useState<RadioActivitySegment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    // Don't fetch if not enabled or missing time range
    if (!enabled || !startTime || !endTime) {
      setSegments([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchActivity = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          start_time: startTime,
          end_time: endTime,
          include_locations: includeLocations.toString(),
        });

        const response = await fetch(`/api/v1/radio/activity/by-timerange?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch radio activity: ${response.statusText}`);
        }

        const data: RadioActivitySegment[] = await response.json();
        setSegments(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error fetching radio activity:', err);
        setSegments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [startTime, endTime, includeLocations, enabled, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return {
    segments,
    loading,
    error,
    refetch,
  };
}

export default useRadioActivity;
