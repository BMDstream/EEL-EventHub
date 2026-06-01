import os
import json
from cryptography.fernet import Fernet

# Load or generate encryption key
# For production, ENCRYPTION_KEY must be set in the environment.
# For local development, we fallback to a pre-defined key or generate one.
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Use a static fallback for local dev to avoid changing keys on every restart
    ENCRYPTION_KEY = "CqX3rZ8vK9wP5mN2jT6bY7hL1xR4fG9zS0aV2eM8uI5="

try:
    fernet = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
except Exception as e:
    print(f"Warning: Invalid ENCRYPTION_KEY format, generating a temporary key. Error: {e}")
    # Fallback to a random key if the provided key is invalid
    temp_key = Fernet.generate_key()
    fernet = Fernet(temp_key)

def encrypt_data(data: str) -> str:
    """Encrypt a string payload using Fernet symmetric encryption."""
    if not data:
        return ""
    return fernet.encrypt(data.encode()).decode()

def decrypt_data(token: str) -> str:
    """Decrypt a Fernet token back to a string."""
    if not token:
        return ""
    try:
        return fernet.decrypt(token.encode()).decode()
    except Exception as e:
        print(f"Decryption error: {e}")
        # In case decryption fails (e.g. key changed), return a placeholder or raw token
        return "[ENCRYPTED - DECRYPTION FAILED]"

def encrypt_dict(data: dict) -> dict:
    """
    Encrypts a dictionary by serializing it to JSON and returning
    a wrapper dict containing the encrypted ciphertext.
    """
    if not data:
        return {}
    serialized = json.dumps(data)
    ciphertext = encrypt_data(serialized)
    return {"_encrypted": ciphertext}

def decrypt_dict(data: dict) -> dict:
    """
    Decrypts a dictionary if it contains the encrypted wrapper format.
    Otherwise, returns the dictionary as-is.
    """
    if not data:
        return {}
    if isinstance(data, dict) and "_encrypted" in data:
        ciphertext = data["_encrypted"]
        decrypted_str = decrypt_data(ciphertext)
        if decrypted_str == "[ENCRYPTED - DECRYPTION FAILED]":
            return {"error": "Decryption failed"}
        try:
            return json.loads(decrypted_str)
        except Exception as e:
            print(f"JSON deserialization error after decryption: {e}")
            return {}
    return data
