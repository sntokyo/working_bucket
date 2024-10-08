import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import { InfraStack, CdkDevOpsPipelineStackProps } from './integration-stack'; // インポート

export class CdkPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();
    const deployOutput = new codepipeline.Artifact();

    // Manual Approval Action for triggering the pipeline manually
    const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
      actionName: 'ManualApproval',
    });

    // GitHubソースアクションの定義
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub_Source',
      owner: 'your-github-username',
      repo: 'repoA',
      branch: 'main',
      oauthToken: cdk.SecretValue.secretsManager('github-token'),
      output: sourceOutput,
    });

    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'cd XYZ',
              'npm install',
            ],
          },
          build: {
            commands: [
              'npm run build',
              'npx cdk synth',
            ],
          },
        },
        artifacts: {
          'base-directory': 'XYZ/cdk.out',
          files: '**/*',
        },
      }),
      cache: codebuild.Cache.none(),
    });

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'CodeBuild',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    const deployAction = new codepipeline_actions.CloudFormationCreateUpdateStackAction({
      actionName: 'CloudFormationDeploy',
      stackName: 'MyAppStack',
      templatePath: buildOutput.atPath('MyAppStack.template.json'),
      adminPermissions: true,
      output: deployOutput,
    });

    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'MyPipeline',
      stages: [
        {
          stageName: 'ManualApproval',
          actions: [manualApprovalAction], // 手動承認をソースステージに追加
        },
        {
          stageName: 'Source',
          actions: [sourceAction], // 手動承認後にGitHubからソースを取得
        },
        {
          stageName: 'Build',
          actions: [buildAction],
        },
        {
          stageName: 'Deploy',
          actions: [deployAction],
        },
      ],
    });

    const testStackProps: CdkDevOpsPipelineStackProps = {
      accountNumber: '123456789012',
      region: 'us-west-2',
      environment: 'dev',
      stackName: 'IntegrationTestStack',
      targetStacks: ['stack1', 'stack2'],
      resourcesNamePrefix: 'myprefix',
      approvalNotifyTopic: new s3.Bucket(this, 'ApprovalNotifyTopic').topic,
      nodeVersion: '14.x',
      artifactBucket: new s3.Bucket(this, 'ArtifactBucket'),
    };

    new InfraStack(this, 'IntegrationTestStack', testStackProps);
  }
}
