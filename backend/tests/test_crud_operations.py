"""
Unit tests for CRUD operations
"""
import pytest
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.crud.aircraft import aircraft_crud
from app.crud.flights import flight_log_crud, flight_position_crud
from app.schemas.aircraft import AircraftCreate, AircraftUpdate
from app.schemas.flights import FlightLogCreate, FlightPositionCreate, FlightLogUpdate
from app.models.aircraft import Aircraft
from app.models import FlightLog, FlightPosition


class TestAircraftCRUD:
    """Test suite for aircraft CRUD operations"""

    def test_create_aircraft(self, db_session: Session):
        """Test creating an aircraft"""
        aircraft_in = AircraftCreate(
            registration="N999TST",
            icao_code="A9999T",  # 6 characters max
            make="Test",
            model="TestModel",
            is_phoenix_pd=False,
            is_active=True,
            hourly_operating_cost=1500.0,
        )

        aircraft = aircraft_crud.create(db_session, obj_in=aircraft_in)

        assert aircraft.registration == "N999TST"
        assert aircraft.make == "Test"
        assert aircraft.model == "TestModel"
        assert aircraft.is_phoenix_pd is False
        assert aircraft.id is not None

    def test_get_aircraft_by_registration(
        self, db_session: Session, sample_aircraft: Aircraft
    ):
        """Test getting aircraft by registration"""
        aircraft = aircraft_crud.get_by_registration(
            db_session, registration=sample_aircraft.registration
        )

        assert aircraft is not None
        assert aircraft.id == sample_aircraft.id
        assert aircraft.registration == sample_aircraft.registration

    def test_get_phoenix_pd_aircraft(self, db_session: Session):
        """Test getting Phoenix PD aircraft"""
        # Create mix of aircraft
        phoenix1 = aircraft_crud.create(
            db_session,
            obj_in=AircraftCreate(
                registration="N600PD", is_phoenix_pd=True, is_active=True
            ),
        )
        phoenix2 = aircraft_crud.create(
            db_session,
            obj_in=AircraftCreate(
                registration="N601PD", is_phoenix_pd=True, is_active=False
            ),
        )
        civilian = aircraft_crud.create(
            db_session,
            obj_in=AircraftCreate(
                registration="N100CIV", is_phoenix_pd=False, is_active=True
            ),
        )

        # Get all Phoenix PD
        all_phoenix = aircraft_crud.get_phoenix_pd_aircraft(
            db_session, active_only=False
        )
        assert len([a for a in all_phoenix if a.id in [phoenix1.id, phoenix2.id]]) == 2

        # Get active Phoenix PD only
        active_phoenix = aircraft_crud.get_phoenix_pd_aircraft(
            db_session, active_only=True
        )
        assert phoenix1.id in [a.id for a in active_phoenix]
        assert phoenix2.id not in [a.id for a in active_phoenix]

    def test_update_aircraft(self, db_session: Session, sample_aircraft: Aircraft):
        """Test updating aircraft"""
        update_data = AircraftUpdate(
            model="UpdatedModel", is_active=False, notes="Test update"
        )

        updated = aircraft_crud.update(
            db_session, db_obj=sample_aircraft, obj_in=update_data
        )

        assert updated.model == "UpdatedModel"
        assert updated.is_active is False
        assert updated.notes == "Test update"
        assert updated.registration == sample_aircraft.registration  # Unchanged

    def test_update_last_seen(self, db_session: Session, sample_aircraft: Aircraft):
        """Test updating last seen timestamp"""
        original_time = sample_aircraft.last_seen

        aircraft_crud.update_last_seen(db_session, aircraft_id=sample_aircraft.id)

        db_session.refresh(sample_aircraft)
        assert sample_aircraft.last_seen is not None
        assert sample_aircraft.last_seen > original_time if original_time else True


