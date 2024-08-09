import { Construct } from "constructs";
import { Stack, StackProps } from "aws-cdk-lib";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Topic } from "aws-cdk-lib/aws-sns";
import { Bucket } from "aws-cdk-lib/aws-s3";

/**
 * Properties to create devops account cdk pipeline.
 *
 * @interface CdkDevOpsPipelineStackProps
 * @extends {StackProps}
 */
interface CdkDevOpsPipelineStackProps extends StackProps {
  accountNumber: string;
  region: string;
  environment: string;
  stackName: string;
  targetStacks: string[];
  resourcesNamePrefix: string;
  approvalNotifyTopic: Topic;
  nodeVersion: string;
  artifactBucket: Bucket;
}

/**
 * InfraStack to create resources for manual test execution.
 *
 * @export
 * @class InfraStack
 * @extends {Stack}
 */
export class IntegrationTestStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkDevOpsPipelineStackProps) {
    super(scope, id, props);
    
    // Define IAM policies
    const dynamoDbPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:*"],
      resources: [`arn:aws:dynamodb:${props.region}:${props.accountNumber}:table/*`],
    });

    const s3Policy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:*"],
      resources: [`arn:aws:s3:::${props.environment}-001*`],
    });

    // Define the test Lambda function
    const testLambdaFunction = new NodejsFunction(this, "TestLambdaFunction", {
      entry: path.join(__dirname, "../lambda/test-lambda"),
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: "test-table",
        BUCKET_NAME: `${props.environment}-001`,
      },
      initialPolicy: [dynamoDbPolicy, s3Policy],
    });

    // Create a CloudWatch Event rule to trigger the Lambda function manually
    new Rule(this, 'ManualTriggerRule', {
      schedule: Schedule.rate(Duration.minutes(5)), // Modify as needed
      targets: [new LambdaFunction(testLambdaFunction)],
    });
  }
}
