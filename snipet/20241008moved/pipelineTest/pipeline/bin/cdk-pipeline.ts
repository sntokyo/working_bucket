#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { NotifyStack } from "../lib/notify-stack";
import { DevopsPipelineStack } from "../lib/devops-pipeline-stack";
import { InfraPipelineStack } from "../lib/infra-pipeline-stack";
import { ReadConfigJson } from "../utils/config-util";
import { ArtifactBucketStack } from "../lib/artifactbucket-stack";
import { IntegrationTestPipelineStack } from "../lib/integration-test-pipeline-stack";

const app = new cdk.App();


const envConfig: string = app.node.tryGetContext("env");
console.log(envConfig);
const configJson = ReadConfigJson.getConfigJson(envConfig);

const account = configJson["account"];
const github = configJson["github"];
const nodeVersion = configJson["nodeVersion"];

const targetStackNames = configJson["Stacks"];

let deploymentType = app.node.tryGetContext("deploymentType");
if (deploymentType === undefined) {
  deploymentType = "devops";
}

const notifyStack = new NotifyStack(app, account.resourceNamePrefix + "pipeline-notify-" + envConfig, {
  accountNumber: account.accountNumber,
  region: account.pipelineRegion,
  environment: account.environment,
  resourceNamePrefix: account.resourceNamePrefix,
  approvalNotifyEmails: configJson.approvalNotifyEmails
  // approvalNotifyEmails: Array.isArray(configJson.approvalNotifyEmails) ? configJson.approvalNotifyEmails : [configJson.approvalNotifyEmails],
});

const artifactBucketStack = new ArtifactBucketStack(
    app,
    account.resourceNamePrefix + "-pipeline-artifact-bucket-" + envConfig,
    {
        accountNumber: account.accountNumber,
        region: account.pipelineRegion,
        environment: account.environment,
        resourceNamePrefix: account.resourceNamePrefix,
    }
);

if (deploymentType === "devops") {
  const stackName = account.resourceNamePrefix + "-pipeline-devops-" + envConfig;
  new DevopsPipelineStack(app, stackName, {
    description: "This stack is cdk infra pipline for the account ${account.accountNumber} and region ${account.piplineRegion}",
    accountNumber: account.accountNumber,
    region: account.pipelineRegion,
    stackName: stackName,
    environment: account.environment,
    resourceNamePrefix: account.resourceNamePrefix,
    githubConnectionArn: github.githubConnectionArn,
    githubOwner: github.githubOwner,
    githubRepository: github.githubRepository,
    githubBranch: github.githubBranch,
    triggerOnPush: account.triggerOnPush,
    approvalNotifyTopic: notifyStack.notifyTopic,
    nodeVersion: nodeVersion,
    deploymentType: deploymentType,
    artifactBucket: artifactBucketStack.artifactBucket,
  });
}

if (deploymentType === "infra" && envConfig !== "ntdev" && envConfig !== "stg") {
  // envConfigがntdevまたはstgでない場合に適用される条件
  const stackName = account.resourceNamePrefix + "-pipeline-infra-" + envConfig;
  new InfraPipelineStack(app, stackName, {
    description: "This stack is cdk infra stack for the account ${account.accountNumber} and region ${account.region}",
    accountNumber: account.accountNumber,
    region: account.region,
    environment: account.environment,
    stackName: stackName,
    targetStacks: targetStackNames,
    resourceNamePrefix: account.resourceNamePrefix,
    githubConnectionArn: github.githubConnectionArn,
    githubOwner: github.githubOwner,
    githubRepository: github.githubRepository,
    githubBranch: github.githubBranch,
    triggerOnPush: account.triggerOnPush,
    approvalNotifyTopic: notifyStack.notifyTopic,
    nodeVersion: nodeVersion,
    deploymentType: deploymentType,
    artifactBucket: artifactBucketStack.artifactBucket,
  });
} else if ((envConfig === "ntdev" || envConfig === "stg") && deploymentType === "infra") {
  // envConfigがntdevまたはstgであり、かつdeploymentTypeがinfraの場合に適用される条件
  const stackName = account.resourceNamePrefix + "-pipeline-integration-test-" + envConfig;
  new IntegrationTestPipelineStack(app, stackName, {
    description: "This stack is cdk infra stack for the account ${account.accountNumber} and region ${account.region}",
    accountNumber: account.accountNumber,
    region: account.region,
    environment: account.environment,
    stackName: stackName,
    targetStacks: targetStackNames,
    resourceNamePrefix: account.resourceNamePrefix,
    githubConnectionArn: github.githubConnectionArn,
    githubOwner: github.githubOwner,
    githubRepository: github.githubRepository,
    githubBranch: github.githubBranch,
    triggerOnPush: false, // triggerOnPushをオフに設定
    approvalNotifyTopic: notifyStack.notifyTopic,
    nodeVersion: nodeVersion,
    deploymentType: deploymentType,
    artifactBucket: artifactBucketStack.artifactBucket,
  });
}
