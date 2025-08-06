import hashlib
import itertools

md5_hash = "90386a7a163b2d726f215f7afbf8586c"       #散列值
plaintext_length = 4                               #明文长度
charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"      #字典 ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 abcdefghijklmnopqrstuvwxyz

# 生成所有可能的明文组合
combinations = itertools.product(charset, repeat=plaintext_length)

# 尝试每个明文组合并进行MD5散列计算
for combination in combinations:
    plaintext = "".join(combination)
    md5 = hashlib.md5(plaintext.encode()).hexdigest()

    # 检查计算的MD5散列值是否与给定的散列值匹配
    if md5 == md5_hash:
        print("解密成功！明文为:", plaintext)
        break
else:
    print("未找到匹配的明文。")
