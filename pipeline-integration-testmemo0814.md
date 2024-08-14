/integration-test/bin/integration-test-stack.ts
```typescript
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { S3DynamodbTestStack } from "../lib/s3-dynamodb-test-stack";

const app = new cdk.App();

new S3DynamodbTestStack(app, "S3DynamodbTestStack",{
  accountNumber: accountNumber!,
  region: region!,
  environment: environment,
  stackName: "s3DynamodbTestStack",
  resourceNamePrefix: "s3DynamodbTestStack-resources",
});
```

/integration-test/bin/integration-test-stack.ts
```typescript
import { Construct } from "constructs";
import { Stack, StackProps, Duration } from "aws-cdk-lib";
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
 * @interface S3DynamodbTestStackProps
 * @extends {StackProps}
 */
interface S3DynamodbTestStackProps extends StackProps {
  accountNumber: string;
  region: string;
  environment: string;
  stackName: string;
  targetStacks: string[];
  resourcesNamePrefix: string;
}

/**
 * S3DynamodbTestStackProps to create resources for manual test execution.
 *
 * @export
 * @class S3DynamodbTestStackProps
 * @extends {Stack}
 */
export class S3DynamodbTestStack extends Stack {
  public readonly testLambdaFunction: NodejsFunction;
  constructor(scope: Construct, id: string, props: S3DynamodbTestStackProps) {
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
    // const testLambdaFunction = new NodejsFunction(this, "TestLambdaFunction", {
    this.testLambdaFunction = new NodejsFunction(this, "TestLambdaFunction", {
        entry: path.join(__dirname, "../lambda/test-lambda"),
        handler: "handler",
        runtime: Runtime.NODEJS_18_X,
        environment: {
          TABLE_NAME: "test-table",
          BUCKET_NAME: `${props.environment}-001`,
        },
        initialPolicy: [dynamoDbPolicy, s3Policy],
      });

    this.testLambdaFunction.role?.attachInlinePolicy(
      new iam.Policy(this, "LambdaExecutionPolicy", {
        statements: [dynamoDbPolicy, s3Policy],
      }));
    
    // Create a CloudWatch Event rule to trigger the Lambda function manually
    new Rule(this, 'ManualTriggerRule', {
      schedule: Schedule.rate(Duration.minutes(5)), // Modify as needed
      targets: [new LambdaFunction(this.testLambdaFunction)],
    });
  }
}
```

/integration-test/package.json
```json
{
  "dependencies": {
    "aws-cdk-lib": "^2.151.0",
    "aws-sdk": "^2.1673.0",
    "constructs": "^10.3.0"
  },
  "devDependencies": {
    "@types/node": "^22.1.0"
  }
}
```


/integration-test/tsconfig.json
```json
{
    "compilerOptions": {
      "target": "ES2018",
      "module": "commonjs",
      "lib": ["es2018"],
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "moduleResolution": "node",
      "outDir": "dist"
    },
    "include": ["**/*.ts"],
    "exclude": ["node_modules", "cdk.out"]
  }

```

/pipeline/cdk-pipeline.ts

```typescript
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

```

/pipeline/lib/integration-test-pipeline-stack.ts


