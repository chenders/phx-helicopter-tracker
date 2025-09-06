#!/usr/bin/env python3
"""
Test FlightRadar24 SDK specifically for helicopters
"""
from FlightRadar24 import FlightRadar24API

# Initialize the API
fr24 = FlightRadar24API()

print("🚁 Testing FlightRadar24 SDK for Helicopters")
print("=" * 50)

# Get flights with bounds for Phoenix area
print("\n📡 Getting flights in Phoenix area...")
# Bounds format: "tl_y,tl_x,br_y,br_x"
bounds = "33.7,-112.4,33.2,-111.9"

# Get flights in bounds
flights = fr24.get_flights(bounds=bounds)

print(f"Found {len(flights)} aircraft in Phoenix area")

# Filter for helicopters
helicopters = []
phoenix_pd_regs = ["N622FB", "N623FB", "N624FB", "N625FB", "N626FB", "N627FB", "N628FB"]

for flight in flights:
    # Check if it's a helicopter by aircraft type or other indicators
    is_helicopter = False
    registration = getattr(flight, 'registration', None)
    aircraft_type = getattr(flight, 'aircraft_code', None)
    
    # Common helicopter codes
    helicopter_codes = ['H25B', 'EC35', 'EC45', 'B407', 'AS50', 'AS55', 'R44', 'R66', 'B06', 'B06T']
    
    if aircraft_type and any(code in str(aircraft_type) for code in helicopter_codes):
        is_helicopter = True
    elif registration and registration in phoenix_pd_regs:
        is_helicopter = True
    elif flight.altitude and flight.altitude > 0 and flight.altitude < 5000:
        # Low altitude could indicate helicopter
        if flight.ground_speed and flight.ground_speed < 200:
            is_helicopter = True
    
    if is_helicopter or registration in phoenix_pd_regs:
        helicopters.append(flight)
        print(f"\n🚁 Found helicopter/low-altitude aircraft:")
        print(f"  Registration: {registration or 'Unknown'}")
        print(f"  Callsign: {flight.callsign}")
        print(f"  Aircraft Type: {aircraft_type or 'Unknown'}")
        print(f"  Position: {flight.latitude:.4f}, {flight.longitude:.4f}")
        print(f"  Altitude: {flight.altitude} ft")
        print(f"  Speed: {flight.ground_speed} kts")
        print(f"  Heading: {flight.heading}°")
        
        # Check if it's Phoenix PD
        if registration in phoenix_pd_regs:
            print(f"  ✅ THIS IS PHOENIX PD HELICOPTER!")

print(f"\n📊 Summary:")
print(f"  - Total aircraft in area: {len(flights)}")
print(f"  - Helicopters/low-altitude: {len(helicopters)}")

# Try alternative method - search by registration
print("\n📡 Alternative: Direct registration search...")
for reg in phoenix_pd_regs:
    try:
        # Some FR24 API versions support direct registration search
        results = fr24.search(reg)
        if results:
            print(f"✅ Found data for {reg}: {results}")
    except:
        pass

print("\n💡 Note: Helicopters may not always transmit ADS-B data or may use different identifiers")