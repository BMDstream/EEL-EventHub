import sys

try:
    from PIL import Image
    print("PIL is installed")
except ImportError:
    print("PIL is NOT installed")

try:
    import pyzbar.pyzbar as pyzbar
    print("pyzbar is installed")
except ImportError:
    print("pyzbar is NOT installed")

try:
    import cv2
    print("cv2 (opencv) is installed")
except ImportError:
    print("cv2 is NOT installed")

# If pyzbar is installed, let's decode!
if 'pyzbar' in sys.modules:
    def decode_qr(img_path):
        try:
            img = Image.open(img_path)
            decoded = pyzbar.decode(img)
            if decoded:
                for obj in decoded:
                    print(f"File: {img_path} | Decoded: {obj.data.decode('utf-8')}")
            else:
                print(f"File: {img_path} | No QR found")
        except Exception as e:
            print(f"Error decoding {img_path}: {e}")

    decode_qr("/Users/bartondelaney/.gemini/antigravity/brain/d7dde3a0-df6b-4d98-b820-176fb5fc9c51/media__1781255270068.png")
    decode_qr("/Users/bartondelaney/.gemini/antigravity/brain/d7dde3a0-df6b-4d98-b820-176fb5fc9c51/media__1781255377207.png")
