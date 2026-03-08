/**
 * AWS DynamoDB Client Wrapper
 * NoSQL database operations
 */

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteItemCommand,
  BatchGetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { awsConfig } from "./config";

export const dynamoClient = new DynamoDBClient({
  region: awsConfig.region,
});

export interface DynamoItem {
  [key: string]: any;
}

export interface QueryOptions {
  keyConditionExpression?: string;
  filterExpression?: string;
  expressionAttributeNames?: { [key: string]: string };
  expressionAttributeValues?: { [key: string]: any };
  limit?: number;
  scanIndexForward?: boolean;
}

/**
 * Put item in DynamoDB table
 */
export async function putItem(
  tableName: string,
  item: DynamoItem
): Promise<void> {
  try {
    const command = new PutItemCommand({
      TableName: tableName,
      Item: marshall(item),
    });

    await dynamoClient.send(command);
  } catch (error) {
    console.error("Put item error:", error);
    throw error;
  }
}

/**
 * Get item from DynamoDB table by key
 */
export async function getItem(
  tableName: string,
  key: { [key: string]: any }
): Promise<DynamoItem | null> {
  try {
    const command = new GetItemCommand({
      TableName: tableName,
      Key: marshall(key),
    });

    const response = await dynamoClient.send(command);
    return response.Item ? unmarshall(response.Item) : null;
  } catch (error) {
    console.error("Get item error:", error);
    throw error;
  }
}

/**
 * Update item in DynamoDB table
 */
export async function updateItem(
  tableName: string,
  key: { [key: string]: any },
  updates: { [key: string]: any }
): Promise<DynamoItem> {
  try {
    const updateExpression = Object.keys(updates)
      .map((k) => `#${k} = :${k}`)
      .join(", ");

    const expressionAttributeNames = Object.keys(updates).reduce(
      (acc, k) => {
        acc[`#${k}`] = k;
        return acc;
      },
      {} as { [key: string]: string }
    );

    const expressionAttributeValues = Object.keys(updates).reduce(
      (acc, k) => {
        acc[`:${k}`] = updates[k];
        return acc;
      },
      {} as { [key: string]: any }
    );

    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: marshall(key),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ReturnValues: "ALL_NEW",
    });

    const response = await dynamoClient.send(command);
    return response.Attributes ? unmarshall(response.Attributes) : {};
  } catch (error) {
    console.error("Update item error:", error);
    throw error;
  }
}

/**
 * Delete item from DynamoDB table
 */
export async function deleteItem(
  tableName: string,
  key: { [key: string]: any }
): Promise<void> {
  try {
    const command = new DeleteItemCommand({
      TableName: tableName,
      Key: marshall(key),
    });

    await dynamoClient.send(command);
  } catch (error) {
    console.error("Delete item error:", error);
    throw error;
  }
}

/**
 * Query items with key condition
 */
export async function queryItems(
  tableName: string,
  options: QueryOptions
): Promise<DynamoItem[]> {
  try {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: options.keyConditionExpression,
      FilterExpression: options.filterExpression,
      ExpressionAttributeNames: options.expressionAttributeNames,
      ExpressionAttributeValues: options.expressionAttributeValues
        ? marshall(options.expressionAttributeValues)
        : undefined,
      Limit: options.limit,
      ScanIndexForward: options.scanIndexForward ?? true,
    });

    const response = await dynamoClient.send(command);
    return (response.Items || []).map((item) => unmarshall(item));
  } catch (error) {
    console.error("Query items error:", error);
    throw error;
  }
}

/**
 * Scan table (expensive operation - use sparingly)
 */
export async function scanTable(
  tableName: string,
  filterExpression?: string,
  expressionAttributeNames?: { [key: string]: string },
  expressionAttributeValues?: { [key: string]: any },
  limit?: number
): Promise<DynamoItem[]> {
  try {
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
        ? marshall(expressionAttributeValues)
        : undefined,
      Limit: limit,
    });

    const response = await dynamoClient.send(command);
    return (response.Items || []).map((item) => unmarshall(item));
  } catch (error) {
    console.error("Scan table error:", error);
    throw error;
  }
}

/**
 * Batch get items
 */
export async function batchGetItems(
  tableName: string,
  keys: Array<{ [key: string]: any }>
): Promise<DynamoItem[]> {
  try {
    const command = new BatchGetItemCommand({
      RequestItems: {
        [tableName]: {
          Keys: keys.map((key) => marshall(key)),
        },
      },
    });

    const response = await dynamoClient.send(command);
    const items = response.Responses?.[tableName] || [];
    return items.map((item) => unmarshall(item));
  } catch (error) {
    console.error("Batch get items error:", error);
    throw error;
  }
}

/**
 * Batch write items
 */
export async function batchWriteItems(
  tableName: string,
  items: DynamoItem[],
  operation: "PUT" | "DELETE" = "PUT"
): Promise<void> {
  try {
    const requestItems = items.map((item) => {
      if (operation === "PUT") {
        return {
          PutRequest: {
            Item: marshall(item),
          },
        };
      } else {
        return {
          DeleteRequest: {
            Key: marshall(item),
          },
        };
      }
    });

    const command = new BatchWriteItemCommand({
      RequestItems: {
        [tableName]: requestItems,
      },
    });

    await dynamoClient.send(command);
  } catch (error) {
    console.error("Batch write items error:", error);
    throw error;
  }
}

export default dynamoClient;
