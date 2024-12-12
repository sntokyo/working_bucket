import puppeteer from "puppeteer";
import totp from "totp-generator";

// 設定
const BASE_URL = "https://example.com";
const LOGIN_URL = `${BASE_URL}/adm-portal/login`;
const TOTP_SECRET = "YOUR_SECRET"; // TOTPシークレットキー

/**
 * TOTPコードを生成する関数
 * @param secret シークレットキー
 * @returns TOTPコード
 */
function generateTotpCode(secret: string): string {
  return totp(secret); // デフォルトでは30秒のステップが使用されます
}

/**
 * 現在の日時をYYYYMMDDHHMMSS形式で取得
 * @returns フォーマットされた日時文字列
 */
function getCurrentTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

(async () => {
  const browser = await puppeteer.launch({ headless: true }); // ヘッドレスモードをオン
  const page = await browser.newPage();

  try {
    // 1. トップページでログイン
    console.log("[1] トップページにアクセス...");
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });
    await page.screenshot({ path: `step1-login-page-${getCurrentTimestamp()}.png` });

    console.log("[2] IDとパスワードを入力...");
    await page.type("#userId", "your_username"); // ユーザー名を入力
    await page.type("#password", "your_password"); // パスワードを入力
    await page.click("button"); // ログインボタンをクリック
    await page.screenshot({ path: `step2-login-submitted-${getCurrentTimestamp()}.png` });

    // 2. TOTP認証コードを送信
    console.log("[3] TOTP認証ページに移動...");
    await page.waitForSelector("#authCode");
    await page.screenshot({ path: `step3-totp-page-${getCurrentTimestamp()}.png` });

    const totpCode = generateTotpCode(TOTP_SECRET);
    console.log(`TOTPコード: ${totpCode}`);
    await page.type("#authCode", totpCode); // 認証コードを入力
    await page.click("button"); // OKボタンをクリック
    await page.screenshot({ path: `step4-totp-submitted-${getCurrentTimestamp()}.png` });

    // 3. ログイン後のページを確認
    console.log("[4] ログイン後のページにアクセス...");
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    await page.screenshot({ path: `step5-logged-in-${getCurrentTimestamp()}.png` });
    console.log("ログイン後のページにアクセス成功");

    // 4. データ検索ページにアクセス
    console.log("[5] データ検索ページにアクセス...");
    await page.goto(`${BASE_URL}/adm-portal/data-search`, { waitUntil: "networkidle2" });
    await page.screenshot({ path: `step6-data-search-page-${getCurrentTimestamp()}.png` });
    console.log("データ検索ページの内容:");
    const pageContent = await page.content();
    console.log(pageContent); // ページのHTMLを表示

    // 5. ログアウト
    console.log("[6] ログアウト中...");
    await page.click("button#logout"); // ログアウトボタンをクリック
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    await page.screenshot({ path: `step7-logged-out-${getCurrentTimestamp()}.png` });
    console.log("ログアウト成功");
  } catch (error) {
    console.error(`エラーが発生しました: ${(error as Error).message}`);
    const timestamp = getCurrentTimestamp();
    const screenshotPath = `error-${timestamp}.png`;
    await page.screenshot({ path: screenshotPath });
    console.error(`スクリーンショットを保存しました: ${screenshotPath}`);
  } finally {
    await browser.close();
  }
})();



// 必要なライブラリをインストール
// 以下のライブラリをインストールします：

// npm install puppeteer totp-generator
// npm install --save-dev @types/puppeteer

// スクリプトの説明

// 1. ライブラリ
// puppeteer:
// ブラウザ操作を自動化します。
// totp-generator:
// TOTPコードを生成します。

// 2. 設定
// BASE_URL: 基本URL。
// LOGIN_URL: ログインページURL。
// TOTP_SECRET: サービス提供元から与えられたTOTPシークレットキー。

// 3. 認証フロー
// ログインページにアクセス
// ユーザー名とパスワードを入力。
// ログインボタンをクリック。
// TOTP認証ページ
// totp-generatorでTOTPコードを生成。
// 認証コードを入力して送信。
// ログイン後のページ
// ログインが成功していることを確認。
// データ検索ページ
// 必要なデータを取得。
// ログアウト
// ログアウトボタンをクリックして、セッションを終了。
// 使用方法
// TypeScriptを設定 プロジェクトにtsconfig.jsonを設定します（必要であれば作成）。
// {
//   "compilerOptions": {
//     "target": "ES2020",
//     "module": "commonjs",
//     "strict": true,
//     "esModuleInterop": true,
//     "outDir": "./dist"
//   },
//   "include": ["**/*.ts"]
// }

// スクリプトをビルドして実行
// tsc totp_with_puppeteer.ts
// node dist/totp_with_puppeteer.js

// 注意事項
// セキュリティ
// TOTP_SECRET を環境変数や設定ファイルに移動して安全に管理。
// エラー処理
// ページ遷移や要素の表示が遅延する可能性があるため、waitForSelector や waitForNavigation のタイムアウトを適切に設定。
// デバッグ
// headless: false を使用して操作を可視化。
// エラー箇所を特定してデバッグできます。
// このスクリプトは、totp-generator を使用してTOTP認証を生成し、TypeScriptで記述された完全な認証フローを再現します。
