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

export const handler = async () => {
  const command = `bash ${process.env.SCRIPT_PATH || '/var/task/default-script.sh'}`;

  try {
    const { stdout, stderr } = await execCommand(command);

    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Script executed successfully',
        output: stdout.trim(),
      }),
    };
  } catch (e) {
    if (e instanceof Error) {
      console.error(`Error: ${e.message}`);
    } else {
      console.error(`Unknown error: ${JSON.stringify(e)}`);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to execute script',
        error: e instanceof Error ? e.message : 'Unknown error',
        // 三項演算子の基本構文は次の通りです：
        // condition ? expr1 : expr2
        // condition: 評価される条件式（true または false を返す式）。
        // expr1: 条件が true の場合に評価される式。
        // expr2: 条件が false の場合に評価される式。
      }),
    };
  }
};
