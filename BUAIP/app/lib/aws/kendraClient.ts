/**
 * AWS Kendra Client Wrapper
 * Intelligent search and knowledge retrieval
 */

import {
  KendraClient,
  QueryCommand,
  BatchPutDocumentCommand,
  BatchDeleteDocumentCommand,
} from "@aws-sdk/client-kendra";
import { awsConfig } from "./config";

export const kendraClient = new KendraClient({
  region: awsConfig.region,
});

export interface KendraSearchResult {
  documentId: string;
  title: string;
  excerpt: string;
  url?: string;
  score: number;
}

export interface KendraDocument {
  id: string;
  title: string;
  body: string;
  attributes?: { [key: string]: string | string[] };
}

export interface KendraQueryOptions {
  pageSize?: number;
  pageNumber?: number;
  attributeFilter?: string;
  userContext?: {
    userId?: string;
    userGroups?: string[];
  };
}

/**
 * Search knowledge base via Kendra
 */
export async function searchKnowledge(
  indexId: string,
  query: string,
  options?: KendraQueryOptions
): Promise<KendraSearchResult[]> {
  try {
    const command = new QueryCommand({
      IndexId: indexId,
      QueryText: query,
      PageSize: options?.pageSize ?? 10,
      PageNumber: options?.pageNumber ?? 1,
      AttributeFilter: options?.attributeFilter as any,
      UserContext: options?.userContext as any,
    });

    const response = await kendraClient.send(command);
    const results = response.ResultItems || [];

    return results.map((result: any) => ({
      documentId: result.DocumentId || "",
      title: result.DocumentTitle?.Text || result.DocumentTitle || "",
      excerpt: result.DocumentExcerpt?.Text || result.DocumentExcerpt || "",
      url: result.DocumentURI,
      score: typeof result.ScoreAttributes?.ScoreConfidence === 'number' 
        ? result.ScoreAttributes.ScoreConfidence 
        : 0,
    }));
  } catch (error) {
    console.error("Search knowledge error:", error);
    throw error;
  }
}

/**
 * Batch ingest documents into Kendra
 */
export async function ingestDocuments(
  indexId: string,
  documents: KendraDocument[],
  roleArn: string
): Promise<{ successCount: number; failureCount: number }> {
  try {
    const documentList = documents.map((doc) => ({
      Id: doc.id,
      Title: doc.title,
      Body: doc.body,
      Attributes: doc.attributes,
    }));

    const command = new BatchPutDocumentCommand({
      IndexId: indexId,
      Documents: documentList as any,
      RoleArn: roleArn,
    });

    const response = await kendraClient.send(command);

    return {
      successCount: response.FailedDocuments?.length
        ? documents.length - response.FailedDocuments.length
        : documents.length,
      failureCount: response.FailedDocuments?.length || 0,
    };
  } catch (error) {
    console.error("Ingest documents error:", error);
    throw error;
  }
}

/**
 * Delete documents from Kendra
 */
export async function deleteDocuments(
  indexId: string,
  documentIds: string[]
): Promise<{ successCount: number; failureCount: number }> {
  try {
    const command = new BatchDeleteDocumentCommand({
      IndexId: indexId,
      DocumentIdList: documentIds,
    });

    const response = await kendraClient.send(command);

    return {
      successCount: documentIds.length - (response.FailedDocuments?.length || 0),
      failureCount: response.FailedDocuments?.length || 0,
    };
  } catch (error) {
    console.error("Delete documents error:", error);
    throw error;
  }
}

/**
 * Advanced search with filters
 */
export async function advancedSearch(
  indexId: string,
  query: string,
  filters: { [key: string]: string | string[] },
  options?: KendraQueryOptions
): Promise<KendraSearchResult[]> {
  try {
    // Build attribute filter from filters object
    const attributeParts = Object.entries(filters).map(([key, value]) => {
      if (Array.isArray(value)) {
        return `(${key} IN (${value.map((v) => `'${v}'`).join(", ")}))`;
      }
      return `${key} = '${value}'`;
    });

    const attributeFilter = attributeParts.join(" AND ");

    return searchKnowledge(indexId, query, {
      ...options,
      attributeFilter,
    });
  } catch (error) {
    console.error("Advanced search error:", error);
    throw error;
  }
}

/**
 * Search with contextual user information
 */
export async function contextualSearch(
  indexId: string,
  query: string,
  userId?: string,
  userGroups?: string[]
): Promise<KendraSearchResult[]> {
  return searchKnowledge(indexId, query, {
    userContext: {
      userId,
      userGroups,
    },
  });
}

export default kendraClient;
