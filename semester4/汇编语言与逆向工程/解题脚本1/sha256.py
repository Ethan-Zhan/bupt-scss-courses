import hashlib

hash_value = "1ad07476ea3cd48dab86c94a1249ea9262956f21a390f1136824ba7fcd94020e"
plaintext_length = 4
charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"  #字典 ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 abcdefghijklmnopqrstuvwxyz

def generate_combinations(length, charset):
    if length == 0:
        yield ''
    else:
        for char in charset:
            for combination in generate_combinations(length - 1, charset):
                yield char + combination

for combination in generate_combinations(plaintext_length, charset):
    hashed_combination = hashlib.sha256(combination.encode()).hexdigest()
    if hashed_combination == hash_value:
        print("Plaintext found:", combination)
        break
