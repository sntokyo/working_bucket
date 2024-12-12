import { CloudWatchLogsClient, DescribeLogGroupsCommand, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import * as dayjs from 'dayjs';

const region = 'us-east-1'; // 適切なリージョンに変更してください
const logGroupName = '/aws/lambda/your-lambda-function-name'; // 直接指定するLambda関数のロググループ名
const query = '"statusCode" || "awsRequestId" || "body"'; // フィルタ文字列

const client = new CloudWatchLogsClient({ region });

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
    const response = await client.send(command);
    console.log(`Filtered logs from ${logGroupName}:`, response.events);
  } catch (error) {
    console.error(`Error fetching logs from ${logGroupName}:`, error);
  }
}

// メイン関数
async function processLogGroup() {
  await getFilteredLogs(logGroupName);
}

// 関数の呼び出しとエラーハンドリング
processLogGroup().catch(console.error);
