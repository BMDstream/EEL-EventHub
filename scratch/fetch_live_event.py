import requests

slugs = ["dfa-padel-day", "padel-championship", "padel-championship-2026", "padel-champions-hip"]
base_url = "https://eventhub.bmdcomputing.com/api/py/events"

for slug in slugs:
    url = f"{base_url}/{slug}/public-stats"
    print(f"Checking {url}...")
    try:
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            print(f"SUCCESS for {slug}:")
            print("Title:", repr(data.get("title")))
            print("Client:", data.get("client", {}).get("name"))
        else:
            print(f"Failed ({res.status_code}): {res.text[:100]}")
    except Exception as e:
        print("Error:", e)
