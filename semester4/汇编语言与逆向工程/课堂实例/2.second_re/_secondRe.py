def decrypt_shift_cipher(text):
    decrypted = ''
    for ch in text:
        if ord(ch) - 5 >= ord('a'):
            decrypted += chr(ord(ch) - 5)
        else:
            decrypted += chr(ord(ch) + 21)  # 等效于 (ord(ch) - 5 + 26)
    return decrypted

# 示例测试
cipher_text = 'mftiztqnzczfff'
plain_text = decrypt_shift_cipher(cipher_text)
print(plain_text)
