def xor_strings(str1, str2):
    # 确保两个字符串有相同长度
    if len(str1) != len(str2):
        raise ValueError("Both strings must have the same length.")

    result = ""

    for i in range(len(str1)):
        char_xored = chr(ord(str1[i]) ^ str2[i])
        result += char_xored

    return result


# 测试字符串
test_str1 = "abcdefg123"
test_str2 = [40, 61, 36, 84, 10, 18, 56, 122, 87, 74]

# 调用函数并打印结果
print(xor_strings(test_str1, test_str2))
