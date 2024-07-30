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

      //ここに条件分岐でntdevの時だけIntegrationTestステージを追加する処理を追加
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
}
      
    ];

    // environmentがntdevのときにIntegrationTestステージを追加
    if (props.environment === 'ntdev') {
      // stages[2]でdeployステージの前にIntegrationTestステージを追加したいけど、あっていますか？
      stages[2].push({
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

    // Deployステージを追加
    stages.push();

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


// stages[2]でdeployステージの前にIntegrationTestステージを追加したいけど、あっていますか？
