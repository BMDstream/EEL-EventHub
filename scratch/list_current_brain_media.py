import os
from datetime import datetime

base_dir = "/Users/bartondelaney/.gemini/antigravity/brain/d7dde3a0-df6b-4d98-b820-176fb5fc9c51"
print(f"Listing media files in {base_dir}:")

for f in os.listdir(base_dir):
    if f.endswith((".png", ".jpg", ".jpeg")):
        path = os.path.join(base_dir, f)
        mtime = os.path.getmtime(path)
        dt = datetime.fromtimestamp(mtime)
        print(f"File: {f} | Modified: {dt}")
