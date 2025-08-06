def increment_ascii(s):
    result = ""
    for char in s:
        new_char = chr(ord(char) - 1)
        result += new_char
    return result

# 测试字符串
input_string = "GMBH|Xfmd1nf`u1`uif`xpsme`pg`Sfwfstf~"

# 调用函数并打印结果
print(increment_ascii(input_string))
