# Emacs コマンド
## 1. ファイル処理
 
| 項目           | キー操作                               | コマンド (M-x ...)                    |
| -------------- | ---------------------------------------------- | ---------------------------------------------- |
| **ファイルを新しいバッファへ読み込む**       | C-x C-f | find-file          |
| **カーソルの位置にファイルを挿入**   | C-x i | insert-file |
| **バッファの内容をファイルに保存**   | C-x C-s                 | save-buffer                    |
| **バッファの内容を指定したファイルに保存**| C-x C-w      | write-file                  |
| **Emacsを終了**   | C-x C-c       | save-buffer-kill-emacs    |

## 2.Dired
sudo権限でファイルを編集するとき
```
/sudo::/path/to/directory
```
リモートでsshでログインして編集するとき
```
/ssh:user@hostname:/path/to/file
/ssh:paoo@192.168.128.109:/
/ssh:paoo@192.168.128.109:/home/paoo/
/ssh:paoo@192.168.128.200:/home/paoo/
```
リモートでsshでログインして、sudo権限で編集するとき
```
/ssh:user@hostname|sudo:root@hostname:/path/to/file
/ssh:paoo@192.168.128.109|sudo:root@192.168.128.109:/etc
/ssh:paoo@192.168.128.120|sudo:root@192.168.128.120:/etc
```
