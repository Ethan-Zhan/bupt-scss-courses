# -*- coding: utf-8 -*-
from Crypto.Cipher import ARC4

def encrypt(message, key):    # 加密
    des = ARC4.new(key)
    cipher_text = des.encrypt(message)
    
    return cipher_text

def decrypt(cipher_text, key): # 解密
    des3 = ARC4.new(key)
    message = des3.decrypt(cipher_text)
    
    return message

if __name__ == "__main__":
    key = '{This_is_a_key_!}'.encode("utf8")
    
    # message = 'Is_Th13_Simple_Rc4?'.encode("utf8")    
    # cipher_text = encrypt(message, key)
    # print('密文:', cipher_text.hex().upper())
    cipher_text = b"\x3D\x93\x66\x29\xE7\x31\xF1\x0E\xB2\x06\x71\x91\x89\x93"
    message = decrypt(cipher_text, key)
    print('得到的\'FLAG\':', message.decode("utf-8"))
    