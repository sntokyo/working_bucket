# devcontainerとwsl2上のssh
WSLにopenssh-serverとsocatをインストールし、WSL上のSSHエージェントを使ってVS CodeのDev Container上でSSHを利用する方法を説明します。この手順では、WSL2のSSHエージェントソケットをDev Containerに共有し、Gitリポジトリへのアクセスなどに使用します。

1. 必要なパッケージのインストール
まず、WSLに必要なパッケージをインストールします。

sh
コードをコピーする
sudo apt update
sudo apt install -y openssh-server socat
2. SSHエージェントの設定
次に、WSLでSSHエージェントを起動し、必要なSSHキーを追加します。

sh
コードをコピーする
# SSHエージェントの起動
eval $(ssh-agent -s)

# SSHキーの追加
ssh-add ~/.ssh/id_rsa
3. SSHエージェントソケットを共有するディレクトリの作成
WSLとDev Container間でSSHエージェントソケットを共有するためのディレクトリを作成します。

sh
コードをコピーする
mkdir -p /mnt/wsl/shared-docker
ln -sf $SSH_AUTH_SOCK /mnt/wsl/shared-docker/agent.sock
4. socatを使用してソケットを共有
socatを使用して、WSLのSSHエージェントソケットを共有ディレクトリに転送します。

sh
コードをコピーする
socat UNIX-LISTEN:/mnt/wsl/shared-docker/agent.sock,fork UNIX-CONNECT:$SSH_AUTH_SOCK
5. Dev Containerの設定
次に、Dev Container設定ファイル（devcontainer.json）を編集して、WSLのSSHエージェントソケットをDev Containerにマウントします。

json
コードをコピーする
{
  "name": "My Dev Container",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "runArgs": [
    "-v",
    "/mnt/wsl/shared-docker:/mnt/wsl/shared-docker",
    "-e",
    "SSH_AUTH_SOCK=/mnt/wsl/shared-docker/agent.sock"
  ],
  "containerEnv": {
    "SSH_AUTH_SOCK": "/mnt/wsl/shared-docker/agent.sock"
  },
  "mounts": [
    "source=/mnt/wsl/shared-docker,target=/mnt/wsl/shared-docker,type=bind,consistency=cached"
  ],
  "postCreateCommand": "ln -sf /mnt/wsl/shared-docker/agent.sock ~/.ssh/agent.sock"
}
6. Dev Containerの再起動
VS CodeでDev Containerを再起動して、新しい設定を適用します。

7. Dev Container内でSSH接続を確認
Dev Container内でSSH接続が正しく動作することを確認します。

sh
コードをコピーする
ssh -T git@github.com
成功すると、次のようなメッセージが表示されます：

vbnet
コードをコピーする
Hi username! You've successfully authenticated, but GitHub does not provide shell access.
これで、WSL2のSSHエージェントを利用して、VS CodeのDev Container内でSSHを利用できるようになりました。これにより、SSH認証が必要なリポジトリやサービスにアクセスすることができます。
