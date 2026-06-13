"""
Pytest configuration and fixtures for backend tests
"""
import pytest
import asyncio
import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.main import app
from app.db.database import Base, get_db
from app.api.deps import get_db as deps_get_db
from app.models import (
    Aircraft,
    FlightLog,
    FlightPosition,
    LegalDocument,
    ConstitutionalAnalysis,
    LegalPrecedent,
    TaskHistory,
    TaskEvent,
    TaskMetrics,
)

# Use PostgreSQL for testing to match production
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5433/phoenix_helicopters_test",
)

# Create test engine with connection pooling
test_engine = create_engine(
    TEST_DATABASE_URL,
    poolclass=StaticPool,  # Use static pool for better test isolation
    connect_args={"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {},
    echo=False,  # Set to True for SQL debugging
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Set up the test database once per test session."""
    # Create all tables at the start of the test session
    Base.metadata.create_all(bind=test_engine)
    yield
    # Clean up at the end of the test session
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """DB session in a transaction + SAVEPOINT, rolled back per test.

    The nested SAVEPOINT (restarted after each inner commit) lets endpoint code
    call session.commit() while the outer transaction is still rolled back at
    teardown, keeping tests isolated on a single shared connection.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, trans):
        if trans.nested and not trans._parent.nested:
            sess.begin_nested()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database session override."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # Session cleanup is handled in db_session fixture

    # Override the dependency
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[deps_get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        # Clean up the override
        app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def async_client(db_session):
    """Create an async test client with database session override."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[deps_get_db] = override_get_db

    try:
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def sample_aircraft(db_session):
    """Create a sample aircraft for testing."""
    aircraft = Aircraft(
        registration="N624FB",
        icao_code="A12345",
        make="Airbus",
        model="H125",
        year_manufactured=2020,
        is_phoenix_pd=True,
        unit_designation="Air15",
        has_flir=True,
        has_spotlight=True,
        has_loudspeaker=True,
        max_flight_time_minutes=180,
        hourly_operating_cost=2160.0,
        purchase_cost=3500000.0,
        annual_maintenance_cost=150000.0,
        is_active=True,
    )
    db_session.add(aircraft)
    db_session.commit()
    db_session.refresh(aircraft)
    return aircraft


@pytest.fixture
def sample_flight_log(db_session, sample_aircraft):
    """Create a sample flight log for testing."""
    from datetime import datetime, timezone

    flight_log = FlightLog(
        aircraft_id=sample_aircraft.id,
        flight_id="FL_TEST_001",
        callsign="Air15",
        departure_time=datetime.now(timezone.utc),
        arrival_time=datetime.now(timezone.utc),
        flight_duration_minutes=45.0,
        departure_airport="KDVT",
        arrival_airport="KDVT",
        max_altitude_feet=1200,
        min_altitude_feet=300,
        avg_altitude_feet=800,
        estimated_cost=162.0,
        fuel_consumed_gallons=25.0,
        data_source="adsb",
        surveillance_likelihood=0.8,
        privacy_concern_level=4,
        legal_notes="Low altitude over residential area",
    )
    db_session.add(flight_log)
    db_session.commit()
    db_session.refresh(flight_log)
    return flight_log


@pytest.fixture
def sample_flight_positions(db_session, sample_flight_log):
    """Create sample flight positions for testing."""
    from datetime import datetime, timezone, timedelta

    positions = []
    base_time = datetime.now(timezone.utc)

    for i in range(5):
        position = FlightPosition(
            flight_log_id=sample_flight_log.id,
            aircraft_id=sample_flight_log.aircraft_id,  # Add aircraft_id
            timestamp=base_time + timedelta(minutes=i * 2),
            latitude=33.4484 + (i * 0.001),
            longitude=-112.0740 - (i * 0.001),
            altitude_feet=800 + (i * 50),
            ground_speed_knots=80 if i > 0 else 0,
            track_degrees=180,
            vertical_rate=100 if i < 3 else -100,
            is_hovering=i == 2,
            altitude_privacy_concern=i == 2,
            data_source="adsb",
        )
        db_session.add(position)
        positions.append(position)

    db_session.commit()
    for pos in positions:
        db_session.refresh(pos)
    return positions


@pytest.fixture
def sample_flight_with_positions(sample_flight_log, sample_flight_positions):
    """Get the flight log that has positions associated with it."""
    return sample_flight_log


@pytest.fixture
def mock_fr24_response():
    """Mock FlightRadar24 API response."""
    return {
        "version": "v1",
        "flights": [
            {
                "flight_id": "3bb5af37",
                "lat": 33.4484,
                "lon": -112.0740,
                "track": 180,
                "altitude": 1500,
                "speed": 80,
                "squawk": "1200",
                "vspeed": 0,
                "callsign": "N624FB",
                "registration": "N624FB",
                "origin": "KDVT",
                "destination": "KDVT",
                "flight": "N624FB",
                "timestamp": "2025-08-30T12:00:00Z",
            }
        ],
    }


@pytest.fixture
def auth_headers():
    """Create authentication headers for testing."""
    return {"Authorization": "Bearer test-token"}


@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection for testing."""
    from unittest.mock import AsyncMock

    ws = AsyncMock()
    ws.send_json = AsyncMock()
    ws.receive_json = AsyncMock()
    ws.close = AsyncMock()
    return ws


@pytest.fixture
def surveillance_flight(db_session, sample_aircraft):
    """Create a flight with surveillance patterns."""
    from datetime import datetime, timezone

    flight = FlightLog(
        aircraft_id=sample_aircraft.id,
        flight_id="SURV_001",
        callsign="Air15",
        departure_time=datetime.now(timezone.utc),
        arrival_time=datetime.now(timezone.utc),
        flight_duration_minutes=120.0,
        departure_airport="KDVT",
        arrival_airport="KDVT",
        max_altitude_feet=400,
        min_altitude_feet=350,
        avg_altitude_feet=375,
        estimated_cost=432.0,
        fuel_consumed_gallons=67.0,
        data_source="flightradar24",
        surveillance_likelihood=0.95,
        privacy_concern_level=5,
        legal_notes="Extended hovering at low altitude over residential area",
    )
    db_session.add(flight)
    db_session.commit()
    db_session.refresh(flight)
    return flight


# Test database utilities
@pytest.fixture
def clean_db(db_session):
    """Ensure a completely clean database state."""
    # This fixture can be used when you need to ensure
    # no residual data exists from previous tests

    # Clear all tables in reverse dependency order
    for table in reversed(Base.metadata.sorted_tables):
        db_session.execute(table.delete())
    db_session.commit()

    yield db_session
