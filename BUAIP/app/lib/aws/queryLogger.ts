import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

/**
 * DynamoDB Query Logger for BUAIP AI Platform
 * 
 * Logs all AI engine queries and responses to DynamoDB for:
 * - User query history
 * - Analytics and insights
 * - Quality monitoring
 * - Compliance and audit trails
 */

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'BUAIP_Queries';

/**
 * Interface for query log entry
 */
export interface QueryLogEntry {
  userId: string;
  engine: string;
  query: string;
  response: string;
  timestamp: string;
}

/**
 * Log an AI engine query to DynamoDB
 * 
 * @param engineName - Name of the AI engine (e.g., 'ANNADATA', 'SCHEME', 'NYAYA', 'UDYOG', 'GLOBALSELLER', 'ATITHI')
 * @param userId - User ID or 'anonymous' for guest users
 * @param query - The user's query/question
 * @param response - The AI engine's response
 * @returns Promise<void>
 * 
 * @example
 * ```typescript
 * await logEngineQuery(
 *   'ANNADATA',
 *   'user123',
 *   'What is the wheat price in Bangalore?',
 *   'Current wheat price in Bangalore is ₹2,400/quintal'
 * );
 * ```
 */
export async function logEngineQuery(
  engineName: string,
  userId: string,
  query: string,
  response: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();

    const item: QueryLogEntry = {
      userId,
      engine: engineName,
      query,
      response,
      timestamp,
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    });

    await docClient.send(command);

    console.log(`[QueryLogger] Logged query for engine=${engineName}, userId=${userId}`);
  } catch (error) {
    console.error('[QueryLogger] Failed to log query:', error);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Log multiple queries in batch (for bulk operations)
 * 
 * @param entries - Array of query log entries
 * @returns Promise<void>
 */
export async function logEngineQueriesBatch(
  entries: Array<{
    engineName: string;
    userId: string;
    query: string;
    response: string;
  }>
): Promise<void> {
  try {
    const promises = entries.map((entry) =>
      logEngineQuery(entry.engineName, entry.userId, entry.query, entry.response)
    );

    await Promise.all(promises);

    console.log(`[QueryLogger] Logged ${entries.length} queries in batch`);
  } catch (error) {
    console.error('[QueryLogger] Failed to log batch queries:', error);
  }
}

/**
 * Wrapper function to automatically log API route queries
 * 
 * @param engineName - Name of the engine
 * @param handler - The actual query handler function
 * @returns Wrapped handler with automatic logging
 * 
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   return withQueryLogging('ANNADATA', async (body) => {
 *     const result = await processQuery(body.query);
 *     return result;
 *   })(request);
 * }
 * ```
 */
export function withQueryLogging<T>(
  engineName: string,
  handler: (body: any, userId: string) => Promise<T>
) {
  return async (request: Request): Promise<Response> => {
    try {
      const body = await request.json();
      const userId = body.userId || 'anonymous';
      const query = body.query || body.question || JSON.stringify(body);

      // Execute the actual handler
      const result = await handler(body, userId);

      // Log the query and response
      await logEngineQuery(
        engineName,
        userId,
        query,
        typeof result === 'string' ? result : JSON.stringify(result)
      );

      // Return the response
      return Response.json(result);
    } catch (error) {
      console.error(`[${engineName}] Error:`, error);
      return Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

export default logEngineQuery;
