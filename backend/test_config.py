"""
Common configuration for test files.
Reads credentials from environment variables.
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Broadcastify credentials
BROADCASTIFY_USERNAME = os.getenv("BROADCASTIFY_USERNAME", "")
BROADCASTIFY_PASSWORD = os.getenv("BROADCASTIFY_PASSWORD", "")

# FlightRadar24 credentials
FR24_USERNAME = os.getenv("FR24_USERNAME", "")
FR24_PASSWORD = os.getenv("FR24_PASSWORD", "")
FR24_API_KEY_SANDBOX = os.getenv("FR24_API_KEY_SANDBOX", "")
FR24_API_KEY_PRODUCTION = os.getenv("FR24_API_KEY_PRODUCTION", "")
FR24_API_ENVIRONMENT = os.getenv("FR24_API_ENVIRONMENT", "sandbox")

# Other API keys
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Database and Redis
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/phoenix_helicopters")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6380")

# Validate required credentials
def validate_broadcastify_credentials():
    """Check if Broadcastify credentials are set."""
    if not BROADCASTIFY_USERNAME or not BROADCASTIFY_PASSWORD:
        raise ValueError("Broadcastify credentials not found in environment variables. Please set BROADCASTIFY_USERNAME and BROADCASTIFY_PASSWORD in your .env file.")
    return True

def validate_fr24_credentials():
    """Check if FlightRadar24 credentials are set."""
    if not FR24_USERNAME or not FR24_PASSWORD:
        raise ValueError("FlightRadar24 credentials not found in environment variables. Please set FR24_USERNAME and FR24_PASSWORD in your .env file.")
    return True