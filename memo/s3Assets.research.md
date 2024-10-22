# アセット (Asset) と アーティファクト (Artifact)
AWS CDK における アセット (Asset) と アーティファクト (Artifact) はどちらもリソースを管理・デプロイする際に使われるものですが、役割と使用方法が異なります。
それぞれの違いについて説明します。

## アセット (Asset)
アセット (Asset) とは、AWS CDK アプリケーションのデプロイに必要なファイルやリソース（静的ファイル）を指します。
これには、Lambda のコード、Docker イメージ、静的ウェブサイトのファイルなどが含まれます。
アセットは、デプロイ時に AWS にアップロードされ、リソースとして利用されます。

### 使用例:
Lambda 関数のコードを CDK アプリケーションで管理する場合、そのコードを AWS S3 にアップロードして Lambda に渡す必要があります。
そのために s3.Asset を使って、Lambda 関数のコードを S3 にアップロードします。
Docker コンテナのイメージを使用する ECS タスクで、ローカルでビルドした Docker イメージをデプロイするためのアセットとして定義することも可能です。

###  特徴:
s3.Asset クラスを使ってアセットを指定することで、CDK によってそのファイルが S3 にアップロードされ、デプロイの一部として利用されます。
アセットは ブートストラップによって作成される S3 バケット を利用して管理されます。

### 用途:
Lambda コードのアップロード: `new s3.Asset()` を使用して、Lambda のソースコードを S3 にアップロード。
静的ファイル: 静的ウェブサイトのホスティング用に HTML ファイルをアセットとして管理。
Docker イメージ: Docker イメージを ECR にプッシュするためにアセットとして扱う。


## アーティファクト (Artifact)
アーティファクト (Artifact) は、AWS CodePipeline やデプロイプロセスにおいて管理されるデータや成果物を指します。
これには、ビルドの出力物、テスト結果、リリース対象のアプリケーションバンドルなどが含まれます。

### 使用例:
AWS CodePipeline では、ソースコードの取得、ビルド、テスト、そしてデプロイといった各ステージ間でやり取りされるデータをアーティファクトとして管理します。
例えば、ソースコードを Source ステージで取得し、それを Build ステージでビルドし、Deploy ステージでデプロイする場合、各ステージ間の成果物がアーティファクトとなります。
CodeBuild でビルドされた出力ファイルを次のステージに渡す際、アーティファクトとして扱います。

### 特徴:
成果物や中間生成物: アーティファクトは、CodePipeline の各ステージで生成された成果物や、中間生成物を次のステージに渡すためのものです。
管理対象: ソースコード、ビルド結果（ZIP や WAR ファイルなど）、テストレポートなどが含まれます。

### 用途:
CI/CD プロセス: ソースコードからビルドを行い、その結果をデプロイする際に、パイプラインの各ステージでアーティファクトを使用します。
アーティファクトの格納場所: アーティファクトは S3 に保存されることが多いです。
CodePipeline では、アーティファクトの保存先として S3 を利用します。


| 項目           | アセット (Asset)                                | アーティファクト (Artifact)                    |
| -------------- | ---------------------------------------------- | ---------------------------------------------- |
| **目的**       | 静的リソース（コード、ファイルなど）のデプロイ時の利用 | パイプライン内で生成・共有される成果物          |
| **使用場所**   | Lambda 関数のコード、静的ファイル、Docker イメージ | CodePipeline の各ステージ間でのデータのやり取り |
| **管理方法**   | `s3.Asset` で S3 にアップロード                 | パイプライン内で S3 に格納                      |
| **デプロイ対象**| AWS リソース（Lambda、ECS など）にデプロイ      | CI/CD プロセスの一部として使用                  |
| **生成方法**   | CDK によって静的ファイルが管理される            | CodePipeline や CodeBuild によって生成される    |

## 具体的な例

### アセット:
Lambda のコードを AWS CDK でデプロイする際に、new s3.Asset() を使用して、ローカルのソースコードを S3 にアップロードし、Lambda のコードとしてデプロイします。

### アーティファクト:
CodePipeline の Source ステージで GitHub からコードを取得し、それを Build ステージでビルドした後に、Deploy ステージでデプロイします。
このとき、Source ステージから Build ステージ、そして Deploy ステージへと渡されるデータはすべてアーティファクトとして管理されます。

## まとめ
```アセット (Asset)``` は、AWS CDK で Lambda コードや静的リソースをアップロードするためのリソース管理の単位です。
S3 バケットに保存され、AWS の他のサービスで利用されます。
```アーティファクト (Artifact)``` は、主に CodePipeline などの CI/CD パイプラインで生成された成果物や中間生成物です。
各ステージ間でデータを渡す際に利用されます。
アセットはデプロイに必要な静的リソースとして、アーティファクトは CI/CD プロセス内で生成・共有される成果物として利用される点で異なります。


