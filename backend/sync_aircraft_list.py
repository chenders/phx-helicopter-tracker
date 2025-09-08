#!/usr/bin/env python3
"""
Script to sync aircraft list from .env with database
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.aircraft import Aircraft
from app.crud.aircraft import aircraft_crud
from app.schemas.aircraft import AircraftCreate

# Phoenix PD helicopter registrations from .env
PHOENIX_PD_HELICOPTERS = [
    "N622FB",
    "N623FB",
    "N624FB",
    "N625FB",
    "N626FB",
    "N627FB",
    "N628FB",
]


def sync_aircraft():
    """Ensure all Phoenix PD helicopters are in the database and active"""
    db = SessionLocal()

    print("🚁 Syncing Phoenix PD Helicopter Fleet")
    print("=" * 50)

    try:
        for registration in PHOENIX_PD_HELICOPTERS:
            # Check if aircraft exists
            existing = (
                db.query(Aircraft).filter(Aircraft.registration == registration).first()
            )

            if existing:
                # Update to ensure it's marked as Phoenix PD and active
                if not existing.is_phoenix_pd or not existing.is_active:
                    existing.is_phoenix_pd = True
                    existing.is_active = True
                    existing.make = existing.make or "Airbus"
                    existing.model = existing.model or "H125"
                    db.commit()
                    print(f"✅ Updated {registration}: Phoenix PD = True, Active = True")
                else:
                    print(f"✓  {registration} already correct")
            else:
                # Create new aircraft entry
                aircraft_data = AircraftCreate(
                    registration=registration,
                    icao_code=registration[-6:],  # Use last 6 chars as ICAO
                    make="Airbus",
                    model="H125",
                    year_manufactured=2020,  # Estimate
                    is_phoenix_pd=True,
                    unit_designation=f"Air{registration[-3:-2]}",  # e.g., Air2 for N622FB
                    has_flir=True,
                    has_spotlight=True,
                    has_loudspeaker=True,
                    max_flight_time_minutes=180,
                    hourly_operating_cost=2160.0,
                    purchase_cost=3500000.0,
                    annual_maintenance_cost=150000.0,
                    is_active=True,
                )

                new_aircraft = aircraft_crud.create(db, obj_in=aircraft_data)
                print(f"➕ Created new aircraft: {registration}")

        # List all Phoenix PD aircraft after sync
        print(f"\n{'='*50}")
        print("📋 Final Phoenix PD Fleet Status:")

        all_phx_pd = (
            db.query(Aircraft)
            .filter(Aircraft.is_phoenix_pd == True)
            .order_by(Aircraft.registration)
            .all()
        )

        for aircraft in all_phx_pd:
            status = "✅ ACTIVE" if aircraft.is_active else "⚠️  INACTIVE"
            in_list = "📍" if aircraft.registration in PHOENIX_PD_HELICOPTERS else "❓"
            print(
                f"  {in_list} {aircraft.registration}: {aircraft.make} {aircraft.model} - {status}"
            )

        print(f"\nTotal Phoenix PD aircraft: {len(all_phx_pd)}")
        print(f"Active aircraft: {len([a for a in all_phx_pd if a.is_active])}")
        print(f"Expected from .env: {len(PHOENIX_PD_HELICOPTERS)}")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    sync_aircraft()
