from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    # Application settings
    DEBUG: bool = True
    SECRET_KEY: str = "change_this_in_production"

    # Broadcastify
    BROADCASTIFY_USERNAME: Optional[str] = "chris@waitingforthefuture.org"
    BROADCASTIFY_PASSWORD: Optional[str] = "qjt4KRC_mem4rqu8brg"

    # Database settings
    DATABASE_URL: str = (
        "postgresql://postgres:postgres@localhost:5433/phoenix_helicopters"
    )

    # Redis settings
    REDIS_URL: str = "redis://localhost:6380"

    # External API keys
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    # FR24_USERNAME and FR24_PASSWORD removed - using API access instead

    # FlightRadar24 API Configuration
    FR24_API_KEY_SANDBOX: Optional[str] = None
    FR24_API_KEY_PRODUCTION: Optional[str] = None
    FR24_API_ENVIRONMENT: str = "production"  # Options: 'sandbox', 'production'
    FR24_MONTHLY_CREDIT_LIMIT: int = 666000

    # CORS settings
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3001", "http://localhost:3000"]

    # Phoenix PD specific settings
    PHOENIX_PD_AIRCRAFT: Optional[List[str]] = Field(
        default=[
            "N622FB",
            "N623FB",
            "N624FB",
            "N625FB",
            "N626FB",
            "N627FB",
            "N628FB",
        ]
    )

    # Phoenix area bounds for filtering
    PHOENIX_LAT_MIN: float = 33.2
    PHOENIX_LAT_MAX: float = 33.8
    PHOENIX_LON_MIN: float = -112.4
    PHOENIX_LON_MAX: float = -111.6

    # Tracking settings
    TRACKING_INTERVAL_SECONDS: int = 30
    DATA_RETENTION_DAYS: int = 365

    # Alert settings
    ENABLE_REAL_TIME_ALERTS: bool = True
    ALERT_EMAIL: Optional[str] = None

    # Flight cost analysis (per hour)
    HELICOPTER_COST_PER_HOUR: float = 2160.0

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @field_validator("PHOENIX_PD_AIRCRAFT", mode="before")
    @classmethod
    def assemble_aircraft_list(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()
