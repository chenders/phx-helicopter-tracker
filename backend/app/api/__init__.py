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
    rate_limit_status,
    manual_fr24,
    radio,
    live_database,
    logs,
    config,
    flight_redownload,
    system_health,
)
from app.api.v1 import abnormal_patterns

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
api_router.include_router(
    rate_limit_status.router, prefix="/monitoring", tags=["monitoring"]
)
api_router.include_router(
    manual_fr24.router, prefix="/manual-fr24", tags=["manual_fr24"]
)
api_router.include_router(radio.router, prefix="/radio", tags=["radio"])
api_router.include_router(
    live_database.router, prefix="/tracking", tags=["tracking"]
)
api_router.include_router(
    abnormal_patterns.router, prefix="/abnormal-patterns", tags=["abnormal_patterns"]
)
api_router.include_router(logs.router, tags=["logs"])
api_router.include_router(config.router, prefix="/app", tags=["config"])
api_router.include_router(
    flight_redownload.router, prefix="/flight-redownload", tags=["flight_redownload"]
)
api_router.include_router(
    system_health.router, tags=["system_health"]
)
