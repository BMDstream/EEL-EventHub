import json
import re

with open("scratch/registration_confirmed_live.json", "r") as f:
    data = json.load(f)

body_html = data.get("body_html", "")
print("Template Key:", data.get("key"))
print("Template Subject:", data.get("subject"))

print("\n--- Scanning for placeholders in template html ---")
placeholders = re.findall(r'\{([^}]+)\}', body_html)
print("Placeholders found:", list(set(placeholders)))

print("\n--- Scanning for QR images or QR blocks ---")
# Let's search for image tags containing "qr"
qr_images = re.findall(r'<img[^>]*qr[^>]*>', body_html, re.IGNORECASE)
print("QR Image tags in template:", qr_images)

# Let's print the lines around {qr_block_html} or any custom QR code image
print("\n--- Check if template uses {qr_block_html} or custom img tag ---")
if "{qr_block_html}" in body_html:
    print("Template contains the system placeholder {qr_block_html} - this is CORRECT!")
else:
    print("WARNING: Template DOES NOT contain {qr_block_html}!")
    # Let's find any custom image tags
    img_tags = re.findall(r'<img[^>]+>', body_html)
    print("All image tags found in template:")
    for tag in img_tags:
        print("  -", tag)
