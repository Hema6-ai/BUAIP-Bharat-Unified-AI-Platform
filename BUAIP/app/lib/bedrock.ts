import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface BedrockOptions {
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Call Bedrock with conversation-style messages and system prompt
 */
export async function callBedrock(
  messages: Message[] | string,
  systemPromptOrOptions?: string | BedrockOptions,
  optionsOverride?: BedrockOptions
) {
  let finalMessages: Message[];
  let systemPrompt: string | undefined;
  let options: BedrockOptions | undefined;

  // Handle different parameter combinations
  if (typeof messages === 'string') {
    // Old API: callBedrock(prompt, options)
    finalMessages = [{ role: 'user', content: messages }];
    systemPrompt = undefined;
    options = typeof systemPromptOrOptions === 'object' ? systemPromptOrOptions : undefined;
  } else {
    // New API: callBedrock(messages, systemPrompt, options)
    finalMessages = messages;
    systemPrompt = typeof systemPromptOrOptions === 'string' ? systemPromptOrOptions : undefined;
    options = optionsOverride || (typeof systemPromptOrOptions === 'object' ? systemPromptOrOptions : undefined);
  }

  const body: any = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: options?.maxTokens ?? 3000,
    temperature: options?.temperature ?? 0.3,
    top_p: options?.topP ?? 0.9,
    messages: finalMessages,
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const command = new InvokeModelCommand({
    modelId:
      options?.modelId ??
      process.env.BEDROCK_MODEL_ID ??
      "anthropic.claude-3-5-sonnet-20241022-v2:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  });

  const response = await client.send(command);
  const text = new TextDecoder().decode(response.body);
  const json = JSON.parse(text);

  return json.content[0].text;
}