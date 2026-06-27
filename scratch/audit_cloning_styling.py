import requests
import json
import sys

BASE_URL = "https://eel-event-hub-q61e-lb2tocasf-bmds-projects-e3482668.vercel.app/api/py"
ADMIN_EMAIL = "Barton@bmdcomputing.com"
SOURCE_EVENT_ID = 21

headers = {
    "x-user-email": ADMIN_EMAIL,
    "x-vercel-protection-bypass": "I3ywVNGuNFPbr7js8sRwqWIlPWi6DSxa",
    "Content-Type": "application/json"
}

def run_audit():
    print("=== STARTING CLONING & STYLING AUDIT ===")
    
    # 1. Duplicate event
    print(f"1. Calling duplicate endpoint for Event ID {SOURCE_EVENT_ID}...")
    r = requests.post(f"{BASE_URL}/events/{SOURCE_EVENT_ID}/duplicate", headers=headers, timeout=15)
    print(f"   Status: {r.status_code}")
    if r.status_code not in [200, 201]:
        print(f"   Error: {r.text}")
        sys.exit(1)
        
    duplicated_event = r.json()
    new_id = duplicated_event.get("id")
    new_slug = duplicated_event.get("slug")
    new_title = duplicated_event.get("title")
    print(f"   Success! Duplicated Event ID: {new_id} | Slug: {new_slug} | Title: {new_title}")
    
    if "(Copy)" not in new_title:
        print("   Error: '(Copy)' suffix not added to title.")
        sys.exit(1)
        
    # 2. Verify settings are copied
    print(f"2. Fetching registration details for slug '{new_slug}'...")
    # Also pass protection bypass header for GET request just in case
    get_headers = {
        "x-vercel-protection-bypass": "I3ywVNGuNFPbr7js8sRwqWIlPWi6DSxa"
    }
    r = requests.get(f"{BASE_URL}/events/{new_slug}", headers=get_headers, timeout=15)
    print(f"   Status: {r.status_code}")
    if r.status_code != 200:
        print(f"   Error fetching: {r.text}")
        sys.exit(1)
        
    fetched_event = r.json()
    banner_settings = fetched_event.get("banner_settings") or {}
    print(f"   Fetched Event Banner Settings: {banner_settings}")
    
    # 3. Update event with custom text color
    print(f"3. Updating Event {new_id} configuration with custom text color...")
    update_payload = {
        "title": fetched_event["title"],
        "slug": fetched_event["slug"],
        "description": fetched_event["description"],
        "start_date": fetched_event["start_date"],
        "location": fetched_event["location"],
        "capacity": fetched_event["capacity"],
        "client_id": fetched_event["client_id"],
        "banner_settings": {
            **banner_settings,
            "text_color": "#ff00ff"
        }
    }
    r = requests.put(f"{BASE_URL}/events/{new_id}", headers=headers, json=update_payload, timeout=15)
    print(f"   Status: {r.status_code}")
    if r.status_code != 200:
        print(f"   Error updating: {r.text}")
        sys.exit(1)
        
    # 4. Verify custom text color is saved
    print(f"4. Re-fetching slug '{new_slug}' to verify text color override...")
    r = requests.get(f"{BASE_URL}/events/{new_slug}", headers=get_headers, timeout=15)
    refetched_event = r.json()
    new_banner_settings = refetched_event.get("banner_settings") or {}
    print(f"   New Banner Settings: {new_banner_settings}")
    if new_banner_settings.get("text_color") != "#ff00ff":
        print(f"   Error: Custom text color not saved correctly: {new_banner_settings}")
        sys.exit(1)
    print("   Success! Custom text color saved successfully.")
    
    # 5. Clean up duplicate event
    print(f"5. Cleaning up: Deleting duplicated Event ID {new_id}...")
    r = requests.delete(f"{BASE_URL}/events/{new_id}", headers=headers, timeout=15)
    print(f"   Status: {r.status_code}")
    if r.status_code != 200:
        print(f"   Error deleting: {r.text}")
        sys.exit(1)
    print("   Success! Duplicated event cleaned up from database.")
    
    print("=== CLONING & STYLING AUDIT SUCCESSFUL ===")

if __name__ == "__main__":
    run_audit()
