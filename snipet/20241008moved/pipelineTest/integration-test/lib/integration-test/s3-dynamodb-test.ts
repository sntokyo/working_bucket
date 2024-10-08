import * as AWS from "aws-sdk";
import * as fs from "fs";
import * as path from "path";

// AWSサービスのインスタンスを作成
const s3 = new AWS.S3();
const docClient = new AWS.DynamoDB.DocumentClient();
const codepipeline = new AWS.CodePipeline();

// 環境変数からテーブル名とバケット名を取得
const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;
const S3_DIR = "s3dir1"; // S3ディレクトリ名を指定

// DynamoDBの項目の型を定義
interface DynamoDBItem {
  pk: string;
  sk: string;
  code: string;
  datetime: string;
  key: string;
  origkey: string;
  storedat?: string; // storedatとupdatedatをオプショナルに変更
  updatedat?: string; // storedatとupdatedatをオプショナルに変更
  value: string;
}

// 事前に保持しているデータ
const storedData: { [key: string]: DynamoDBItem } = {
  test1: {
    pk: "test1",
    sk: "info",
    code: "test",
    datetime: "202307010002291",
    key: "test1.bin",
    origkey: "test1.send",
    storedat: "2024-06-27-T05:59:31Z",
    updatedat: "2024-06-27-T05:59:31Z",
    value: "info",
  },
};

// オブジェクトのプロパティをソートする関数
function sortObjectKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((result: any, key: string) => {
      result[key] = sortObjectKeys(obj[key]);
      return result;
    }, {});
  } else {
    return obj;
  }
}

// Lambdaハンドラ関数
export const handler = async (event: any): Promise<void> => {
  const jobId = event["CodePipeline.job"].id;

  const putJobSuccess = async () => {
    const params = {
      jobId: jobId
    };
    await codepipeline.putJobSuccessResult(params).promise();
  };

  const putJobFailure = async (message: string) => {
    const params = {
      jobId: jobId,
      failureDetails: {
        message: JSON.stringify(message),
        type: "JobFailed"
      }
    };
    await codepipeline.putJobFailureResult(params).promise();
  };

  const filenames = ["test1.txt", "test2.txt", "test3.txt"];

  const uploadAndCheckFile = async (filename: string) => {
    const filePath = path.join("/tmp", `${filename}`);

    // ファイル生成
    fs.writeFileSync(filePath, `This is a test file: ${filename}`);

    // S3にアップロード
    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: `${S3_DIR}/${filename}`, // S3ディレクトリにアップロード
      Body: fs.createReadStream(filePath),
    };

    await s3.upload(s3Params).promise();
    console.log(`Successfully uploaded ${filename} to S3 directory ${S3_DIR}`);

    // DynamoDBにファイル名が登録されているまで待機
    const maxRetries = 12; // 最大再試行回数
    const delay = 5000; // 再試行間隔（ミリ秒）
    let retries = 0;
    let found = false;

    const filenameWithoutExtension = path.basename(filename, path.extname(filename)); // ファイル名の拡張子を除去

    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delay)); // 待機

      // DynamoDBにファイル名が登録されているか確認
      const dynamoParams = {
        TableName: TABLE_NAME,
        Key: { pk: filenameWithoutExtension, sk: "info" },
      };

      const data = await docClient.get(dynamoParams).promise();
      if (data.Item) {
        console.log(`${filenameWithoutExtension} found in DynamoDB`);
        found = true;

        // データ付き合わせ
        const storedItem = storedData[filenameWithoutExtension];
        const { storedat: _storedat, updatedat: _updatedat, ...storedItemToCompare } = storedItem;
        const { storedat: _dataStoredat, updatedat: _dataUpdatedat, ...dataItemToCompare } = data.Item;

        const sortedStoredItem = sortObjectKeys(storedItemToCompare);
        const sortedDataItem = sortObjectKeys(dataItemToCompare);

        const same = JSON.stringify(sortedStoredItem) === JSON.stringify(sortedDataItem);

        if (same) {
          console.log(`Data for ${filenameWithoutExtension} matches stored data.`);
        } else {
          throw new Error(`Data for ${filenameWithoutExtension} does not match stored data.`);
        }

        break;
      } else {
        console.log(`${filenameWithoutExtension} not found in DynamoDB, retrying...`);
      }
      retries++;
    }

    if (!found) {
      throw new Error(`Failed to find ${filenameWithoutExtension} in DynamoDB after ${retries} retries.`);
    }
  };

  try {
    await Promise.all(filenames.map(uploadAndCheckFile));

    // 成功をCodePipelineに通知
    await putJobSuccess();
    console.log(`Successfully putJobSuccess for ${jobId}`);

  } catch (error) {
    console.error(`Test failed with error: ${(error as Error).message}`);
    // 失敗をCodePipelineに通知
    await putJobFailure((error as Error).message);
    console.log(`Failed as putJobFailure for ${jobId}`);

  } finally {
    // クリーンアップ処理
    for (const filename of filenames) {
      const filenameWithoutExtension = path.basename(filename, path.extname(filename));

      // S3からファイルを削除
      const deleteS3Params = {
        Bucket: BUCKET_NAME,
        Key: `${S3_DIR}/${filename}`,
      };

      try {
        await s3.deleteObject(deleteS3Params).promise();
        console.log(`Successfully deleted ${filename} from S3 directory ${S3_DIR}`);
      } catch (deleteError) {
        console.error(`Failed to delete ${filename} from S3: ${(deleteError as Error).message}`);
      }

      // DynamoDBからファイル名を削除
      const deleteDynamoParams = {
        TableName: TABLE_NAME,
        Key: { pk: filenameWithoutExtension, sk: "info" },
      };

      try {
        await docClient.delete(deleteDynamoParams).promise();
        console.log(`Successfully deleted ${filenameWithoutExtension} from DynamoDB`);
      } catch (deleteError) {
        console.error(`Failed to delete ${filenameWithoutExtension} from DynamoDB: ${(deleteError as Error).message}`);
      }
    }
  }
};
