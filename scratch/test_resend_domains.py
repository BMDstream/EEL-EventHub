import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")
print("API Key loaded:", bool(resend.api_key))

try:
    domains_response = resend.Domains.list()
    print("Domains Response Type:", type(domains_response))
    print("Domains Response:", domains_response)
    
    # Let's inspect the returned structure
    if hasattr(domains_response, "data"):
        print("data field exists!")
        for domain in domains_response.data:
            print(f"Domain: {domain.name} (ID: {domain.id})")
    elif isinstance(domains_response, dict) and "data" in domains_response:
        print("dict with data key exists!")
        for domain in domains_response["data"]:
            print(domain)
    else:
        # Maybe it's a list or has another representation
        print("No .data attribute found, displaying attributes/keys:", dir(domains_response))
except Exception as e:
    print("Error calling resend.Domains.list():", e)
