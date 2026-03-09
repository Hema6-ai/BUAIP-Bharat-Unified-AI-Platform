// Streaming wrapper for Bedrock Claude
// Returns a ReadableStream of text chunks for instant display

import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.BEDROCK_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.BEDROCK_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Call Bedrock with streaming — returns an async iterable of text deltas.
 */
export async function* streamBedrock(
  messages: Message[],
  systemPrompt?: string,
  maxTokens = 4096,
  temperature = 0.4
): AsyncGenerator<string> {
  const body: any = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    temperature,
    top_p: 0.9,
    messages,
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const command = new InvokeModelWithResponseStreamCommand({
    modelId:
      process.env.BEDROCK_MODEL_ID ??
      "anthropic.claude-3-5-sonnet-20241022-v2:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  });

  const response = await client.send(command);

  if (!response.body) {
    throw new Error("No streaming body returned from Bedrock");
  }

  for await (const event of response.body) {
    if (event.chunk?.bytes) {
      const json = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

      if (json.type === "content_block_delta" && json.delta?.text) {
        yield json.delta.text;
      }
    }
  }
}
