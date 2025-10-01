-- Phoenix Police Helicopter Tracker Database Schema
-- Generated from SQLAlchemy models
-- Database: phoenix_helicopters
-- PostgreSQL with TimescaleDB extensions

-- Create database if not exists
-- Note: This must be run as a superuser from the postgres database
-- CREATE DATABASE phoenix_helicopters;

-- Connect to the database
\c phoenix_helicopters;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;
CREATE EXTENSION IF NOT EXISTS "postgis";

-- NOTE: Tables are created only if they don't exist
-- This preserves existing data
-- To completely reset database, manually drop tables first

-- Aircraft table
CREATE TABLE IF NOT EXISTS aircraft (
    id SERIAL PRIMARY KEY,
    registration VARCHAR(20) UNIQUE NOT NULL,
    model VARCHAR(100),
    manufacturer VARCHAR(100),
    owner VARCHAR(200),
    operator VARCHAR(200),
    year_manufactured INTEGER,
    has_flir BOOLEAN DEFAULT FALSE,
    has_spotlight BOOLEAN DEFAULT FALSE,
    has_loudspeaker BOOLEAN DEFAULT FALSE,
    max_altitude_ft INTEGER,
    cruise_speed_knots INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for aircraft
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_aircraft_registration ON aircraft(registration);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_aircraft_is_active ON aircraft(is_active);

-- Flight logs table with JSONB for flexible data storage
CREATE TABLE IF NOT EXISTS flight_logs (
    id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES aircraft(id) ON DELETE CASCADE,
    registration VARCHAR(20),
    flight_number VARCHAR(50),
    callsign VARCHAR(20),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    
    -- Location data
    departure_airport VARCHAR(10),
    arrival_airport VARCHAR(10),
    max_altitude_ft INTEGER,
    min_altitude_ft INTEGER,
    total_distance_nm DOUBLE PRECISION,
    
    -- Analysis fields
    hover_count INTEGER DEFAULT 0,
    hover_total_minutes DOUBLE PRECISION DEFAULT 0,
    low_altitude_minutes DOUBLE PRECISION DEFAULT 0,
    circling_count INTEGER DEFAULT 0,
    
    -- JSONB fields for flexible storage
    positions JSONB,  -- Array of position data
    hover_locations JSONB,  -- Array of hover event locations
    low_altitude_segments JSONB,  -- Array of low altitude flight segments
    
    -- Privacy and surveillance metrics
    surveillance_score DOUBLE PRECISION,
    privacy_concern_level INTEGER CHECK (privacy_concern_level BETWEEN 1 AND 5),
    
    -- Data source tracking
    data_source VARCHAR(50),  -- 'fr24', 'adsb', 'manual', etc.
    source_file_path TEXT,
    import_id UUID DEFAULT uuid_generate_v4(),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_flight_per_source UNIQUE (registration, start_time, data_source)
);

-- Create indexes for flight_logs
CREATE INDEX IF NOT EXISTS idx_flight_logs_aircraft_id ON flight_logs(aircraft_id);
CREATE INDEX IF NOT EXISTS idx_flight_logs_registration ON flight_logs(registration);
CREATE INDEX IF NOT EXISTS idx_flight_logs_start_time ON flight_logs(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_flight_logs_end_time ON flight_logs(end_time DESC);
CREATE INDEX IF NOT EXISTS idx_flight_logs_surveillance_score ON flight_logs(surveillance_score);
CREATE INDEX IF NOT EXISTS idx_flight_logs_privacy_concern ON flight_logs(privacy_concern_level);
CREATE INDEX IF NOT EXISTS idx_flight_logs_import_id ON flight_logs(import_id);
CREATE INDEX IF NOT EXISTS idx_flight_logs_positions_gin ON flight_logs USING GIN (positions);
CREATE INDEX IF NOT EXISTS idx_flight_logs_hover_locations_gin ON flight_logs USING GIN (hover_locations);

-- Flight positions table (time-series data)
CREATE TABLE IF NOT EXISTS flight_positions (
    id BIGSERIAL PRIMARY KEY,
    flight_log_id INTEGER REFERENCES flight_logs(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude_ft INTEGER,
    ground_speed_knots INTEGER,
    heading INTEGER,
    vertical_speed_fpm INTEGER,
    on_ground BOOLEAN DEFAULT FALSE,
    
    -- Analysis flags
    is_hovering BOOLEAN DEFAULT FALSE,
    is_circling BOOLEAN DEFAULT FALSE,
    is_low_altitude BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create hypertable for time-series data (if TimescaleDB is available)
-- SELECT create_hypertable('flight_positions', 'timestamp', if_not_exists => TRUE);

-- Create indexes for flight_positions
CREATE INDEX IF NOT EXISTS idx_flight_positions_flight_log_id ON flight_positions(flight_log_id);
CREATE INDEX IF NOT EXISTS idx_flight_positions_timestamp ON flight_positions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_flight_positions_location ON flight_positions(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_flight_positions_hovering ON flight_positions(is_hovering) WHERE is_hovering = TRUE;

-- Legal documents table
CREATE TABLE IF NOT EXISTS legal_documents (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(50) NOT NULL,  -- 'complaint', 'motion', 'brief', etc.
    title VARCHAR(500) NOT NULL,
    content TEXT,
    
    -- Related flight data
    related_flights JSONB,  -- Array of flight_log_ids
    related_dates JSONB,  -- Array of relevant dates
    
    -- Document metadata
    case_number VARCHAR(100),
    court VARCHAR(200),
    filing_date DATE,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'draft',  -- 'draft', 'review', 'filed', 'accepted'
    
    -- Analysis results
    constitutional_issues JSONB,
    privacy_violations JSONB,
    supporting_evidence JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Create indexes for legal_documents
CREATE INDEX IF NOT EXISTS idx_legal_documents_type ON legal_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_legal_documents_status ON legal_documents(status);
CREATE INDEX IF NOT EXISTS idx_legal_documents_case_number ON legal_documents(case_number);

-- Constitutional analyses table
CREATE TABLE IF NOT EXISTS constitutional_analyses (
    id SERIAL PRIMARY KEY,
    legal_document_id INTEGER REFERENCES legal_documents(id) ON DELETE CASCADE,
    
    amendment VARCHAR(50),  -- 'fourth', 'first', 'fourteenth'
    violation_type VARCHAR(100),
    description TEXT,
    severity_score INTEGER CHECK (severity_score BETWEEN 1 AND 10),
    
    -- Supporting data
    supporting_flights JSONB,
    supporting_patterns JSONB,
    legal_citations TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Legal precedents table
CREATE TABLE IF NOT EXISTS legal_precedents (
    id SERIAL PRIMARY KEY,
    legal_document_id INTEGER REFERENCES legal_documents(id) ON DELETE CASCADE,
    
    case_name VARCHAR(500) NOT NULL,
    citation VARCHAR(200),
    year INTEGER,
    court VARCHAR(200),
    
    relevance_score INTEGER CHECK (relevance_score BETWEEN 1 AND 10),
    summary TEXT,
    key_holdings TEXT,
    
    -- How it applies to our case
    application_notes TEXT,
    supports_position BOOLEAN,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task history table for background job tracking
CREATE TABLE IF NOT EXISTS task_history (
    id SERIAL PRIMARY KEY,
    task_id UUID DEFAULT uuid_generate_v4(),
    task_name VARCHAR(200) NOT NULL,
    task_type VARCHAR(50),  -- 'data_import', 'analysis', 'report_generation'
    
    -- Task parameters and results
    parameters JSONB,
    result JSONB,
    error_message TEXT,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed'
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds DOUBLE PRECISION,
    
    -- Resource usage
    memory_usage_mb DOUBLE PRECISION,
    cpu_seconds DOUBLE PRECISION,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for task_history
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_task_name ON task_history(task_name);
CREATE INDEX IF NOT EXISTS idx_task_history_status ON task_history(status);
CREATE INDEX IF NOT EXISTS idx_task_history_created_at ON task_history(created_at DESC);

-- Task events table for detailed task logging
CREATE TABLE IF NOT EXISTS task_events (
    id SERIAL PRIMARY KEY,
    task_history_id INTEGER REFERENCES task_history(id) ON DELETE CASCADE,
    event_type VARCHAR(50),  -- 'info', 'warning', 'error', 'progress'
    message TEXT,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task metrics table for performance tracking
CREATE TABLE IF NOT EXISTS task_metrics (
    id SERIAL PRIMARY KEY,
    task_history_id INTEGER REFERENCES task_history(id) ON DELETE CASCADE,
    metric_name VARCHAR(100),
    metric_value DOUBLE PRECISION,
    unit VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
CREATE TRIGGER update_aircraft_updated_at BEFORE UPDATE ON aircraft
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flight_logs_updated_at BEFORE UPDATE ON flight_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_documents_updated_at BEFORE UPDATE ON legal_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_history_updated_at BEFORE UPDATE ON task_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for Phoenix PD helicopters
INSERT INTO aircraft (registration, model, manufacturer, owner, operator, has_flir, has_spotlight, has_loudspeaker, is_active) VALUES
    ('N621FB', 'H125', 'Airbus Helicopters', 'City of Phoenix', 'Phoenix Police Department', TRUE, TRUE, TRUE, TRUE),
    ('N622FB', 'H125', 'Airbus Helicopters', 'City of Phoenix', 'Phoenix Police Department', TRUE, TRUE, TRUE, TRUE),
    ('N623FB', 'H125', 'Airbus Helicopters', 'City of Phoenix', 'Phoenix Police Department', TRUE, TRUE, TRUE, TRUE),
    ('N624FB', 'H125', 'Airbus Helicopters', 'City of Phoenix', 'Phoenix Police Department', TRUE, TRUE, TRUE, TRUE),
    ('N625FB', 'H125', 'Airbus Helicopters', 'City of Phoenix', 'Phoenix Police Department', TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (registration) DO UPDATE SET
    model = EXCLUDED.model,
    has_flir = EXCLUDED.has_flir,
    has_spotlight = EXCLUDED.has_spotlight,
    has_loudspeaker = EXCLUDED.has_loudspeaker,
    updated_at = CURRENT_TIMESTAMP;

-- Create views for common queries
CREATE OR REPLACE VIEW v_active_flights AS
SELECT 
    fl.*,
    a.model as aircraft_model,
    a.operator
FROM flight_logs fl
JOIN aircraft a ON fl.aircraft_id = a.id
WHERE fl.end_time IS NULL OR fl.end_time > NOW() - INTERVAL '1 hour';

CREATE OR REPLACE VIEW v_surveillance_flights AS
SELECT 
    fl.*,
    a.model as aircraft_model,
    a.operator,
    COALESCE(fl.hover_count, 0) + COALESCE(fl.circling_count, 0) as surveillance_events
FROM flight_logs fl
JOIN aircraft a ON fl.aircraft_id = a.id
WHERE fl.surveillance_score > 0.5 
   OR fl.privacy_concern_level >= 3
   OR fl.hover_total_minutes > 10;

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Database configuration notes
COMMENT ON DATABASE phoenix_helicopters IS 'Phoenix Police Helicopter Tracking Database for Legal Case Documentation';
COMMENT ON TABLE aircraft IS 'Phoenix PD helicopter fleet information';
COMMENT ON TABLE flight_logs IS 'Comprehensive flight tracking with privacy analysis';
COMMENT ON TABLE flight_positions IS 'Time-series position data for flight paths';
COMMENT ON TABLE legal_documents IS 'Legal documents for the surveillance lawsuit';
COMMENT ON COLUMN flight_logs.surveillance_score IS 'Calculated score 0-1 indicating surveillance activity level';
COMMENT ON COLUMN flight_logs.privacy_concern_level IS 'Privacy violation severity: 1=minimal, 5=severe';

-- Performance tuning recommendations
-- ALTER SYSTEM SET shared_buffers = '2GB';
-- ALTER SYSTEM SET effective_cache_size = '6GB';
-- ALTER SYSTEM SET maintenance_work_mem = '512MB';
-- ALTER SYSTEM SET work_mem = '32MB';
-- ALTER SYSTEM SET max_connections = 100;
-- ALTER SYSTEM SET random_page_cost = 1.1;  -- For SSD storage

-- Backup command example
-- pg_dump -h localhost -p 5433 -U postgres -d phoenix_helicopters -f backup_$(date +%Y%m%d).sql