# -*- coding: utf-8 -*-

token = b"\x52\x68\x53\x72\x70\x70\x59\x7A\x77\x2C"            #'abcdefg123'
ciphertext = b"\x11\x12\x13\x14\x15\01\x02\x03\x04\x05"

#result = ''.join(chr(ord(token[i]) ^ ciphertext[i]) for i in range(10))
result = ''.join( chr(token[i] ^ ciphertext[i]) for i in range(10))

print("result is: %s\n" %(result))
