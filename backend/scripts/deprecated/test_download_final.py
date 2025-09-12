#!/usr/bin/env python3
"""
Final test to get Broadcastify downloads working
"""
import requests
from datetime import datetime
import time
from test_config import BROADCASTIFY_USERNAME, BROADCASTIFY_PASSWORD, validate_broadcastify_credentials

# Use credentials from environment
validate_broadcastify_credentials()
USERNAME = BROADCASTIFY_USERNAME
PASSWORD = BROADCASTIFY_PASSWORD
BASE_URL = "https://www.broadcastify.com"
FEED_ID = "12145"

print("Broadcastify Premium Download Test")
print("=" * 50)

# Create session with browser-like headers
session = requests.Session()
session.headers.update(
    {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
)

# Step 1: Get login page (important for cookies)
print("Step 1: Getting login page...")
login_page = session.get(f"{BASE_URL}/login")
print(f"  Status: {login_page.status_code}")

# Step 2: Login with email
print("\nStep 2: Logging in...")
login_data = {
    "email": USERNAME,
    "password": PASSWORD,
    "action": "auth",
    "redirect": "",
}

session.headers["Referer"] = f"{BASE_URL}/login"
login_response = session.post(f"{BASE_URL}/login/", data=login_data)
print(f"  Status: {login_response.status_code}")
print(f"  URL: {login_response.url}")

# Check cookies
print("\n  Cookies after login:")
for cookie in session.cookies:
    print(f"    - {cookie.name}: {'*' * 10} (hidden)")

# Step 3: Navigate to archive page (important for session)
print("\nStep 3: Navigating to archive page...")
archive_url = f"{BASE_URL}/archives/feed/{FEED_ID}"
archive_page = session.get(archive_url)
print(f"  Status: {archive_page.status_code}")

# Verify we're logged in with premium
if "var p = true" in archive_page.text:
    print("  ✓ Premium status confirmed!")
elif "premium" in archive_page.text.lower():
    print("  ? Premium mentioned but status unclear")
else:
    print("  ✗ Premium status not confirmed")

# Step 4: Get archive list via AJAX
print("\nStep 4: Getting archive list...")
session.headers.update(
    {
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": archive_url,
    }
)

date_str = datetime.now().strftime("%m/%d/%Y")
ajax_response = session.get(
    f"{BASE_URL}/archives/ajax.php", params={"feedId": FEED_ID, "date": date_str}
)

if ajax_response.status_code == 200:
    data = ajax_response.json()
    archives = data.get("data", [])
    print(f"  Found {len(archives)} archives")

    if archives:
        # Get first archive
        archive_id = archives[0][0]  # Full ID like "12145-1757299178"
        start_time = archives[0][1]
        end_time = archives[0][2]

        print(f"\n  First archive:")
        print(f"    ID: {archive_id}")
        print(f"    Time: {start_time} - {end_time}")

        # Step 5: Download the archive
        print("\nStep 5: Attempting download...")

        # Reset headers for download
        session.headers.update(
            {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Referer": archive_url,
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-User": "?1",
            }
        )

        # Remove AJAX headers
        if "X-Requested-With" in session.headers:
            del session.headers["X-Requested-With"]

        # Try the download URL with full archive ID
        download_url = f"{BASE_URL}/archives/download/{archive_id}"
        print(f"  URL: {download_url}")

        # Download with streaming
        download_response = session.get(download_url, stream=True, allow_redirects=True)
        print(f"  Initial Status: {download_response.status_code}")
        print(f"  Final URL: {download_response.url}")
        print(f"  Content-Type: {download_response.headers.get('content-type')}")

        # Check if it's audio
        content_type = download_response.headers.get("content-type", "")
        if "audio" in content_type or "mpeg" in content_type:
            print("  ✓✓✓ SUCCESS! Audio content received!")

            # Download the file
            filename = f"test_archive_{archive_id}.mp3"
            with open(filename, "wb") as f:
                for chunk in download_response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

            print(f"  ✓ Downloaded to {filename}")

            # Check file size
            import os

            file_size = os.path.getsize(filename)
            print(f"  File size: {file_size:,} bytes ({file_size/1024/1024:.1f} MB)")

        else:
            # Check if it's a redirect page
            if "html" in content_type:
                # Read first 1KB to check content
                content_sample = next(
                    download_response.iter_content(chunk_size=1024)
                ).decode("utf-8", errors="ignore")

                if (
                    "location.href" in content_sample
                    or "window.location" in content_sample
                ):
                    print("  ! Page contains JavaScript redirect")
                    # Try to extract the redirect URL
                    import re

                    redirect_match = re.search(
                        r'(location\.href|window\.location)\s*=\s*["\']([^"\']+)["\']',
                        content_sample,
                    )
                    if redirect_match:
                        redirect_url = redirect_match.group(2)
                        print(f"  Redirect URL found: {redirect_url}")

                        # Try downloading from redirect URL
                        if redirect_url.startswith("http"):
                            final_response = session.get(redirect_url, stream=True)
                            if "audio" in final_response.headers.get(
                                "content-type", ""
                            ):
                                print("  ✓ Audio found at redirect URL!")
                elif "login" in content_sample.lower():
                    print("  ✗ Redirected to login page - session lost")
                elif (
                    "premium" in content_sample.lower()
                    and "subscribe" in content_sample.lower()
                ):
                    print("  ✗ Premium subscription required message")
                else:
                    print("  ? HTML page returned, content unclear")
                    with open("download_response.html", "w") as f:
                        f.write(content_sample)
                    print("  Response saved to download_response.html")

print("\n" + "=" * 50)
print("Test complete!")
