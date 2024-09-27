import * as AWS from "aws-sdk";
import * as fs from "fs";
import * as path from "path";
import omit from 'just-omit';
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

// テストファイルリスト
const uploadS3FileList = [
  "XXXX63_RTGF_010000_202409060000001_001_99999.send",
];


// 事前に保持しているデータ(DynamoDBに入っていると期待される値)
const storedData: { [key: string]: DynamoDBItem } = {
  XXXX63_RTGF_010000_202409060000001_001_99999: {
    pk: "XXXX63_RTGF_010000_202409060000001_001_99999",
    sk: "info",
    code: "XXXX63",
    datetime: "202409020002291",
    key: "XXXX63/XXXX63_RTGF_010000_202409060000001_001_99999.bin",
    origkey: "danben/test1.send",
    storedat: "2024-09-02-T05:59:31Z",
    updatedat: "2024-06-02-T05:59:31Z",
    value: "info",
  },
};

// just-compare, just-omit に置き換える予定
// function sortObjectKeys(obj: any): any {
//   if (obj !== null && typeof obj === 'object') {
//     const sortedObj: any = {};
//     Object.keys(obj).sort().forEach(key => {
//       sortedObj[key] = obj[key];
//     });
//     return sortedObj;
//   } else {
//     return obj;
//   }
// }

// ファイル名からprefixを取得する関数
function extractPrefix(filename: string): string | null {
  const match = filename.match(/^([A-Z0-9]+)_/);
  return match ? match[1] : null;
}

// 拡張子が.binのファイルを作成
function transformFileName(filename: string): string {
  // 元のファイル名から拡張子を除去し、.binを付与
  const baseName = filename.replace(/\.[^/.]+$/, "");
  return `${baseName}.bin`;
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

  const filenames = uploadS3FileList;
  
  const uploadAndCheckFile = async (filename: string) => {
    const filePath = path.join("/tmp", `${filename}`);

    // ファイル生成
    fs.writeFileSync(filePath, `This is a test file: ${filename}`);

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
    let foundRepliDenbunBucket = false;
    let foundRepliPrefixBucket = false;

    const filenameWithoutExtension = path.basename(filename, path.extname(filename));
    const prefixDir = extractPrefix(filename);
    const newFileNameBin = transformFileName(filename);

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
        // const { storedat: _storedat, updatedat: _updatedat, ...storedItemToCompare } = storedItem;
        // const { storedat: _dataStoredat, updatedat: _dataUpdatedat, ...dataItemToCompare } = data.Item;
        const storedItemToCompare = omit(storedItem, ['storedat', 'updatedat']);
        const dataItemToCompare = omit(data.Item, ['storedat', 'updatedat']);
        
        const sortedStoredItem = sortObjectKeys(storedItemToCompare);
        const sortedDataItem = sortObjectKeys(dataItemToCompare);

        const same = JSON.stringify(sortedStoredItem) === JSON.stringify(sortedDataItem);

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
        Key: `${prefixDir}/${newFileNameBin}`,
      };

      try {
        await s3.headObject(headParams).promise();
        foundDestBucketA = true;
        console.log(`File ${newFileNameBin} exists in ${DEST_BUCKET_NAME_A}`);
        break;
      } catch (err) {
        console.error(`File ${newFileNameBin} does not exist in ${DEST_BUCKET_NAME_A}, retrying...`);
      }

      // REPLICATION_BUCKET_NAMEのdenbun ディレクトリにファイルが存在するか確認
      const repliDenbunBucketHeadParams = {
        Bucket: REPLICATION_BUCKET_NAME,
        Key: `denbun/${filename}`,
      };

      try {
        await s3.headObject(repliDenbunBucketHeadParams).promise();
        foundRepliDenbunBucket = true;
        console.log(`File ${filename} exists in ${REPLICATION_BUCKET_NAME}/denbun`);
        break;
      } catch (err) {
        console.error(`File ${filename} does not exist in ${REPLICATION_BUCKET_NAME}/denbun, retrying...`);
      }

      // REPLICATION_BUCKET_NAMEの $PREFIX ディレクトリにファイルが存在するか確認
      const repliDenbunBucketHeadParams = {
        Bucket: REPLICATION_BUCKET_NAME,
        Key: `${prefixDir}/${newFileNameBin}`,
      };

      try {
        await s3.headObject(repliDenbunBucketHeadParams).promise();
        foundRepliPrefixBucket = true;
        console.log(`File ${newFileNameBin} exists in ${REPLICATION_BUCKET_NAME}/${prefixDir}`);
        break;
      } catch (err) {
        console.error(`File ${newFileNameBin} does not exist in ${REPLICATION_BUCKET_NAME}/${prefixDir}, retrying...`);
      }

      retries++;
    }

    if (!foundDdb) {
      throw new Error(`Failed to find ${filenameWithoutExtension} in DynamoDB after ${retries} retries.`);
    }
    if (!foundDestBucketA) {
      throw new Error(`Failed to find ${newFileNameBin} in ${DEST_BUCKET_NAME_A} after ${retries} retries.`);
    }
    if (!foundRepliDenbunBucket) {
      throw new Error(`Failed to find ${filename} in ${REPLICATION_BUCKET_NAME}/denbun after ${retries} retries.`);
    }
    if (!foundRepliPrefixBucket) {
      throw new Error(`Failed to find ${newFileNameBin} in ${REPLICATION_BUCKET_NAME}/${prefixDir} after ${retries} retries.`);
    }
  };

  try {
    await Promise.all(filenames.map(uploadAndCheckFile));
    await putJobSuccess();
    console.log(`Successfully putJobSuccess for ${jobId}`);
  } catch (error) {
    console.error(`Test failed with error: ${(error as Error).message}`);
    await putJobFailure((error as Error).message);
    console.log(`Failed as putJobFailure for ${jobId}`);
  } finally {
    for (const filename of filenames) {
      const filenameWithoutExtension = path.basename(filename, path.extname(filename));
      const prefixDir = extractPrefix(filename);
      const newFileNameBin = transformFileName(filename);

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
      await deleteFileFromS3(REPLICATION_BUCKET_NAME, `${prefixDir}/${newFileNameBin}`);
      await deleteFileFromS3(DEST_BUCKET_NAME_A, `${prefixDir}/${newFileNameBin}`);

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