class TestFlightLogCRUD:
    """Test suite for flight log CRUD operations"""

    def test_create_flight_log(self, db_session: Session, sample_aircraft: Aircraft):
        """Test creating a flight log"""
        flight_in = FlightLogCreate(
            aircraft_id=sample_aircraft.id,
            flight_id=f"test_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
            departure_time=datetime.now(timezone.utc),
            departure_airport="KDVT",
            data_source="test",
        )

        flight = flight_log_crud.create(db_session, obj_in=flight_in)

        assert flight.aircraft_id == sample_aircraft.id
        assert flight.departure_airport == "KDVT"
        assert flight.id is not None

    def test_get_flight_by_flight_id(
        self, db_session: Session, sample_flight_log: FlightLog
    ):
        """Test getting flight by flight ID"""
        flight = flight_log_crud.get_by_flight_id(
            db_session, flight_id=sample_flight_log.flight_id
        )

        assert flight is not None
        assert flight.id == sample_flight_log.id

    def test_get_flights_by_aircraft(
        self, db_session: Session, sample_flight_log: FlightLog
    ):
        """Test getting flights for an aircraft"""
        flights = flight_log_crud.get_by_aircraft(
            db_session, aircraft_id=sample_flight_log.aircraft_id
        )

        assert len(flights) > 0
        assert sample_flight_log.id in [f.id for f in flights]

    def test_get_recent_flights(self, db_session: Session, sample_aircraft: Aircraft):
        """Test getting recent flights"""
        # Create flights at different times
        recent_flight = flight_log_crud.create(
            db_session,
            obj_in=FlightLogCreate(
                aircraft_id=sample_aircraft.id,
                flight_id="recent_test",
                departure_time=datetime.now(timezone.utc) - timedelta(hours=1),
            ),
        )

        old_flight = flight_log_crud.create(
            db_session,
            obj_in=FlightLogCreate(
                aircraft_id=sample_aircraft.id,
                flight_id="old_test",
                departure_time=datetime.now(timezone.utc) - timedelta(days=7),
            ),
        )

        # Get flights from last 24 hours
        recent = flight_log_crud.get_recent_flights(db_session, hours=24)

        assert recent_flight.id in [f.id for f in recent]
        assert old_flight.id not in [f.id for f in recent]

    def test_get_surveillance_flights(
        self, db_session: Session, sample_aircraft: Aircraft
    ):
        """Test getting high surveillance likelihood flights"""
        # Create flights with different surveillance scores
        high_surveillance = flight_log_crud.create(
            db_session,
            obj_in=FlightLogCreate(
                aircraft_id=sample_aircraft.id,
                flight_id="high_surv",
                departure_time=datetime.now(timezone.utc),
                surveillance_likelihood=0.85,
            ),
        )

        low_surveillance = flight_log_crud.create(
            db_session,
            obj_in=FlightLogCreate(
                aircraft_id=sample_aircraft.id,
                flight_id="low_surv",
                # distinct departure_time so public_id differs from high_surv
                # (public_id is derived from registration + departure_time)
                departure_time=datetime.now(timezone.utc) - timedelta(hours=1),
                surveillance_likelihood=0.3,
            ),
        )

        # Get high surveillance flights
        surveillance_flights = flight_log_crud.get_surveillance_flights(
            db_session, min_surveillance_score=0.7
        )

        assert high_surveillance.id in [f.id for f in surveillance_flights]
        assert low_surveillance.id not in [f.id for f in surveillance_flights]

    def test_calculate_cost_summary(
        self, db_session: Session, sample_aircraft: Aircraft
    ):
        """Test calculating flight cost summary"""
        # Create flights with costs
        flight1 = flight_log_crud.create(
            db_session,
            obj_in=FlightLogCreate(
                aircraft_id=sample_aircraft.id,
                flight_id="cost_test_1",
                departure_time=datetime.now(timezone.utc) - timedelta(hours=2),
                arrival_time=datetime.now(timezone.utc) - timedelta(hours=1),
                flight_duration_minutes=60,
                estimated_cost=2160.0,
            ),
        )

        flight2 = flight_log_crud.create(
            db_session,
            obj_in=FlightLogCreate(
                aircraft_id=sample_aircraft.id,
                flight_id="cost_test_2",
                departure_time=datetime.now(timezone.utc) - timedelta(hours=1),
                arrival_time=datetime.now(timezone.utc),
                flight_duration_minutes=60,
                estimated_cost=2160.0,
            ),
        )

        summary = flight_log_crud.calculate_cost_summary(
            db_session,
            start_date=datetime.now(timezone.utc) - timedelta(days=1),
            end_date=datetime.now(timezone.utc),
        )

        assert summary["total_flights"] >= 2
        assert summary["total_cost"] >= 4320.0
        assert summary["total_hours"] >= 2.0


