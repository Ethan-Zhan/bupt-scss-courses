import re

# 原始汇编数据段
assembly_data = """
.data:00427A30 3D                            asc_427A30 db '='                       ; DATA XREF: _main_0+116↑o
.data:00427A31 93                            db  93h
.data:00427A32 66                            db  66h ; f
.data:00427A33 29                            db  29h ; )
.data:00427A34 E7                            db 0E7h
.data:00427A35 31                            db  31h ; 1
.data:00427A36 F1                            db 0F1h
.data:00427A37 0E                            db  0Eh
.data:00427A38 B2                            db 0B2h
.data:00427A39 06                            db    6
.data:00427A3A 71                            db  71h ; q
.data:00427A3B 91                            db  91h
.data:00427A3C 89                            db  89h
.data:00427A3D 93                            db  93h
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
