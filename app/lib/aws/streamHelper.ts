/**
 * Helper to convert AWS SDK streams to strings
 * Used by S3DatasetLoader and other AWS SDK v3 clients
 */

export async function streamToString(stream: any): Promise<string> {
  if (stream.transformToString) {
    // For Blob/Response-like objects
    return await stream.transformToString();
  }

  // For Node.js Readable streams
  const chunks: string[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk.toString('utf-8'));
    });

    stream.on('error', (error: Error) => {
      reject(error);
    });

    stream.on('end', () => {
      resolve(chunks.join(''));
    });
  });
}

/**
 * Helper to convert stream to Buffer
 */
export async function streamToBuffer(stream: any): Promise<Buffer> {
  if (stream instanceof Buffer) {
    return stream;
  }

  if (stream.transformToByteArray) {
    // For SDK v3 response bodies
    return Buffer.from(await stream.transformToByteArray());
  }

  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    stream.on('error', (error: Error) => {
      reject(error);
    });

    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}
