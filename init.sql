-- Create TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create database if it doesn't exist (note: this needs to be run from a superuser context)
-- CREATE DATABASE phoenix_helicopters;

-- Connect to the phoenix_helicopters database
\c phoenix_helicopters;

-- Create TimescaleDB extension in the phoenix_helicopters database
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create initial tables for the application
-- These match the SQLAlchemy models defined in the backend

-- Aircraft table for Phoenix PD helicopter fleet
CREATE TABLE IF NOT EXISTS aircraft (
    id SERIAL PRIMARY KEY,
    registration VARCHAR(10) UNIQUE NOT NULL,
    icao_code VARCHAR(6) UNIQUE,
    make VARCHAR(50),
    model VARCHAR(50),
    year_manufactured INTEGER,
    is_phoenix_pd BOOLEAN DEFAULT FALSE,
    unit_designation VARCHAR(20),
    has_flir BOOLEAN DEFAULT FALSE,
    has_spotlight BOOLEAN DEFAULT FALSE,
    has_loudspeaker BOOLEAN DEFAULT FALSE,
    max_flight_time_minutes INTEGER,
    hourly_operating_cost FLOAT DEFAULT 2160.0,
    purchase_cost FLOAT,
    annual_maintenance_cost FLOAT,
    is_active BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Flight logs table - will be converted to hypertable for time-series data
CREATE TABLE IF NOT EXISTS flight_logs (
    id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES aircraft(id) NOT NULL,
    flight_id VARCHAR(50) UNIQUE,
    callsign VARCHAR(50),  -- Increased from 20 to 50
    departure_time TIMESTAMP WITH TIME ZONE,
    arrival_time TIMESTAMP WITH TIME ZONE,
    flight_duration_minutes FLOAT,
    departure_airport VARCHAR(10),
    arrival_airport VARCHAR(10),
    max_altitude_feet INTEGER,
    min_altitude_feet INTEGER,
    avg_altitude_feet INTEGER,
    estimated_cost FLOAT,
    fuel_consumed_gallons FLOAT,
    data_source VARCHAR(50),  -- Increased from 20 to 50 for "flightradar24_historical"
    raw_data JSONB,
    area_coverage JSONB,
    hover_locations JSONB,
    low_altitude_segments JSONB,
    surveillance_types JSONB,
    pattern_notes TEXT,
    surveillance_likelihood FLOAT,
    privacy_concern_level INTEGER,
    legal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Note: TimescaleDB hypertable creation will be skipped if using regular PostgreSQL
-- SELECT create_hypertable('flight_logs', 'departure_time', if_not_exists => TRUE);

-- Flight positions table for GPS tracking data
CREATE TABLE IF NOT EXISTS flight_positions (
    id SERIAL PRIMARY KEY,
    flight_log_id INTEGER REFERENCES flight_logs(id) NOT NULL,
    aircraft_id INTEGER REFERENCES aircraft(id) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    altitude_feet INTEGER,
    ground_speed_knots FLOAT,
    track_degrees FLOAT,
    vertical_rate FLOAT,
    is_hovering BOOLEAN DEFAULT FALSE,
    hover_duration_seconds INTEGER,
    is_circling BOOLEAN DEFAULT FALSE,
    circle_radius_feet FLOAT,
    neighborhood VARCHAR(100),
    address_nearby VARCHAR(200),
    land_use_type VARCHAR(50),
    over_private_property BOOLEAN,
    altitude_privacy_concern BOOLEAN,
    duration_at_location INTEGER,
    position_accuracy_meters FLOAT,
    data_source VARCHAR(50)  -- Increased from 20 to 50 for "flightradar24_historical"
);

-- Note: TimescaleDB hypertable creation will be skipped if using regular PostgreSQL
-- SELECT create_hypertable('flight_positions', 'timestamp', if_not_exists => TRUE);


-- Legal documents table
CREATE TABLE IF NOT EXISTS legal_documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    description TEXT,
    date_range_start TIMESTAMP WITH TIME ZONE,
    date_range_end TIMESTAMP WITH TIME ZONE,
    geographic_area VARCHAR(200),
    aircraft_filter TEXT[],
    incident_filter INTEGER[],
    analysis_parameters JSONB,
    export_format VARCHAR(10) DEFAULT 'pdf',
    include_maps BOOLEAN DEFAULT TRUE,
    include_raw_data BOOLEAN DEFAULT FALSE,
    attorney_notes TEXT,
    executive_summary TEXT,
    findings JSONB,
    recommendations JSONB,
    file_path VARCHAR(500),
    file_size_bytes INTEGER,
    generation_status VARCHAR(20) DEFAULT 'pending',
    generated_at TIMESTAMP WITH TIME ZONE,
    generation_duration_seconds INTEGER,
    error_message TEXT,
    download_count INTEGER DEFAULT 0,
    last_downloaded TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Constitutional analyses table
CREATE TABLE IF NOT EXISTS constitutional_analyses (
    id SERIAL PRIMARY KEY,
    analysis_name VARCHAR(200) NOT NULL,
    date_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
    date_range_end TIMESTAMP WITH TIME ZONE NOT NULL,
    geographic_scope VARCHAR(200),
    fourth_amendment_violations JSONB,
    privacy_expectation_analysis JSONB,
    surveillance_patterns JSONB,
    systematic_surveillance_detected BOOLEAN DEFAULT FALSE,
    surveillance_intensity_score FLOAT DEFAULT 0.0,
    targeted_areas JSONB,
    applicable_precedents JSONB,
    precedent_violations JSONB,
    discriminatory_impact_detected BOOLEAN DEFAULT FALSE,
    demographic_analysis JSONB,
    disparate_impact_score FLOAT DEFAULT 0.0,
    total_flights_analyzed INTEGER NOT NULL,
    total_surveillance_events INTEGER DEFAULT 0,
    average_surveillance_duration FLOAT,
    cost_of_surveillance FLOAT,
    recommended_legal_actions JSONB,
    injunction_grounds JSONB,
    damages_analysis JSONB,
    methodology_notes TEXT,
    confidence_score FLOAT DEFAULT 0.0,
    peer_reviewed BOOLEAN DEFAULT FALSE,
    reviewer_notes TEXT,
    legal_document_id INTEGER REFERENCES legal_documents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    analyst_name VARCHAR(100)
);

-- Legal precedents table
CREATE TABLE IF NOT EXISTS legal_precedents (
    id SERIAL PRIMARY KEY,
    case_name VARCHAR(200) NOT NULL,
    citation VARCHAR(100) NOT NULL,
    court VARCHAR(100) NOT NULL,
    decision_date TIMESTAMP WITH TIME ZONE NOT NULL,
    case_summary TEXT,
    holding TEXT NOT NULL,
    legal_principle TEXT,
    surveillance_relevance FLOAT DEFAULT 0.0,
    fourth_amendment_analysis TEXT,
    privacy_analysis TEXT,
    case_type VARCHAR(50),
    jurisdiction VARCHAR(50),
    binding_precedent BOOLEAN DEFAULT FALSE,
    key_facts JSONB,
    distinguishing_factors JSONB,
    supporting_authority JSONB,
    citation_count INTEGER DEFAULT 0,
    last_cited TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    added_by VARCHAR(100),
    notes TEXT
);

-- Task history table for Celery task monitoring
CREATE TABLE IF NOT EXISTS task_history (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) UNIQUE,
    task_name VARCHAR(255),
    status VARCHAR(50),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    runtime_seconds FLOAT,
    args JSON,
    kwargs JSON,
    queue VARCHAR(100),
    worker VARCHAR(255),
    result JSON,
    error_message TEXT,
    traceback TEXT,
    retry_count INTEGER DEFAULT 0,
    credits_used INTEGER,
    records_processed INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Task events table
CREATE TABLE IF NOT EXISTS task_events (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255),
    task_name VARCHAR(255),
    event_type VARCHAR(50),
    severity INTEGER DEFAULT 1,
    title VARCHAR(255),
    message TEXT,
    details JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task metrics table
CREATE TABLE IF NOT EXISTS task_metrics (
    id SERIAL PRIMARY KEY,
    task_name VARCHAR(255) UNIQUE,
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    retry_runs INTEGER DEFAULT 0,
    avg_runtime_seconds FLOAT,
    max_runtime_seconds FLOAT,
    min_runtime_seconds FLOAT,
    total_records_processed INTEGER DEFAULT 0,
    total_credits_used INTEGER DEFAULT 0,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_success_at TIMESTAMP WITH TIME ZONE,
    last_failure_at TIMESTAMP WITH TIME ZONE,
    last_error_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Insert sample Phoenix PD aircraft data
INSERT INTO aircraft (registration, make, model, year_manufactured, is_phoenix_pd, has_flir, has_spotlight, has_loudspeaker)
VALUES
    ('N624FB', 'Airbus', 'AS350B3', 2010, TRUE, TRUE, TRUE, TRUE),
    ('N625FB', 'Airbus', 'AS350B3', 2011, TRUE, TRUE, TRUE, TRUE),
    ('N626FB', 'Airbus', 'H125', 2020, TRUE, TRUE, TRUE, TRUE),
    ('N627FB', 'Airbus', 'H125', 2021, TRUE, TRUE, TRUE, TRUE),
    ('N628FB', 'Leonardo', 'A109E', 2018, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (registration) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_aircraft_phoenix_pd ON aircraft (is_phoenix_pd);
CREATE INDEX IF NOT EXISTS idx_aircraft_registration ON aircraft (registration);
CREATE INDEX IF NOT EXISTS idx_aircraft_icao ON aircraft (icao_code);

CREATE INDEX IF NOT EXISTS idx_flight_logs_time_range ON flight_logs (departure_time, arrival_time);
CREATE INDEX IF NOT EXISTS idx_flight_logs_aircraft_date ON flight_logs (aircraft_id, departure_time);
CREATE INDEX IF NOT EXISTS idx_flight_logs_surveillance ON flight_logs (surveillance_likelihood, privacy_concern_level);
CREATE INDEX IF NOT EXISTS idx_flight_logs_flight_id ON flight_logs (flight_id);
CREATE INDEX IF NOT EXISTS idx_flight_logs_callsign ON flight_logs (callsign);
CREATE INDEX IF NOT EXISTS idx_flight_logs_data_source ON flight_logs (data_source);
CREATE INDEX IF NOT EXISTS idx_flight_logs_created ON flight_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_positions_location ON flight_positions (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_positions_time_aircraft ON flight_positions (timestamp, aircraft_id);
CREATE INDEX IF NOT EXISTS idx_positions_hovering ON flight_positions (is_hovering, hover_duration_seconds);
CREATE INDEX IF NOT EXISTS idx_positions_privacy ON flight_positions (over_private_property, altitude_privacy_concern);
CREATE INDEX IF NOT EXISTS idx_positions_neighborhood ON flight_positions (neighborhood);
CREATE INDEX IF NOT EXISTS idx_positions_flight_log ON flight_positions (flight_log_id);

CREATE INDEX IF NOT EXISTS idx_legal_docs_type_status ON legal_documents (document_type, generation_status);
CREATE INDEX IF NOT EXISTS idx_legal_docs_date_range ON legal_documents (date_range_start, date_range_end);
CREATE INDEX IF NOT EXISTS idx_legal_docs_generated ON legal_documents (generated_at, download_count);

CREATE INDEX IF NOT EXISTS idx_const_analysis_violations ON constitutional_analyses (systematic_surveillance_detected, discriminatory_impact_detected);
CREATE INDEX IF NOT EXISTS idx_const_analysis_scores ON constitutional_analyses (surveillance_intensity_score, confidence_score);
CREATE INDEX IF NOT EXISTS idx_const_analysis_date_range ON constitutional_analyses (date_range_start, date_range_end);

CREATE INDEX IF NOT EXISTS idx_precedents_relevance ON legal_precedents (surveillance_relevance, binding_precedent);
CREATE INDEX IF NOT EXISTS idx_precedents_type_jurisdiction ON legal_precedents (case_type, jurisdiction);
CREATE INDEX IF NOT EXISTS idx_precedents_court_date ON legal_precedents (court, decision_date);
CREATE INDEX IF NOT EXISTS idx_precedents_case_name ON legal_precedents (case_name);
CREATE INDEX IF NOT EXISTS idx_precedents_citation ON legal_precedents (citation);

CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history (task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_task_name ON task_history (task_name);
CREATE INDEX IF NOT EXISTS idx_task_history_status ON task_history (status);
CREATE INDEX IF NOT EXISTS idx_task_history_created ON task_history (created_at);

CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events (task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_task_name ON task_events (task_name);
CREATE INDEX IF NOT EXISTS idx_task_events_event_type ON task_events (event_type);
CREATE INDEX IF NOT EXISTS idx_task_events_created ON task_events (created_at);

CREATE INDEX IF NOT EXISTS idx_task_metrics_task_name ON task_metrics (task_name);

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
CREATE TRIGGER update_flight_logs_updated_at BEFORE UPDATE ON flight_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_legal_documents_updated_at BEFORE UPDATE ON legal_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_constitutional_analyses_updated_at BEFORE UPDATE ON constitutional_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_legal_precedents_updated_at BEFORE UPDATE ON legal_precedents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_history_updated_at BEFORE UPDATE ON task_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_metrics_updated_at BEFORE UPDATE ON task_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (if needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chris;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chris;
