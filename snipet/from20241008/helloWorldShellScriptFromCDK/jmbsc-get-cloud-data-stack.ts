import * as cdk from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export class JmbscGetCloudDataStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getCloudDataLambda = new lambdaNodejs.NodejsFunction(this, 'GetCloudDataLambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X, // Node.jsランタイム
      entry: path.join(__dirname, 'jmbsc-get-cloud-data-stack.get.ts'), // Lambdaエントリポイント
      handler: 'handler', // Lambdaのエクスポート関数名
      bundling: {
        // カスタムバンドリング
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [
              // ディレクトリ全体をコピー
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
      },
      environment: {
        SCRIPT_PATH: '/var/task/jmbsc-get-cloud-data-stack.get.script/hello.sh', // シェルスクリプトのパス
      },
    });
  }
}
