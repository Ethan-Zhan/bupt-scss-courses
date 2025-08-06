INV_3_MOD_26 = 9        # 3^{-1} (mod 26)
ADDEND        = 7       # 加密时加上的 7

def affine_decrypt(text: str) -> str:
    """按 sub_4012E0() 的规则解密字符串"""
    out = []
    for ch in text:
        if 'A' <= ch <= 'Z':               # 大写
            y = ord(ch) - ord('A')
            x = (INV_3_MOD_26 * (y - ADDEND)) % 26
            out.append(chr(x + ord('A')))
        elif 'a' <= ch <= 'z':             # 小写
            y = ord(ch) - ord('a')
            x = (INV_3_MOD_26 * (y - ADDEND)) % 26
            out.append(chr(x + ord('a')))
        else:                              # 其它字符保持不变
            out.append(ch)
    return ''.join(out)

if __name__ == "__main__":
    cipher = input("输入密文: ").strip()
    plain  = affine_decrypt(cipher)
    print("解密结果:", plain)
