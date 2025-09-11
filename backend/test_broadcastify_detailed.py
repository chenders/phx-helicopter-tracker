#!/usr/bin/env python3
"""
Detailed test of Broadcastify archive access
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import re
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
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
)

print("Testing Broadcastify authentication and archive access...")
print("=" * 50)

# Login
session.headers["Referer"] = f"{BASE_URL}/login"
login_data = {
    "email": USERNAME,
    "password": PASSWORD,
    "action": "auth",
    "redirect": "https://www.broadcastify.com",
}

print("Attempting login...")
response = session.post(f"{BASE_URL}/login", data=login_data)
print(f"Login response status: {response.status_code}")
print(f"Response URL: {response.url}")

if response.ok:
    print("✓ Login request successful")
else:
    print("✗ Login request failed")
    exit(1)

# Check if we can access archives
print("\n" + "=" * 50)
print("Checking archive access...")

archive_url = f"{BASE_URL}/archives/feed/{FEED_ID}"
response = session.get(archive_url)
print(f"Archive page status: {response.status_code}")
print(f"Archive page URL: {response.url}")

if "login" in response.url.lower():
    print("✗ Redirected to login - not authenticated")
else:
    print("✓ Archive page accessed")

# Parse the archive page
soup = BeautifulSoup(response.text, "html.parser")

# Save page for inspection
with open("archive_page_detailed.html", "w") as f:
    f.write(response.text)
print("\nPage saved to archive_page_detailed.html")

# Look for archive links
print("\n" + "=" * 50)
print("Searching for archive links...")

# Method 1: Look for download links
download_links = soup.find_all("a", href=re.compile(r"/archives/download/\d+"))
print(
    f"Found {len(download_links)} download links with pattern '/archives/download/\\d+'"
)

# Method 2: Look for any links with 'archive' in them
archive_links = soup.find_all("a", href=lambda x: x and "archive" in x.lower())
print(f"Found {len(archive_links)} links containing 'archive'")
for link in archive_links[:5]:
    print(f"  - {link.get('href')}")

# Method 3: Look for audio/mp3 references
mp3_links = soup.find_all("a", href=lambda x: x and ".mp3" in x.lower())
print(f"Found {len(mp3_links)} links containing '.mp3'")

# Method 4: Look for any playback elements
audio_elements = soup.find_all(["audio", "video"])
print(f"Found {len(audio_elements)} audio/video elements")

# Try with a specific date
print("\n" + "=" * 50)
print("Testing with specific date parameter...")

yesterday = datetime.now() - timedelta(days=1)
date_str = yesterday.strftime("%Y%m%d")
date_url = f"{archive_url}?date={date_str}"

print(f"Requesting: {date_url}")
response = session.get(date_url)
soup = BeautifulSoup(response.text, "html.parser")

# Check for any change in content
download_links_dated = soup.find_all("a", href=re.compile(r"/archives/download/\d+"))
print(f"Found {len(download_links_dated)} download links for date {date_str}")

# Look for JavaScript-loaded content indicators
scripts = soup.find_all("script")
has_ajax = False
for script in scripts:
    if script.string and (
        "ajax" in script.string.lower() or "fetch" in script.string.lower()
    ):
        has_ajax = True
        break

if has_ajax:
    print("\n⚠ Page appears to load content dynamically via JavaScript")
    print("  This might require Selenium or checking API endpoints")

# Check for any forms or interactive elements
forms = soup.find_all("form")
print(f"\nFound {len(forms)} forms on the page")
for form in forms[:2]:
    print(f"  Form action: {form.get('action')}")

# Look for any error messages or subscription notices
error_divs = soup.find_all(
    ["div", "p"],
    class_=lambda x: x
    and ("error" in x.lower() or "premium" in x.lower() or "subscribe" in x.lower()),
)
if error_divs:
    print("\n⚠ Found potential error or subscription messages:")
    for div in error_divs[:3]:
        text = div.get_text().strip()[:100]
        if text:
            print(f"  - {text}")

# Check page title and main content
title = soup.find("title")
if title:
    print(f"\nPage title: {title.string}")

# Look for main content area
main_content = soup.find(["main", "div"], class_=lambda x: x and "content" in x.lower())
if main_content:
    text_snippet = main_content.get_text().strip()[:200]
    print(f"\nMain content snippet: {text_snippet}...")

print("\n" + "=" * 50)
print("Analysis complete - check archive_page_detailed.html for full page content")
