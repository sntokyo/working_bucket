import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { s3DynamodbTestStack } from "../lib/s3-dynamodb-test-stack";

const app = new cdk.App();

new s3DynamoDBTestStack(app, "s3DynamoDBTestStack",{
  accountNumber: accountNumber!,
  region: region!,
  environment: environment,
  stackName: "s3DynamodbTestStack",
  resourceNamePrefix: "s3DynamodbTestStack-resources",
});

