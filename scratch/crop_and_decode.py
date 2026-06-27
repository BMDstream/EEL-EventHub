import cv2

def crop_and_decode(img_path):
    img = cv2.imread(img_path)
    h, w, c = img.shape
    print(f"Image shape: {h}x{w}")
    
    # The QR code is at the bottom center of the email body screenshot.
    # Let's crop different regions, or let's resize/enhance contrast.
    # Let's convert to grayscale and apply thresholding.
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Try directly first
    detector = cv2.QRCodeDetector()
    data, bbox, straight_qrcode = detector.detectAndDecode(gray)
    if data:
        print(f"Decoded gray directly: {data}")
        return
        
    # Crop the bottom part where the QR code resides.
    # For a typical mobile view or screenshot, the QR code is in the bottom half.
    # Let's crop bottom 40% of the image.
    crop = gray[int(h*0.65):int(h*0.95), int(w*0.2):int(w*0.8)]
    cv2.imwrite("scratch/crop.png", crop)
    
    data, bbox, straight_qrcode = detector.detectAndDecode(crop)
    if data:
        print(f"Decoded crop: {data}")
    else:
        # Try resizing the crop
        resized = cv2.resize(crop, (0,0), fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        data, bbox, straight_qrcode = detector.detectAndDecode(resized)
        if data:
            print(f"Decoded resized crop: {data}")
        else:
            print("Failed to decode QR code in all attempts")

crop_and_decode("/Users/bartondelaney/.gemini/antigravity/brain/d7dde3a0-df6b-4d98-b820-176fb5fc9c51/media__1781255270068.png")
crop_and_decode("/Users/bartondelaney/.gemini/antigravity/brain/d7dde3a0-df6b-4d98-b820-176fb5fc9c51/media__1781255377207.png")
