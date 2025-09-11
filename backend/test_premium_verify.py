#!/usr/bin/env python3
"""
Verify Broadcastify premium login and find correct download method
"""
import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
from test_config import BROADCASTIFY_USERNAME, BROADCASTIFY_PASSWORD, validate_broadcastify_credentials

# Use credentials from environment
validate_broadcastify_credentials()
USERNAME = BROADCASTIFY_USERNAME
PASSWORD = BROADCASTIFY_PASSWORD
BASE_URL = "https://www.broadcastify.com"
FEED_ID = "12145"

session = requests.Session()
session.headers.update(
    {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
)

print("Testing Broadcastify premium authentication...")
print("=" * 50)

# More robust login process
print("Step 1: Get login page for any cookies/tokens...")
login_page_response = session.get(f"{BASE_URL}/login")
login_soup = BeautifulSoup(login_page_response.text, "html.parser")

# Look for any hidden form fields
login_form = login_soup.find("form", {"action": "/login/"})
if login_form:
    hidden_inputs = login_form.find_all("input", type="hidden")
    print(f"Found {len(hidden_inputs)} hidden fields in login form")
    for inp in hidden_inputs:
        print(f"  - {inp.get('name')}: {inp.get('value')}")

print("\nStep 2: Submit login...")
login_data = {
    "username": USERNAME,  # Try username field
    "password": PASSWORD,
    "action": "auth",
    "redirect": "",
}

# Add any hidden fields found
if login_form:
    for inp in hidden_inputs:
        if inp.get("name") and inp.get("value"):
            login_data[inp.get("name")] = inp.get("value")

response = session.post(f"{BASE_URL}/login/", data=login_data)
print(f"Login response status: {response.status_code}")
print(f"Login response URL: {response.url}")

# Check if login was successful
if "logout" in response.text.lower():
    print("✓ Found 'logout' in response - likely logged in")
else:
    print("? 'logout' not found - trying alternate login...")

    # Try with email field instead
    login_data["email"] = USERNAME
    del login_data["username"]
    response = session.post(f"{BASE_URL}/login/", data=login_data)
    print(f"Alternate login status: {response.status_code}")

    if "logout" in response.text.lower():
        print("✓ Logged in with email field")

# Verify premium status
print("\n" + "=" * 50)
print("Step 3: Verify premium status...")

# Check the archive page
archive_page_url = f"{BASE_URL}/archives/feed/{FEED_ID}"
archive_response = session.get(archive_page_url)
archive_soup = BeautifulSoup(archive_response.text, "html.parser")

# Look for premium indicators
if "premium" in archive_response.text.lower():
    premium_contexts = []
    for text in archive_soup.find_all(text=lambda t: "premium" in t.lower()):
        context = text.strip()[:100]
        if context and context not in premium_contexts:
            premium_contexts.append(context)

    print(f"Found {len(premium_contexts)} references to 'premium':")
    for ctx in premium_contexts[:3]:
        print(f"  - {ctx}")

# Check download links in the actual page
print("\n" + "=" * 50)
print("Step 4: Analyzing download link structure...")

# Save the archive page for inspection
with open("archive_page_premium.html", "w") as f:
    f.write(archive_response.text)
print("Archive page saved to archive_page_premium.html")

# Look for actual download links in JavaScript
scripts = archive_soup.find_all("script")
for script in scripts:
    if script.string and "download" in script.string.lower():
        # Extract the download URL pattern
        lines = script.string.split("\n")
        for line in lines:
            if "download" in line.lower() and (
                "href" in line or "url" in line or "return" in line
            ):
                print(f"Found download pattern: {line.strip()[:150]}")

# Try to find the actual audio player or download mechanism
print("\n" + "=" * 50)
print("Step 5: Testing archive playback URL...")

# Get today's archives via AJAX
session.headers.update(
    {
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
    }
)

date_str = datetime.now().strftime("%m/%d/%Y")
ajax_response = session.get(
    f"{BASE_URL}/archives/ajax.php", params={"feedId": FEED_ID, "date": date_str}
)

if ajax_response.status_code == 200:
    data = ajax_response.json()
    if data.get("data"):
        archive_id = data["data"][0][0]
        print(f"Testing with archive ID: {archive_id}")

        # Extract just the timestamp part
        parts = archive_id.split("-")
        if len(parts) == 2:
            timestamp = parts[1]

            # Try different URL patterns that might work for premium
            test_urls = [
                f"{BASE_URL}/archives/play/{archive_id}",
                f"{BASE_URL}/archives/play/{timestamp}",
                f"{BASE_URL}/archives/audio/{archive_id}.mp3",
                f"{BASE_URL}/archives/download/{timestamp}",
                f"https://archives.broadcastify.com/{FEED_ID}/{timestamp}.mp3",
                f"https://m.broadcastify.com/archives/download/{archive_id}",
            ]

            for url in test_urls:
                print(f"\n  Testing: {url}")
                try:
                    # Don't follow redirects automatically
                    test_response = session.get(
                        url, allow_redirects=False, stream=True, timeout=5
                    )
                    print(f"    Status: {test_response.status_code}")

                    if (
                        test_response.status_code == 302
                        or test_response.status_code == 301
                    ):
                        redirect_url = test_response.headers.get("Location")
                        print(f"    Redirect to: {redirect_url}")

                        # Follow the redirect
                        if redirect_url:
                            final_response = session.get(
                                redirect_url, stream=True, timeout=5
                            )
                            print(f"    Final status: {final_response.status_code}")
                            print(
                                f"    Final content-type: {final_response.headers.get('content-type')}"
                            )

                            if "audio" in final_response.headers.get(
                                "content-type", ""
                            ):
                                print(f"    ✓✓✓ FOUND WORKING DOWNLOAD URL!")
                                print(f"    Pattern: {url} -> {redirect_url}")
                                break

                    elif test_response.status_code == 200:
                        content_type = test_response.headers.get("content-type", "")
                        print(f"    Content-Type: {content_type}")

                        if "audio" in content_type:
                            print(f"    ✓✓✓ FOUND DIRECT DOWNLOAD URL!")
                            print(f"    Working URL: {url}")
                            break

                except Exception as e:
                    print(f"    Error: {str(e)}")

print("\n" + "=" * 50)
print("Test complete!")
