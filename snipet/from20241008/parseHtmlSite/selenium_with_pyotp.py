from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pyotp
import time

# 設定
BASE_URL = "https://example.com"
LOGIN_URL = f"{BASE_URL}/adm-portal/login"
TOTP_SECRET = "YOUR_SECRET"  # サービス提供元から与えられたTOTPシークレット

def generate_totp_code(secret):
    """TOTPコードを生成"""
    totp = pyotp.TOTP(secret)
    return totp.now()

def main():
    # Chromeオプションを設定してヘッドレスモードを有効化
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument("--headless")  # ヘッドレスモード
    chrome_options.add_argument("--disable-gpu")  # GPUの無効化（Linuxでは不要）
    chrome_options.add_argument("--window-size=1920x1080")  # ウィンドウサイズを指定

    # ブラウザドライバを起動 (例: Chrome)
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 10)

    try:
        # 1. トップページでログイン
        print("[1] トップページにアクセス...")
        driver.get(LOGIN_URL)
        
        print("[2] IDとパスワードを入力...")
        user_id_input = wait.until(EC.presence_of_element_located((By.ID, "userId")))
        user_id_input.send_keys("your_username")
        
        password_input = driver.find_element(By.ID, "password")
        password_input.send_keys("your_password")
        
        login_button = driver.find_element(By.XPATH, "//button[contains(text(), 'ログイン')]")
        login_button.click()
        
        # 2. TOTP認証コードを送信
        print("[3] TOTP認証ページに移動...")
        auth_code_input = wait.until(EC.presence_of_element_located((By.ID, "authCode")))
        
        totp_code = generate_totp_code(TOTP_SECRET)
        print(f"TOTPコード: {totp_code}")
        auth_code_input.send_keys(totp_code)
        
        ok_button = driver.find_element(By.XPATH, "//button[contains(text(), 'OK')]")
        ok_button.click()
        
        # 3. ログイン後のページを確認
        print("[4] ログイン後のページにアクセス...")
        wait.until(EC.url_contains("/adm-portal/home"))
        print("ログイン後のページにアクセス成功")

        # 4. データ検索ページにアクセス
        print("[5] データ検索ページにアクセス...")
        driver.get(f"{BASE_URL}/adm-portal/data-search")
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "user-portal-form")))
        print("データ検索ページの内容:")
        print(driver.page_source)  # ページのHTMLを表示
        
        # 5. ログアウト
        print("[6] ログアウト中...")
        logout_button = driver.find_element(By.XPATH, "//button[contains(text(), 'ログアウト')]")
        logout_button.click()
        wait.until(EC.url_contains(LOGIN_URL))
        print("ログアウト成功")
    
    except Exception as e:
        print(f"エラーが発生しました: {e}")
    
    finally:
        # ブラウザを閉じる
        driver.quit()

if __name__ == "__main__":
    main()


# 変更点
# webdriver.ChromeOptionsの追加
# headlessモードを有効化:
# chrome_options.add_argument("--headless")
# GPUの無効化（Windows環境でのエラー回避に有効）:
# chrome_options.add_argument("--disable-gpu")
# ウィンドウサイズの設定（headlessモードではデフォルトサイズが小さいため）:
# chrome_options.add_argument("--window-size=1920x1080")
# webdriver.Chrome()にオプションを適用
# options=chrome_options を渡します。
# headlessモードでの注意点
# デバッグが難しい:
# GUIが表示されないため、操作の進捗を確認できません。
# エラーが発生した場合、driver.save_screenshot()でスクリーンショットを保存して確認できます。
# driver.save_screenshot("screenshot.png")
# 一部のサイトで問題が発生する場合:
# --headlessモードでは検知される可能性があります。
# その場合、通常モードに切り替えるか、ヘッドレスブラウザ検知回避の設定を追加します。
