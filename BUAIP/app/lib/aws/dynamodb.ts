/**
 * DynamoDB Conversation Storage
 * Stores and retrieves user conversation sessions using real AWS credentials
 * Credentials loaded from .env.local
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

// Initialize DynamoDB client with explicit credentials from .env.local
const client = new DynamoDBClient({
  region: process.env.BEDROCK_REGION || process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.BEDROCK_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.BEDROCK_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export interface UserProfile {
  gender?: string;
  age_group?: string;
  state?: string;
  annual_income?: number;
  social_category?: string;
  disability?: boolean;
  marital_status?: string;
  land_ownership?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ConversationSession {
  sessionId: string;
  profile: UserProfile;
  messages: ConversationMessage[];
  completedFields: string[];
  createdAt: string;
  updatedAt: string;
}

const tableName = process.env.DYNAMODB_CONVERSATIONS_TABLE || "buaip-conversations";

export async function getSession(sessionId: string): Promise<ConversationSession | null> {
  const command = new GetItemCommand({
    TableName: tableName,
    Key: marshall({ sessionId }),
  });

  try {
    const response = await client.send(command);

    if (!response.Item) {
      return null;
    }

    return unmarshall(response.Item) as ConversationSession;
  } catch (error) {
    console.error("[DynamoDB] Error getting session:", error);
    return null;
  }
}

export async function createSession(sessionId: string): Promise<ConversationSession> {
  const now = new Date().toISOString();
  const session: ConversationSession = {
    sessionId,
    profile: {},
    messages: [],
    completedFields: [],
    createdAt: now,
    updatedAt: now,
  };

  const command = new PutItemCommand({
    TableName: tableName,
    Item: marshall(session),
  });

  try {
    await client.send(command);
    console.log(`[DynamoDB] Created session: ${sessionId}`);
    return session;
  } catch (error) {
    console.error("[DynamoDB] Error creating session:", error);
    // Return in-memory session if DynamoDB fails
    return session;
  }
}

export async function updateSession(
  sessionId: string,
  updates: Partial<ConversationSession>
): Promise<ConversationSession | null> {
  const now = new Date().toISOString();

  const updateExpressionParts: string[] = [];
  const expressionAttributeValues: Record<string, any> = {
    ":updatedAt": now,
  };

  if (updates.profile) {
    updateExpressionParts.push("#profile = :profile");
    expressionAttributeValues[":profile"] = updates.profile;
  }

  if (updates.messages) {
    updateExpressionParts.push("#messages = :messages");
    expressionAttributeValues[":messages"] = updates.messages;
  }

  if (updates.completedFields) {
    updateExpressionParts.push("#completedFields = :completedFields");
    expressionAttributeValues[":completedFields"] = updates.completedFields;
  }

  updateExpressionParts.push("#updatedAt = :updatedAt");

  const command = new UpdateItemCommand({
    TableName: tableName,
    Key: marshall({ sessionId }),
    UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
    ExpressionAttributeNames: {
      "#profile": "profile",
      "#messages": "messages",
      "#completedFields": "completedFields",
      "#updatedAt": "updatedAt",
    },
    ExpressionAttributeValues: marshall(expressionAttributeValues),
    ReturnValues: "ALL_NEW",
  });

  try {
    const response = await client.send(command);
    if (response.Attributes) {
      return unmarshall(response.Attributes) as ConversationSession;
    }
    return null;
  } catch (error) {
    console.error("[DynamoDB] Error updating session:", error);
    return null;
  }
}

export async function addMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const session = await getSession(sessionId);

  if (!session) {
    console.error("[DynamoDB] Session not found:", sessionId);
    return;
  }

  const newMessage: ConversationMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  session.messages.push(newMessage);

  // Keep only last 20 messages for context
  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
  }

  await updateSession(sessionId, {
    messages: session.messages,
    updatedAt: new Date().toISOString(),
  });
}
