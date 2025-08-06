a = '0123456789'
b = 'ippio'
c = ''
result = ''

for i in range(len(a)):
    tmp = (3 * i + 7) % 10 + 105
    result += chr(tmp)

for i in range(len(b)):
    for j in range((len(a))):
        if b[i] == result[j]:
            c += a[j]
print(c)
