/**
 * AWS Personalize Client Wrapper
 * Recommendation engine
 */

import {
  PersonalizeRuntimeClient,
  GetRecommendationsCommand,
  GetPersonalizedRankingCommand,
} from "@aws-sdk/client-personalize-runtime";
import { awsConfig } from "./config";

export const personalizeClient = new PersonalizeRuntimeClient({
  region: awsConfig.region,
});

export interface Recommendation {
  itemId: string;
  score: number;
  metadata?: { [key: string]: string };
}

export interface RankingRequest {
  userId: string;
  itemList: string[];
  context?: { [key: string]: string };
}

/**
 * Get recommendations for user
 */
export async function getRecommendations(
  campaignArn: string,
  userId: string,
  numResults: number = 5,
  context?: { [key: string]: string }
): Promise<Recommendation[]> {
  try {
    const command = new GetRecommendationsCommand({
      campaignArn,
      userId,
      numResults,
      context,
    });

    const response = await personalizeClient.send(command);
    const itemList = response.itemList || [];

    return itemList.map((item) => ({
      itemId: item.itemId || "",
      score: item.score || 0,
      metadata: item.metadata,
    }));
  } catch (error) {
    console.error("Get recommendations error:", error);
    throw error;
  }
}

/**
 * Rank items for user
 */
export async function rankItems(
  campaignArn: string,
  request: RankingRequest
): Promise<string[]> {
  try {
    const command = new GetPersonalizedRankingCommand({
      campaignArn,
      userId: request.userId,
      inputList: request.itemList,
      context: request.context,
    });

    const response = await personalizeClient.send(command);
    return response.personalizedRanking?.map((item) => item.itemId || "") || [];
  } catch (error) {
    console.error("Rank items error:", error);
    throw error;
  }
}

/**
 * Get similar items
 */
export async function getSimilarItems(
  campaignArn: string,
  itemId: string,
  numResults: number = 5,
  userId?: string
): Promise<Recommendation[]> {
  try {
    // Personalize doesn't have direct similar items API
    // Use recommendations with item context instead
    const context = {
      reference_item: itemId,
    };

    const recommendations = userId
      ? await getRecommendations(campaignArn, userId, numResults, context)
      : [];

    return recommendations;
  } catch (error) {
    console.error("Get similar items error:", error);
    throw error;
  }
}

/**
 * Batch get recommendations for multiple users
 */
export async function batchGetRecommendations(
  campaignArn: string,
  userIds: string[],
  numResults: number = 5
): Promise<{ [userId: string]: Recommendation[] }> {
  try {
    const results: { [userId: string]: Recommendation[] } = {};

    const promises = userIds.map((userId) =>
      getRecommendations(campaignArn, userId, numResults)
        .then((recs) => {
          results[userId] = recs;
        })
        .catch((error) => {
          console.error(`Error getting recommendations for ${userId}:`, error);
          results[userId] = [];
        })
    );

    await Promise.all(promises);

    return results;
  } catch (error) {
    console.error("Batch get recommendations error:", error);
    throw error;
  }
}

/**
 * Contextual recommendations with filtering
 */
export async function contextualRecommendations(
  campaignArn: string,
  userId: string,
  numResults: number = 5,
  filters: { [key: string]: string | string[] }
): Promise<Recommendation[]> {
  try {
    const context: { [key: string]: string } = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        context[key] = value.join(",");
      } else {
        context[key] = value;
      }
    });

    return getRecommendations(campaignArn, userId, numResults, context);
  } catch (error) {
    console.error("Contextual recommendations error:", error);
    throw error;
  }
}

/**
 * A/B test recommendations
 */
export async function abTestRecommendations(
  campaignArnA: string,
  campaignArnB: string,
  userId: string,
  numResults: number = 5
): Promise<{
  variantA: Recommendation[];
  variantB: Recommendation[];
}> {
  try {
    const [variantA, variantB] = await Promise.all([
      getRecommendations(campaignArnA, userId, numResults),
      getRecommendations(campaignArnB, userId, numResults),
    ]);

    return {
      variantA,
      variantB,
    };
  } catch (error) {
    console.error("A/B test recommendations error:", error);
    throw error;
  }
}

export default personalizeClient;
