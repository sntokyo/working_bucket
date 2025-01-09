import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// Unix時間を取得する関数
function getUnixTime(date = new Date()) {
  return {
    milliseconds: date.getTime(), // ミリ秒単位
    seconds: Math.floor(date.getTime() / 1000), // 秒単位
  };
}

// Unix時間を JST と UTC の日時に変換する関数
function getDateFromUnixTime(unixTimeMillis: number): { utc: string; jst: string } {
  const date = new Date(unixTimeMillis); // UTC 基準の Date オブジェクトを生成

  // UTC の日時を生成
  const utc = date.toISOString();

  // JST の日時を生成
  const jstDate = new Date(unixTimeMillis + 9 * 60 * 60 * 1000); // UTC + 9時間
  const yyyy = jstDate.getFullYear();
  const mm = String(jstDate.getMonth() + 1).padStart(2, '0');
  const dd = String(jstDate.getDate()).padStart(2, '0');
  const hh = String(jstDate.getHours()).padStart(2, '0');
  const mi = String(jstDate.getMinutes()).padStart(2, '0');
  const ss = String(jstDate.getSeconds()).padStart(2, '0');
  const jst = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;

  return { utc, jst };
}

// 時間スロットを計算する関数 (Unix時間を基準)
function calcUTCTimeSlotsFromUnix(unixTimeMillis: number): { start: Date; end: Date } {
  const date = new Date(unixTimeMillis); // Unix時間から Date オブジェクトを作成
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();

  let startHour = hour;
  let startMinute = 0;
  let endHour = hour;
  let endMinute = 0;

  if (minute >= 0 && minute < 10) {
    startHour = hour - 1;
    startMinute = 50;
    endHour = hour - 1;
    endMinute = 59;
  } else if (minute >= 10 && minute < 20) {
    startMinute = 0;
    endMinute = 9;
  } else if (minute >= 20 && minute < 30) {
    startMinute = 10;
    endMinute = 19;
  } else if (minute >= 30 && minute < 40) {
    startMinute = 20;
    endMinute = 29;
  } else if (minute >= 40 && minute < 50) {
    startMinute = 30;
    endMinute = 39;
  } else if (minute >= 50 && minute < 60) {
    startMinute = 40;
    endMinute = 49;
  }

  // 開始・終了時間を構築 (UTC)
  const start = new Date(unixTimeMillis);
  const end = new Date(unixTimeMillis);

  start.setUTCHours(startHour, startMinute, 0, 0);
  end.setUTCHours(endHour, endMinute, 59, 999);

  return { start, end };
}

// 日時を yyyymmddhhmmss フォーマットに変換する関数
function formatDate(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

// アイテムを処理する関数
async function processItems() {
  const programStartUnix = getUnixTime();
  console.log(`[INFO] Program started at (Unix Time): ${programStartUnix.milliseconds} ms`);

  const { start, end } = calcUTCTimeSlotsFromUnix(programStartUnix.milliseconds);
  const formattedStartTime = formatDate(start);
  const formattedEndTime = formatDate(end);

  const items = ['03_12345_012345', '04_67890_987654', '05_11111_222222'];

  for (const item of items) {
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
          resolve();
        });
      });
    } catch (err) {
      console.error(`[FAILED] Failed to process item: ${item}`);
    }
  }

  const logDir = path.resolve('log');
  try {
    const logFiles = await fs.readdir(logDir);
    for (const file of logFiles) {
      if (file.endsWith('.log')) {
        const filePath = path.join(logDir, file);
        const logContent = await fs.readFile(filePath, 'utf-8');

        const filteredLog = logContent
          .split('\n')
          .filter(line => !/(login_id|login_passwd|LOGIN_ID|LOGIN_PASSWORD)/i.test(line))
          .join('\n');

        console.log(`[LOG] Log content from ${file} (Filtered):`);
        console.log(filteredLog);
      }
    }

    await fs.rm(logDir, { recursive: true, force: true });
    console.log(`[INFO] Deleted log directory: ${logDir}`);
  } catch (err) {
    console.error(`[ERROR] Failed to process log directory:`, err);
  }
}

// Lambdaハンドラー関数
export async function handler(event: any) {
  console.log('[INFO] Lambda handler invoked');

  await processItems();

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Process completed successfully.' }),
  };
}
