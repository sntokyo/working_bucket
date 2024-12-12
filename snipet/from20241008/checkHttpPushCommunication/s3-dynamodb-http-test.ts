import * as retry from 'async-retry';
import { CloudWatchLogsClient, DescribeLogGroupsCommand, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

const region = 'us-east-1'; // 適切なリージョンに変更してください
const searchKeyword = 'ABC'; // 検索したいLambda関数名に含まれる文字列
const query = '"consume"'; // フィルタ文字列

const client = new CloudWatchLogsClient({ region });

// ロググループを取得する関数
async function getLogGroupsWithKeyword(keyword: string): Promise<string[]> {
    const command = new DescribeLogGroupsCommand({});
    try {
        const response = await retry(async (bail) => {
            // retry は、非同期処理をリトライするための関数です。この例では、`async-retry`ライブラリを使用しています。
            // retry関数は、指定された回数だけ非同期処理をリトライします。
            // bailは、致命的なエラーが発生した場合にリトライを中断するための関数です。
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
    const command = new FilterLogEventsCommand({
        logGroupName,
        filterPattern: query,
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
        console.log(`Fetching logs for log group: ${logGroupName}`);
        await getFilteredLogs(logGroupName);
    }
}

main();
