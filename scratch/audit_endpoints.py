import requests
import json
import sys

BASE_URL = "https://eel-event-hub-q61e.vercel.app/api/py"
ADMIN_EMAIL = "Barton@bmdcomputing.com"

headers = {
    "x-user-email": ADMIN_EMAIL
}

def print_result(name, r):
    status = r.status_code
    print(f"[{name}] status: {status}")
    if status == 200:
        try:
            data = r.json()
            if isinstance(data, list):
                print(f"  Count: {len(data)}")
                if len(data) > 0:
                    print(f"  First item: {json.dumps(data[0])[:120]}...")
            else:
                print(f"  Response keys: {list(data.keys())}")
        except Exception as e:
            print(f"  Response parsed failed: {e}")
    else:
        print(f"  Detail: {r.text[:200]}")

def test_endpoints():
    print("=== STARTING LIVE PRODUCTION API AUDIT ===")
    
    # 1. Healthcheck
    try:
        r = requests.get(f"{BASE_URL}/healthcheck", timeout=10)
        print_result("GET /healthcheck", r)
    except Exception as e:
        print(f"[GET /healthcheck] Failed: {e}")
        
    # 2. Events List
    event_id = None
    event_slug = None
    try:
        r = requests.get(f"{BASE_URL}/events", headers=headers, timeout=10)
        print_result("GET /events", r)
        if r.status_code == 200:
            events = r.json()
            if events:
                event_id = events[0].get("id")
                event_slug = events[0].get("slug")
    except Exception as e:
        print(f"[GET /events] Failed: {e}")

    # 3. Public Stats (using slug)
    if event_slug:
        try:
            r = requests.get(f"{BASE_URL}/events/{event_slug}/public-stats", timeout=10)
            print_result(f"GET /events/{event_slug}/public-stats", r)
        except Exception as e:
            print(f"[GET /events/{event_slug}/public-stats] Failed: {e}")
            
        try:
            r = requests.get(f"{BASE_URL}/events/{event_slug}", timeout=10)
            print_result(f"GET /events/{event_slug}", r)
        except Exception as e:
            print(f"[GET /events/{event_slug}] Failed: {e}")

    # 4. Event By ID
    if event_id:
        try:
            r = requests.get(f"{BASE_URL}/events/id/{event_id}", headers=headers, timeout=10)
            print_result(f"GET /events/id/{event_id}", r)
        except Exception as e:
            print(f"[GET /events/id/{event_id}] Failed: {e}")

    # 5. Registrations List for Event
    if event_id:
        try:
            r = requests.get(f"{BASE_URL}/events/{event_id}/registrations", headers=headers, timeout=10)
            print_result(f"GET /events/{event_id}/registrations", r)
        except Exception as e:
            print(f"[GET /events/{event_id}/registrations] Failed: {e}")

    # 6. Stats Dashboard
    try:
        r = requests.get(f"{BASE_URL}/stats", headers=headers, timeout=10)
        print_result("GET /stats", r)
    except Exception as e:
        print(f"[GET /stats] Failed: {e}")

    # 7. Activities
    try:
        r = requests.get(f"{BASE_URL}/activities", headers=headers, timeout=10)
        print_result("GET /activities", r)
    except Exception as e:
        print(f"[GET /activities] Failed: {e}")

    # 8. Analytics
    try:
        r = requests.get(f"{BASE_URL}/analytics", headers=headers, timeout=10)
        print_result("GET /analytics", r)
    except Exception as e:
        print(f"[GET /analytics] Failed: {e}")

if __name__ == "__main__":
    test_endpoints()
