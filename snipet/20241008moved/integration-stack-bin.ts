#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';

const app = new cdk.App();

const accountNumber = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
const environment = 'dev';  // 'dev', 'staging', 'prod'などの環境を指定

new InfraStack(app, 'InfraStack', {
  accountNumber: accountNumber!,
  region: region!,
  environment: environment,
  stackName: 'MyInfraStack',
  targetStacks: ['infra'],
  resourcesNamePrefix: 'my-resources',
  approvalNotifyTopic: new cdk.aws_sns.Topic(app, 'ApprovalNotifyTopic'),
  nodeVersion: '14.x',
  artifactBucket: new cdk.aws_s3.Bucket(app, 'ArtifactBucket')
});
