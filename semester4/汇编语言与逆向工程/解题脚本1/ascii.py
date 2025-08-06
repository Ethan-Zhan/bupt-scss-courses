hex_values = "0x10, 0x2C, 0x02, 0xFC, 0xFB, 0x3B, 0x0D, 0x73, 0x6E, 0xBC, 0xB9, 0xA7, 0x6F, 0x2F "

hex_values_list = hex_values.split(", ")

ascii_values = [int(hex_value[:-1], 16) for hex_value in hex_values_list]

ascii_chars = [chr(ascii_value) for ascii_value in ascii_values]

ascii_representation = ''.join(ascii_chars)

print("ASCII representation:", ascii_representation)



byte_sequence = b"\x10\x2C\x02\xFC\xFB\x3B\x0D\x73\x6E\xBC\xB9\xA7\x6F\x2F"
string_representation = byte_sequence.decode('ascii', errors='ignore')

print("字符串表示:", string_representation)
