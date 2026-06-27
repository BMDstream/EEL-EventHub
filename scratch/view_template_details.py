import json

with open("scratch/registration_confirmed_live.json", "r") as f:
    data = json.load(f)

body_html = data.get("body_html", "")
print("Length of body_html:", len(body_html))

# Print lines containing qr or {qr_block_html} or images
for line in body_html.split("\n"):
    if any(k in line for k in ["qr", "QR", "clearance", "pin", "PIN", "img", "IMG"]):
        print(line.strip())
