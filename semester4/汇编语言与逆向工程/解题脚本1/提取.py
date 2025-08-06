import re

# 原始汇编数据段
assembly_data = """
.data:00429A30 52                            byte_429A30 db 52h                      ; DATA XREF: _main_0+FD↑r
.data:00429A31 7C                            db  7Ch ; |
.data:00429A32 6E                            db  6Eh ; n
.data:00429A33 4C                            db  4Ch ; L
.data:00429A34 5D                            db  5Dh ; ]
.data:00429A35 56                            db  56h ; V
.data:00429A36 7F                            db  7Fh ; 
.data:00429A37 63                            db  63h ; c
.data:00429A38 4C                            db  4Ch ; L
.data:00429A39 54                            db  54h ; T
.data:00429A3A 46                            db  46h ; F
.data:00429A3B 56                            db  56h ; V
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