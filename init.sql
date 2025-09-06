-- Create TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create database and user if they don't exist
CREATE DATABASE phoenix_helicopters;

-- Connect to the phoenix_helicopters database
\c phoenix_helicopters;

-- Create TimescaleDB extension in the phoenix_helicopters database
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create initial tables for the application
-- These will be managed by SQLAlchemy, but we can create the basic structure

-- Aircraft table for Phoenix PD helicopter fleet
CREATE TABLE IF NOT EXISTS aircraft (
    id SERIAL PRIMARY KEY,
    registration VARCHAR(10) UNIQUE NOT NULL,
    model VARCHAR(50),
    manufacturer VARCHAR(50),
    year_manufactured INTEGER,
    max_speed INTEGER,
    service_ceiling INTEGER,
    fuel_capacity DECIMAL,
    crew_capacity INTEGER,
    equipment JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flight logs table - will be converted to hypertable for time-series data
CREATE TABLE IF NOT EXISTS flight_logs (
    id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES aircraft(id),
    flight_number VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    start_location POINT,
    end_location POINT,
    duration_minutes INTEGER,
    max_altitude INTEGER,
    min_altitude INTEGER,
    avg_speed DECIMAL,
    fuel_used DECIMAL,
    purpose VARCHAR(100),
    is_surveillance BOOLEAN DEFAULT FALSE,
    surveillance_score DECIMAL DEFAULT 0,
    cost_estimate DECIMAL,
    crew_members JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert flight_logs to hypertable for time-series optimization
SELECT create_hypertable('flight_logs', 'start_time', if_not_exists => TRUE);

-- Flight positions table for GPS tracking data
CREATE TABLE IF NOT EXISTS flight_positions (
    id SERIAL PRIMARY KEY,
    flight_log_id INTEGER REFERENCES flight_logs(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    altitude INTEGER,
    speed DECIMAL,
    heading DECIMAL,
    is_hovering BOOLEAN DEFAULT FALSE,
    is_circling BOOLEAN DEFAULT FALSE,
    behavior_flags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert flight_positions to hypertable
SELECT create_hypertable('flight_positions', 'timestamp', if_not_exists => TRUE);

-- Incidents table for community reports
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    incident_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER,
    location VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    aircraft_registration VARCHAR(10),
    altitude_estimate INTEGER,
    noise_level VARCHAR(20),
    privacy_impact VARCHAR(20),
    witness_info TEXT,
    constitutional_concerns JSONB,
    harassment_indicators JSONB,
    verification_status VARCHAR(20) DEFAULT 'pending',
    media_files JSONB,
    reporter_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Legal documents table
CREATE TABLE IF NOT EXISTS legal_documents (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    file_path VARCHAR(500),
    format VARCHAR(10),
    page_count INTEGER,
    tags JSONB,
    legal_precedents JSONB,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constitutional analyses table
CREATE TABLE IF NOT EXISTS constitutional_analyses (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES incidents(id),
    flight_log_id INTEGER REFERENCES flight_logs(id),
    analysis_type VARCHAR(50),
    violation_type VARCHAR(50),
    severity_score DECIMAL,
    legal_basis TEXT,
    precedent_cases JSONB,
    recommendations TEXT,
    analyst VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample Phoenix PD aircraft data
INSERT INTO aircraft (registration, model, manufacturer, year_manufactured, max_speed, service_ceiling, fuel_capacity, crew_capacity, equipment, status)
VALUES
    ('N624FB', 'AS350B3', 'Airbus Helicopters', 2010, 140, 15000, 145, 6, '{"flir": true, "spotlight": true, "loudspeaker": true, "camera": "high_resolution"}', 'active'),
    ('N625FB', 'AS350B3', 'Airbus Helicopters', 2011, 140, 15000, 145, 6, '{"flir": true, "spotlight": true, "loudspeaker": true, "camera": "high_resolution"}', 'active'),
    ('N626FB', 'H125', 'Airbus Helicopters', 2020, 150, 20000, 145, 6, '{"flir": true, "spotlight": true, "loudspeaker": true, "camera": "4k_thermal"}', 'active'),
    ('N627FB', 'H125', 'Airbus Helicopters', 2021, 150, 20000, 145, 6, '{"flir": true, "spotlight": true, "loudspeaker": true, "camera": "4k_thermal"}', 'active'),
    ('N628FB', 'A109E', 'Leonardo', 2018, 165, 20000, 145, 8, '{"flir": true, "spotlight": true, "loudspeaker": true, "camera": "4k_thermal", "special_ops": true}', 'active')
ON CONFLICT (registration) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_flight_logs_start_time ON flight_logs (start_time);
CREATE INDEX IF NOT EXISTS idx_flight_logs_aircraft_surveillance ON flight_logs (aircraft_id, is_surveillance);
CREATE INDEX IF NOT EXISTS idx_flight_positions_timestamp ON flight_positions (timestamp);
CREATE INDEX IF NOT EXISTS idx_flight_positions_location ON flight_positions (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_incidents_date_time ON incidents (date_time);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_incidents_verification ON incidents (verification_status);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_aircraft_updated_at BEFORE UPDATE ON aircraft FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_legal_documents_updated_at BEFORE UPDATE ON legal_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (if needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chris;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chris;
