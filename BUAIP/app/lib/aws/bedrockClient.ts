/**
 * AWS Bedrock Client Wrapper
 * Centralized Bedrock AI inference engine
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { awsConfig } from "./config";

export const bedrockClient = new BedrockRuntimeClient({
  region: awsConfig.region,
});

export interface BedrockInvokeOptions {
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

/**
 * Invoke Bedrock Claude model
 */
export async function invokeBedrockModel(
  prompt: string,
  options?: BedrockInvokeOptions
): Promise<string> {
  try {
    const command = new InvokeModelCommand({
      modelId:
        options?.modelId ??
        process.env.BEDROCK_MODEL_ID ??
        "anthropic.claude-3-sonnet-20240229-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: options?.maxTokens ?? 2000,
        temperature: options?.temperature ?? 0.3,
        top_p: options?.topP ?? 1,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const response = await bedrockClient.send(command);
    const text = new TextDecoder().decode(response.body);
    const json = JSON.parse(text);

    return json.content[0].text;
  } catch (error) {
    console.error("Bedrock invocation error:", error);
    throw error;
  }
}

/**
 * Invoke Bedrock with system prompt
 */
export async function invokeBedrockWithSystem(
  systemPrompt: string,
  userPrompt: string,
  options?: BedrockInvokeOptions
): Promise<string> {
  const fullPrompt = `${systemPrompt}\n\nUser Query:\n${userPrompt}`;
  return invokeBedrockModel(fullPrompt, options);
}

/**
 * Batch invoke Bedrock (for multiple prompts)
 */
export async function invokeBedrockBatch(
  prompts: string[],
  options?: BedrockInvokeOptions
): Promise<string[]> {
  const results = await Promise.all(
    prompts.map((prompt) => invokeBedrockModel(prompt, options))
  );
  return results;
}

export default bedrockClient;
