import re

# 原始汇编数据段
assembly_data = """

"""

# 使用正则表达式提取所有十六进制数
hex_pattern = r'db\s+([0-9A-Fa-f]+)h'
hex_values = re.findall(hex_pattern, assembly_data)

# 转换为整数列表
byte_list = [int(h, 16) for h in hex_values]

# 自定义格式化函数，生成无引号的十六进制列表字符串
def format_hex_list(lst):
    hex_strings = [f"0x{byte:02X}" for byte in lst]
    return "[%s]" % ", ".join(hex_strings)

# 打印结果
print("提取的字节列表（十进制）:", byte_list)
print("提取的字节列表（十六进制）:", format_hex_list(byte_list))