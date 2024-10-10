# AWS s3.Assetで置き換えた場合の処理 
AWS Lambda の実行環境では、通常 /var/task/ 配下のファイルやディレクトリを確認するために、Lambda 関数の中でファイルシステムを操作して確認します。具体的には、Node.js の fs モジュールを使ってディレクトリを読み取る方法が一般的です。

## /var/task/ 配下を確認する手順
### Lambda 関数内で fs.readdirSync を使用する
Lambda のコード内で fs.readdirSync を使用して /var/task/ 配下のファイルやディレクトリを一覧表示します。
### Lambda 関数を実行して結果を確認する
以下に、実際に /var/task/ 配下のファイルやディレクトリを確認するためのコード例を示します。
#### 例: /var/task/ 配下のファイル一覧を表示する Lambda 関数
```javascript

import * as fs from 'fs';
import * as path from 'path';

export const handler = async (event: any): Promise<void> => {
  const taskDir = '/var/task/';  // /var/task 配下を確認する

  try {
    // /var/task 配下のディレクトリやファイルを読み込む
    const files = fs.readdirSync(taskDir);

    console.log(`/var/task/ のファイルとディレクトリ: ${files.join(', ')}`);

    // 各ファイル/ディレクトリの詳細も表示する
    files.forEach(file => {
      const fullPath = path.join(taskDir, file);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        console.log(`ディレクトリ: ${fullPath}`);
      } else if (stats.isFile()) {
        console.log(`ファイル: ${fullPath}`);
      }
    });
  } catch (error) {
    console.error(`/var/task 配下の確認に失敗しました: ${error.message}`);
  }
};
```
## 説明:
fs.readdirSync を使って /var/task/ 配下のファイルやディレクトリを取得しています。
fs.statSync を使用して、取得したパスがファイルかディレクトリかを確認しています。
結果は CloudWatch Logs に表示されます。Lambda 関数を実行後、CloudWatch Logs で /var/task/ 配下のファイルやディレクトリの一覧を確認できます。

### 実行結果を確認する:
Lambda 関数が実行されると、ログは CloudWatch に記録されます。
AWS マネジメントコンソールから、Lambda 関数の モニタリングタブに移動し、CloudWatch Logs で実行ログを確認します。

## まとめ:
AWS Lambda 環境で /var/task/ 配下を確認する最も簡単な方法は、Lambda 関数内で fs モジュールを使ってディレクトリの内容を読み取り、CloudWatch Logs に出力することです。この方法により、デプロイされたアセットやコードが正しく配置されているかどうかを確認することができます。


# try catch を if statementに置き換える
try-catch文をif文に置き換えることは直接はできません。try-catchは、例外が発生したときにそのエラーをキャッチして処理するための構文であり、エラーが発生しうる非同期処理やAPI呼び出しに対しては、通常のif文では適切にエラーハンドリングを行えません。
ただし、try-catchの代わりにif文を使ってエラーハンドリングを行いたい場合、エラーをtry-catchを使わずに処理する方法としては、then/catchを使ったPromiseベースの処理があります。ただし、エラーハンドリングの挙動が少し異なります。

## try-catchをthen/catchで置き換える方法
try-catchをPromiseの.then()と.catch()を使って置き換えると以下のようになります。if文はエラーチェックというより、Promiseの結果を処理するために使うことができます。

