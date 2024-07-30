3. git commitの取り消し 
```shell
git reset --soft HEAD^
```

2. 現在のGit Config fileを確認する
```shell
cat ~/.gitconfig
```
```shell
# system level
cat /etc/gitconfig 
```
```shell
git config --list
```

1. 指定したコミットの変更を取り消す（逆の変更を適用する）
#### 複数のコミットをリバートする方法
個別にリバートする
複数のコミットを個別にリバートするには、コミットハッシュを指定して git revert を複数回実行します。

```shell
git revert <commit1>
git revert <commit2>
git revert <commit3>
```
#### 一括でリバートする

git revert コマンドで範囲を指定してリバートすることもできます。範囲指定には以下の方法があります。

範囲指定（連続するコミット）:
例えば、最新の3つのコミットをリバートするには、次のようにします。
```shell
git revert HEAD~3..HEAD
```
このコマンドは、HEAD~3 から HEAD までのコミットを逆順でリバートします。
リスト形式（非連続のコミット）:
特定のコミットをリスト形式でリバートする場合は、個別に指定する必要があります。
```shell
git revert <commit1> <commit2> <commit3>
```
範囲指定でリバートする場合は、```HEAD~n..HEAD``` という形式を使うことが一般的です
