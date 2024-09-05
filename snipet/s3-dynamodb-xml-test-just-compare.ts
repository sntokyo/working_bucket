import * as AWS from "aws-sdk";
import * as fs from "fs";
import * as path from "path";
import compare from "just-compare"; // just-compareをインポート

// AWSサービスのインスタンスを作成
const s3 = new AWS.S3();
const docClient = new AWS.DynamoDB.DocumentClient();
const codepipeline = new AWS.CodePipeline();
// 環境変数からテーブル名とバケット名を取得
const TABLE_NAME = process.env.ddbBinarycatalogTableName!;
const BUCKET_NAME = process.env.s3BucketName!;
const REPLICATION_BUCKET_NAME = process.env.replicationBucketName!;
const DEST_BUCKET_NAME_A = process.env.destBucketNameA!;
const S3_DIR = "s3dir1"; // S3ディレクトリ名を指定（全ての環境で共通）

// DynamoDBの項目の型を定義
interface DynamoDBItem {
  pk: string;
  sk: string;
  code: string;
  datetime: string;
  key: string;
  origkey: string;
  storedat?: string;
  updatedat?: string;
  value: string;
}

// ../sample/xml ディレクトリ内のすべてのファイルをリスト化して取得
const sampleXmlDir = path.join(__dirname, "../sample/xml");
let uploadS3FileList: string[] = [];

// ファイルをリストに追加
try {
  uploadS3FileList = fs.readdirSync(sampleXmlDir).filter((file) => {
    const fullPath = path.join(sampleXmlDir, file);
    return fs.statSync(fullPath).isFile(); // ファイルかどうかを確認
  });
  console.log(`Files to upload: ${uploadS3FileList}`);
} catch (error) {
  console.error(`Failed to read directory: ${sampleXmlDir}`, error);
}

// ファイル名からprefixを取得する関数
function extractPrefix(filename: string): string | null {
  const match = filename.match(/^([A-Z0-9]+)_/);
  return match ? match[1] : null;
}

// 拡張子が.xmlのファイルを作成
function transformFileName(filename: string): string {
  // 元のファイル名から拡張子を除去し、.xmlを付与
  const baseName = filename.replace(/\.[^/.]+$/, "");
  return `${baseName}.xml`;
}

export const handler = async (event: any): Promise<void> => {
  const jobId = event["CodePipeline.job"].id;

  // CodePipelineに成功を通知する関数
  const putJobSuccess = async () => {
    const params = { jobId: jobId };
    await codepipeline.putJobSuccessResult(params).promise();
  };

  // CodePipelineに失敗を通知する関数
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

  const uploadAndCheckFile = async (filename: string) => {
    // ../sample/xml/aaa.sendからファイルを読み込み
    const filePath = path.join(sampleXmlDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // S3にアップロード    
    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: `${S3_DIR}/${filename}`,
      Body: fs.createReadStream(filePath),
    };
    await s3.upload(s3Params).promise();
    console.log(`Successfully uploaded ${filename} to S3 directory ${S3_DIR}`);

    // DynamoDBにファイル名が登録されているまで待機
    const maxRetries = 12; // 最大再試行回数
    const delay = 5000; // 再試行間隔（ミリ秒）
    let retries = 0;
    let foundDdb = false;
    let foundDestBucketA = false;

    const filenameWithoutExtension = path.basename(filename, path.extname(filename));
    const prefixDir = extractPrefix(filename);
    const newFileName = transformFileName(filename);

    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delay));

      // DynamoDBにファイル名が登録されているか確認
      const dynamoParams = {
        TableName: TABLE_NAME,
        Key: { pk: filenameWithoutExtension, sk: "info" },
      };

      const data = await docClient.get(dynamoParams).promise();
      if (data.Item) {
        console.log(`${filenameWithoutExtension} found in DynamoDB`);
        foundDdb = true;
        
        // データ付き合わせ
        const storedItem = storedData[filenameWithoutExtension];
        const same = compare(storedItem, data.Item); // just-compareで比較

        if (same) {
          console.log(`Data for ${filenameWithoutExtension} matches stored data.`);
        } else {
          // マッチしない場合はエラーをスロー
          throw new Error(`Data for ${filenameWithoutExtension} does not match stored data.`);
        }

        break;
      } else {
        console.log(`${filenameWithoutExtension} not found in DynamoDB, retrying...`);
      }

      // DEST_BUCKET_NAME_Aにファイルが存在するか確認
      const headParams = {
        Bucket: DEST_BUCKET_NAME_A,
        Key: `${prefixDir}/${newFileName}`,
      };

      try {
        await s3.headObject(headParams).promise();
        foundDestBucketA = true;
        console.log(`File ${newFileName} exists in ${DEST_BUCKET_NAME_A}`);
        break;
      } catch (err) {
        console.error(`File ${newFileName} does not exist in ${DEST_BUCKET_NAME_A}, retrying...`);
      }
      
      retries++;
    }

    if (!foundDdb) {
      throw new Error(`Failed to find ${filenameWithoutExtension} in DynamoDB after ${retries} retries.`);
    }
    if (!foundDestBucketA) {
      throw new Error(`Failed to find ${newFileName} in ${DEST_BUCKET_NAME_A} after ${retries} retries.`);
    }
  };

  try {
    await Promise.all(uploadS3FileList.map(uploadAndCheckFile));
    await putJobSuccess();
    console.log(`Successfully putJobSuccess for ${jobId}`);
  } catch (error) {
    console.error(`Test failed with error: ${(error as Error).message}`);
    await putJobFailure((error as Error).message);
    console.log(`Failed as putJobFailure for ${jobId}`);
  } finally {
    for (const filename of uploadS3FileList) {
      const filenameWithoutExtension = path.basename(filename, path.extname(filename));
      const prefixDir = extractPrefix(filename);
      const newFileName = transformFileName(filename);

      //S3bucketからファイルを削除し、ログを出力
      const deleteFileFromS3 = async (bucket: string, key: string) => {
        const params = { Bucket: bucket, Key: key };
        try {
          await s3.deleteObject(params).promise();
          console.log(`Successfully deleted ${key} from ${bucket}`);
        } catch (deleteError) {
          console.error(`Failed to delete ${key} from ${bucket}: ${(deleteError as Error).message}`);
        }
      };

      await deleteFileFromS3(BUCKET_NAME, `${S3_DIR}/${filename}`);
      await deleteFileFromS3(REPLICATION_BUCKET_NAME, `${S3_DIR}/${filename}`);
      await deleteFileFromS3(REPLICATION_BUCKET_NAME, `${prefixDir}/${newFileName}`);
      await deleteFileFromS3(DEST_BUCKET_NAME_A, `${prefixDir}/${newFileName}`);

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
