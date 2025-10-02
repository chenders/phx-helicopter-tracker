-- Add PostGIS location column to flight_positions table
-- This migration adds a geography column for efficient spatial queries

-- Add the location column
ALTER TABLE flight_positions
ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- Populate location from existing lat/lon data
UPDATE flight_positions
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create spatial index for fast queries
CREATE INDEX IF NOT EXISTS idx_flight_positions_location
ON flight_positions USING GIST(location);

-- Create trigger to auto-populate location on insert/update
CREATE OR REPLACE FUNCTION update_location_column()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_flight_positions_location ON flight_positions;

CREATE TRIGGER update_flight_positions_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON flight_positions
FOR EACH ROW
EXECUTE FUNCTION update_location_column();

-- Also add missing columns that were discovered during data import
ALTER TABLE aircraft
ADD COLUMN IF NOT EXISTS operator VARCHAR(100);

ALTER TABLE flight_logs
ADD COLUMN IF NOT EXISTS max_altitude_agl_feet INTEGER,
ADD COLUMN IF NOT EXISTS min_altitude_agl_feet INTEGER,
ADD COLUMN IF NOT EXISTS avg_altitude_agl_feet INTEGER;

ALTER TABLE flight_positions
ADD COLUMN IF NOT EXISTS ground_elevation_feet INTEGER,
ADD COLUMN IF NOT EXISTS altitude_agl_feet INTEGER;