"""
Unit tests for flight API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.models import FlightLog, FlightPosition


class TestFlightAPI:
    """Test suite for flight endpoints"""

    def test_get_all_flights(self, client: TestClient, db_session: Session):
        """Test getting all flight logs"""
        response = client.get("/api/v1/flights/logs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "flights" in data

    def test_get_flight_by_id(
        self, client: TestClient, db_session: Session, sample_flight_log: FlightLog
    ):
        """Test getting a flight by its stable public_id"""
        # public_id is set by the DB trigger on insert
        assert sample_flight_log.public_id is not None

        response = client.get(
            f"/api/v1/flights/logs/{sample_flight_log.public_id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["public_id"] == sample_flight_log.public_id
        assert data["flight_id"] == sample_flight_log.flight_id

    def test_get_recent_flights(self, client: TestClient, db_session: Session):
        """Test getting recent flights"""
        response = client.get("/api/v1/flights/logs/recent/24")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # All flights should be within last 24 hours
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        for flight in data:
            if flight["departure_time"]:
                departure = datetime.fromisoformat(
                    flight["departure_time"].replace("Z", "+00:00")
                )
                assert departure >= cutoff

    def test_get_flights_by_aircraft(
        self, client: TestClient, db_session: Session, sample_flight_log: FlightLog
    ):
        """Test getting flights for specific aircraft"""
        response = client.get(
            f"/api/v1/flights/logs?aircraft_id={sample_flight_log.aircraft_id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "flights" in data
        assert "total" in data

        # All flights should be for the specified aircraft
        for flight in data["flights"]:
            assert flight["aircraft_id"] == sample_flight_log.aircraft_id

    def test_get_flights_by_date_range(self, client: TestClient, db_session: Session):
        """Test getting flights within date range"""
        start_date = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        end_date = datetime.now(timezone.utc).isoformat()

        response = client.get(
            "/api/v1/flights/logs",
            params={"start_date": start_date, "end_date": end_date},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "flights" in data
        assert "total" in data

    def test_get_surveillance_flights(self, client: TestClient, db_session: Session):
        """Test getting flights with high surveillance likelihood"""
        response = client.get("/api/v1/flights/logs?min_surveillance_score=0.7")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "flights" in data
        assert "total" in data

        # All flights should have high surveillance score
        for flight in data["flights"]:
            if flight["surveillance_likelihood"]:
                assert flight["surveillance_likelihood"] >= 0.7

    def test_create_flight_log(
        self, client: TestClient, db_session: Session, sample_aircraft
    ):
        """Test creating a new flight log"""
        flight_data = {
            "aircraft_id": sample_aircraft.id,
            "flight_id": f"test_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
            "departure_time": datetime.now(timezone.utc).isoformat(),
            "departure_airport": "KDVT",
            "data_source": "test",
        }

        response = client.post("/api/v1/flights/logs", json=flight_data)
        assert response.status_code == 200
        data = response.json()
        assert data["flight_id"] == flight_data["flight_id"]
        assert data["aircraft_id"] == flight_data["aircraft_id"]
        assert data["id"] is not None

    def test_update_flight_log(
        self, client: TestClient, db_session: Session, sample_flight_log: FlightLog
    ):
        """Test updating flight log"""
        update_data = {
            "arrival_time": datetime.now(timezone.utc).isoformat(),
            "arrival_airport": "KPHX",
            "surveillance_likelihood": 0.85,
            "privacy_concern_level": 3,
        }

        response = client.put(
            f"/api/v1/flights/logs/{sample_flight_log.id}", json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["arrival_airport"] == update_data["arrival_airport"]
        assert data["surveillance_likelihood"] == update_data["surveillance_likelihood"]

    def test_get_flight_positions(
        self, client: TestClient, db_session: Session, sample_flight_log: FlightLog
    ):
        """Test getting positions for a flight"""
        response = client.get(
            f"/api/v1/flights/logs/{sample_flight_log.id}/with-positions"
        )
        assert response.status_code == 200
        data = response.json()
        # The response should be a flight object
        assert "id" in data
        assert data["id"] == sample_flight_log.id

    def test_add_flight_position(
        self, client: TestClient, db_session: Session, sample_flight_log: FlightLog
    ):
        """Test adding position to flight"""
        position_data = {
            "flight_log_id": sample_flight_log.id,
            "aircraft_id": sample_flight_log.aircraft_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 33.4484,
            "longitude": -112.0740,
            "altitude_feet": 1500,
            "ground_speed_knots": 80,
            "track_degrees": 180,
            "data_source": "test",
        }

        response = client.post("/api/v1/flights/positions", json=position_data)
        assert response.status_code == 200
        data = response.json()
        assert data["flight_log_id"] == sample_flight_log.id
        assert data["latitude"] == position_data["latitude"]
        assert data["longitude"] == position_data["longitude"]

    def test_get_flight_statistics(
        self, client: TestClient, db_session: Session, sample_flight_log: FlightLog
    ):
        """Test getting flight statistics"""
        response = client.get("/api/v1/flights/analysis/cost-summary")
        assert response.status_code == 200
        data = response.json()

        assert "total_flights" in data
        assert "total_cost" in data
        assert "total_hours" in data

    def test_get_hovering_positions(self, client: TestClient, db_session: Session):
        """Test getting hovering positions"""
        response = client.get("/api/v1/flights/positions/hovering")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # All positions should be hovering
        for position in data:
            assert position["is_hovering"] is True
            if position["hover_duration_seconds"]:
                assert position["hover_duration_seconds"] >= 30

    def test_get_low_altitude_positions(self, client: TestClient, db_session: Session):
        """Test getting low altitude positions"""
        response = client.get("/api/v1/flights/positions/low-altitude")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # All positions should be low altitude
        for position in data:
            if position["altitude_feet"]:
                assert position["altitude_feet"] <= 400

    def test_calculate_flight_cost(self, client: TestClient, db_session: Session):
        """Test calculating flight costs"""
        response = client.get("/api/v1/flights/analysis/cost-summary")
        assert response.status_code == 200
        data = response.json()

        assert "total_flights" in data
        assert "total_cost" in data
        assert "total_hours" in data
