import * as cdk from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export class JmbscGetCloudDataStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getCloudDataLambda = new lambdaNodejs.NodejsFunction(this, 'GetCloudDataLambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X, // Amazon Linux 2023 対応のランタイム
      entry: path.join(__dirname, 'jmbsc-get-cloud-data-stack.get.ts'), // Lambdaエントリポイント
      handler: 'handler', // Lambdaのエクスポート関数名
      bundling: {
        // カスタムバンドリング
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [
              // ディレクトリ全体を再帰的にコピー
              `cp -r ${path.join(inputDir, 'jmbsc-get-cloud-data-stack.get.script')} ${outputDir}`,
            ];
          },
          afterBundling(): string[] {
            return [];
          },
          beforeInstall(): string[] {
            return [];
          },
        },
        // Amazon Linux 2023 用のバンドル設定
        image: lambdaNodejs.Runtime.NODEJS_18_X.bundlingDockerImage,
      },
      environment: {
        SCRIPT_PATH: '/var/task/jmbsc-get-cloud-data-stack.get.script/hello.sh', // シェルスクリプトのパス
      },
    });
  }
}
