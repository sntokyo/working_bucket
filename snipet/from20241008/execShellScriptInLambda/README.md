# Q: lambdaの base image としてamazon linux 2023があるそうです。stackではどう指定するのでしょう

## Answer: 
AWS Lambda 関数の Base Image として Amazon Linux 2023 を使用する場合、
AWS CDK の DockerImageFunction を利用して指定できます。
Amazon Linux 2023 は Lambda のランタイムベースイメージとして公式に提供されているため、これを基にカスタマイズが可能です。

以下に、AWS CDK スタックで Amazon Linux 2023 を指定する方法を説明します。

1. Amazon Linux 2023 ベースイメージの選択
Amazon Linux 2023 をベースに Lambda 関数を構築するには、AWS 公式の ECR
レジストリから提供されているベースイメージを利用します。AWS 公式のベースイメージは次のように指定します：

Amazon Linux 2023:
public.ecr.aws/lambda/provided:al2023

2. AWS CDK コード例
以下のように DockerImageFunction を使用して、Amazon Linux 2023 をベースにした Lambda 関数を構築します。

TypeScript の例
```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class AmazonLinux2023LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda Docker イメージ関数の作成
    const lambdaFunction = new lambda.DockerImageFunction(this, 'AmazonLinux2023Lambda', {
      code: lambda.DockerImageCode.fromImageAsset('./lambda-docker'), // Dockerfile のパス
    });
  }
}
```
3. Dockerfile の構成
Dockerfile を作成し、Amazon Linux 2023 をベースにした Lambda 実行環境を構築します。

Dockerfile の例
```Dockerfile
# Amazon Linux 2023 ベースの Lambda イメージ
FROM public.ecr.aws/lambda/provided:al2023

# 必要なパッケージをインストール
RUN yum update -y && \
    yum install -y python3 && \
    yum clean all

# Lambda 関数コードを追加
COPY app.py ${LAMBDA_TASK_ROOT}

# Lambda 関数のエントリポイントを指定
CMD ["app.lambda_handler"]
```
```python
Lambda 関数のコード (app.py)

def lambda_handler(event, context):
    return {
        "statusCode": 200,
        "body": "Hello from Amazon Linux 2023!"
    }
```
4. ディレクトリ構成
プロジェクトのディレクトリ構成は以下のようになります。
```shell
project-root/
├── cdk/
│   └── amazon-linux-2023-stack.ts  # CDK スタック定義
├── lambda-docker/
│   ├── Dockerfile                 # Amazon Linux 2023 を使用した Dockerfile
│   ├── app.py                     # Lambda 関数コード
├── package.json                   # CDK プロジェクトの依存関係
└── cdk.json                       # CDK 設定ファイル
```
5. AWS CDK デプロイ手順
依存パッケージのインストール
```shell
npm install
```
CDK スタックのデプロイ
```shell
cdk deploy
```
Lambda 関数の動作確認 デプロイ後、AWS マネジメントコンソールまたは AWS CLI を使用して Lambda 関数をテストします。

6. Amazon Linux 2023 を指定する理由
最新のセキュリティ更新。
Amazon Linux 2 よりも長期のサポート。
dnf を使用したパッケージ管理。
この設定を使用すれば、Amazon Linux 2023 を基にした Lambda 関数を簡単に構築できます！



# Q: この構成の中で、あるシェルスクリプトをtypescriptで書かれたlambda側から実行したい。

## Answer:
AWS Lambda (TypeScript で実装) から特定のシェルスクリプトを実行するには、以下の手順で実現できます。

1. 必要なファイル構成
以下のように、TypeScript を使用した Lambda 関数とシェルスクリプトを含む Docker イメージを構築します。

ディレクトリ構成の例
```shell
project-root/
├── cdk/
│   └── amazon-linux-2023-stack.ts   # CDK スタック定義
├── lambda-docker/
│   ├── Dockerfile                  # Amazon Linux 2023 用の Dockerfile
│   ├── script.sh                   # 実行したいシェルスクリプト
│   ├── index.ts                    # TypeScript Lambda 関数コード
├── package.json                    # CDK プロジェクトの依存関係
└── cdk.json                        # CDK 設定ファイル
```
2. シェルスクリプト (script.sh)
script.sh を作成し、必要なコマンドを記述します。
以下は例として、/tmp/output.txt に文字列を書き込むスクリプトです。
```shell
#!/bin/bash
echo "Hello from the shell script!" > /tmp/output.txt
```
スクリプトには実行権限を付与する必要があります。Dockerfile 内で実行権限を設定します。

3. TypeScript Lambda 関数 (index.ts)
TypeScript のコード内で、child_process モジュールを使ってシェルスクリプトを実行します。

TypeScript Lambda 関数コード

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const handler = async (event: any) => {
  try {
    // シェルスクリプトを実行
    const { stdout, stderr } = await execAsync('/var/task/script.sh');

    // 標準出力とエラーをログに表示
    console.log('STDOUT:', stdout);
    if (stderr) {
      console.error('STDERR:', stderr);
    }

    return {
      statusCode: 200,
      body: 'Shell script executed successfully!',
    };
  } catch (error) {
    console.error('Error executing script:', error);
    return {
      statusCode: 500,
      body: 'Error executing shell script.',
    };
  }
};
```

4. Dockerfile
Dockerfile にシェルスクリプトを追加し、実行権限を付与します。

```Dockerfile

# Amazon Linux 2023 ベースの Lambda イメージ
FROM public.ecr.aws/lambda/nodejs:18-al2023

# 必要なツールをインストール
RUN yum update -y && yum install -y bash && yum clean all

# Lambda 関数コードをコピー
COPY index.js ${LAMBDA_TASK_ROOT}/
COPY script.sh ${LAMBDA_TASK_ROOT}/

# シェルスクリプトに実行権限を付与
RUN chmod +x ${LAMBDA_TASK_ROOT}/script.sh

# Lambda 関数のエントリポイントを指定
CMD ["index.handler"]
```

5. AWS CDK スタック
CDK スタックで Docker イメージを利用して Lambda 関数を定義します。

CDK スタック (TypeScript)
```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class AmazonLinux2023LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda Docker イメージ関数の作成
    const lambdaFunction = new lambda.DockerImageFunction(this, 'AmazonLinux2023Lambda', {
      code: lambda.DockerImageCode.fromImageAsset('./lambda-docker'), // Dockerfile のパス
    });
  }
}
```

6. デプロイ手順
CDK の依存パッケージをインストール
```shell
npm install
```
Lambda Docker イメージをビルド CDK は自動で Docker イメージをビルドします。
スタックをデプロイ
```shell
cdk deploy
```
動作確認 AWS コンソールや AWS CLI を使用して Lambda 関数をテストします。

7. Lambda 関数からシェルスクリプトを実行する際のポイント
実行権限: シェルスクリプトに実行権限を付与することを忘れないでください（chmod +x）。
パス: シェルスクリプトのパスは、Dockerfile でコピーした場所に合わせて記述してください。
child_process モジュール: Node.js の child_process モジュールを使うと、簡単に外部コマンドを呼び出せます。
この構成で、TypeScript を使った Lambda 関数から Amazon Linux 2023 環境上でシェルスクリプトを実行できます！






