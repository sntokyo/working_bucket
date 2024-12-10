import * as retry from 'async-retry';
import { CloudWatchLogsClient, DescribeLogGroupsCommand, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import * as dayjs from 'dayjs';

const region = 'us-east-1'; // 適切なリージョンに変更してください
const searchKeyword = 'ABC'; // 検索したいLambda関数名に含まれる文字列
const query = '"statusCode" "awsRequestId" "body"'; // フィルタ文字列

const client = new CloudWatchLogsClient({ region });

// ロググループを取得する関数
async function getLogGroupsWithKeyword(keyword: string): Promise<string[]> {
  const command = new DescribeLogGroupsCommand({});
  try {
    const response = await retry(async (bail) => {
      const res = await client.send(command);
      if (!res.logGroups) {
        bail(new Error('No log groups found')); // 致命的なエラーの場合リトライを中断
      }
      return res;
    }, {
      retries: 3, // 最大3回リトライ
      factor: 2,  // リトライ間隔を指数関数的に増加
      minTimeout: 1000, // 最小遅延 (1秒)
    });

    return response.logGroups!
      .map((group) => group.logGroupName || '')
      .filter((name) => name.includes(keyword));
  } catch (error) {
    console.error('Error fetching log groups:', error);
    return [];
  }
}

// 特定のロググループからフィルタされたログを取得する関数
async function getFilteredLogs(logGroupName: string) {
  const now = dayjs();
  const startTime = now.subtract(5, 'minute').valueOf();
  const endTime = now.add(5, 'minute').valueOf();

  const command = new FilterLogEventsCommand({
    logGroupName,
    filterPattern: query,
    startTime,
    endTime,
  });

  try {
    const response = await retry(async () => {
      return await client.send(command);
    }, {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
    });

    console.log(`Filtered logs from ${logGroupName}:`, response.events);
  } catch (error) {
    console.error(`Error fetching logs from ${logGroupName}:`, error);
  }
}

// メイン関数
async function main() {
  const logGroups = await getLogGroupsWithKeyword(searchKeyword);

  if (logGroups.length === 0) {
    console.log(`No log groups found containing the keyword: ${searchKeyword}`);
    return;
  }

  for (const logGroupName of logGroups) {
    await getFilteredLogs(logGroupName);
  }
}

main().catch(console.error);
