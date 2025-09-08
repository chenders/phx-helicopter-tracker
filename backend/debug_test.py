#!/usr/bin/env python3

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from tests.conftest import override_get_db, TestingSessionLocal


# Set up the test client with database override
def override_get_db_debug():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[app.db.database.get_db] = override_get_db_debug

client = TestClient(app)

# Test data
aircraft_data = {
    "registration": "N9TEST",
    "icao_code": "N9TEST",
    "make": "Test",
    "model": "TestModel",
    "is_phoenix_pd": False,
    "is_active": True,
    "hourly_operating_cost": 1500.0,
}

print("Testing aircraft creation...")
response = client.post("/api/v1/aircraft/", json=aircraft_data)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code != 200:
    try:
        error_detail = response.json()
        print(f"Error detail: {error_detail}")
    except:
        print("Could not parse JSON response")
