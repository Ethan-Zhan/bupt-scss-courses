def xor_strings(str1, str2):
    # 确保两个字符串有相同长度
    if len(str1) != len(str2):
        raise ValueError("Both strings must have the same length.")

    result = ""

    for i in range(len(str1)):
        char_xored = chr(str1[i] ^ str2[i])
        result += char_xored

    return result


# 测试字符串
test_str1 = [82, 103, 117, 97, 107, 114, 127, 92, 97, 98, 112, 114]
test_str2 = [0x1, 0x2, 0x3, 0x4, 0x5, 0x6,0x6,0x5,0x4,0x3,0x2,0x1]
# 调用函数并打印结果
print(xor_strings(test_str1, test_str2))
