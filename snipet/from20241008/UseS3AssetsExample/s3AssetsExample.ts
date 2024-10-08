import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3-assets';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';

export class MyLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // サンプルファイルを含める
    const myLambdaFunction = new NodejsFunction(this, 'MyLambdaFunction', {
      entry: path.join(__dirname, 'lambda/index.ts'),  // エントリポイント
      handler: 'handler',
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      environment: {
        SAMPLE_XML_DIR: '/var/task/sample/xml',  // 環境変数でファイルパスを設定
      }
    });

    // 必要なファイルを含めるためにアセットを指定
    new s3.Asset(this, 'SampleXmlAsset', {
      path: path.join(__dirname, 'sample/xml'), // ディレクトリをパッケージ化
    });
  }
}
// sample/xml ディレクトリをLambdaにパッケージ化し、環境変数として SAMPLE_XML_DIR を設定しています。このパスを Lambda 内で参照することで、必要なファイルにアクセスできます。
// environment: { SAMPLE_XML_DIR: '/var/task/sample/xml' } の部分で指定している /var/task は、AWS Lambda にデプロイされたコードやアセットがデフォルトで展開されるディレクトリです。
// つまり、Lambda が実行される環境内で、デプロイしたファイル（アセット）が /var/task の下に配置されるため、/var/task/sample/xml というパスは、デプロイしたアセット（sample/xml ディレクトリ）が配置される場所として事実上決まった値になります。
// 詳細説明:
// /var/task: AWS Lambda でデプロイされたコードとアセットは、このディレクトリに展開されます。これは AWS Lambda 環境での標準の配置場所です。
// /sample/xml: この部分は、あなたが指定したアセットの相対パスです。コードやファイルをパッケージ化する際に、このパスが /var/task の下に配置されることになります。

