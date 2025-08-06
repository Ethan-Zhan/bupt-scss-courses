from cryptography.hazmat.primitives.ciphers import Cipher, modes
from cryptography.hazmat.backends import default_backend
import re
from cryptography.hazmat.decrepit.ciphers import algorithms



def hex_to_int(hex_str):
    hex_str = hex_str.replace("h", "").strip()
    return int(hex_str, 16)

def des_decrypt(ciphertext, key):
    backend = default_backend()
    cipher = Cipher(algorithms.TripleDES(key), modes.ECB(), backend=backend)
    decryptor = cipher.decryptor()
    plaintext = decryptor.update(ciphertext) + decryptor.finalize()
    return plaintext

ciphertext_str = "cdh,49h,33h,09h,f3h,23h,21h,8ah"

key_str = "efh,34h, D4h, a3h, c6h, 84h, e4h,23h"
ciphertext_bytes = bytearray(hex_to_int(x) for x in re.findall(r'[0-9a-fA-F]+', ciphertext_str))
key_bytes = bytearray(hex_to_int(x) for x in re.findall(r'[0-9a-fA-F]+', key_str))

plaintext = des_decrypt(ciphertext_bytes, key_bytes)
plaintext_str = plaintext.decode()

print("解密后的明文:", plaintext_str)
