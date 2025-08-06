# -*- coding: utf-8 -*-
from hashlib import md5
from string import digits, ascii_letters, ascii_lowercase, ascii_uppercase, punctuation, whitespace, printable
from itertools import permutations, product
import sys

def decipher_md5(md5_value: str, plaintext_len: int = 4, \
                 plaintext_letter_dict: str = ascii_letters+punctuation, dup: bool =False):

    md5_value = md5_value.lower()
    if len(md5_value) != 32:
        print('\n不是有效的md5散列!')
        sys.exit(-1)
    
    try:
        if dup: # 全排列，可重复
            plaintext_set = [''.join(p) for p in product(punctuation, repeat=plaintext_len)]
        else:   # 全排列，不可重复
            plaintext_set = permutations(plaintext_letter_dict, plaintext_len)
        
        for item in plaintext_set: 
            item=''.join(item)
            # print(item)

            if md5(item.encode()).hexdigest() == md5_value:
                print('\n成功解出明文: ' + md5_value + ' ==> ' + item)
                break
        
        if md5(item.encode()).hexdigest() != md5_value: 
            sys.exit(1)
        
    except SystemExit:
        print('\n解析失败，请检查下给定的明文长度（默认 plaintext_len: int = 4）!!!')   

def test():
    decipher_md5(md5_value = 'b5c0b187fe309af0f4d35982fd961d7e', plaintext_letter_dict = punctuation, dup=True)

if __name__ == '__main__':
    # test()
    decipher_md5(md5_value = 'a35406b8720479039b686e4fa344875a', plaintext_letter_dict = ascii_letters)
    