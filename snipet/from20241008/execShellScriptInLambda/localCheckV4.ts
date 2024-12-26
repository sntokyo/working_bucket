import { exec } from 'child_process';
import fs from 'fs/promises'; // promises API を使用
import path from 'path';

// リストの定義
const items = ['03_12345_012345', '04_67890_987654', '05_11111_222222'];

// 現在時刻を取得
const now = new Date();

// 開始時間: 現在時刻の20分前
const startTime = new Date(now);
startTime.setMinutes(now.getMinutes() - 20);

// 終了時間: 現在時刻の10分前
const endTime = new Date(now);
endTime.setMinutes(now.getMinutes() - 10);

// 日時を yyyymmddhhmmss フォーマットに変換する関数
function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = '00'; // 秒は常に 00
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

// フォーマット済みの開始時間と終了時間
const formattedStartTime = formatDate(startTime);
const formattedEndTime = formatDate(endTime);

// 非同期関数で処理を実行
async function processItems() {
  for (const item of items) {
    // スクリプト実行コマンドを作成
    const command = `./abc 3 ${item} ${formattedStartTime} ${formattedEndTime} 1`;

    console.log(`[START] Processing item: ${item}`);
    console.log(`[INFO] Command: ${command}`);

    try {
      await new Promise<void>((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`[ERROR] Error processing ${item}: ${error.message}`);
            reject(error);
            return;
          }
          if (stderr) {
            console.error(`[STDERR] ${stderr}`);
          }
          console.log(`[STDOUT] ${stdout}`);
          console.log(`[COMPLETE] Finished processing item: ${item}`);
          resolve();
        });
      });
    } catch (err) {
      console.error(`[FAILED] Failed to process item: ${item}`);
    }
  }

  // 処理が終わったらログを表示して削除
  const logDir = path.resolve('log'); // log ディレクトリのパスを解決
  try {
    const logFiles = await fs.readdir(logDir);
    for (const file of logFiles) {
      if (file.endsWith('.log')) {
        const filePath = path.join(logDir, file);
        const logContent = await fs.readFile(filePath, 'utf-8');
        console.log(`[LOG] Log content from ${file}:`);
        console.log(logContent);
      }
    }

    // log ディレクトリを削除
    await fs.rm(logDir, { recursive: true, force: true }); // 再帰的に削除
    console.log(`[INFO] Deleted log directory: ${logDir}`);
  } catch (err) {
    console.error(`[ERROR] Failed to process log directory:`, err);
  }
}

// 処理を開始
processItems().then(() => console.log('[INFO] All items processed.'));