# bootstrap
s3.Asset で使用される S3 バケットは、AWS CDK の bootstrap プロセスによって作成されます。
このバケットは、CDK アプリケーションで使用するアセット（例えば、Lambda のコードやデプロイする静的ファイルなど）を保存するために使用されます。

## Bootstrap の役割
AWS CDK の bootstrap コマンドは、CDK スタックをデプロイするために必要な共有リソース（「環境」リソースと呼ばれるもの）をセットアップします。
具体的には、次のようなリソースが含まれます：

### S3 バケット:

#### アセットバケット: CDK がアセットを保存するために使用します。これはコードや静的リソースを AWS にデプロイする前に、一時的に保存しておくためのバケットです。
たとえば、Lambda のコードや ECS のタスク定義ファイルなど、スタックに含まれるアセットが一時的にこのバケットにアップロードされ、デプロイされます。

#### IAM ロール:
デプロイの際に使用される権限: CDK がリソースを作成するための権限が必要になる場合があります。
これらのロールも bootstrap によってセットアップされます。

### S3 アセットバケットの特徴
#### 名前の生成:
この S3 バケットの名前は通常自動生成され、形式としては``` cdk-<リージョン>-assets-<アカウントID> ```のような形になります。
このため、CDK によってプロジェクトやリージョンごとにユニークな名前のバケットが作成されます。

#### アセットのアップロードと管理:
s3.Asset を使用すると、そのアセットは最初にこの自動生成された S3 バケットにアップロードされ、次に他のリソースで使用されます（例えば、Lambda 関数のデプロイコードとして使用されるなど）。
CDK はこのバケットを管理し、必要に応じて古いアセットを削除するなど、リソースを効率的に使うように設計されています。

#### Bootstrap の実行
CDK を初めて使う際には、以下のように bootstrap コマンド を実行しておく必要があります。このコマンドを実行することで、必要なリソース（S3バケットなど）が準備されます。
```sh
cdk bootstrap
```
```cdk bootstrap ```コマンドを実行すると、現在の AWS アカウントとリージョンに対応した必要なリソースがすべて作成されます。

### デプロイ時の利用:
このブートストラップ S3 バケットに対して、AWS CDK はアセットをアップロードし、それらを各リソース（例えば Lambda 関数）にデプロイします。

### ブートストラップバケットの注意点
バケットの名前は固定ではないため、AWS アカウントやリージョンによって異なります。
このバケットは CDK によって自動管理されるため、手動で変更したり削除したりすることは推奨されません。
手動で操作することで不整合が発生し、デプロイ時にエラーが発生する可能性があります。
エラー回避のためにもし誤って S3 バケット内のアセットを手動で削除した場合やバケット自体を削除した場合、
CDK の次回デプロイ時に bootstrap を再実行して再セットアップすることで問題を修正できます。

## まとめ
s3.Asset バケットは cdk bootstrap によって作成される: このバケットは、デプロイ用のアセットを保存するための一時的な場所です。
自動管理される: CDK によって自動的に管理されるため、通常、手動で削除したり変更したりするのは避けるべきです。
初回の CDK セットアップ時には ```cdk bootstrap``` が必要: これを実行することで、デプロイに必要な基盤リソース（S3 バケット、IAM ロールなど）が作成されます。
CDK のアセット管理は自動化されており、bootstrap プロセスを使うことで、AWS リソースを効率的かつ安全に管理できるようになっています。

# AWS S3 に存在するアセットを削除（原則やめた方がいい）

AWS CDK で既に S3 に存在するアセット（s3.Asset を通じてアップロードされたファイル）を削除するためには、次の手順を使って削除処理を実装します。

## 手順1: AWS SDK を使って S3 ファイルを削除
S3 に存在するアセットを削除するために、Lambda 関数を作成し、その中で AWS SDK を利用して削除します。
この場合、アセットバケット名とオブジェクトキーを特定する必要があります。

以下に cdk を使って Lambda 関数を作成し、その中でアセットを削除する方法を説明します。

### Step-by-Step 実装例
アセットのバケット名とオブジェクトキーを取得
`s3.Asset` オブジェクトから、バケット名とオブジェクトキーを取得します。


