#!/usr/bin/env python3
"""
Test Broadcastify AJAX API endpoint for archives
"""
import requests
import json
from datetime import datetime, timedelta

# Credentials
USERNAME = "chris@waitingforthefuture.org"
PASSWORD = "qjt4KRC_mem4rqu8brg"
BASE_URL = "https://www.broadcastify.com"
FEED_ID = "12145"

session = requests.Session()
session.headers.update(
    {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "X-Requested-With": "XMLHttpRequest",
        "Connection": "keep-alive",
        "Referer": f"https://www.broadcastify.com/archives/feed/{FEED_ID}",
    }
)

print("Testing Broadcastify AJAX API...")
print("=" * 50)

# Login first
session.headers["Referer"] = f"{BASE_URL}/login"
login_data = {
    "email": USERNAME,
    "password": PASSWORD,
    "action": "auth",
    "redirect": "https://www.broadcastify.com",
}

print("Logging in...")
response = session.post(f"{BASE_URL}/login", data=login_data)
if response.ok:
    print("✓ Login successful")
else:
    print("✗ Login failed")
    exit(1)

# Now test the AJAX endpoint
print("\n" + "=" * 50)
print("Testing AJAX archive endpoint...")

# Test with different date formats
dates_to_test = [
    datetime.now(),
    datetime.now() - timedelta(days=1),
    datetime.now() - timedelta(days=2),
]

for test_date in dates_to_test:
    # Try the format from the HTML: MM/DD/YYYY
    date_str = test_date.strftime("%m/%d/%Y")

    ajax_url = f"{BASE_URL}/archives/ajax.php"
    params = {"feedId": FEED_ID, "date": date_str}

    print(f"\nRequesting archives for {date_str}...")
    print(f"URL: {ajax_url}?feedId={FEED_ID}&date={date_str}")

    response = session.get(ajax_url, params=params)
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        try:
            data = response.json()

            if "data" in data:
                archives = data["data"]
                print(f"✓ Found {len(archives)} archives")

                # Show first few archives
                for i, archive in enumerate(archives[:3]):
                    print(f"\nArchive {i+1}:")
                    if isinstance(archive, list):
                        for j, field in enumerate(archive[:5]):  # Show first 5 fields
                            print(f"  Field {j}: {field}")
                    else:
                        print(f"  Data: {archive}")

                if len(archives) > 3:
                    print(f"\n... and {len(archives) - 3} more archives")

                # Save full response for analysis
                with open(
                    f"ajax_response_{test_date.strftime('%Y%m%d')}.json", "w"
                ) as f:
                    json.dump(data, f, indent=2)
                    print(
                        f"\nFull response saved to ajax_response_{test_date.strftime('%Y%m%d')}.json"
                    )

                break  # Found archives, stop testing other dates
            else:
                print("Response has no 'data' field")
                print(f"Response: {response.text[:200]}")
        except json.JSONDecodeError:
            print("Response is not JSON")
            print(f"Response: {response.text[:200]}")
    else:
        print(f"Error: {response.status_code}")

print("\n" + "=" * 50)
print("Test complete!")
