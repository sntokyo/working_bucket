import requests
import pyotp

# 設定
BASE_URL = "https://example.com"
LOGIN_URL = f"{BASE_URL}/adm-portal/login"  # ログインページURL
TOTP_URL = f"{BASE_URL}/adm-portal/totp"   # TOTP認証ページURL
SEARCH_URL = f"{BASE_URL}/adm-portal/data-search"  # データ検索ページURL
LOGOUT_URL = f"{BASE_URL}/adm-portal/logout"  # ログアウトページURL
USERNAME = "your_username"  # ユーザー名
PASSWORD = "your_password"  # パスワード
TOTP_SECRET = "YOUR_SECRET"  # サービス提供元から与えられたTOTPシークレット

def generate_totp_code(secret):
    """TOTPコードを生成"""
    totp = pyotp.TOTP(secret)
    return totp.now()

def main():
    # セッションを作成
    session = requests.Session()
    
    # 1. トップページでログイン
    print("[1] ログイン中...")
    login_data = {
        "userId": USERNAME,
        "password": PASSWORD
    }
    response_login = session.post(LOGIN_URL, data=login_data)
    if response_login.status_code != 200:
        print(f"ログイン失敗: {response_login.status_code}")
        return
    print("ログイン成功")
    
    # 2. 多要素認証コードを送信
    print("[2] TOTP認証中...")
    totp_code = generate_totp_code(TOTP_SECRET)
    print(f"TOTPコード: {totp_code}")
    totp_data = {
        "authCode": totp_code
    }
    response_totp = session.post(TOTP_URL, data=totp_data)
    if response_totp.status_code != 200:
        print(f"TOTP認証失敗: {response_totp.status_code}")
        return
    print("TOTP認証成功")
    
    # 3. ログイン後のページを確認
    print("[3] ログイン後のページ確認...")
    response_logged_in = session.get(LOGIN_URL)
    if response_logged_in.status_code != 200:
        print(f"ログイン後のページ取得失敗: {response_logged_in.status_code}")
        return
    print("ログイン後のページ取得成功")
    
    # 4. データ検索ページにアクセス
    print("[4] データ検索ページにアクセス...")
    response_search = session.get(SEARCH_URL)
    if response_search.status_code != 200:
        print(f"データ検索ページ取得失敗: {response_search.status_code}")
        return
    print("データ検索ページ取得成功")
    print("取得したデータ:")
    print(response_search.text)  # 必要に応じてデータの処理を追加

    # 5. ログアウト
    print("[5] ログアウト中...")
    response_logout = session.post(LOGOUT_URL)
    if response_logout.status_code != 200:
        print(f"ログアウト失敗: {response_logout.status_code}")
        return
    print("ログアウト成功")

if __name__ == "__main__":
    main()
