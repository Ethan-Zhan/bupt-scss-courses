# -*- coding: utf-8 -*-
# DES 加解密示例程序

from Crypto.Cipher import DES

key = b'SONGFENR'
IDA_ciphertext = b"\x8F\x90\xE0\x4E\x67\x1E\x7F\x92"

des = DES.new(key, DES.MODE_ECB)

print('Decrypted: ', des.decrypt(IDA_ciphertext))
