import { exec } from 'child_process';

export const handler = async () => {
  // 環境変数の存在を確認
  if (!process.env.SCRIPT_PATH) {
    console.error('SCRIPT_PATH is not defined in the environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SCRIPT_PATH is not defined' }),
    };
  }

  const command = `bash ${process.env.SCRIPT_PATH}`;

  // 非同期実行をPromiseでラップ
  const execCommand = (cmd: string): Promise<{ stdout: string; stderr: string }> => {
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }
        resolve({ stdout, stderr });
      });
    });
  };

  try {
    const { stdout, stderr } = await execCommand(command);

    // 標準エラー出力がある場合もログに記録
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }

    // 成功レスポンス
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Script executed successfully',
        output: stdout.trim(), // 出力結果をトリム
      }),
    };
  } catch (error) {
    // エラー発生時のレスポンス
    console.error(`Error: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to execute script',
        error: error.message,
      }),
    };
  }
};
