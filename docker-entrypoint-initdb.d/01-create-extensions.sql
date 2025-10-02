-- Create extensions in the phoenix_helicopters database
\c phoenix_helicopters;

-- Create PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Verify extensions are installed
SELECT extname, extversion FROM pg_extension WHERE extname IN ('postgis', 'timescaledb');