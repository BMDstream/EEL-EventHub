import requests
import json
import sys

BASE_URL = "https://eel-event-hub-q61e.vercel.app/api/py"
ADMIN_EMAIL = "Barton@bmdcomputing.com"
EVENT_ID = 21

headers = {
    "x-user-email": ADMIN_EMAIL
}

def run_bulk_checkin_audit():
    print("=== STARTING BULK CHECK-IN ENDPOINT AUDIT ===")
    
    # 1. Register attendee
    email = "test_bulk_audit@example.com"
    reg_payload = {
        "event_id": EVENT_ID,
        "email": email,
        "first_name": "Bulk",
        "last_name": "Audit",
        "company": "Bulk Corp",
        "custom_answers": {},
        "is_attending": True
    }
    
    print(f"1. Registering {email} for event {EVENT_ID}...")
    r = requests.post(f"{BASE_URL}/register", json=reg_payload, timeout=10)
    if r.status_code not in [200, 201]:
        print(f"   Error registering: {r.text}")
        sys.exit(1)
        
    registration_info = r.json()
    print(f"   Successfully registered. PIN/Clearance ID: {registration_info.get('pin') or registration_info.get('clearance_id')}")
    
    # 2. Fetch registrations list to get the UUID
    print(f"2. Fetching registrations for event {EVENT_ID} to locate UUID...")
    r = requests.get(f"{BASE_URL}/events/{EVENT_ID}/registrations", headers=headers, timeout=10)
    if r.status_code != 200:
        print(f"   Error fetching list: {r.text}")
        sys.exit(1)
        
    registrations = r.json()
    my_reg = next((reg for reg in registrations if reg.get("attendee", {}).get("email") == email), None)
    if not my_reg:
        print("   Error: Created registration could not be found in list.")
        sys.exit(1)
        
    registration_id = my_reg.get("id")
    print(f"   Located attendee. Registration UUID: {registration_id}")
    
    # 3. Perform bulk check-in via new endpoint
    print(f"3. Posting bulk check-in to endpoint...")
    bulk_payload = [
        {
            "registration_id": registration_id,
            "day": 1,
            "timestamp": "2026-06-22T15:30:00.123Z",
            "mode": "checkin"
        }
    ]
    r = requests.post(f"{BASE_URL}/events/{EVENT_ID}/bulk-checkin", json=bulk_payload, headers=headers, timeout=10)
    print(f"   Status: {r.status_code}")
    if r.status_code != 200:
        print(f"   Error checking in: {r.text}")
        sys.exit(1)
        
    result = r.json()
    print(f"   Bulk check-in response keys: {list(result.keys())}")
    print(f"   Synced: {len(result.get('synced', []))}, Conflicts: {len(result.get('conflicts', []))}, Errors: {len(result.get('errors', []))}")
    if len(result.get('synced', [])) != 1:
        print("   Error: Sync failed.")
        sys.exit(1)
        
    # 4. Verify check-in status on server
    print(f"4. Verifying check-in status on server...")
    r = requests.get(f"{BASE_URL}/events/{EVENT_ID}/registrations", headers=headers, timeout=10)
    registrations = r.json()
    verified_reg = next((reg for reg in registrations if reg.get("id") == registration_id), None)
    print(f"   Checked-In status: {verified_reg.get('checked_in')}")
    if not verified_reg.get("checked_in"):
        print("   Error: Checked-in status is not True after bulk check-in.")
        sys.exit(1)
        
    # 5. Clean up (delete registration)
    print(f"5. Cleaning up: Deleting registration {registration_id}...")
    r = requests.delete(f"{BASE_URL}/registrations/{registration_id}", headers=headers, timeout=10)
    if r.status_code != 200:
        print(f"   Error deleting: {r.text}")
        sys.exit(1)
        
    print("   Cleanup completed successfully.")
    print("=== BULK CHECK-IN ENDPOINT AUDIT SUCCESSFUL ===")

if __name__ == "__main__":
    run_bulk_checkin_audit()
