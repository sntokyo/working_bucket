#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkWs09LambdaCheckS3DynamodbStack } from "../lib/cdk-ws09-lambda-check-s3-dynamodb-stack";

const app = new cdk.App();
new CdkWs09LambdaCheckS3DynamodbStack(
  app,
  "CdkWs09LambdaCheckS3DynamodbStack",
  {},
);
