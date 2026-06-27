import requests
import json
import sys

BASE_URL = "https://eel-event-hub-q61e-lb2tocasf-bmds-projects-e3482668.vercel.app/api/py"
ADMIN_EMAIL = "Barton@bmdcomputing.com"
EVENT_ID = 21

headers = {
    "x-user-email": ADMIN_EMAIL,
    "x-vercel-protection-bypass": "I3ywVNGuNFPbr7js8sRwqWIlPWi6DSxa",
    "Content-Type": "application/json"
}

# General headers for requests that do not need x-user-email but still need bypass token
bypass_headers = {
    "x-vercel-protection-bypass": "I3ywVNGuNFPbr7js8sRwqWIlPWi6DSxa"
}

def run_roundtrip_audit():
    print("=== STARTING END-TO-END ROUNDTRIP AUDIT ===")
    
    # Step 1: Register attendee
    email = "test_audit_attendee@example.com"
    reg_payload = {
        "event_id": EVENT_ID,
        "email": email,
        "first_name": "Audit",
        "last_name": "Attendee",
        "company": "Audit Inc",
        "custom_answers": {},
        "is_attending": True
    }
    
    print(f"1. Registering {email} for event {EVENT_ID}...")
    r = requests.post(f"{BASE_URL}/register", headers=bypass_headers, json=reg_payload, timeout=15)
    print(f"   Status: {r.status_code}")
    if r.status_code not in [200, 201]:
        print(f"   Error registering: {r.text}")
        sys.exit(1)
        
    registration_info = r.json()
    print(f"   Successfully registered. PIN/Clearance ID: {registration_info.get('pin') or registration_info.get('clearance_id')}")
    
    # Step 2: Fetch registrations list to get the UUID of our registrant
    print(f"2. Fetching registrations for event {EVENT_ID} to locate UUID...")
    r = requests.get(f"{BASE_URL}/events/{EVENT_ID}/registrations", headers=headers, timeout=15)
    print(f"   Status: {r.status_code}")
    if r.status_code != 200:
        print(f"   Error fetching list: {r.text}")
        sys.exit(1)
        
    registrations = r.json()
    my_reg = None
    for reg in registrations:
        attendee = reg.get("attendee", {})
        if attendee.get("email") == email:
            my_reg = reg
            break
            
    if not my_reg:
        print("   Error: Created registration could not be found in list.")
        sys.exit(1)
        
    registration_id = my_reg.get("id")
    print(f"   Located attendee. Registration UUID: {registration_id}")
    
    # Step 3: Check-in via UUID
    print(f"3. Performing Check-In via UUID: {registration_id}...")
    r = requests.put(f"{BASE_URL}/registrations/{registration_id}/checkin?mode=checkin", headers=bypass_headers, timeout=15)
    print(f"   Status: {r.status_code}")
    if r.status_code != 200:
        print(f"   Error checking in: {r.text}")
        sys.exit(1)
        
    print(f"   Check-In successful.")
    
    # Step 4: Verify check-in status
    print(f"4. Verifying check-in status...")
    r = requests.get(f"{BASE_URL}/events/{EVENT_ID}/registrations", headers=headers, timeout=15)
    registrations = r.json()
    verified_reg = next((reg for reg in registrations if reg.get("id") == registration_id), None)
    if not verified_reg:
        print("   Error: Could not find registration during verification.")
        sys.exit(1)
        
    print(f"   Checked-In status: {verified_reg.get('checked_in')}")
    if not verified_reg.get("checked_in"):
        print("   Error: Checked-in status is not True.")
        sys.exit(1)
        
    # Step 5: Check-out (toggle back)
    print(f"5. Performing Check-Out (checkout mode) via UUID...")
    r = requests.put(f"{BASE_URL}/registrations/{registration_id}/checkin?mode=checkout", headers=bypass_headers, timeout=15)
    print(f"   Status: {r.status_code}")
    if r.status_code != 200:
        print(f"   Error checking out: {r.text}")
        sys.exit(1)
        
    # Step 6: Verify check-out status
    print(f"6. Verifying check-out status...")
    r = requests.get(f"{BASE_URL}/events/{EVENT_ID}/registrations", headers=headers, timeout=15)
    registrations = r.json()
    verified_reg = next((reg for reg in registrations if reg.get("id") == registration_id), None)
    print(f"   Checked-In status: {verified_reg.get('checked_in')}")
    if verified_reg.get("checked_in"):
        print("   Error: Checked-in status is still True.")
        sys.exit(1)

    # Step 7: Clean up (delete registration)
    print(f"7. Cleaning up: Deleting registration {registration_id}...")
    r = requests.delete(f"{BASE_URL}/registrations/{registration_id}", headers=headers, timeout=15)
    print(f"   Status: {r.status_code}")
    if r.status_code != 200:
        print(f"   Error deleting: {r.text}")
        sys.exit(1)
        
    print("   Cleanup completed successfully.")
    
    # Step 8: Verify deletion
    print("8. Verifying deletion...")
    r = requests.get(f"{BASE_URL}/events/{EVENT_ID}/registrations", headers=headers, timeout=15)
    registrations = r.json()
    deleted_reg = next((reg for reg in registrations if reg.get("id") == registration_id), None)
    if deleted_reg:
        print("   Error: Registration still exists in database.")
        sys.exit(1)
        
    print("   Verification: Registration was successfully deleted.")
    print("=== END-TO-END ROUNDTRIP AUDIT SUCCESSFUL ===")

if __name__ == "__main__":
    run_roundtrip_audit()
