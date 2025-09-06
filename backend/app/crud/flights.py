from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc

from app.crud.base import CRUDBase
from app.models.flight_logs import FlightLog, FlightPosition
from app.models.aircraft import Aircraft
from app.schemas.flights import FlightLogCreate, FlightLogUpdate, FlightPositionCreate


class CRUDFlightLog(CRUDBase[FlightLog, FlightLogCreate, FlightLogUpdate]):
    def get_by_flight_id(self, db: Session, *, flight_id: str) -> Optional[FlightLog]:
        """Get flight log by flight ID"""
        return db.query(FlightLog).filter(FlightLog.flight_id == flight_id).first()

    def get_by_aircraft(
        self, db: Session, *, aircraft_id: int, skip: int = 0, limit: int = 100
    ) -> List[FlightLog]:
        """Get flight logs for specific aircraft"""
        return (
            db.query(FlightLog)
            .filter(FlightLog.aircraft_id == aircraft_id)
            .order_by(desc(FlightLog.departure_time))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_date_range(
        self,
        db: Session,
        *,
        start_date: datetime,
        end_date: datetime,
        aircraft_id: Optional[int] = None
    ) -> List[FlightLog]:
        """Get flight logs within date range"""
        query = db.query(FlightLog).filter(
            and_(
                FlightLog.departure_time >= start_date,
                FlightLog.departure_time <= end_date,
            )
        )

        if aircraft_id:
            query = query.filter(FlightLog.aircraft_id == aircraft_id)

        return query.order_by(desc(FlightLog.departure_time)).all()

    def get_recent_flights(
        self, db: Session, *, hours: int = 24, phoenix_pd_only: bool = False
    ) -> List[FlightLog]:
        """Get recent flights within specified hours"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)

        query = db.query(FlightLog).filter(FlightLog.departure_time >= cutoff_time)

        if phoenix_pd_only:
            query = query.join(FlightLog.aircraft).filter(
                Aircraft.is_phoenix_pd == True
            )

        return query.order_by(desc(FlightLog.departure_time)).all()

    def get_surveillance_flights(
        self,
        db: Session,
        *,
        min_surveillance_score: float = 0.7,
        skip: int = 0,
        limit: int = 100
    ) -> List[FlightLog]:
        """Get flights with high surveillance likelihood"""
        return (
            db.query(FlightLog)
            .filter(FlightLog.surveillance_likelihood >= min_surveillance_score)
            .order_by(desc(FlightLog.surveillance_likelihood))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_flights_with_positions(
        self, db: Session, *, flight_id: int
    ) -> Optional[FlightLog]:
        """Get flight log with all positions loaded"""
        return (
            db.query(FlightLog)
            .options(joinedload(FlightLog.positions))
            .filter(FlightLog.id == flight_id)
            .first()
        )

    def calculate_cost_summary(
        self,
        db: Session,
        *,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        aircraft_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Calculate cost summary for flights"""
        query = db.query(FlightLog)

        if start_date and end_date:
            query = query.filter(
                and_(
                    FlightLog.departure_time >= start_date,
                    FlightLog.departure_time <= end_date,
                )
            )

        if aircraft_id:
            query = query.filter(FlightLog.aircraft_id == aircraft_id)

        flights = query.all()

        total_cost = sum(f.estimated_cost or 0 for f in flights)
        total_hours = sum(f.flight_duration_minutes or 0 for f in flights) / 60

        return {
            "total_flights": len(flights),
            "total_cost": total_cost,
            "total_hours": total_hours,
            "average_cost_per_flight": total_cost / len(flights) if flights else 0,
            "average_flight_duration": sum(
                f.flight_duration_minutes or 0 for f in flights
            )
            / len(flights)
            if flights
            else 0,
        }


class CRUDFlightPosition(CRUDBase[FlightPosition, FlightPositionCreate, None]):
    def get_by_flight(
        self, db: Session, *, flight_log_id: int, skip: int = 0, limit: int = 1000
    ) -> List[FlightPosition]:
        """Get positions for a specific flight"""
        return (
            db.query(FlightPosition)
            .filter(FlightPosition.flight_log_id == flight_log_id)
            .order_by(asc(FlightPosition.timestamp))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_positions_in_area(
        self,
        db: Session,
        *,
        center_lat: float,
        center_lon: float,
        radius_km: float,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[FlightPosition]:
        """Get positions within geographic area"""
        # Calculate approximate lat/lon bounds (rough calculation)
        lat_delta = radius_km / 111.0  # ~111km per degree latitude
        lon_delta = radius_km / (111.0 * abs(func.cos(func.radians(center_lat))))

        query = db.query(FlightPosition).filter(
            and_(
                FlightPosition.latitude >= center_lat - lat_delta,
                FlightPosition.latitude <= center_lat + lat_delta,
                FlightPosition.longitude >= center_lon - lon_delta,
                FlightPosition.longitude <= center_lon + lon_delta,
            )
        )

        if start_time:
            query = query.filter(FlightPosition.timestamp >= start_time)
        if end_time:
            query = query.filter(FlightPosition.timestamp <= end_time)

        return query.order_by(desc(FlightPosition.timestamp)).all()

    def get_hovering_positions(
        self,
        db: Session,
        *,
        min_duration_seconds: int = 30,
        skip: int = 0,
        limit: int = 100
    ) -> List[FlightPosition]:
        """Get positions where aircraft was hovering"""
        return (
            db.query(FlightPosition)
            .filter(
                and_(
                    FlightPosition.is_hovering == True,
                    FlightPosition.hover_duration_seconds >= min_duration_seconds,
                )
            )
            .order_by(desc(FlightPosition.timestamp))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_low_altitude_positions(
        self,
        db: Session,
        *,
        max_altitude_feet: int = 400,
        over_residential_only: bool = False
    ) -> List[FlightPosition]:
        """Get positions at low altitude"""
        query = db.query(FlightPosition).filter(
            FlightPosition.altitude_feet <= max_altitude_feet
        )

        if over_residential_only:
            query = query.filter(FlightPosition.over_private_property == True)

        return query.order_by(desc(FlightPosition.timestamp)).all()

    def get_positions_by_aircraft_and_time(
        self, db: Session, *, aircraft_id: int, start_time: datetime, end_time: datetime
    ) -> List[FlightPosition]:
        """Get positions for aircraft within time range"""
        return (
            db.query(FlightPosition)
            .filter(
                and_(
                    FlightPosition.aircraft_id == aircraft_id,
                    FlightPosition.timestamp >= start_time,
                    FlightPosition.timestamp <= end_time,
                )
            )
            .order_by(asc(FlightPosition.timestamp))
            .all()
        )

    def create_bulk(
        self, db: Session, *, positions: List[FlightPositionCreate]
    ) -> List[FlightPosition]:
        """Create multiple positions efficiently"""
        db_positions = []
        for position_data in positions:
            db_position = FlightPosition(**position_data.dict())
            db_positions.append(db_position)

        db.add_all(db_positions)
        db.commit()

        for pos in db_positions:
            db.refresh(pos)

        return db_positions

    def get_positions_in_range(
        self, db: Session, *, aircraft_id: int, start_time: datetime, end_time: datetime
    ) -> List[FlightPosition]:
        """Get positions for an aircraft within a time range"""
        return (
            db.query(FlightPosition)
            .filter(
                and_(
                    FlightPosition.aircraft_id == aircraft_id,
                    FlightPosition.timestamp >= start_time,
                    FlightPosition.timestamp <= end_time,
                )
            )
            .order_by(asc(FlightPosition.timestamp))
            .all()
        )


flight_log_crud = CRUDFlightLog(FlightLog)
flight_position_crud = CRUDFlightPosition(FlightPosition)
