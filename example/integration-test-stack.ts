import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';

/**
 * Properties for IntegrationTestStack
 *
 * @interface IntegrationTestStackProps
 * @extends {cdk.StackProps}
 */
interface IntegrationTestStackProps extends cdk.StackProps {
  accountNumber: string;
  region: string;
  environment: string;
  resourceNamePrefix: string;
  nodeVersion: string;
  tableName: string;
  bucketName: string;
}

/**
 * IntegrationTestStack to create lambda for integration tests.
 *
 * @export
 * @class IntegrationTestStack
 * @extends {cdk.Stack}
 */
export class IntegrationTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IntegrationTestStackProps) {
    super(scope, id, props);

    const integrationTestLambda = new NodejsFunction(this, 'IntegrationTestLambda', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, 'integration-test/s3-dynamodb-test.ts'),
      environment: {
        TABLE_NAME: props.tableName,
        BUCKET_NAME: props.bucketName,
      },
    });

    // Grant necessary permissions to the Lambda function
    const table = Table.fromTableName(this, 'DynamoDBTable', props.tableName);
    table.grantReadWriteData(integrationTestLambda);

    const bucket = Bucket.fromBucketName(this, 'S3Bucket', props.bucketName);
    bucket.grantReadWrite(integrationTestLambda);

    integrationTestLambda.addToRolePolicy(new PolicyStatement({
      actions: ['codepipeline:PutJobSuccessResult', 'codepipeline:PutJobFailureResult'],
      resources: ['*'],
    }));
  }
}
