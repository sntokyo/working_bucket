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

    // パイプラインのステージを定義
    const stages = [
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
            projectName: `${props.resourceNamePrefix}-codebuild-cdk-bootstrap-e2e`,
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
            projectName: `${props.resourceNamePrefix}-codebuild-cdk-diff-pipeline-e2e`,
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
          new CdkDeployStep(this, "PipelineDeploy", {
            accountId: props.accountNumber,
            environment: props.environment,
            input: sourceOutput,
            runOrder: 2,
            actionName: "cdk-deploy",
            region: props.region,
            stackName: this.stackName,
            projectName: `${props.resourceNamePrefix}-codebuild-cdk-deploy-pipeline-e2e`,
            nodeVersion: props.nodeVersion,
            deploymentType: props.deploymentType,
          }),
        ],
      },
    ];

    // environmentがntdevのときにIntegrationTestステージを追加
    if (props.environment === 'ntdev') {
      stages.splice(2, 0, {
        stageName: "IntegrationTest",
        actions: [
          new CdkDeployStep(this, "IntegrationTestDeploy", {
            accountId: props.accountNumber,
            environment: props.environment,
            input: sourceOutput,
            runOrder: 1,
            actionName: "integration-test-deploy",
            region: props.region,
            stackName: this.stackName,
            projectName: `${props.resourceNamePrefix}-codebuild-integration-test`,
            nodeVersion: props.nodeVersion,
            deploymentType: props.deploymentType,
          }),
        ],
      });
    }

    // パイプラインを作成
    new Pipeline(this, id, {
      pipelineName: `${props.resourceNamePrefix}-pipeline-e2e-${props.environment}`,
      restartExecutionOnUpdate: true,
      crossAccountKeys: false,
      artifactBucket: props.artifactBucket,
      stages: stages,
    });
  }
}
