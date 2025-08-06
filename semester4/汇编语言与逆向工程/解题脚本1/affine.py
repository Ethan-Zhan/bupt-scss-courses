def affine_decrypt(ciphertext, a, b, dictionary):
    decrypted = ""
    for char in ciphertext:

        char_index = dictionary.index(char)
        # 计算字符的模逆
        char_inverse = mod_inverse(a, len(dictionary))
        # 应用仿射解密公式
        decrypted_char_index = (char_inverse * (char_index - b)) % len(dictionary)
        decrypted += dictionary[decrypted_char_index]

    return decrypted


def mod_inverse(a, m):
    # 扩展欧几里得算法求模逆
    g, x, _ = extended_gcd(a, m)
    if g == 1:
        return x % m


def extended_gcd(a, b):
    if a == 0:
        return b, 0, 1
    else:
        gcd, x, y = extended_gcd(b % a, a)
        return gcd, y - (b // a) * x, x


# 自定义字典 ABCDEFGHIJKLMNOPQRSTUVWXY
dictionary = "abcdefghijklmnopqrstuvwxyz"

# 输入密文和仿射加密的参数
ciphertext = "qxbxpluxvwhuzjct"
a = 3
b = 7


plaintext = affine_decrypt(ciphertext, a, b, dictionary)
print("明文:", plaintext)

