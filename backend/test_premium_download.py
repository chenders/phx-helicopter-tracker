#!/usr/bin/env python3
"""
Test Broadcastify premium download with detailed debugging
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
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
)

print("Testing Broadcastify premium download...")
print("=" * 50)

# Login
session.headers["Referer"] = f"{BASE_URL}/login"
login_data = {
    "email": USERNAME,
    "password": PASSWORD,
    "action": "auth",
    "redirect": "https://www.broadcastify.com",
}

print("Logging in with premium account...")
response = session.post(f"{BASE_URL}/login", data=login_data)
print(f"Login status: {response.status_code}")

# Check cookies
print("\nSession cookies:")
for cookie in session.cookies:
    print(
        f"  - {cookie.name}: {cookie.value[:20]}..."
        if len(str(cookie.value)) > 20
        else f"  - {cookie.name}: {cookie.value}"
    )

# Get archives via AJAX
print("\n" + "=" * 50)
print("Getting archive list...")

session.headers.update(
    {
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": f"{BASE_URL}/archives/feed/{FEED_ID}",
    }
)

# Get today's archives
today = datetime.now()
date_str = today.strftime("%m/%d/%Y")

ajax_url = f"{BASE_URL}/archives/ajax.php"
params = {"feedId": FEED_ID, "date": date_str}

response = session.get(ajax_url, params=params)
print(f"AJAX response status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    archives = data.get("data", [])
    print(f"Found {len(archives)} archives")

    if archives:
        # Test downloading the first archive
        archive_data = archives[0]
        archive_id = archive_data[0]
        start_time = archive_data[1]
        end_time = archive_data[2]

        print(f"\nTesting download of first archive:")
        print(f"  Archive ID: {archive_id}")
        print(f"  Time: {start_time} - {end_time}")

        # Update headers for download
        session.headers.update(
            {
                "Accept": "audio/mpeg, */*",
                "Referer": f"{BASE_URL}/archives/feed/{FEED_ID}",
            }
        )

        # Try different download URL formats
        download_urls = [
            (f"{BASE_URL}/archives/downloadv2/{archive_id}", "downloadv2"),
            (f"{BASE_URL}/archives/download/{archive_id}", "download"),
            (f"{BASE_URL}/archives/play/{archive_id}", "play"),
            (f"{BASE_URL}/archives/stream/{archive_id}", "stream"),
        ]

        for url, url_type in download_urls:
            print(f"\n  Trying {url_type} URL: {url}")

            # First try HEAD request to check if accessible
            try:
                head_response = session.head(url, allow_redirects=True, timeout=10)
                print(f"    HEAD status: {head_response.status_code}")
                print(f"    Final URL: {head_response.url}")

                if head_response.status_code == 200:
                    content_type = head_response.headers.get("content-type", "")
                    content_length = head_response.headers.get(
                        "content-length", "unknown"
                    )
                    print(f"    Content-Type: {content_type}")
                    print(f"    Content-Length: {content_length}")

                    # If it looks like audio, try to download a small chunk
                    if (
                        "audio" in content_type
                        or "octet-stream" in content_type
                        or head_response.status_code == 200
                    ):
                        print(f"    ✓ This URL appears to work for downloads!")

                        # Try to download first 1KB
                        get_response = session.get(url, stream=True, timeout=10)
                        if get_response.status_code == 200:
                            chunk = next(get_response.iter_content(chunk_size=1024))
                            print(f"    ✓ Successfully downloaded {len(chunk)} bytes")

                            # Save a small sample
                            with open("test_download_sample.mp3", "wb") as f:
                                f.write(chunk)
                            print(f"    Sample saved to test_download_sample.mp3")
                            break
                    else:
                        print(f"    Not audio content: {content_type}")

                elif (
                    head_response.status_code == 302 or head_response.status_code == 301
                ):
                    print(f"    Redirect detected")
                elif head_response.status_code == 403:
                    print(f"    ✗ Access forbidden - might need different auth")
                elif head_response.status_code == 404:
                    print(f"    ✗ Not found")
                else:
                    print(f"    ✗ Unexpected status: {head_response.status_code}")

            except requests.exceptions.RequestException as e:
                print(f"    ✗ Request failed: {str(e)}")

        # Also check if we need to get a special download token
        print("\n" + "=" * 50)
        print("Checking for download token requirement...")

        # Check the main archive page for any tokens
        archive_page_url = f"{BASE_URL}/archives/feed/{FEED_ID}"
        page_response = session.get(archive_page_url)

        if "csrf" in page_response.text.lower():
            print("  CSRF token might be required")
        if "token" in page_response.text.lower():
            print("  Some form of token detected in page")

        # Check session info
        print("\nChecking account status...")
        account_url = f"{BASE_URL}/account"  # Try common account URLs
        account_response = session.get(account_url, allow_redirects=False)
        if account_response.status_code == 200:
            if "premium" in account_response.text.lower():
                print("  ✓ Premium account confirmed")
            else:
                print("  ? Premium status unclear from account page")
else:
    print("Failed to get archive list")

print("\n" + "=" * 50)
print("Debug test complete!")