```typescript

import { Construct } from "constructs";
import { Stack, StackProps } from "aws-cdk-lib";
import { CodeStarConnectionsSourceAction, ManualApprovalAction, LambdaInvokeAction } from "aws-cdk-lib/aws-codepipeline-actions"; 
import { Pipeline, Artifact, PipelineType } from "aws-cdk-lib/aws-codepipeline";
import { CdkBootstrapStep } from "../classes/cdk-bootstrap-step";
import { CdkDeployStep } from "../classes/cdk-deploy-step";
import { CdkDiffStep } from "../classes/cdk-diff-step";
import{ Topic } from "aws-cdk-lib/aws-sns";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { S3DynamodbTestStack } from "../../integration-test/lib/s3-dynamodb-test-stack"; // インポート追加

/**
  * Properties to create devops account cdk pipline.
  *
  * @interface CdkDevOpsPipelineStackProps
  * @extends {StackProps}
  */
interface CdkDevOpsPipelineStackProps extends StackProps {
  accountNumber: string;
  region: string;
  environment: string;
  githubBranch: string;
  stackName: string;
  targetStacks: string[];
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
  * InfraStack to create cdk pipeline to deploy infra.
  *
  * @export
  * @class CdkDevOpsPipelineStack
  * @extends {Stack}
  */
export class IntegrationTestPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkDevOpsPipelineStackProps) {
    super(scope, id, props);
    const sourceOutput = new Artifact();
    console.log("id");

    for (const targetStack of props.targetStacks){
      if (targetStack === "infra") {
        continue;
      }

      const testStack = new S3DynamodbTestStack(this, id + "-" + targetStack, {
        accountNumber: props.accountNumber,
        region: props.region,
        environment: props.environment,
        stackName: props.resourceNamePrefix + "-" + targetStack + "-s3-dynamodb-test-stack-" + props.environment,
        targetStacks: props.targetStacks,
        resourcesNamePrefix: props.resourceNamePrefix,
        approvalNotifyTopic: props.approvalNotifyTopic,
        nodeVersion: props.nodeVersion,
        artifactBucket: props.artifactBucket,
      });

      new Pipeline(this, id + "-" + targetStack, {
        pipelineName: props.resourceNamePrefix + "-" + targetStack + "-pipeline-infra-" + props.environment,
        restartExecutionOnUpdate: true,
        // enableKeyRotation: true,
        crossAccountKeys: false,
        artifactBucket: props.artifactBucket,
        pipelineType: PipelineType.V2,
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
              new CdkBootstrapStep(this, "PipelineBootstrap-" + targetStack, {
                accountId: props.accountNumber,
                environment: props.environment,
                input: sourceOutput,
                runOrder: 1,
                actionName: "cdk-bootstrap",
                region: props.region,
                stackName: targetStack,
                projectName: props.resourceNamePrefix + "-" + targetStack + "-codebuild-cdk-bootstrap" + props.environment,
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
                projectName: props.resourceNamePrefix + "-" + targetStack + "-codebuild-cdk-diff-pipeline-" + props.environment,
                nodeVersion: props.nodeVersion,
                deploymentType: props.deploymentType,
                variablesNamespace: "DIFF_VARIABLES",
                variablesEnvName: "DIFF_STATUS",
              }),
            ],
          },
          // ここでセキュリティスキャンのステップを入れたい感ある。
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
                  props.resourceNamePrefix + "-" + targetStack + "-codebuild-cdk-deploy-pipeline-" + props.environment,
                nodeVersion: props.nodeVersion,
                deploymentType: props.deploymentType,
              }),
            ],
          },
          {
            stageName: "IntegrationTest",
            actions: [
              new LambdaInvokeAction({
                actionName: "RunIntegrationTest",
                lambda: testStack.testLambdaFunction,
              }),
            ],
          }
        ],
      });
    }
  }
}


```

/pipeline/classes/cdk-bootstrap-step.ts

```typescript

import { Construct } from 'constructs';
import { GenericStep, GenericStepProps } from "./cdk-generic-step";

/**
 * Properties for cdk bootstrap step
 *
 * @interface CdkBootstrapStepProps
 * @extends {GenericStepProps}
 */
interface CdkBootstrapStepProps extends GenericStepProps {}

/**
 * CdkBootstrapStep class
 *
 * @export
 * @class CdkBootstrapStep
 * @extends {GenericStep}
 */
export class CdkBootstrapStep extends GenericStep {
  constructor(scope: Construct, id: string, props: CdkBootstrapStepProps) {
    // bootstrap command for buildspec
    props.command = ["cd pipeline", "npm install", "cdk -c env=$ENV bootstrap aws://$ACCOUNT_ID/$REGION", "cd .."];
    super(scope, id, props);
  }
}

```

/pipeline/package.json

```typescript
{
  "name": "pipeline",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "directories": {
    "lib": "lib"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "aws-cdk-lib": "^2.151.0",
    "aws-sdk": "^2.1673.0",
    "constructs": "^10.3.0"
  },
  "devDependencies": {
    "@types/node": "^22.2.0"
  }
}

```


/pipeline/tsconfig.json
```json
{
    "compilerOptions": {
      "target": "ES2018",
      "module": "commonjs",
      "lib": ["es2018"],
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "moduleResolution": "node",
      "outDir": "dist"
    },
    "include": ["**/*.ts"],
    "exclude": ["node_modules", "cdk.out"]
  }

```

ルートプロジェクトディレクトリの配下にpipelineとintegration-testディレクトリが存在します。
/pipeline/classes/bootstrap-step.ts にcdk -c env=$ENV bootstrap aws://$ACCOUNT/AWS_REGION
の記載があります。
/pipeline/lib/integration-test-pipeline-stack.tsで、 integration-test/lib/s3-dynamodb-test-stackをインポートしてますがこのファイルにあるモジュールが見つからないとか一致しないとかのエラーが出ます。

/pipeline/配下のスタックで/integration-test配下のスタックをインポートしてcdk -c env=$ENV bootstrap aws://$ACCOUNT/AWS_REGIONはできないということでしょうか