```javascript
let foundDdb = false;
let foundDestBucketA = false;
let foundRepliDenbunBucket = false;
let foundRepliPrefixBucket = false;

while (retries < maxRetries) {
  await new Promise(resolve => setTimeout(resolve, delay));

  // Try 1: DynamoDB確認 (成功した場合は次回以降スキップ)
  if (!foundDdb) {
    const dynamoParams = {
      TableName: TABLE_NAME,
      Key: { pk: filenameWithoutExtension, sk: "info" },
    };

    await docClient.get(dynamoParams).promise()
      .then(data => {
        if (data.Item) {
          foundDdb = true;
          console.log("DynamoDBチェック成功");
        } else {
          console.log("DynamoDB項目が見つかりません。リトライ中...");
        }
      })
      .catch(err => {
        console.error(`DynamoDBチェックでエラー: ${err.message}`);
      });
  }

  // Try 2: S3バケットA確認 (成功した場合は次回以降スキップ)
  if (!foundDestBucketA) {
    const headParams = {
      Bucket: DEST_BUCKET_NAME_A,
      Key: `${prefixDir}/${newFileNameBin}`,
    };

    await s3.headObject(headParams).promise()
      .then(() => {
        foundDestBucketA = true;
        console.log("S3バケットAチェック成功");
      })
      .catch(err => {
        console.error(`S3バケットAチェックでエラー: ${err.message}`);
      });
  }

  // Try 3: Replicationバケット確認 (成功した場合は次回以降スキップ)
  if (!foundRepliDenbunBucket) {
    const repliDenbunBucketHeadParams = {
      Bucket: REPLICATION_BUCKET_NAME,
      Key: `denbun/${filename}`,
    };

    await s3.headObject(repliDenbunBucketHeadParams).promise()
      .then(() => {
        foundRepliDenbunBucket = true;
        console.log("Replicationバケットチェック成功");
      })
      .catch(err => {
        console.error(`Replicationバケットチェックでエラー: ${err.message}`);
      });
  }

  retries++;
}

```

# then-catchは、
Promiseベースの非同期処理を扱う際に使われる構文です。Promiseは、将来完了するか、失敗するかが決まっていない非同期処理を扱うためのオブジェクトです。then-catchを使うことで、非同期処理が成功したときの処理と失敗したときのエラーハンドリングを簡潔に記述することができます。

## 基本的な構文
### then:
Promiseが成功（resolve）した場合の処理を行います。
成功時の結果（データなど）を受け取って、次の処理を行います。
### catch:
Promiseが失敗（reject）した場合、つまりエラーが発生した場合のエラーハンドリングを行います。
### 基本的な例:
```javascript
// 非同期関数の例
const asyncFunction = () => {
  return new Promise((resolve, reject) => {
    const success = Math.random() > 0.5; // 0.5より大きければ成功
    if (success) {
      resolve("成功しました！");
    } else {
      reject(new Error("失敗しました..."));
    }
  });
};

// then-catchの使い方
asyncFunction()
  .then(result => {
    console.log(result); // 成功時のメッセージが表示される
  })
  .catch(error => {
    console.error(error.message); // エラー発生時のメッセージが表示される
  });

```
## 詳細解説:
### Promiseオブジェクト:
上記のasyncFunctionはPromiseを返します。Promiseは、非同期処理が終了した際に、resolveされるか、rejectされるかで状態が決まります。
resolveされた場合はthenに渡され、rejectされた場合はcatchで処理されます。
### .then():
thenは、Promiseが成功した場合の処理を記述するために使用されます。成功時の結果が引数として渡されます。
上記の例では、resolve("成功しました！") が実行されると、then内の関数が呼ばれ、resultには "成功しました！" というメッセージが渡されます。
### .catch():
catchは、Promiseが失敗した場合（つまりrejectされた場合）の処理を記述します。
上記の例では、reject(new Error("失敗しました...")) が実行されると、catch内の関数が呼ばれ、エラーメッセージがerror.messageとして渡されます。

## 実際のユースケース
then-catchは、APIリクエストやファイル読み込みなど、非同期処理が関わる操作に広く使われます。
### 例: APIリクエストを使用する場合
```javascript
fetch('https://jsonplaceholder.typicode.com/todos/1')
  .then(response => response.json()) // レスポンスをJSONに変換
  .then(data => {
    console.log(data); // データをコンソールに表示
  })
  .catch(error => {
    console.error("エラーが発生しました:", error);
  });
```

#### 上記のコードの流れ:
##### fetch関数はPromiseを返し、非同期にAPIからデータを取得します。
##### APIリクエストが成功すると、thenが呼ばれ、取得したデータがresponseとして渡されます。このデータをresponse.json()でJSON形式に変換します。
##### 変換されたJSONデータが次のthenで処理されます。
##### もし何かエラー（ネットワーク障害など）が発生した場合は、catchが呼ばれ、エラーメッセージが表示されます。