class TestFlightPositionCRUD:
    """Test suite for flight position CRUD operations"""

    def test_create_position(self, db_session: Session, sample_flight_log: FlightLog):
        """Test creating a flight position"""
        position_in = FlightPositionCreate(
            flight_log_id=sample_flight_log.id,
            aircraft_id=sample_flight_log.aircraft_id,
            timestamp=datetime.now(timezone.utc),
            latitude=33.4484,
            longitude=-112.0740,
            altitude_feet=1500,
            ground_speed_knots=80,
            track_degrees=180,
            data_source="test",
        )

        position = flight_position_crud.create(db_session, obj_in=position_in)

        assert position.flight_log_id == sample_flight_log.id
        assert position.latitude == 33.4484
        assert position.longitude == -112.0740
        assert position.id is not None

    def test_get_positions_by_flight(
        self, db_session: Session, sample_flight_with_positions
    ):
        """Test getting positions for a flight"""
        positions = flight_position_crud.get_by_flight(
            db_session, flight_log_id=sample_flight_with_positions.id
        )

        assert len(positions) > 0
        assert all(
            p.flight_log_id == sample_flight_with_positions.id for p in positions
        )

    def test_get_hovering_positions(
        self, db_session: Session, sample_flight_log: FlightLog
    ):
        """Test getting hovering positions"""
        # Create hovering and normal positions
        hover_pos = flight_position_crud.create(
            db_session,
            obj_in=FlightPositionCreate(
                flight_log_id=sample_flight_log.id,
                aircraft_id=sample_flight_log.aircraft_id,
                timestamp=datetime.now(timezone.utc),
                latitude=33.4484,
                longitude=-112.0740,
                altitude_feet=800,
                ground_speed_knots=5,  # Hovering speed
                is_hovering=True,
                hover_duration_seconds=60,
                data_source="test",
            ),
        )

        normal_pos = flight_position_crud.create(
            db_session,
            obj_in=FlightPositionCreate(
                flight_log_id=sample_flight_log.id,
                aircraft_id=sample_flight_log.aircraft_id,
                timestamp=datetime.now(timezone.utc),
                latitude=33.4500,
                longitude=-112.0750,
                altitude_feet=1500,
                ground_speed_knots=80,
                is_hovering=False,
                data_source="test",
            ),
        )

        hovering = flight_position_crud.get_hovering_positions(
            db_session, min_duration_seconds=30
        )

        assert hover_pos.id in [p.id for p in hovering]
        assert normal_pos.id not in [p.id for p in hovering]

    def test_get_low_altitude_positions(
        self, db_session: Session, sample_flight_log: FlightLog
    ):
        """Test getting low altitude positions"""
        # Create low and normal altitude positions
        low_pos = flight_position_crud.create(
            db_session,
            obj_in=FlightPositionCreate(
                flight_log_id=sample_flight_log.id,
                aircraft_id=sample_flight_log.aircraft_id,
                timestamp=datetime.now(timezone.utc),
                latitude=33.4484,
                longitude=-112.0740,
                altitude_feet=350,  # Low altitude
                ground_speed_knots=60,
                altitude_privacy_concern=True,
                data_source="test",
            ),
        )

        high_pos = flight_position_crud.create(
            db_session,
            obj_in=FlightPositionCreate(
                flight_log_id=sample_flight_log.id,
                aircraft_id=sample_flight_log.aircraft_id,
                timestamp=datetime.now(timezone.utc),
                latitude=33.4500,
                longitude=-112.0750,
                altitude_feet=2000,
                ground_speed_knots=80,
                altitude_privacy_concern=False,
                data_source="test",
            ),
        )

        low_altitude = flight_position_crud.get_low_altitude_positions(
            db_session, max_altitude_feet=400
        )

        assert low_pos.id in [p.id for p in low_altitude]
        assert high_pos.id not in [p.id for p in low_altitude]

    def test_create_bulk_positions(
        self, db_session: Session, sample_flight_log: FlightLog
    ):
        """Test bulk creating positions"""
        positions_data = []
        base_time = datetime.now(timezone.utc)

        for i in range(10):
            positions_data.append(
                FlightPositionCreate(
                    flight_log_id=sample_flight_log.id,
                    aircraft_id=sample_flight_log.aircraft_id,
                    timestamp=base_time + timedelta(seconds=i * 30),
                    latitude=33.4484 + (i * 0.001),
                    longitude=-112.0740 - (i * 0.001),
                    altitude_feet=1500 + (i * 10),
                    ground_speed_knots=80,
                    track_degrees=180,
                    data_source="test",
                )
            )

        created = flight_position_crud.create_bulk(db_session, positions=positions_data)

        assert len(created) == 10
        assert all(p.flight_log_id == sample_flight_log.id for p in created)
