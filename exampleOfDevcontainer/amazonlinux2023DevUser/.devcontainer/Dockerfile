FROM amazonlinux:2023

# 必要なパッケージをインストール
RUN dnf update -y && \
    dnf install -y sudo git vim python3 python3-pip nodejs && \
    dnf clean all

# 開発ユーザーを作成
ARG USERNAME=devuser
ARG USER_UID=1000
ARG USER_GID=1000
RUN groupadd --gid $USER_GID $USERNAME && \
    useradd --uid $USER_UID --gid $USER_GID -m $USERNAME && \
    echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME && \
    chmod 0440 /etc/sudoers.d/$USERNAME

# 作業ディレクトリを設定
WORKDIR /workspace

# デフォルトユーザーに切り替え
USER $USERNAME
