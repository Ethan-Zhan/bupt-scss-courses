def to_bytes_literal(data_list):
    result = []
    for item in data_list:
        if isinstance(item, int):
            value = item
        elif isinstance(item, str):
            value = int(item, 16)  # 自动支持 "0x", "0X", "FF", "0f" 等
        else:
            raise ValueError(f"不支持的数据类型: {item}")

        if not (0 <= value <= 255):
            raise ValueError(f"字节值超出范围: {value}")

        result.append(value)

    # 生成 b"\x.." 格式字符串
    byte_literal = 'b"' + ''.join(f'\\x{b:02X}' for b in result) + '"'
    return byte_literal


# 示例
data = [207, 211, 253, 35, 4, 196]
print(to_bytes_literal(data))
