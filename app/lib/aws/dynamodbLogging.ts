import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// ============================================================================
// TYPES
// ============================================================================

export interface EngineQuery {
  userId: string;
  engineName: string;
  query: Record<string, unknown>;
  timestamp: number;
}

// ============================================================================
// DYNAMODB CLIENT
// ============================================================================

let docClient: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const region = process.env.AWS_REGION || 'ap-south-1';
    const client = new DynamoDBClient({ region });
    docClient = DynamoDBDocumentClient.from(client);
  }
  return docClient;
}

// ============================================================================
// SAVE ENGINE QUERY
// ============================================================================

/**
 * Save engine query to DynamoDB for logging and analytics
 * @param engineName Name of the engine processing the query
 * @param userId User identifier (from session/auth)
 * @param query The query/input data
 * @param tableName DynamoDB table name (default: BUAIP_Queries)
 */
export async function saveEngineQuery(
  engineName: string,
  userId: string,
  query: Record<string, unknown>,
  tableName: string = 'BUAIP_Queries'
): Promise<void> {
  try {
    const timestamp = Date.now();

    const params: PutCommandInput = {
      TableName: tableName,
      Item: {
        userId: userId || 'anonymous',
        timestamp,
        engineName,
        query,
      },
    };

    const docClient = getDocClient();
    await docClient.send(new PutCommand(params));

    console.log(
      `[DynamoDB] Query logged: engine=${engineName}, userId=${userId}, timestamp=${timestamp}`
    );
  } catch (error) {
    // Don't throw - logging failure shouldn't break the main request
    console.error('[DynamoDB] Error logging query:', error);
  }
}

/**
 * Save engine query with response for complete transaction logging
 * @param engineName Name of the engine
 * @param userId User identifier
 * @param query Input query
 * @param response Engine response
 * @param tableName DynamoDB table name
 */
export async function saveEngineTransaction(
  engineName: string,
  userId: string,
  query: Record<string, unknown>,
  response: Record<string, unknown>,
  tableName: string = 'BUAIP_Queries'
): Promise<void> {
  try {
    const timestamp = Date.now();

    const params: PutCommandInput = {
      TableName: tableName,
      Item: {
        userId: userId || 'anonymous',
        timestamp,
        engineName,
        query,
        response,
      },
    };

    const docClient = getDocClient();
    await docClient.send(new PutCommand(params));

    console.log(
      `[DynamoDB] Transaction logged: engine=${engineName}, userId=${userId}`
    );
  } catch (error) {
    console.error('[DynamoDB] Error logging transaction:', error);
  }
}

/**
 * Middleware function to wrap engine route handlers with logging
 * Usage: const response = await withLogging(engineName, userId, query, engineHandler)
 */
export async function withLogging<T>(
  engineName: string,
  userId: string,
  query: Record<string, unknown>,
  handler: () => Promise<T>
): Promise<T> {
  // Log the query
  await saveEngineQuery(engineName, userId, query);

  try {
    // Execute the handler
    const response = await handler();

    // Log the successful response
    if (typeof response === 'object') {
      await saveEngineTransaction(engineName, userId, query, response as Record<string, unknown>);
    }

    return response;
  } catch (error) {
    console.error(`[DynamoDB] Error in engine handler: ${engineName}`, error);
    throw error;
  }
}
