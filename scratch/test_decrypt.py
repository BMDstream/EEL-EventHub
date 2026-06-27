from cryptography.fernet import Fernet
import json

key = "CqX3rZ8vK9wP5mN2jT6bY7hL1xR4fG9zS0aV2eM8uI5="
fernet = Fernet(key.encode())

token = "gAAAAABqM8LNlV1_aPFXx6BQrvDkpInYsl-5xv_pAvJpbPXE8II0pEzqeYvS_psOFIvzEqqfjGkG9b64Z_ElHF-Z0i4HyugFXKNuKTvGkeibuK7LK648PMhTEtC5PS1Q269HCdQTq7lX3CZyHMamUSe3TUv4n_PXS6ZG1luS8nnixkR-czMrZeYE9HP7U0xPhz84VEAqliBCyA6I4cqBbqPUFTfU4nbexyU9p_220Vu9fgndzhT6Le7cXe5MzoQBXht7qZFBC3jyWDzuG1NEvwKhermmHw-TCw=="

try:
    decrypted = fernet.decrypt(token.encode()).decode()
    print("Decrypted successfully!")
    print(json.loads(decrypted))
except Exception as e:
    print("Decryption failed:", e)
