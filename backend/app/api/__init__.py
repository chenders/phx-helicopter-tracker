from fastapi import APIRouter

from app.api.endpoints import (
    aircraft,
    flights,
    tracking,
    analysis,
    legal,
    data_sources,
    historical_import,
    task_monitoring,
    patterns,
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(aircraft.router, prefix="/aircraft", tags=["aircraft"])
api_router.include_router(flights.router, prefix="/flights", tags=["flights"])
api_router.include_router(tracking.router, prefix="/tracking", tags=["tracking"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(legal.router, prefix="/legal", tags=["legal"])
api_router.include_router(
    data_sources.router, prefix="/data-sources", tags=["data_sources"]
)
api_router.include_router(
    historical_import.router, prefix="/historical", tags=["historical_import"]
)
api_router.include_router(
    task_monitoring.router, prefix="/tasks", tags=["task_monitoring"]
)
api_router.include_router(patterns.router, prefix="/patterns", tags=["patterns"])
