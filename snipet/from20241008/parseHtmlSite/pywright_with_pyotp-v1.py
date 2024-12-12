# このスクリプトは、ブラウザ操作が必要な認証フローにPywrightを使用し、動的コンテンツの操作を完全に再現する方法です。

from playwright.sync_api import sync_playwright
import pyotp

# 設定
BASE_URL = "https://example.com"
LOGIN_URL = f"{BASE_URL}/adm-portal/login"
TOTP_SECRET = "YOUR_SECRET"  # サービス提供元から与えられたTOTPシークレット

def generate_totp_code(secret):
    """TOTPコードを生成"""
    totp = pyotp.TOTP(secret)
    return totp.now()

def main():
    with sync_playwright() as p:
        # ブラウザを起動
        # browser = p.chromium.launch(headless=False)  # headless=Trueでヘッドレスモード
        browser = p.chromium.launch(headless=True)  # headless=Trueでヘッドレスモード
        context = browser.new_context()
        page = context.new_page()

        # 1. トップページでログイン
        print("[1] トップページにアクセス...")
        page.goto(LOGIN_URL)
        
        print("[2] IDとパスワードを入力...")
        page.fill("input#userId", "your_username")  # ユーザー名を入力
        page.fill("input#password", "your_password")  # パスワードを入力
        page.click("button:has-text('ログイン')")  # ログインボタンをクリック
        
        # 2. TOTP認証コードを送信
        print("[3] TOTP認証ページに移動...")
        page.wait_for_url(f"{BASE_URL}/adm-portal/totp")  # TOTPページを待つ
        
        totp_code = generate_totp_code(TOTP_SECRET)
        print(f"TOTPコード: {totp_code}")
        page.fill("input#authCode", totp_code)  # 認証コードを入力
        page.click("button:has-text('OK')")  # OKボタンをクリック
        
        # 3. ログイン後のページを確認
        print("[4] ログイン後のページにアクセス...")
        page.wait_for_url(f"{BASE_URL}/adm-portal/home")  # ログイン後のページURLを待つ
        
        # 4. データ検索ページにアクセス
        print("[5] データ検索ページにアクセス...")
        page.goto(f"{BASE_URL}/adm-portal/data-search")
        page.wait_for_selector(".user-portal-form")  # データ検索ページの要素を待つ
        print("データ検索ページの内容:")
        print(page.content())  # ページのHTML内容を表示
        
        # 5. ログアウト
        print("[6] ログアウト中...")
        page.click("button:has-text('ログアウト')")  # ログアウトボタンをクリック
        page.wait_for_url(LOGIN_URL)  # ログアウト後、ログインページにリダイレクト
        
        print("ログアウト成功")
        
        # ブラウザを閉じる
        browser.close()

if __name__ == "__main__":
    main()


# スクリプトの説明
# 1. ライブラリ

# playwright.sync_api: Pywrightを使用してブラウザを操作。
# pyotp: TOTPコードを生成。
# 2. 設定

# BASE_URL: 基本のURL。
# LOGIN_URL: ログインページURL。
# TOTP_SECRET: TOTP認証に必要なシークレットキー。
# 3. 認証フロー

# ログインページ (LOGIN_URL) にアクセス
# ユーザー名とパスワードを入力。
# ログインボタンをクリック。
# TOTP認証ページに遷移
# PyOTPを使用してTOTPコードを生成。
# 認証コードを入力してOKボタンをクリック。
# ログイン後のページ (/adm-portal/home) を確認
# ログイン状態を確認。
# データ検索ページ (/adm-portal/data-search) にアクセス
# 必要なデータを取得。
# ログアウト
# ログアウトボタンをクリックしてセッションを終了。
# 4. ログ出力

# 各ステップで進捗や成功/失敗メッセージを出力。


# 使用方法
# 必要なパッケージをインストール:
# pip install playwright pyotp
# playwright install
# スクリプトの実行:
# python pywright_with_pyotp.py
# ブラウザを表示して進行状況を確認:
# headless=False の場合、ブラウザ操作が表示されます。
# 必要に応じて headless=True に変更するとヘッドレスモードで動作します。

# 注意事項
# タイミングの調整
# ページ遷移や要素の表示タイミングが異なる場合は、wait_for_* メソッドを適切に調整してください。
# セキュリティ
# TOTPシークレットや認証情報は安全な方法で管理（例: 環境変数や外部設定ファイル）。
# エラー処理
# 各ステップで例外をキャッチしてエラー内容をログ出力する仕組みを追加することを推奨します。
