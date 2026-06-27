import os
from datetime import datetime

base_dir = "/Users/bartondelaney/.gemini/antigravity"
print(f"Searching in {base_dir}:")

for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f.endswith((".png", ".jpg", ".jpeg")):
            path = os.path.join(root, f)
            mtime = os.path.getmtime(path)
            dt = datetime.fromtimestamp(mtime)
            print(f"Path: {path} | Modified: {dt}")