```javascript
import { Construct } from 'constructs';
import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3-assets';
import * as s3Buckets from 'aws-cdk-lib/aws-s3';

interface S3DeleteAssetStackProps extends StackProps {}

export class S3DeleteAssetStack extends Stack {
  constructor(scope: Construct, id: string, props: S3DeleteAssetStackProps) {
    super(scope, id, props);

    // アセットの生成
    const sampleXmlAsset = new s3.Asset(this, 'SampleXmlAsset', {
      path: path.join(__dirname, 'integration-test/sample/xml'),
    });

    // アセットのバケット名とオブジェクトキーを取得
    const bucketName = sampleXmlAsset.bucket.bucketName;
    const objectKey = sampleXmlAsset.s3ObjectKey;

    // Lambda 関数を定義して、S3からオブジェクトを削除
    const deleteLambda = new NodejsFunction(this, 'S3DeleteFunction', {
      runtime: Runtime.NODEJS_18_X,
      entry: path.join(__dirname, 'lambda/s3-delete-handler.ts'), // Lambda ハンドラーのコードパス
      handler: 'handler',
      timeout: Duration.seconds(10),
      environment: {
        BUCKET_NAME: bucketName,
        OBJECT_KEY: objectKey,
      },
    });

    // Lambda 関数にバケットの削除権限を付与
    sampleXmlAsset.bucket.grantDelete(deleteLambda);
  }
}

```

## Step 2: Lambda ハンドラー関数の実装
以下は、Lambda 関数で S3 のオブジェクトを削除するためのハンドラー関数の例です。
```javascript
import * as AWS from 'aws-sdk';
import { Handler } from 'aws-lambda';

// S3クライアントの初期化
const s3 = new AWS.S3();

// Lambda ハンドラー関数
export const handler: Handler = async () => {
  const bucketName = process.env.BUCKET_NAME!;
  const objectKey = process.env.OBJECT_KEY!;

  try {
    // S3 バケットからオブジェクトを削除
    await s3
      .deleteObject({
        Bucket: bucketName,
        Key: objectKey,
      })
      .promise();

    console.log(`バケット ${bucketName} からオブジェクト ${objectKey} を正常に削除しました`);
  } catch (error) {
    console.error(`オブジェクトの削除中にエラーが発生しました: ${error}`);
  }
};
```
## Step 3: まとめ
### バケット名とオブジェクトキーの取得:
`s3.Asset` クラスには bucket プロパティ（`sampleXmlAsset.bucket.bucketName`）があり、バケット名を取得できます。
また、オブジェクトキー（`sampleXmlAsset.s3ObjectKey`）も取得できます。

### Lambda 関数の環境変数に渡す:
bucketName と objectKey を Lambda 関数の環境変数に渡し、S3 のオブジェクトを削除する処理を行います。

### バケットへのアクセス権限:
Lambda 関数がバケットからファイルを削除するには、S3 バケットに対して DeleteObject 権限を持つ必要があります。
これは `sampleXmlAsset.bucket.grantDelete(deleteLambda)` を使って実現します。

## 注意点
1. 削除対象のバケットに関する権限:
Lambda 関数が削除対象のバケットやオブジェクトにアクセスできるように、適切な IAM ポリシーを設定する必要があります。
2. 削除時の確認:
アセットが意図したものであるか確認し、誤ったファイルを削除しないように注意してください。
3. AWS CDK の再デプロイ:
ファイルが手動で削除された場合や Lambda で削除した場合、次回のデプロイ時には AWS CDK がそれを認識し、必要に応じてアセットを再アップロードします。
再アップロードが不要な場合、スタックの再デプロイ時に cdk.out ディレクトリをクリアすることも検討してください。
これで、`s3.Asset` を使って AWS S3 にアップロードされたファイルを、Lambda を使用して削除することができます。


## new s3.Asset を使った場合 
`new s3.Asset` を使った場合、CDK は通常デプロイ時に内部で自動的にS3バケットを生成して、そのバケットにアセットをアップロードします。
このバケットの名前はデフォルトではランダムに生成され、スタックの出力やCloudFormationのリソースから確認できます。

アセットがアップロードされるS3バケットについて確認する方法は以下の通りです：

## CloudFormationスタック出力の確認:
デプロイされたスタックのCloudFormationリソースには、アセットがアップロードされたS3バケットが含まれています。
CloudFormationコンソールからそのスタックを選択し、リソースの一覧を確認してください。
出力 (CfnOutput) にS3バケット名を明示的に追加することで簡単に確認できますが、このコードではその出力は指定されていないので手動で確認する必要があります。

## CDKのデプロイログの確認:
cdk deploy を実行した際のログにアップロード先のS3バケット情報が表示されます。ここでどのS3バケットにアセットがアップロードされたのか確認することができます。

## CloudFormationのリソースセクションで確認する:
AWS管理コンソールで対象のCloudFormationスタックにアクセスし、「リソース」タブで `AWS::S3::Bucket` タイプのリソースを確認します。
CDKによって生成されたアセット用のバケットがリストに表示されます。
まとめると、`new s3.Asset` でアップロードされるバケットはCDKが自動的に生成するため、明示的に指定されない限り、ランダムな名前のS3バケットにアップロードされます。
そのバケット名を確認するには、CloudFormationのリソースを確認するか、デプロイ時のログを確認する必要があります。

