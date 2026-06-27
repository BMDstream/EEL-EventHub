import cv2

def crop_right_half(img_path):
    img = cv2.imread(img_path)
    h, w, c = img.shape
    print(f"Image shape: {h}x{w}")
    
    # Let's crop the right pane (from w*0.5 to w)
    right_pane = img[:, int(w*0.55):]
    cv2.imwrite("scratch/right_pane.png", right_pane)
    
    # Now let's try to detect QR code on the right pane
    detector = cv2.QRCodeDetector()
    data, bbox, straight_qrcode = detector.detectAndDecode(right_pane)
    if data:
        print(f"Decoded right pane: {data}")
    else:
        # Let's crop the bottom 40% of the right pane
        rh, rw, rc = right_pane.shape
        bottom_right = right_pane[int(rh*0.6):, :]
        cv2.imwrite("scratch/bottom_right.png", bottom_right)
        data, bbox, straight_qrcode = detector.detectAndDecode(bottom_right)
        if data:
            print(f"Decoded bottom right: {data}")
        else:
            # Let's try cv2's WeChatQRCode detector if available, or resize
            resized = cv2.resize(bottom_right, (0,0), fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
            data, bbox, straight_qrcode = detector.detectAndDecode(resized)
            if data:
                print(f"Decoded resized bottom right: {data}")
            else:
                print("Failed to decode bottom right QR code")

crop_right_half("/Users/bartondelaney/.gemini/antigravity/brain/d7dde3a0-df6b-4d98-b820-176fb5fc9c51/media__1781255270068.png")
