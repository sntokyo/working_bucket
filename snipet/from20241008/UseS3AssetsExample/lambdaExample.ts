import * as fs from 'fs';
import * as path from 'path';

export const handler = async (event: any) => {
  const sampleXmlDir = process.env.SAMPLE_XML_DIR || '/var/task/sample/xml';
  
  try {
    const files = fs.readdirSync(sampleXmlDir);
    return {
      statusCode: 200,
      body: JSON.stringify(files),
    };
  } catch (error) {
    console.error("Failed to read directory:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to read directory' }),
    };
  }
};
