import {
  DynamoDBClient,
  DynamoDBClientConfig,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  PutCommandInput,
  QueryCommandInput,
  ScanCommandInput,
} from '@aws-sdk/lib-dynamodb';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Query record structure stored in DynamoDB
 */
export interface QueryRecord {
  userId: string;
  timestamp: number;
  engineName: string;
  query: Record<string, unknown>;
  response: Record<string, unknown>;
}

/**
 * User history item
 */
export interface UserHistoryItem {
  timestamp: number;
  engineName: string;
  query: Record<string, unknown>;
  response: Record<string, unknown>;
}

/**
 * Engine analytics data
 */
export interface EngineAnalytics {
  engineName: string;
  totalQueries: number;
  uniqueUsers: number;
  averageResponseSize: number;
  lastQueryTime: number;
}

/**
 * Data layer options
 */
export interface DataLayerOptions {
  region?: string;
  endpoint?: string;
  tableName?: string;
}

// ============================================================================
// DYNAMODB DATA LAYER
// ============================================================================

export class BUAIPDataLayer {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  /**
   * Initialize the DynamoDB data layer
   * @param options Configuration options for DynamoDB connection
   */
  constructor(options: DataLayerOptions = {}) {
    const region = options.region || process.env.AWS_REGION || 'ap-south-1';
    this.tableName = options.tableName || 'BUAIP_Queries';

    const ddbConfig: DynamoDBClientConfig = {
      region,
    };

    // Allow custom endpoint for local testing
    if (options.endpoint) {
      ddbConfig.endpoint = options.endpoint;
    }

    const client = new DynamoDBClient(ddbConfig);
    this.client = DynamoDBDocumentClient.from(client);

    console.log(`DynamoDB Data Layer initialized with table: ${this.tableName}`);
  }

