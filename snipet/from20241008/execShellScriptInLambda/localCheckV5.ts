import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// 現在時刻を取得
const now = new Date();

// 時間スロットを計算する関数
function calculateTimeSlots(date: Date): { start: Date; end: Date } {
  const minute = date.getMinutes();
  const hour = date.getHours();

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

  // 開始・終了時間を構築
  const start = new Date(date);
  const end = new Date(date);

  start.setHours(startHour);
  start.setMinutes(startMinute);
  start.setSeconds(0);

  end.setHours(endHour);
  end.setMinutes(endMinute);
  end.setSeconds(59);

  return { start, end };
}

// 日時を yyyymmddhhmmss フォーマットに変換する関数
function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

// 時間スロットを計算
const { start, end } = calculateTimeSlots(now);
const formattedStartTime = formatDate(start);
const formattedEndTime = formatDate(end);

// リストの定義
const items = ['03_12345_012345', '04_67890_987654', '05_11111_222222'];

// 非同期関数で処理を実行
async function processItems() {
  for (const item of items) {
    const command = `./abc 3 ${item} ${formattedStartTime} ${formattedEndTime} 1`;

    console.log(`[START] Processing item: ${item}`);
    console.log(`[INFO] Command: ${command}`);
    console.log(`[INFO] Start Time: ${formattedStartTime}, End Time: ${formattedEndTime}`);

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

  const logDir = path.resolve('log');
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

    await fs.rm(logDir, { recursive: true, force: true });
    console.log(`[INFO] Deleted log directory: ${logDir}`);
  } catch (err) {
    console.error(`[ERROR] Failed to process log directory:`, err);
  }
}

processItems().then(() => console.log('[INFO] All items processed.'));
