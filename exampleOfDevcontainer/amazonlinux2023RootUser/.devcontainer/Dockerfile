FROM amazonlinux:2023

# 必要なパッケージをインストール
RUN dnf update -y && \
    dnf install -y sudo git vim python3 python3-pip nodejs && \
    dnf clean all

