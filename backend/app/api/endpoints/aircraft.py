from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.crud.aircraft import aircraft_crud
from app.schemas.aircraft import Aircraft, AircraftCreate, AircraftUpdate, AircraftList

router = APIRouter()


@router.get("/", response_model=AircraftList)
def get_aircraft(
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    phoenix_pd_only: bool = Query(
        False, description="Filter to Phoenix PD aircraft only"
    ),
    active_only: bool = Query(True, description="Filter to active aircraft only"),
    search: Optional[str] = Query(
        None, description="Search term for registration, make, model"
    ),
) -> AircraftList:
    """Get list of aircraft with optional filtering"""

    if search:
        aircraft = aircraft_crud.search_aircraft(
            db,
            search_term=search,
            phoenix_pd_only=phoenix_pd_only,
            active_only=active_only,
        )
        # Apply pagination manually for search results
        total = len(aircraft)
        aircraft = aircraft[skip : skip + limit]
    else:
        if phoenix_pd_only:
            aircraft = aircraft_crud.get_phoenix_pd_aircraft(
                db, active_only=active_only
            )
            total = len(aircraft)
            aircraft = aircraft[skip : skip + limit]
        elif active_only:
            aircraft = aircraft_crud.get_active_aircraft(db)
            total = len(aircraft)
            aircraft = aircraft[skip : skip + limit]
        else:
            aircraft = aircraft_crud.get_multi(db, skip=skip, limit=limit)
            total = aircraft_crud.count(db)

    return AircraftList(
        aircraft=aircraft, total=total, page=skip // limit + 1, size=len(aircraft)
    )


@router.post("/", response_model=Aircraft)
def create_aircraft(
    *, db: Session = Depends(get_db), aircraft_in: AircraftCreate
) -> Aircraft:
    """Create new aircraft record"""
    # Check if aircraft with this registration already exists
    existing = aircraft_crud.get_by_registration(
        db, registration=aircraft_in.registration
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Aircraft with registration {aircraft_in.registration} already exists",
        )

    aircraft = aircraft_crud.create(db, obj_in=aircraft_in)
    return aircraft


@router.get("/{aircraft_id}", response_model=Aircraft)
def get_aircraft_by_id(*, db: Session = Depends(get_db), aircraft_id: int) -> Aircraft:
    """Get specific aircraft by ID"""
    aircraft = aircraft_crud.get(db, id=aircraft_id)
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    return aircraft


@router.get("/registration/{registration}", response_model=Aircraft)
def get_aircraft_by_registration(
    *, db: Session = Depends(get_db), registration: str
) -> Aircraft:
    """Get aircraft by registration number"""
    aircraft = aircraft_crud.get_by_registration(db, registration=registration)
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    return aircraft


@router.get("/icao/{icao_code}", response_model=Aircraft)
def get_aircraft_by_icao(*, db: Session = Depends(get_db), icao_code: str) -> Aircraft:
    """Get aircraft by ICAO code"""
    aircraft = aircraft_crud.get_by_icao_code(db, icao_code=icao_code)
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    return aircraft


@router.put("/{aircraft_id}", response_model=Aircraft)
def update_aircraft(
    *, db: Session = Depends(get_db), aircraft_id: int, aircraft_in: AircraftUpdate
) -> Aircraft:
    """Update aircraft information"""
    aircraft = aircraft_crud.get(db, id=aircraft_id)
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")

    # Check if registration is being changed and if new registration already exists
    if aircraft_in.registration and aircraft_in.registration != aircraft.registration:
        existing = aircraft_crud.get_by_registration(
            db, registration=aircraft_in.registration
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Aircraft with registration {aircraft_in.registration} already exists",
            )

    aircraft = aircraft_crud.update(db, db_obj=aircraft, obj_in=aircraft_in)
    return aircraft


@router.delete("/{aircraft_id}")
def delete_aircraft(*, db: Session = Depends(get_db), aircraft_id: int) -> dict:
    """Delete aircraft record"""
    aircraft = aircraft_crud.get(db, id=aircraft_id)
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")

    aircraft_crud.remove(db, id=aircraft_id)
    return {"message": f"Aircraft {aircraft.registration} deleted successfully"}


@router.get("/phoenix-pd/active", response_model=List[Aircraft])
def get_phoenix_pd_active_aircraft(*, db: Session = Depends(get_db)) -> List[Aircraft]:
    """Get all active Phoenix PD aircraft"""
    return aircraft_crud.get_phoenix_pd_aircraft(db, active_only=True)


@router.get("/capabilities/filter", response_model=List[Aircraft])
def get_aircraft_by_capabilities(
    *,
    db: Session = Depends(get_db),
    has_flir: Optional[bool] = Query(None, description="Filter by FLIR capability"),
    has_spotlight: Optional[bool] = Query(
        None, description="Filter by spotlight capability"
    ),
    has_loudspeaker: Optional[bool] = Query(
        None, description="Filter by loudspeaker capability"
    ),
) -> List[Aircraft]:
    """Get aircraft filtered by capabilities"""
    return aircraft_crud.get_aircraft_with_capabilities(
        db,
        has_flir=has_flir,
        has_spotlight=has_spotlight,
        has_loudspeaker=has_loudspeaker,
    )


@router.post("/{aircraft_id}/update-last-seen", response_model=Aircraft)
def update_aircraft_last_seen(
    *, db: Session = Depends(get_db), aircraft_id: int
) -> Aircraft:
    """Update the last seen timestamp for an aircraft"""
    aircraft = aircraft_crud.update_last_seen(db, aircraft_id=aircraft_id)
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    return aircraft
