/**
 * AWS Bedrock Claude Service
 * Wrapper for AWS Bedrock Claude LLM
 * 
 * Uses real AWS credentials from environment variables.
 * Credentials are loaded from .env.local by Next.js automatically.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

// Verify credentials are available
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.warn("[Bedrock] Warning: AWS credentials not found in environment variables");
  console.warn("[Bedrock] AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? "✓" : "✗");
  console.warn("[Bedrock] AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY ? "✓" : "✗");
  console.warn("[Bedrock] AWS_REGION:", process.env.AWS_REGION || "not set");
}

// Initialize Bedrock client with explicit credentials from .env.local
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

console.log("[Bedrock] Client initialized with region:", process.env.AWS_REGION || "us-east-1");

export interface MessageParam {
  role: "user" | "assistant";
  content: string;
}

export async function callBedrockClaude(
  systemPrompt: string,
  messages: MessageParam[],
  maxTokens: number = 1024
): Promise<string> {
  const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-sonnet-20240229-v1:0";

  console.log("[Bedrock] Calling model:", modelId);
  console.log("[Bedrock] System prompt length:", systemPrompt.length);
  console.log("[Bedrock] Messages count:", messages.length);

  // Build messages with system prompt as the first user message if needed
  const messagesForRequest = [
    {
      role: "user" as const,
      content: systemPrompt + "\n\n" + messages.map(m => m.content).join("\n"),
    },
  ];

  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    messages: messagesForRequest,
  };

  const command = new InvokeModelCommand({
    modelId,
    body: JSON.stringify(requestBody),
  });

  try {
    console.log("[Bedrock] Invoking model...");
    const response = await client.send(command);
    console.log("[Bedrock] Response received");
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract text from Claude response
    if (responseBody.content && responseBody.content.length > 0) {
      const textContent = responseBody.content.find(
        (block: any) => block.type === "text"
      );
      if (textContent) {
        console.log("[Bedrock] Text extracted, length:", textContent.text.length);
        return textContent.text;
      }
    }

    throw new Error("No text content in Claude response");
  } catch (error) {
    console.error("[Bedrock] Error calling Claude:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Bedrock] Error details:", errorMessage);
    throw error;
  }
}

export async function generateConversationResponse(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: MessageParam[]
): Promise<string> {
  const messages: MessageParam[] = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  return callBedrockClaude(systemPrompt, messages);
}