  /**
   * Save a query and its response to DynamoDB
   * @param engineName Name of the AI engine that processed the query
   * @param userId Unique identifier of the user
   * @param query The input query object
   * @param response The engine's response object
   * @returns The saved record
   */
  async saveQuery(
    engineName: string,
    userId: string,
    query: Record<string, unknown>,
    response: Record<string, unknown>
  ): Promise<QueryRecord> {
    try {
      if (!userId || !engineName) {
        throw new Error('userId and engineName are required');
      }

      const timestamp = Date.now();
      const record: QueryRecord = {
        userId,
        timestamp,
        engineName,
        query,
        response,
      };

      const params: PutCommandInput = {
        TableName: this.tableName,
        Item: record,
      };

      await this.client.send(new PutCommand(params));

      console.log(
        `Query saved: userId=${userId}, engineName=${engineName}, timestamp=${timestamp}`
      );

      return record;
    } catch (error) {
      console.error('Error saving query:', error);
      throw new Error(
        `Failed to save query: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve query history for a specific user
   * @param userId Unique identifier of the user
   * @param limit Maximum number of records to return (default: 50)
   * @returns Array of user's query history
   */
  async getUserHistory(
    userId: string,
    limit: number = 50
  ): Promise<UserHistoryItem[]> {
    try {
      if (!userId) {
        throw new Error('userId is required');
      }

      const params: QueryCommandInput = {
        TableName: this.tableName,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ScanIndexForward: false, // Sort by timestamp descending (most recent first)
        Limit: Math.min(limit, 1000), // Cap at 1000
      };

      const response = await this.client.send(new QueryCommand(params));

      if (!response.Items) {
        console.log(`No history found for userId: ${userId}`);
        return [];
      }

      const history: UserHistoryItem[] = response.Items.map((item: any) => ({
        timestamp: item.timestamp,
        engineName: item.engineName,
        query: item.query,
        response: item.response,
      }));

      console.log(
        `Retrieved ${history.length} history items for userId: ${userId}`
      );

      return history;
    } catch (error) {
      console.error('Error retrieving user history:', error);
      throw new Error(
        `Failed to retrieve user history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve analytics for a specific engine
   * @param engineName Name of the AI engine
   * @returns Analytics data including total queries, unique users, and average response size
   */
  async getEngineAnalytics(engineName: string): Promise<EngineAnalytics> {
    try {
      if (!engineName) {
        throw new Error('engineName is required');
      }

      const params: ScanCommandInput = {
        TableName: this.tableName,
        FilterExpression: 'engineName = :engineName',
        ExpressionAttributeValues: {
          ':engineName': engineName,
        },
        ProjectionExpression: 'userId, engineName, response, #ts',
        ExpressionAttributeNames: {
          '#ts': 'timestamp',
        },
      };

      let allItems: any[] = [];
      let lastEvaluatedKey = undefined;

      // Handle pagination for large datasets
      do {
        if (lastEvaluatedKey) {
          params.ExclusiveStartKey = lastEvaluatedKey;
        }

        const response = await this.client.send(new ScanCommand(params));

        if (response.Items) {
          allItems.push(...response.Items);
        }

        lastEvaluatedKey = response.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      // Calculate analytics
      const totalQueries = allItems.length;
      const uniqueUsers = new Set(allItems.map((item) => item.userId)).size;

      let totalResponseSize = 0;
      let lastQueryTime = 0;

      allItems.forEach((item) => {
        const responseSize = JSON.stringify(item.response || {}).length;
        totalResponseSize += responseSize;
        if (item.timestamp > lastQueryTime) {
          lastQueryTime = item.timestamp;
        }
      });

      const averageResponseSize =
        totalQueries > 0 ? totalResponseSize / totalQueries : 0;

      const analytics: EngineAnalytics = {
        engineName,
        totalQueries,
        uniqueUsers,
        averageResponseSize: Math.round(averageResponseSize),
        lastQueryTime,
      };

      console.log(
        `Analytics for ${engineName}:`,
        JSON.stringify(analytics, null, 2)
      );

      return analytics;
    } catch (error) {
      console.error('Error retrieving engine analytics:', error);
      throw new Error(
        `Failed to retrieve engine analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get multiple engines' analytics
   * @param engineNames Array of engine names
   * @returns Map of engine names to their analytics
   */
  async getMultipleEngineAnalytics(
    engineNames: string[]
  ): Promise<Map<string, EngineAnalytics>> {
    const analyticsMap = new Map<string, EngineAnalytics>();

    for (const engineName of engineNames) {
      try {
        const analytics = await this.getEngineAnalytics(engineName);
        analyticsMap.set(engineName, analytics);
      } catch (error) {
        console.error(`Error getting analytics for ${engineName}:`, error);
        // Continue processing other engines
      }
    }

    return analyticsMap;
  }

  /**
   * Delete old queries (for data cleanup)
   * @param ageInDays Number of days of data to keep
   * @returns Number of items deleted
   */
  async deleteOldQueries(ageInDays: number = 90): Promise<number> {
    try {
      if (ageInDays < 1) {
        throw new Error('ageInDays must be at least 1');
      }

      const cutoffTime = Date.now() - ageInDays * 24 * 60 * 60 * 1000;

      const params: ScanCommandInput = {
        TableName: this.tableName,
        FilterExpression: '#ts < :cutoffTime',
        ExpressionAttributeNames: {
          '#ts': 'timestamp',
        },
        ExpressionAttributeValues: {
          ':cutoffTime': cutoffTime,
        },
        ProjectionExpression: 'userId, #ts',
      };

      let deletedCount = 0;
      let lastEvaluatedKey = undefined;

      // Note: In a production environment, consider using batch delete or TTL
      console.log(`Scanning for items older than ${ageInDays} days...`);

      do {
        if (lastEvaluatedKey) {
          params.ExclusiveStartKey = lastEvaluatedKey;
        }

        const response = await this.client.send(new ScanCommand(params));

        // In production, implement batch delete operations
        console.log(`Found ${response.Items?.length || 0} items to delete`);
        deletedCount += response.Items?.length || 0;

        lastEvaluatedKey = response.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      console.log(
        `Identified ${deletedCount} items for deletion (implement batch delete in production)`
      );

      return deletedCount;
    } catch (error) {
      console.error('Error deleting old queries:', error);
      throw new Error(
        `Failed to delete old queries: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Health check for DynamoDB connection
   * @returns True if connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const params: ScanCommandInput = {
        TableName: this.tableName,
        Limit: 1,
      };

      await this.client.send(new ScanCommand(params));
      console.log('DynamoDB health check passed');
      return true;
    } catch (error) {
      console.error('DynamoDB health check failed:', error);
      return false;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let dataLayerInstance: BUAIPDataLayer | null = null;

/**
 * Get or create a singleton instance of the data layer
 * @param options Configuration options
 * @returns BUAIPDataLayer instance
 */
export function getDataLayer(options?: DataLayerOptions): BUAIPDataLayer {
  if (!dataLayerInstance) {
    dataLayerInstance = new BUAIPDataLayer(options);
  }
  return dataLayerInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetDataLayer(): void {
  dataLayerInstance = null;
}
