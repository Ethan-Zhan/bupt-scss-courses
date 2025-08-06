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

# 正则提取所有十六进制数字
hex_pattern = r'db\s+([0-9A-Fa-f]+)h'
hex_values = re.findall(hex_pattern, assembly_data)

# 转换为整数列表
byte_list = [int(h, 16) for h in hex_values]

# 构造字节串（b'...形式）
byte_string = 'b"' + ''.join([f'\\x{b:02X}' for b in byte_list]) + '"'

# 输出
print("提取的字节字面量:", byte_string)