もし明示的にS3バケットを特定したい場合は、次のようにS3アセットをカスタムバケットにデプロイすることも可能です：

```javascript
const sampleXmlAsset = new s3.Asset(this, 'SampleXmlAsset', {
  path: path.join(__dirname, 'integration-test/sample/xml'),
  bucket: s3Buckets.Bucket.fromBucketName(this, 'MyCustomBucket', 'YourCustomBucketName')
});
```
こうすることで、アセットを特定のバケットにデプロイすることができます。

## cdk の s3.Asset を使ってアップロードされたアセットの削除は
cdk の s3.Asset を使ってアップロードされたアセットの削除は少し特殊です。
なぜなら、s3.Asset は cdk が自動で管理するため、バケット名とオブジェクトキーが自動生成されるからです。この情報を取得して削除するには、少し工夫が必要です。

### 削除のための情報取得手順
AWS CDK の s3.Asset は、自動生成されたバケットにファイルをアップロードしますが、そのバケット名やオブジェクトキーは次のように取得できます。

1. s3.Asset のオブジェクトからバケット名とオブジェクトキーを取得

Asset インスタンスには、アップロードされたアセットに関する情報（バケット名とS3キー）を提供するプロパティがあります。これを利用して Lambda に情報を渡すことができます。

例: Lambda 用の削除処理コード
CDK スタックでの Lambda 定義
まず、AWS CDK スタック内でアセットを作成し、それを削除するための Lambda 関数を定義します。
アセットがどこにアップロードされたかを知るため、Asset オブジェクトから情報を取得します。

```javascript
import { Construct } from 'constructs';
import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3-assets';
import * as s3Buckets from 'aws-cdk-lib/aws-s3';

interface S3DeleteLambdaStackProps extends StackProps {}

export class S3DeleteLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props: S3DeleteLambdaStackProps) {
    super(scope, id, props);

    // 必要なファイルを含めるためにアセットを指定
    const sampleXmlAsset = new s3.Asset(this, 'SampleXmlAsset', {
      path: path.join(__dirname, 'integration-test/sample/xml'),
    });

    // アセットのバケット名とキーを取得
    const bucketName = sampleXmlAsset.bucket.bucketName;
    const objectKey = sampleXmlAsset.s3ObjectKey;

    // Lambda 関数を定義
    const deleteLambda = new NodejsFunction(this, 'S3DeleteFunction', {
      runtime: Runtime.NODEJS_18_X,
      entry: path.join(__dirname, 'lambda/s3-delete-handler.ts'), // Lambda ハンドラーコードのパス
      handler: 'handler',
      timeout: Duration.seconds(10),
      environment: {
        BUCKET_NAME: bucketName,
        OBJECT_KEY: objectKey,
      },
    });

    // S3 バケットへのアクセス権限を Lambda 関数に付与
    sampleXmlAsset.bucket.grantDelete(deleteLambda);
  }
}

```

2. Lambda ハンドラーコード
Lambda ハンドラーで、環境変数からバケット名とオブジェクトキーを取得し、それを使って S3 のオブジェクトを削除します。
```javascript
import * as AWS from 'aws-sdk';
import { Handler } from 'aws-lambda';

// S3クライアントの初期化
const s3 = new AWS.S3();

// Lambda ハンドラー関数
export const handler: Handler = async () => {
  const bucketName = process.env.BUCKET_NAME!;
  const objectKey = process.env.OBJECT_KEY!;

  try {
    // S3 バケットからオブジェクトを削除
    await s3
      .deleteObject({
        Bucket: bucketName,
        Key: objectKey,
      })
      .promise();

    console.log(`バケット ${bucketName} からオブジェクト ${objectKey} を正常に削除しました`);
  } catch (error) {
    console.error(`オブジェクトの削除中にエラーが発生しました: ${error}`);
  }
};
```

3. 詳細な説明
アセットの生成と情報取得:
`new s3.Asset(...)` により、指定されたファイルをアップロードするアセットが作成されます。
``sampleXmlAsset.bucket.bucketName`` と ``sampleXmlAsset.s3ObjectKey`` 
を使用して、バケット名とオブジェクトキーを取得します。

Lambda の環境変数に渡す:
取得した bucketName と objectKey を Lambda 関数の環境変数 (BUCKET_NAME と OBJECT_KEY) として渡します。

S3 バケットへのアクセス権限:
Lambda 関数が S3 バケットからファイルを削除できるように、``sampleXmlAsset.bucket.grantDelete(deleteLambda)`` 
を使用して、バケットへの削除権限を付与します。
