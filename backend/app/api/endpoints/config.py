from fastapi import APIRouter
from app.core.config import settings
from typing import Optional

router = APIRouter()


@router.get("/config")
async def get_frontend_config():
    """
    Get frontend configuration values.
    Only returns non-sensitive configuration values needed by the frontend.
    """
    return {
        "main_search_address": settings.MAIN_SEARCH_ADDRESS,
        "phoenix_pd_aircraft": settings.PHOENIX_PD_AIRCRAFT,
        "phoenix_bounds": {
            "lat_min": settings.PHOENIX_LAT_MIN,
            "lat_max": settings.PHOENIX_LAT_MAX,
            "lon_min": settings.PHOENIX_LON_MIN,
            "lon_max": settings.PHOENIX_LON_MAX,
        },
    }