## then-catchの利点
### チェーン処理: 
thenを連鎖させることで、非同期の順序を保証しながら複数の処理を行えます。たとえば、APIからデータを取得した後、そのデータを加工して次の処理に渡すことができます。
### エラーハンドリング: 
catchを使うことで、エラー発生時の一元的な処理が可能になります。複数の非同期処理をチェーンした場合でも、最後に1つのcatchでエラーハンドリングを行えます。

## まとめ
### then: Promiseが成功した場合にその結果を処理します。
### catch: Promiseが失敗した場合にエラーを処理します。
### チェーン処理: thenを使って順序立てて非同期処理を連続的に行うことができます。
### エラーハンドリングの一元化: catchを使うことで、すべての非同期処理のエラーを一括で処理できます。
### then-catchは、JavaScriptやTypeScriptで非同期処理を行う際に非常に便利なパターンです。


# break文は、ループの中でのみ使用できる文です。
そのため、console.log("ファイルが存在します", result); の後に break を使いたい場合、そのコードがwhileやforなどのループ内にある必要があります。
breakは通常、現在のループを途中で終了するために使われます。Promiseや非同期処理 (.then() や async/await) の中では、直接breakを使うことはできないため、次のようにフラグを立ててループの外側でbreakを制御する方法が必要です。
## breakを使用する方法（ループ内で使う）
### 例: async/await + try-catch を使った場合
ループの中でheadObject()を呼び出し、ファイルが存在する場合にbreakでループを終了したい場合は、次のようにフラグやtry-catchを組み合わせて使います。

```javascript
let found = false; // ファイルが見つかったかどうかを示すフラグ
let retries = 0;
const maxRetries = 5;

while (retries < maxRetries) {
  try {
    const result = await s3.headObject(headParams).promise();
    console.log("ファイルが存在します", result);
    found = true; // ファイルが見つかったのでフラグをtrueに設定
    break; // ループを抜ける
  } catch (error) {
    if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
      console.log("ファイルが存在しません");
    } else {
      console.error("エラーが発生しました:", error);
    }
  }
  
  retries++;
}

if (found) {
  console.log("ファイルが見つかりました。処理を続けます。");
} else {
  console.log("ファイルが見つかりませんでした。リトライ終了。");
}
```

# while loop とtry~catchの関数化

```javascript
const maxRetries = 5;
const delay = 1000; // 適切なディレイを設定

// S3バケット内にファイルが存在するか確認する汎用関数
async function checkFileInS3(bucketName, key) {
  let retries = 0;

  while (retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const headParams = {
      Bucket: bucketName,
      Key: key,
    };

    try {
      await s3.headObject(headParams).promise();
      console.log(`File ${key} exists in ${bucketName}`);
      return true; // ファイルが存在するので終了
    } catch (err) {
      console.error(`File ${key} does not exist in ${bucketName}, retrying...`);
    }

    retries++;
  }

  return false; // ファイルが見つからなかった場合
}

// 関数の外に変数を移動
const prefixDir = 'your-prefix';  // 置き換えてください
const newFileName = 'your-file-name';  // 置き換えてください
const filename = 'your-filename';  // 置き換えてください
const newFileNameBin = 'your-binary-filename';  // 置き換えてください

// 各バケットをチェックする関数
async function checkAllBuckets() {
  const foundDestBucketA = await checkFileInS3(DEST_BUCKET_NAME_A, `${prefixDir}/${newFileName}`);
  const foundRepliDenbunBucket = await checkFileInS3(REPLICATION_BUCKET_NAME, `denbun/${filename}`);
  const foundRepliPrefixBucket = await checkFileInS3(REPLICATION_BUCKET_NAME, `${prefixDir}/${newFileNameBin}`);

  if (foundDestBucketA && foundRepliDenbunBucket && foundRepliPrefixBucket) {
    console.log('すべてのファイルが見つかりました');
  } else {
    console.log('いくつかのファイルが見つかりませんでした');
  }
}

// 呼び出し
checkAllBuckets();
```

