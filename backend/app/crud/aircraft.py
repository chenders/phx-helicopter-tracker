from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.crud.base import CRUDBase
from app.models.aircraft import Aircraft
from app.schemas.aircraft import AircraftCreate, AircraftUpdate


class CRUDAircraft(CRUDBase[Aircraft, AircraftCreate, AircraftUpdate]):
    def get_by_registration(
        self, db: Session, *, registration: str
    ) -> Optional[Aircraft]:
        """Get aircraft by registration number"""
        return db.query(Aircraft).filter(Aircraft.registration == registration).first()

    def get_by_icao_code(self, db: Session, *, icao_code: str) -> Optional[Aircraft]:
        """Get aircraft by ICAO code"""
        return db.query(Aircraft).filter(Aircraft.icao_code == icao_code).first()

    def get_phoenix_pd_aircraft(
        self, db: Session, *, active_only: bool = True
    ) -> List[Aircraft]:
        """Get all Phoenix PD aircraft"""
        query = db.query(Aircraft).filter(Aircraft.is_phoenix_pd == True)
        if active_only:
            query = query.filter(Aircraft.is_active == True)
        return query.all()

    def get_active_aircraft(self, db: Session) -> List[Aircraft]:
        """Get all active aircraft"""
        return db.query(Aircraft).filter(Aircraft.is_active == True).all()

    def search_aircraft(
        self,
        db: Session,
        *,
        search_term: str,
        phoenix_pd_only: bool = False,
        active_only: bool = False,
    ) -> List[Aircraft]:
        """Search aircraft by registration, make, model, or unit designation"""
        query = db.query(Aircraft)

        # Add search filters
        search_filter = or_(
            Aircraft.registration.ilike(f"%{search_term}%"),
            Aircraft.make.ilike(f"%{search_term}%"),
            Aircraft.model.ilike(f"%{search_term}%"),
            Aircraft.unit_designation.ilike(f"%{search_term}%"),
        )
        query = query.filter(search_filter)

        # Add additional filters
        if phoenix_pd_only:
            query = query.filter(Aircraft.is_phoenix_pd == True)
        if active_only:
            query = query.filter(Aircraft.is_active == True)

        return query.all()

    def get_aircraft_with_capabilities(
        self,
        db: Session,
        *,
        has_flir: Optional[bool] = None,
        has_spotlight: Optional[bool] = None,
        has_loudspeaker: Optional[bool] = None,
    ) -> List[Aircraft]:
        """Get aircraft filtered by capabilities"""
        query = db.query(Aircraft)

        if has_flir is not None:
            query = query.filter(Aircraft.has_flir == has_flir)
        if has_spotlight is not None:
            query = query.filter(Aircraft.has_spotlight == has_spotlight)
        if has_loudspeaker is not None:
            query = query.filter(Aircraft.has_loudspeaker == has_loudspeaker)

        return query.all()

    def update_last_seen(self, db: Session, *, aircraft_id: int) -> Optional[Aircraft]:
        """Update the last_seen timestamp for an aircraft"""
        from datetime import datetime, timezone

        aircraft = self.get(db, id=aircraft_id)
        if aircraft:
            aircraft.last_seen = datetime.now(timezone.utc)
            db.commit()
            db.refresh(aircraft)
        return aircraft


aircraft_crud = CRUDAircraft(Aircraft)
