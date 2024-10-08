import { Construct } from "constructs";
import { Stack, StackProps } from "aws-cdk-lib";
import { CodeStarConnectionsSourceAction, ManualApprovalAction, LambdaInvokeAction } from "aws-cdk-lib/aws-codepipeline-actions"; 
import { Pipeline, Artifact, PipelineType } from "aws-cdk-lib/aws-codepipeline";
import { CdkBootstrapStep } from "../classes/cdk-bootstrap-step";
import { CdkDeployStep } from "../classes/cdk-deploy-step";
import { CdkDiffStep } from "../classes/cdk-diff-step";
import { Topic } from "aws-cdk-lib/aws-sns";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { IntegrationTestStack } from "../../integration-test/lib/integration-test-stack"; // インポート追加

interface CdkDevOpsPipelineStackProps extends StackProps {
  accountNumber: string;
  region: string;
  environment: string;
  githubBranch: string;
  stackName: string;
  targetStacks: string[];
  resourcesNamePrefix: string;
  githubConnectionArn: string;
  guthubOwner: string;
  githubRepository: string;
  triggerOnPush: boolean;
  approvalNotifyTopic: Topic;
  nodeVersion: string;
  deploymentType: string;
  artifactBucket: Bucket;
}

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkDevOpsPipelineStackProps) {
    super(scope, id, props);
    const sourceOutput = new Artifact();

    for (const targetStack of props.targetStacks) {
      if (targetStack === "infra") {
        continue;
      }

      // IntegrationTestStackのインスタンスを作成
      const integrationTestStack = new IntegrationTestStack(this, "IntegrationTestStack", {
        accountNumber: props.accountNumber,
        region: props.region,
        environment: props.environment,
        stackName: targetStack,
        resourcesNamePrefix: props.resourcesNamePrefix,
        nodeVersion: props.nodeVersion,
        artifactBucket: props.artifactBucket,
      });

      const pipeline = new Pipeline(this, id + "-" + targetStack, {
        pipelineName: props.resourcesNamePrefix + "-" + targetStack + "-pipeline-infra-" + props.environment,
        restartExecutionOnUpdate: true,
        crossAccountKeys: false,
        artifactBucket: props.artifactBucket,
        pipelineType: PipelineType.V2,
        stages: [
          {
            stageName: "Source",
            actions: [
              new CodeStarConnectionsSourceAction({
                actionName: "GitHub",
                owner: props.guthubOwner,
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
              new CdkBootstrapStep(this, "PipelineBootstrap-" + targetStack, {
                accountId: props.accountNumber,
                environment: props.environment,
                input: sourceOutput,
                runOrder: 1,
                actionName: "cdk-bootstrap",
                region: props.region,
                stackName: targetStack,
                projectName: props.resourcesNamePrefix + "-" + targetStack + "-codebuild-cdk-bootstrap" + props.environment,
                nodeVersion: props.nodeVersion,
                deploymentType: props.deploymentType,
              }),
              new CdkDiffStep(this, "PipelineDiff-" + targetStack, {
                accountId: props.accountNumber,
                environment: props.environment,
                input: sourceOutput,
                runOrder: 2,
                actionName: "cdk-diff",
                region: props.region,
                stackName: targetStack,
                projectName: props.resourcesNamePrefix + "-" + targetStack + "-codebuild-cdk-diff-pipeline-" + props.environment,
                nodeVersion: props.nodeVersion,
                deploymentType: props.deploymentType,
                variablesNamespace: "DIFF_VARIABLES",
                variablesEnvName: "DIFF_STATUS",
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
              new CdkDeployStep(this, "PipelineDeploy-" + targetStack, {
                accountId: props.accountNumber,
                environment: props.environment,
                input: sourceOutput,
                runOrder: 2,
                actionName: "cdk-deploy",
                region: props.region,
                stackName: targetStack,
                projectName:
                  props.resourcesNamePrefix + "-" + targetStack + "-codebuild-cdk-deploy-pipeline-" + props.environment,
                nodeVersion: props.nodeVersion,
                deploymentType: props.deploymentType,
              }),
            ],
          },
          {
            stageName: "Test",
            actions: [
              new LambdaInvokeAction({
                actionName: "RunIntegrationTests",
                lambda: integrationTestStack.testLambdaFunction,
              }),
            ],
          },
        ],
      });
    }
  }
}
