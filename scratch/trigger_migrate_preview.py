import requests

target_url = "https://eel-event-hub-q61e-29q04zzuq-bmds-projects-e3482668.vercel.app/api/py/settings/migrate"
headers = {
    "x-user-email": "barton@bmdcomputing.com"
}

print(f"Triggering migration on new Vercel deployment: {target_url}")
try:
    res = requests.post(target_url, headers=headers, timeout=30)
    print("Status Code:", res.status_code)
    try:
        print("Response JSON:", res.json())
    except:
        print("Response Text:", res.text[:200])
except Exception as e:
    print("Failed to trigger migration:", e)
