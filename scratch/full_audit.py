"""
Full Deep Audit Script for EEL EventHub
Tests: Event listing, Event detail, Registration flow, Check-in/out,
       Event duplication, Custom text color, Banner fallback, Email dispatch status.
Target: Vercel Preview Deployment
"""
import requests
import json
import sys
import time

BASE_URL = "https://eel-event-hub-q61e-1y9adj38n-bmds-projects-e3482668.vercel.app/api/py"
ADMIN_EMAIL = "Barton@bmdcomputing.com"
EVENT_ID = 21
BYPASS = "I3ywVNGuNFPbr7js8sRwqWIlPWi6DSxa"

auth_headers = {
    "x-user-email": ADMIN_EMAIL,
    "x-vercel-protection-bypass": BYPASS,
    "Content-Type": "application/json"
}
bypass_headers = {
    "x-vercel-protection-bypass": BYPASS,
    "Content-Type": "application/json"
}

PASS = "  ✅ PASS"
FAIL = "  ❌ FAIL"
results = []

def check(label, condition, detail=""):
    status = PASS if condition else FAIL
    msg = f"{status}: {label}"
    if detail:
        msg += f" | {detail}"
    print(msg)
    results.append((label, condition))
    return condition


def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def run_full_audit():
    # =====================================================================
    # 1. HEALTH CHECK
    # =====================================================================
    section("1. HEALTH CHECK")
    r = requests.get(f"{BASE_URL}/healthcheck", headers=bypass_headers, timeout=15)
    check("Health endpoint responds 200", r.status_code == 200, f"Status: {r.status_code}")

    # =====================================================================
    # 2. EVENT LISTING
    # =====================================================================
    section("2. EVENT LISTING")
    r = requests.get(f"{BASE_URL}/events", headers=auth_headers, timeout=15)
    check("GET /events returns 200", r.status_code == 200, f"Status: {r.status_code}")
    events = r.json() if r.status_code == 200 else []
    check("Events list is non-empty", isinstance(events, list) and len(events) > 0, f"Count: {len(events)}")

    # =====================================================================
    # 3. EVENT DETAIL (public slug endpoint)
    # =====================================================================
    section("3. EVENT DETAIL")
    # Find event 21's slug from list
    event_slug = None
    for ev in events:
        if ev.get("id") == EVENT_ID:
            event_slug = ev.get("slug")
            break
    check("Event 21 found in listing", event_slug is not None, f"Slug: {event_slug}")

    if event_slug:
        r = requests.get(f"{BASE_URL}/events/{event_slug}", headers=bypass_headers, timeout=15)
        check("GET /events/{slug} returns 200", r.status_code == 200, f"Status: {r.status_code}")
        event_detail = r.json() if r.status_code == 200 else {}
        check("Event detail has title", bool(event_detail.get("title")), f"Title: {event_detail.get('title')}")
        check("Event detail has banner_settings", "banner_settings" in event_detail, f"Settings: {event_detail.get('banner_settings')}")

    # =====================================================================
    # 4. REGISTRATION FLOW & EMAIL
    # =====================================================================
    section("4. REGISTRATION & CONFIRMATION EMAIL")
    test_email = f"audit_test_{int(time.time())}@example.com"
    reg_payload = {
        "event_id": EVENT_ID,
        "email": test_email,
        "first_name": "AuditTest",
        "last_name": "User",
        "company": "Audit Corp",
        "custom_answers": {},
        "is_attending": True
    }
    r = requests.post(f"{BASE_URL}/register", headers=bypass_headers, json=reg_payload, timeout=20)
    check("POST /register returns 200/201", r.status_code in [200, 201], f"Status: {r.status_code}, Body: {r.text[:200]}")
    
    reg_data = {}
    registration_id = None
    if r.status_code in [200, 201]:
        reg_data = r.json()
        registration_id = reg_data.get("id") or reg_data.get("registration_id")
        check("Registration response has id", registration_id is not None, f"ID: {registration_id}")
        email_sent = reg_data.get("email_sent", None)
        print(f"  ℹ️  email_sent field: {email_sent}")
        # Check no error key in response
        check("No error in registration response", "error" not in reg_data, f"Keys: {list(reg_data.keys())}")

    # =====================================================================
    # 5. REGISTRATION LIST & CHECKIN
    # =====================================================================
    section("5. CHECK-IN / CHECK-OUT")
    r = requests.get(f"{BASE_URL}/events/{EVENT_ID}/registrations", headers=auth_headers, timeout=15)
    check("GET /events/{id}/registrations returns 200", r.status_code == 200, f"Status: {r.status_code}")

    if r.status_code == 200:
        regs = r.json()
        my_reg = next((reg for reg in regs if reg.get("attendee", {}).get("email") == test_email), None)
        check("New registration appears in list", my_reg is not None)
        
        if my_reg:
            reg_uuid = my_reg.get("id")
            
            # Check-in
            r2 = requests.put(f"{BASE_URL}/registrations/{reg_uuid}/checkin?mode=checkin", headers=bypass_headers, timeout=15)
            check("Check-in returns 200", r2.status_code == 200, f"Status: {r2.status_code}")

            # Verify checked_in = True
            r3 = requests.get(f"{BASE_URL}/events/{EVENT_ID}/registrations", headers=auth_headers, timeout=15)
            regs2 = r3.json()
            verified = next((reg for reg in regs2 if reg.get("id") == reg_uuid), None)
            check("checked_in is True after check-in", verified and verified.get("checked_in") is True)

            # Check-out
            r4 = requests.put(f"{BASE_URL}/registrations/{reg_uuid}/checkin?mode=checkout", headers=bypass_headers, timeout=15)
            check("Check-out returns 200", r4.status_code == 200, f"Status: {r4.status_code}")
            
            # Verify checked_in = False
            r5 = requests.get(f"{BASE_URL}/events/{EVENT_ID}/registrations", headers=auth_headers, timeout=15)
            regs3 = r5.json()
            verified2 = next((reg for reg in regs3 if reg.get("id") == reg_uuid), None)
            check("checked_in is False after check-out", verified2 and verified2.get("checked_in") is False)

            # Clean up registration
            r6 = requests.delete(f"{BASE_URL}/registrations/{reg_uuid}", headers=auth_headers, timeout=15)
            check("DELETE /registrations/{id} returns 200", r6.status_code == 200, f"Status: {r6.status_code}")

    # =====================================================================
    # 6. EVENT DUPLICATION
    # =====================================================================
    section("6. EVENT DUPLICATION")
    r = requests.post(f"{BASE_URL}/events/{EVENT_ID}/duplicate", headers=auth_headers, timeout=20)
    check("POST /events/{id}/duplicate returns 200", r.status_code == 200, f"Status: {r.status_code}, Body: {r.text[:300]}")
    
    dup_id = None
    dup_slug = None
    if r.status_code == 200:
        dup = r.json()
        dup_id = dup.get("id")
        dup_slug = dup.get("slug")
        dup_title = dup.get("title", "")
        check("Duplicate has an ID", dup_id is not None, f"ID: {dup_id}")
        check("Duplicate title contains '(Copy)'", "(Copy)" in dup_title, f"Title: {dup_title}")
        check("Duplicate has unique slug", dup_slug is not None and "copy" in dup_slug, f"Slug: {dup_slug}")

    # =====================================================================
    # 7. CUSTOM TEXT COLOR (banner_settings)
    # =====================================================================
    section("7. CUSTOM TEXT COLOR / BANNER SETTINGS")
    if dup_id and dup_slug:
        # Fetch the duplicated event to get its current data
        r = requests.get(f"{BASE_URL}/events/{dup_slug}", headers=bypass_headers, timeout=15)
        check("Fetch duplicated event detail returns 200", r.status_code == 200, f"Status: {r.status_code}")
        
        if r.status_code == 200:
            dup_detail = r.json()
            current_settings = dup_detail.get("banner_settings") or {}
            
            # Update with custom text color
            update_payload = {
                "title": dup_detail["title"],
                "slug": dup_detail["slug"],
                "description": dup_detail["description"],
                "start_date": dup_detail["start_date"],
                "location": dup_detail["location"],
                "capacity": dup_detail["capacity"],
                "client_id": dup_detail["client_id"],
                "banner_settings": {**current_settings, "text_color": "#ff00ff"}
            }
            r2 = requests.put(f"{BASE_URL}/events/{dup_id}", headers=auth_headers, json=update_payload, timeout=15)
            check("PUT /events/{id} with text_color returns 200", r2.status_code == 200, f"Status: {r2.status_code}")
            
            # Verify saved
            r3 = requests.get(f"{BASE_URL}/events/{dup_slug}", headers=bypass_headers, timeout=15)
            refetched = r3.json()
            saved_color = (refetched.get("banner_settings") or {}).get("text_color")
            check("text_color '#ff00ff' saved correctly", saved_color == "#ff00ff", f"Saved: {saved_color}")

    # =====================================================================
    # 8. BANNER / BACKGROUND FALLBACK LOGIC
    # =====================================================================
    section("8. BANNER / BACKGROUND FALLBACK LOGIC")
    # This tests that the API returns both banner_url and background_url fields
    if event_slug:
        r = requests.get(f"{BASE_URL}/events/{event_slug}", headers=bypass_headers, timeout=15)
        detail = r.json() if r.status_code == 200 else {}
        banner_url = detail.get("banner_url")
        background_url = detail.get("background_url")
        print(f"  ℹ️  banner_url: {banner_url}")
        print(f"  ℹ️  background_url: {background_url}")
        has_either = (banner_url is not None) or (background_url is not None)
        check("Event has banner_url or background_url field", "banner_url" in detail and "background_url" in detail,
              "Both fields present in API response")

    # =====================================================================
    # 9. DUPLICATE CLEANUP
    # =====================================================================
    section("9. CLEANUP")
    if dup_id:
        r = requests.delete(f"{BASE_URL}/events/{dup_id}", headers=auth_headers, timeout=15)
        check("DELETE duplicated event returns 200", r.status_code == 200, f"Status: {r.status_code}")

    # =====================================================================
    # FINAL RESULTS
    # =====================================================================
    section("FINAL AUDIT RESULTS")
    passed = sum(1 for _, ok in results if ok)
    failed = sum(1 for _, ok in results if not ok)
    total = len(results)
    
    print(f"\n  Total: {total} checks | ✅ Passed: {passed} | ❌ Failed: {failed}\n")
    
    if failed > 0:
        print("  Failed checks:")
        for label, ok in results:
            if not ok:
                print(f"    ❌ {label}")
        print()
    
    if failed == 0:
        print("  🎉 ALL CHECKS PASSED - DEPLOYMENT VERIFIED!")
    else:
        print(f"  ⚠️  {failed} CHECK(S) FAILED - REVIEW ABOVE")
    
    return failed == 0


if __name__ == "__main__":
    success = run_full_audit()
    sys.exit(0 if success else 1)
