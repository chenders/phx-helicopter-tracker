import pytest
from datetime import datetime, timezone
from app.models import Aircraft, FlightLog, FlightPosition


class TestAircraftModel:
    """Test the Aircraft model."""

    def test_create_aircraft(self, db_session):
        """Test creating an aircraft."""
        aircraft = Aircraft(
            registration="N123AB",
            icao_code="ABC123",
            make="Bell",
            model="407",
            year_manufactured=2018,
            is_phoenix_pd=True,
            unit_designation="Air20",
            has_flir=False,
            has_spotlight=True,
            hourly_operating_cost=1800.0,
        )

        db_session.add(aircraft)
        db_session.commit()

        assert aircraft.id is not None
        assert aircraft.registration == "N123AB"
        assert aircraft.is_phoenix_pd is True
        assert aircraft.hourly_operating_cost == 1800.0

    def test_aircraft_repr(self, sample_aircraft):
        """Test aircraft string representation."""
        repr_str = repr(sample_aircraft)
        assert "N624FB" in repr_str
        assert "Airbus H125" in repr_str
        assert "phoenix_pd=True" in repr_str

    def test_aircraft_relationships(
        self, sample_aircraft, sample_flight_log, db_session
    ):
        """Test aircraft relationships with flight logs."""
        db_session.refresh(sample_aircraft)
        assert len(sample_aircraft.flight_logs) == 1
        assert sample_aircraft.flight_logs[0].id == sample_flight_log.id


class TestFlightLogModel:
    """Test the FlightLog model."""

    def test_create_flight_log(self, db_session, sample_aircraft):
        """Test creating a flight log."""
        now = datetime.now(timezone.utc)

        flight_log = FlightLog(
            aircraft_id=sample_aircraft.id,
            flight_id="FL_TEST_002",
            callsign="Air20",
            departure_time=now,
            arrival_time=now,
            flight_duration_minutes=90.0,
            departure_airport="KDVT",
            max_altitude_feet=2000,
            estimated_cost=324.0,
            data_source="flightradar24",
            surveillance_likelihood=0.6,
            privacy_concern_level=2,
        )

        db_session.add(flight_log)
        db_session.commit()

        assert flight_log.id is not None
        assert flight_log.aircraft_id == sample_aircraft.id
        assert flight_log.flight_duration_minutes == 90.0
        assert flight_log.surveillance_likelihood == 0.6

    def test_flight_log_cost_calculation(self, db_session, sample_aircraft):
        """Test flight log cost calculation."""
        flight_log = FlightLog(
            aircraft_id=sample_aircraft.id,
            flight_id="FL_COST_TEST",
            flight_duration_minutes=60.0,
            estimated_cost=sample_aircraft.hourly_operating_cost,
        )

        db_session.add(flight_log)
        db_session.commit()

        assert flight_log.estimated_cost == 2160.0

    def test_flight_log_repr(self, sample_flight_log):
        """Test flight log string representation."""
        repr_str = repr(sample_flight_log)
        assert str(sample_flight_log.id) in repr_str
        assert "N624FB" in repr_str


class TestFlightPositionModel:
    """Test the FlightPosition model."""

    def test_create_flight_position(
        self, db_session, sample_aircraft, sample_flight_log
    ):
        """Test creating a flight position."""
        now = datetime.now(timezone.utc)

        position = FlightPosition(
            flight_log_id=sample_flight_log.id,
            aircraft_id=sample_aircraft.id,
            timestamp=now,
            latitude=33.4484,
            longitude=-112.0740,
            altitude_feet=800,
            ground_speed_knots=45.0,
            track_degrees=180.0,
            is_hovering=True,
            hover_duration_seconds=120,
            neighborhood="Maryvale",
            over_private_property=True,
            altitude_privacy_concern=True,
            data_source="adsb",
        )

        db_session.add(position)
        db_session.commit()

        assert position.id is not None
        assert position.latitude == 33.4484
        assert position.longitude == -112.0740
        assert position.is_hovering is True
        assert position.over_private_property is True

    def test_position_privacy_analysis(
        self, db_session, sample_aircraft, sample_flight_log
    ):
        """Test position privacy concern analysis."""
        low_altitude_position = FlightPosition(
            flight_log_id=sample_flight_log.id,
            aircraft_id=sample_aircraft.id,
            timestamp=datetime.now(timezone.utc),
            latitude=33.4484,
            longitude=-112.0740,
            altitude_feet=200,  # Very low altitude
            over_private_property=True,
            altitude_privacy_concern=True,
            duration_at_location=300,  # 5 minutes
        )

        db_session.add(low_altitude_position)
        db_session.commit()

        assert low_altitude_position.altitude_feet < 400
        assert low_altitude_position.altitude_privacy_concern is True
        assert low_altitude_position.duration_at_location == 300

    def test_position_relationships(
        self, db_session, sample_aircraft, sample_flight_log
    ):
        """Test position relationships."""
        position = FlightPosition(
            flight_log_id=sample_flight_log.id,
            aircraft_id=sample_aircraft.id,
            timestamp=datetime.now(timezone.utc),
            latitude=33.4484,
            longitude=-112.0740,
            altitude_feet=800,
        )

        db_session.add(position)
        db_session.commit()
        db_session.refresh(position)

        assert position.aircraft.registration == "N624FB"
        assert position.flight_log.flight_id == "FL_TEST_001"
