
https://catalog.workshops.aws/typescript-and-cdk-for-beginner/ja-JP


## CDK スタックの削除

AWS CloudFormation コンソールで削除するか、cdk destroy を実行してください。

```
cdk destroy
```

## cdk init
プロジェクトディレクトリの作成

空のディレクトリを作成し、カレントディレクトリを変更します。
```
mkdir ~/environment/cdk-workshop && cd ~/environment/cdk-workshop
```
```
cdk init
```
新しい TypeScript CDK プロジェクトを作成するために cdk init を使います。
```
cdk init sample-app --language typescript
```
https://catalog.workshops.aws/typescript-and-cdk-for-beginner/ja-JP/40-cdk-introduction/10-create-project/10-cdk-init

```
    bin/cdk-workshop.ts
```
CDK アプリケーションのエントリポイントです。最初にこのファイルから実行されます。lib/cdk-workshop-stack.ts で定義されたスタックをロードします。
```
    lib/cdk-workshop-stack.ts
```
CDK アプリケーションのメインスタックが定義されます。スタックとは、関連する 1 つ以上の AWS リソースを定義したものです。今回のワークショップでほとんどの時間を費やすことになるファイルです。
```
node_modules/
```
npm によって管理され、プロジェクトのすべての依存関係が含まれます。
```
test/ CDK 
```
アプリケーションをテスト・検証するために必要なファイルを格納するフォルダです。
```
.git/ 
```
CDK アプリケーションを Git 管理するための情報を格納するフォルダです。cdk init コマンドではデフォルトで自動作成されます。
```
cdk.json
```
    アプリの実行方法をツールキットに指示させるためのファイルです。今回の場合は、 npx ts-node bin/cdk-workshop.ts です。
```
package.json
```
    npm モジュールのマニフェストファイルです。これは、アプリの名前、バージョン、依存関係、“watch” や “build” 用のビルドスクリプトなど、さまざまな情報が含まれるファイルのことです。（package-lock.json は npm によって管理されます）
```
tsconfig.json
```
プロジェクトの TypeScript 設定です。
```
.gitignore と .npmignore
```
Git と npm 用のファイルです。ソースコードの管理に含める/除外するファイルと、パッケージマネージャーへの公開用設定が含まれています。
https://catalog.workshops.aws/typescript-and-cdk-for-beginner/ja-JP/40-cdk-introduction/10-create-project/20-structure


## cdk synth
https://catalog.workshops.aws/typescript-and-cdk-for-beginner/ja-JP/40-cdk-introduction/10-create-project/30-cdk-synth

AWS CDK アプリケーションは、事実上、コードを使用したインフラストラクチャの定義にすぎません。CDK アプリケーションが実行されると、アプリケーションで定義されたスタックごとに AWS CloudFormation テンプレートが生成（CDK 用語では「合成」）されます。

CDK アプリを合成するには、cdk synth コマンドを使用します。サンプルアプリから合成されたテンプレートを確認してみましょう。
```
cdk synth
```

## cdk deploy
https://catalog.workshops.aws/typescript-and-cdk-for-beginner/ja-JP/40-cdk-introduction/10-create-project/40-cdk-deploy

### 環境のブートストラップ  
AWS CDK アプリケーションを環境 (アカウント/リージョン) に初めてデプロイするときは、ブートストラップスタックをデプロイする必要があります。  
このスタックには、AWS CDK アプリケーションを環境にデプロイするために必要なリソースが含まれています。  
たとえば、このスタックには、デプロイプロセス中にテンプレートとアセットを保存するための S3 バケットが含まれています。  
cdk bootstrap コマンドを使用して、ブートストラップスタックを AWS アカウントの指定したリージョンにデプロイできます。  

```
cdk bootstrap
```

### cdk deploy を使って CDK アプリケーションをデプロイします。

```
cdk deploy
```

```
cdk synth -c env=dev StackName
```
説明: 指定された環境 (env=dev) で、特定のスタック (StackName) のCloudFormationテンプレートを生成します。

```
cdk deploy -c env=dev StackName
```
説明: 指定された環境 (env=dev) で、特定のスタック (StackName) をデプロイします。

```
cdk synth -c env=dev --all
```
説明: 指定された環境 (env=dev) で、すべてのスタックのCloudFormationテンプレートを生成します。

```
cdk deploy -c env=dev --all
```
説明: 指定された環境 (env=dev) で、すべてのスタックをデプロイします。
