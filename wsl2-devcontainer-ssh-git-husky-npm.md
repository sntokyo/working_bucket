# devcontainerとwsl2上のssh
WSLにopenssh-serverとsocatをインストールし、WSL上のSSHエージェントを使ってVS CodeのDev Container上でSSHを利用する方法を説明します。この手順では、WSL2のSSHエージェントソケットをDev Containerに共有し、Gitリポジトリへのアクセスなどに使用します。

1. 必要なパッケージのインストール(wsl2)
まず、WSLに必要なパッケージをインストールします。

```sh
sudo apt update
sudo apt install -y openssh-server socat
```
2. SSHエージェントの設定(wsl2)
次に、WSLでSSHエージェントを起動し、必要なSSHキーを追加します。

```sh
# SSHエージェントの起動
eval $(ssh-agent -s)
```
3. SSHキーの追加(wsl2)
```
ssh-add ~/.ssh/id_rsa
```

4. devcontainer起動

5. devcontainerで cd pipeline に移動後、
```shell
npm install
```
※package.jsonにhusky等の記載があるのでまとめてインストールできる。

6. devcontainer内で、
```shell
git config user.name 
git config user.email 
```
7. git commit 時huskyも動作する
