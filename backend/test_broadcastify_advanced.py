#!/usr/bin/env python3
"""
Advanced Broadcastify authentication test
"""
import requests
from bs4 import BeautifulSoup

# Credentials
USERNAME = "chris@waitingforthefuture.org"
PASSWORD = "qjt4KRC_mem4rqu8brg"
BASE_URL = "https://www.broadcastify.com"

session = requests.Session()

# Set a user agent to appear as a normal browser
session.headers.update(
    {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
)

print("Testing different login methods...\n")

# Method 1: Direct POST to login
print("Method 1: Direct POST to /login")
login_data = {
    "email": USERNAME,
    "password": PASSWORD,
}

response = session.post(f"{BASE_URL}/login", data=login_data, allow_redirects=True)
print(f"Status: {response.status_code}")
print(f"URL after login: {response.url}")
print(f"Cookies: {session.cookies.get_dict()}")

# Check if logged in
if response.status_code == 200:
    if "logout" in response.text.lower() or "dashboard" in response.text.lower():
        print("✓ Login successful!")
    else:
        print("? Login status unclear")

        # Check by trying to access a protected page
        test_response = session.get(f"{BASE_URL}/archives/feed/12145")
        if (
            test_response.status_code == 200
            and "login" not in test_response.url.lower()
        ):
            print("✓ But can access archives - login worked!")
        else:
            print("✗ Cannot access archives - login failed")

print("\n" + "=" * 50)

# If login worked, test archive access
if session.cookies:
    print("\nTesting archive access with session...")

    # Direct archive URL
    archive_url = f"{BASE_URL}/archives/feed/12145"
    response = session.get(archive_url)

    print(f"Archive page status: {response.status_code}")
    print(f"Final URL: {response.url}")

    if response.status_code == 200 and "login" not in response.url.lower():
        print("✓ Can access archives!")

        # Parse the page
        soup = BeautifulSoup(response.text, "html.parser")

        # Look for any audio-related elements
        print("\nSearching for audio elements...")

        # Method 1: Look for audio tags
        audio_tags = soup.find_all("audio")
        if audio_tags:
            print(f"Found {len(audio_tags)} audio tags")
            for audio in audio_tags[:2]:
                src = audio.get("src") or audio.find("source", src=True)
                if src:
                    print(f"  Audio source: {src}")

        # Method 2: Look for download links
        download_patterns = [".mp3", "download", "audio", "archive", "play"]
        relevant_links = []

        for link in soup.find_all("a", href=True):
            href = link.get("href", "")
            if any(pattern in href.lower() for pattern in download_patterns):
                relevant_links.append(href)

        if relevant_links:
            print(f"\nFound {len(relevant_links)} relevant links:")
            for link in relevant_links[:5]:
                print(f"  - {link}")

        # Method 3: Look for JavaScript-loaded content
        scripts = soup.find_all("script")
        for script in scripts:
            if script.string and (
                "mp3" in script.string.lower() or "audio" in script.string.lower()
            ):
                print("\n✓ Found JavaScript with audio references")
                break

        # Save page for manual inspection
        with open("broadcastify_archive_page.html", "w") as f:
            f.write(response.text)
        print("\nFull page saved to broadcastify_archive_page.html")

        # Also check if there's a different archive browser URL pattern
        print("\n" + "=" * 50)
        print("Checking alternative archive URLs...")

        # Try the archive browser
        browser_url = f"{BASE_URL}/archives/ajax.php?a=feed&feedId=12145"
        response = session.get(browser_url)
        if response.status_code == 200:
            print(f"✓ Ajax endpoint accessible")
            print(f"Response type: {response.headers.get('content-type')}")
            if "json" in response.headers.get("content-type", ""):
                print(
                    "JSON response:",
                    response.json()[:200]
                    if len(response.text) > 200
                    else response.json(),
                )
            else:
                print("Text response:", response.text[:200])

    else:
        print("✗ Cannot access archives - may need premium account")
