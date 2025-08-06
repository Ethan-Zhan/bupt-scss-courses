a = '493f877692ea8d507fa98355a054efede85e7c7bbc9ba9890ea99b7b33e281fc'
a_list = list(a)  # 转换为可变列表

for i in range(len(a_list)):
    if a_list[i] == '0':
        a_list[i] = ':'
    elif a_list[i] == 'a':
        a_list[i] = 'g'
    a_list[i]=chr(ord(a_list[i])-1)
    a = ''.join(a_list)  # 转换回字符串
print(a)
