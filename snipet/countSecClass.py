# 修正して再実行
from collections import Counter

# テキストの入力
text = """
Check: CKV_AWS_111:
    FailedXXX
    Guide***
Check: CKV_AWS_112:
    FailedXXX
    Guide***
Check: CKV_AWS_111:
    FailedXXX
    Guide***
Check: CKV_AWS_113:
    FailedXXX
    Guide***
Check: CKV_AWS_111:
    FailedXXX
    Guide***
Check: CKV_AWS_111:
    FailedXXX
    Guide***
Check: CKV_AWS_111:
    FailedXXX
    Guide***
"""

# `Check: CKV_AWS_`で始まる行だけ抽出し、キーをグループ化
lines = text.splitlines()
keys = [line.split("Check: ")[1].split(":")[0] for line in lines if "Check: CKV_AWS_" in line]

# 出現数をカウント
key_counts = Counter(keys)

# 結果を整形
result = {key: count for key, count in key_counts.items()}
result

