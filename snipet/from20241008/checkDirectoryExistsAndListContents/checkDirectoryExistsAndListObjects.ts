import { S3Client, ListObjectsV2Command, HeadBucketCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "your-region" }); // 必要に応じてリージョンを指定
const bucket = "your-bucket-name"; // バケット名を指定
const key = "your-directory-prefix/"; // ディレクトリのプレフィックスを指定（例: "my-folder/"）

// バケットへのアクセス権を確認する関数
async function checkBucketAccess(bucket: string): Promise<boolean> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.info(`バケット ${bucket} へのアクセス権があります`);
    return true;
  } catch (error) {
    console.error(`バケット ${bucket} へのアクセス権がありません`, error);
    return false;
  }
}

// ディレクトリの存在とその内容を確認する関数
async function checkDirectoryExistsAndListContents(bucket: string, key: string, retries: number = 0): Promise<boolean> {
  const listParams = {
    Bucket: bucket,
    Prefix: key.endsWith('/') ? key : `${key}/`, // プレフィックスが'/'で終わるように設定して「ディレクトリ」を指定
    Delimiter: '/',
  };

  try {
    const data = await s3.send(new ListObjectsV2Command(listParams));
    if ((data.Contents && data.Contents.length > 0) || (data.CommonPrefixes && data.CommonPrefixes.length > 0)) {
      // ディレクトリが存在し、ファイルまたはサブディレクトリが含まれている場合
      console.info(`ディレクトリ ${key} は ${bucket} に存在し、以下の内容を含んでいます:`);

      data.Contents?.forEach((content) => {
        console.info(`ファイル: ${content.Key}`);
      });

      data.CommonPrefixes?.forEach((prefix) => {
        console.info(`サブディレクトリ: ${prefix.Prefix}`);
      });

      return true;
    } else {
      console.info(`ディレクトリ ${key} は ${bucket} に存在しますが、内容は空です`);
      return true;
    }
  } catch (err) {
    console.info(
      `ディレクトリ ${key} は ${bucket} に存在しません。リトライします...(試行回数: ${retries + 1})`
    );
    return false;
  }
}

// 使用例
(async () => {
  const hasAccess = await checkBucketAccess(bucket);
  if (hasAccess) {
    checkDirectoryExistsAndListContents(bucket, key).then((exists) => {
      if (exists) {
        console.log("ディレクトリが存在します");
      } else {
        console.log("ディレクトリが存在しません");
      }
    }).catch((error) => {
      console.error("エラーが発生しました:", error);
    });
  } else {
    console.log("バケットへのアクセス権がないため、ディレクトリの確認を行いません");
  }
})();
