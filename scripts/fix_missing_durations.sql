-- Fix missing flight_duration_minutes by calculating from departure and arrival times
-- This updates all flights that have both times but no duration

UPDATE flight_logs
SET flight_duration_minutes = EXTRACT(EPOCH FROM (arrival_time - departure_time)) / 60
WHERE departure_time IS NOT NULL
  AND arrival_time IS NOT NULL
  AND flight_duration_minutes IS NULL;

-- Show summary of what was updated
SELECT
  COUNT(*) as updated_flights,
  MIN(flight_duration_minutes) as min_duration_minutes,
  MAX(flight_duration_minutes) as max_duration_minutes,
  AVG(flight_duration_minutes)::numeric(10,2) as avg_duration_minutes
FROM flight_logs
WHERE updated_at > NOW() - INTERVAL '10 seconds';
