import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda";
// https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_lambda/Function.html
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as eventsources from "aws-cdk-lib/aws-lambda-event-sources";
import * as path from "path";

export class CdkWs09LambdaCheckS3DynamodbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3バケットの作成
    const bucket = new s3.Bucket(this, "MyBucket20240620", {
      versioned: false,
    });

    // DynamoDBテーブルの作成
    const table = new dynamodb.Table(this, "MyTable20240620", {
      partitionKey: { name: "filename", type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_IMAGE, // DynamoDBストリームを有効化
    });

    // Lambda関数の作成
    const lambdaFunction = new lambda.NodejsFunction(
      this,
      "MyFunction20240620",
      {
        runtime: Runtime.NODEJS_18_X,
        entry: path.join(__dirname, "../lambda/index.ts"),
        handler: "handler",
        environment: {
          TABLE_NAME: table.tableName,
        },
      },
    );

    // Lambda関数にS3イベントをトリガーとして追加
    lambdaFunction.addEventSource(
      new eventsources.S3EventSource(bucket, {
        events: [s3.EventType.OBJECT_CREATED],
      }),
    );

    // Lambda関数にDynamoDBストリームをトリガーとして追加
    lambdaFunction.addEventSource(
      new eventsources.DynamoEventSource(table, {
        startingPosition: StartingPosition.TRIM_HORIZON,
      }),
    );

    // Lambda関数にDynamoDBへの書き込み権限を付与
    table.grantWriteData(lambdaFunction);

    // Lambda関数にS3バケットからの読み取り権限を付与
    bucket.grantRead(lambdaFunction);

    // テスト用Lambda関数の作成
    const testLambdaFunction = new lambda.NodejsFunction(
      this,
      "TestFunction20240620",
      {
        runtime: Runtime.NODEJS_18_X,
        entry: path.join(
          __dirname,
          "../test/cdk-ws09-lambda-check-s3-dynamodb.test.ts",
        ),
        handler: "handler",
        timeout: cdk.Duration.seconds(10),  // タイムアウトを10秒に設定
        environment: {
          TABLE_NAME: table.tableName,
          BUCKET_NAME: bucket.bucketName,
        },
      },
    );

    // テスト用Lambda関数にDynamoDBへのアクセス権限を付与
    table.grantReadWriteData(testLambdaFunction);

    // テスト用Lambda関数にS3バケットへのアクセス権限を付与
    bucket.grantReadWrite(testLambdaFunction);
  }
}
