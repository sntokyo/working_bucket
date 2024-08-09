# ベースイメージをDebian 最新版に設定します
FROM debian:latest

# 必要なツールをインストールし、Dockerの公式GPGキーを追加
RUN apt-get update && \
    apt-get install -y \
    ca-certificates \
    curl && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin \
    unzip \
    emacs \
    vim \
    sudo \
    python3 \
    python3-venv \
    python3-pip \
    npm && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install AWS CLI v2(x86の場合の docker in docker はこちら)
# ref.https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/getting-started-install.html
# RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
#     && unzip awscliv2.zip \
#     && sudo ./aws/install \
#     && rm -rf awscliv2.zip aws

# AWS CLI v2のインストール(Apple Silicon上の docker in docker はこちら）
# rosetta errorを回避できる。
# ref.https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/getting-started-install.html
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && sudo ./aws/install \
    && rm -rf awscliv2.zip aws

# Download and install AWS SAM CLI(x86上の docker in docker はこちら)
# ref.https://docs.aws.amazon.com/ja_jp/serverless-application-model/latest/developerguide/install-sam-cli.html
# RUN curl -Lo aws-sam-cli-linux-x86_64.zip https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip \
#     && unzip aws-sam-cli-linux-x86_64.zip -d sam-installation \
#     && sudo ./sam-installation/install \
#     && rm -rf aws-sam-cli-linux-x86_64.zip sam-installation

# Apple Silicon上の docker in docker はこちら
# ref.https://docs.aws.amazon.com/ja_jp/serverless-application-model/latest/developerguide/install-sam-cli.html
RUN curl -Lo aws-sam-cli-linux-arm64.zip https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-arm64.zip \
    && unzip aws-sam-cli-linux-arm64.zip -d sam-installation \
    && sudo ./sam-installation/install \
    && rm -rf aws-sam-cli-linux-x86_64.zip sam-installation

# aws-cdkをインストールします。
# TypeScript、ts-nodeもインストールします。ts-nodeはTypeScriptを実行するためのツールです。
# x86上及びAppleSilicon上で動作確認済
RUN npm install -g  aws-cdk  typescript ts-node eslint prettier


RUN npm install -g @types/node


ENTRYPOINT ["/bin/sh", "-c", "dockerd & exec \"$@\""]
CMD ["sh"]
