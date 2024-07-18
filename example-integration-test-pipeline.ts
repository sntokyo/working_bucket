import { Construct } from "constructs";
import { Stack, StackProps } from "aws-cdk-lib";
import { CodeStarConnectionsSourceAction, ManualApprovalAction } from "aws-cdk-lib/aws-codepipeline-actions"; 
import { Pipeline, Artifact, PipelineType } from "aws-cdk-lib/aws-codepipeline";
import { CdkBootstrapStep } from "../classes/cdk-bootstrap-step";
import { CdkDeployStep } from "../classes/cdk-deploy-step";
import { CdkDiffStep } from "../classes/cdk-diff-step";
import { Topic } from "aws-cdk-lib/aws-sns";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { IntegrationTestStack } from "./integration-test-stack";

/**
 * Properties to create pipeline stack
 *
 * @interface PipelineStackProps
 * @extends {StackProps}
 */
interface PipelineStackProps extends StackProps {
  accountNumber: string;
  region: string;
  environment: string;
  githubBranch: string;
  stackName: string;
  resourceNamePrefix: string;
  githubConnectionArn: string;
  githubOwner: string;
  githubRepository: string;
  triggerOnPush: boolean;
  approvalNotifyTopic: Topic;
  nodeVersion: string;
  deploymentType: string;
  artifactBucket: Bucket;
}

/**
 * PipelineStack to create end-to-end testing pipeline.
 *
 * @export
 * @class PipelineStack
 * @extends {Stack}
 */
export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);
    const sourceOutput = new Artifact();

    // Integration Test Stack
    const integrationTestStack = new IntegrationTestStack(this, `${props.resourceNamePrefix}-IntegrationTestStack`, {
      accountNumber: props.accountNumber,
      region: props.region,
      environment: props.environment,
      resourceNamePrefix: props.resourceNamePrefix,
      nodeVersion: props.nodeVersion,
      tableName: 'YourTableName',
      bucketName: 'YourBucketName',
    });

    new Pipeline(this, id, {
      pipelineName: props.resourceNamePrefix + "-pipeline-e2e-" + props.environment,
      restartExecutionOnUpdate: true,
      crossAccountKeys: false,
      artifactBucket: props.artifactBucket,
      stages: [
        {
          stageName: "Source",
          actions: [
            new CodeStarConnectionsSourceAction({
              actionName: "GitHub",
              owner: props.githubOwner,
              branch: props.githubBranch,
              repo: props.githubRepository,
              output: sourceOutput,
              connectionArn: props.githubConnectionArn,
              triggerOnPush: props.triggerOnPush,
            }),
          ],
        },
        {
          stageName: "Build",
          actions: [
            new CdkBootstrapStep(this, "PipelineBootstrap", {
              accountId: props.accountNumber,
              environment: props.environment,
              input: sourceOutput,
              runOrder: 1,
              actionName: "cdk-bootstrap",
              region: props.region,
              stackName: this.stackName,
              projectName: props.resourceNamePrefix + "-codebuild-cdk-bootstrap-e2e",
              nodeVersion: props.nodeVersion,
              deploymentType: props.deploymentType,
            }),
            new CdkDiffStep(this, "PipelineDiff", {
              accountId: props.accountNumber,
              environment: props.environment,
              input: sourceOutput,
              runOrder: 2,
              actionName: "cdk-diff",
              region: props.region,
              stackName: this.stackName,
              projectName: props.resourceNamePrefix + "-codebuild-cdk-diff-pipeline-e2e",
              nodeVersion: props.nodeVersion,
              deploymentType: props.deploymentType,
              variablesNamespace: "DIFF_VARIABLES",
              variablesEnvName: "DIFF_STATUS",
            }),
          ],
        },
        {
          stageName: "IntegrationTest",
          actions: [
            new CdkDeployStep(this, "IntegrationTestDeploy", {
              accountId: props.accountNumber,
              environment: props.environment,
              input: sourceOutput,
              runOrder: 1,
              actionName: "integration-test-deploy",
              region: props.region,
              stackName: integrationTestStack.stackName,
              projectName: props.resourceNamePrefix + "-codebuild-integration-test",
              nodeVersion: props.nodeVersion,
              deploymentType: props.deploymentType,
            }),
          ],
        },
        {
          stageName: "Deploy",
          actions: [
            new ManualApprovalAction({
              actionName: "manual-approval-to-deploy-pipeline",
              notificationTopic: props.approvalNotifyTopic,
              runOrder: 1,
              additionalInformation: "#{DIFF_VARIABLES.DIFF_STATUS}",
            }),
            new CdkDeployStep(this, "PipelineDeploy", {
              accountId: props.accountNumber,
              environment: props.environment,
              input: sourceOutput,
              runOrder: 2,
              actionName: "cdk-deploy",
              region: props.region,
              stackName: this.stackName,
              projectName: props.resourceNamePrefix + "-codebuild-cdk-deploy-pipeline-e2e",
              nodeVersion: props.nodeVersion,
              deploymentType: props.deploymentType,
            }),
          ],
        },
      ],
    });
  }
}
