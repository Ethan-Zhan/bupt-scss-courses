import re

def rc4_decrypt(ciphertext, key):
    S = list(range(256))
    j = 0
    decrypted = bytearray()

    # 初始化S盒
    for i in range(256):
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]

    # 解密数据
    i = j = 0
    for byte in ciphertext:
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        k = S[(S[i] + S[j]) % 256]
        decrypted.append(byte ^ k)

    return decrypted

ciphertext_str = "6eh, 65h, 11h, cfh, 1dh, 80h, 3Bh, 4eh, 20h, 2ah, e0h, b6h"

ciphertext_bytes = bytearray(int(match.group(1), 16) for match in re.finditer(r"([0-9A-Fa-f]+)h", ciphertext_str))

key_str = "FCh, FBh, 3bh, 0dh, 73h, 6eh"

key_bytes = bytearray(int(match.group(1), 16) for match in re.finditer(r"([0-9A-Fa-f]+)h", key_str))

plaintext = rc4_decrypt(ciphertext_bytes, key_bytes)
print("解密后的明文:", plaintext.decode('latin-1'))
