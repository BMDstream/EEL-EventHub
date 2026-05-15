import requests
import concurrent.futures
import time
import random
import string
import sys

# Configuration
BASE_URL = "http://localhost:3000/api/py"
NUM_REQUESTS = 3000
CONCURRENCY = 50

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def get_event_id():
    try:
        r = requests.get(f"{BASE_URL}/events", timeout=5)
        events = r.json()
        if events:
            return events[0]['id']
        return None
    except Exception as e:
        print(f"Error fetching events: {e}")
        return None

def send_registration(i, event_id):
    email = f"stress_test_{i}_{random_string(4)}@example.com"
    payload = {
        "event_id": event_id,
        "email": email,
        "first_name": f"Stress{i}",
        "last_name": "Tester",
        "company": "Stress Test Inc",
        "custom_answers": {},
        "is_attending": True
    }
    try:
        start = time.time()
        response = requests.post(f"{BASE_URL}/register", json=payload, timeout=20)
        end = time.time()
        return response.status_code, end - start
    except Exception as e:
        return 500, str(e)

def main():
    event_id = get_event_id()
    if not event_id:
        print("No events found to test against. Create an event first.")
        sys.exit(1)
        
    print(f"Starting stress test: {NUM_REQUESTS} registrations for event ID {event_id} with concurrency {CONCURRENCY}")
    start_time = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        # Use a list comprehension to pass event_id to each call
        futures = [executor.submit(send_registration, i, event_id) for i in range(NUM_REQUESTS)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    
    end_time = time.time()
    total_time = end_time - start_time
    
    success_count = sum(1 for status, _ in results if status == 200 or status == 201)
    failed_count = NUM_REQUESTS - success_count
    latencies = [latency for status, latency in results if isinstance(latency, (int, float))]
    
    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    max_latency = max(latencies) if latencies else 0
    min_latency = min(latencies) if latencies else 0
    
    print("\n--- Results ---")
    print(f"Total Requests: {NUM_REQUESTS}")
    print(f"Success: {success_count}")
    print(f"Failed: {failed_count}")
    print(f"Total Time: {total_time:.2f}s")
    print(f"Avg Latency: {avg_latency:.4f}s")
    print(f"Min Latency: {min_latency:.4f}s")
    print(f"Max Latency: {max_latency:.4f}s")
    print(f"Throughput: {NUM_REQUESTS / total_time:.2f} req/s")

if __name__ == "__main__":
    main()
