const integrationTestsLambda = props.integrationTestsLambda;
if (integrationTestsLambda && integrationTestLambda.length > 0) {
  integrationTestsLambda.foreach((test) => {
    const lambdaFunctionName = Fn.importValue(test);
    const existingLambda = Lambda.Function.fromFunctionName(
      this, "ExistingTestsLambda", lambdaFunctionName);
    devopsPipeline.addStage({
      stageName: "IntegrationTests",
      actions: [
        new LambdaInvokeAction({
          actionName: "IntegrationTests",
          lambda: existingLambda,
          // runOrder: 1,
        }),
      ],
    });

}


const integrationTestsLambda = props.integrationTestsLambda;
const uniqueTests = new Set(integrationTestsLambda); // 重複を排除

uniqueTests.forEach((test, index) => {
  const lambdaFunctionName = Fn.importValue(test);
  const existingLambda = Lambda.Function.fromFunctionName(
    this, `ExistingLambda${index}`, lambdaFunctionName); // 各ラムダに一意のIDを追加
  devopsPipeline.addStage({
    stageName: `IntegrationTests${index}`, // ステージ名も一意にする
    actions: [
      new LambdaInvokeAction({
        actionName: `IntegrationTest${index}`, // アクション名を一意にする
        lambda: existingLambda,
        // runOrder: 1,
      }),
    ],
  });
});
