#!/usr/bin/env python3
"""
Check Broadcastify archive page structure
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta

# Credentials
USERNAME = "chris@waitingforthefuture.org"
PASSWORD = "qjt4KRC_mem4rqu8brg"
BASE_URL = "https://www.broadcastify.com"

session = requests.Session()

# Login
login_data = {
    "email": USERNAME,
    "password": PASSWORD,
}
response = session.post(f"{BASE_URL}/login", data=login_data)

if "logout" in response.text.lower():
    print("✓ Logged in successfully")
else:
    print("✗ Login failed")
    exit(1)

# Get archive page
archive_url = f"{BASE_URL}/archives/feed/12145"
response = session.get(archive_url)
soup = BeautifulSoup(response.text, "html.parser")

print(f"\nArchive page title: {soup.title.string if soup.title else 'No title'}")

# Look for any links that might be archives
print("\n" + "=" * 50)
print("Looking for archive-related links...")

# Find all links
all_links = soup.find_all("a", href=True)
archive_links = []

for link in all_links:
    href = link.get("href", "")
    text = link.get_text().strip()

    # Look for patterns that might indicate archive files
    if any(
        pattern in href.lower()
        for pattern in ["archive", "download", "mp3", "audio", "play"]
    ):
        archive_links.append((href, text))
        print(f"Found: {href[:80]} - '{text[:40]}'")

if not archive_links:
    print("No obvious archive links found")

    # Let's look for date-based navigation
    print("\n" + "=" * 50)
    print("Looking for date navigation...")

    # Check for date selector or calendar
    date_inputs = soup.find_all(
        ["input", "select"], attrs={"name": lambda x: x and "date" in x.lower()}
    )
    for inp in date_inputs:
        print(f"Date input: {inp.get('name')} - type: {inp.name}")

    # Try accessing a specific date
    print("\n" + "=" * 50)
    print("Trying to access archives for a specific date...")

    # Try yesterday
    yesterday = datetime.now() - timedelta(days=1)
    date_str = yesterday.strftime("%Y%m%d")

    date_url = f"{archive_url}?date={date_str}"
    print(f"Trying URL: {date_url}")

    response = session.get(date_url)
    soup = BeautifulSoup(response.text, "html.parser")

    # Look for audio/mp3 links again
    links = soup.find_all("a", href=True)
    mp3_links = []

    for link in links:
        href = link.get("href", "")
        text = link.get_text().strip()

        if any(
            pattern in href.lower() for pattern in [".mp3", "download", "audio", "play"]
        ):
            mp3_links.append((href, text))

    if mp3_links:
        print(f"\n✓ Found {len(mp3_links)} audio links for {date_str}:")
        for href, text in mp3_links[:5]:  # Show first 5
            print(f"  - {href[:80]}")
            if text:
                print(f"    Text: '{text[:60]}'")
    else:
        print(f"✗ No audio links found for {date_str}")

        # Save the page for inspection
        with open("archive_page.html", "w") as f:
            f.write(response.text)
        print("\nPage saved to archive_page.html for inspection")

# Also try the main archive list page
print("\n" + "=" * 50)
print("Checking main archives listing...")

list_url = f"{BASE_URL}/archives/"
response = session.get(list_url)
if response.status_code == 200:
    soup = BeautifulSoup(response.text, "html.parser")

    # Look for Phoenix-related links
    phoenix_links = soup.find_all("a", text=lambda x: x and "phoenix" in x.lower())

    if phoenix_links:
        print(f"Found {len(phoenix_links)} Phoenix-related archive links:")
        for link in phoenix_links[:3]:
            print(f"  - {link.get('href')} - {link.get_text().strip()}")
