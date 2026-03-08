// Shared Bedrock AI client for all Lambda engines
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const REGION = process.env.AWS_REGION || "ap-south-1";
const MODEL_ID =
  process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0";

let client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!client) {
    client = new BedrockRuntimeClient({ region: REGION });
  }
  return client;
}

export interface BedrockRequest {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

export interface BedrockResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export async function invokeBedrockClaude(
  req: BedrockRequest
): Promise<BedrockResponse> {
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: req.maxTokens || 2048,
    temperature: req.temperature ?? 0.3,
    messages: [{ role: "user", content: req.userMessage }],
    system: req.systemPrompt,
  };

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  const response = await getClient().send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));

  return {
    text: body.content?.[0]?.text || "",
    inputTokens: body.usage?.input_tokens || 0,
    outputTokens: body.usage?.output_tokens || 0,
    model: MODEL_ID,
  };
}
