import cv2

def decode_qr_cv2(img_path):
    try:
        img = cv2.imread(img_path)
        detector = cv2.QRCodeDetector()
        data, bbox, straight_qrcode = detector.detectAndDecode(img)
        if data:
            print(f"File: {img_path} | Decoded data: {data}")
        else:
            print(f"File: {img_path} | Could not detect QR code")
    except Exception as e:
        print(f"Error reading {img_path}: {e}")

decode_qr_cv2("/Users/bartondelaney/.gemini/antigravity/brain/d7dde3a0-df6b-4d98-b820-176fb5fc9c51/media__1781255270068.png")
decode_qr_cv2("/Users/bartondelaney/.gemini/antigravity/brain/d7dde3a0-df6b-4d98-b820-176fb5fc9c51/media__1781255377207.png")
