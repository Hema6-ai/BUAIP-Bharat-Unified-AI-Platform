/**
 * AWS SNS Client Wrapper
 * Simple Notification Service
 */

import {
  SNSClient,
  PublishCommand,
  CreateTopicCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  ListSubscriptionsByTopicCommand,
} from "@aws-sdk/client-sns";
import { awsConfig } from "./config";

export const snsClient = new SNSClient({
  region: awsConfig.region,
});

export interface PublishOptions {
  subject?: string;
  messageStructure?: string;
  attributes?: { [key: string]: { DataType: string; StringValue: string } };
}

/**
 * Publish message to SNS topic
 */
export async function publishMessage(
  topicArn: string,
  message: string,
  options?: PublishOptions
): Promise<string> {
  try {
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: message,
      Subject: options?.subject,
      MessageStructure: options?.messageStructure,
      MessageAttributes: options?.attributes,
    });

    const response = await snsClient.send(command);
    return response.MessageId || "";
  } catch (error) {
    console.error("Publish message error:", error);
    throw error;
  }
}

/**
 * Publish JSON message to SNS topic
 */
export async function publishJSON(
  topicArn: string,
  data: any,
  subject?: string
): Promise<string> {
  const message = JSON.stringify(data);

  return publishMessage(topicArn, message, {
    subject: subject || "Notification",
    messageStructure: "json",
  });
}

/**
 * Send SMS notification (requires topic configured for SMS)
 */
export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<string> {
  try {
    const command = new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
    });

    const response = await snsClient.send(command);
    return response.MessageId || "";
  } catch (error) {
    console.error("Send SMS error:", error);
    throw error;
  }
}

/**
 * Create SNS topic
 */
export async function createTopic(topicName: string): Promise<string> {
  try {
    const command = new CreateTopicCommand({
      Name: topicName,
    });

    const response = await snsClient.send(command);
    return response.TopicArn || "";
  } catch (error) {
    console.error("Create topic error:", error);
    throw error;
  }
}

/**
 * Subscribe email to SNS topic
 */
export async function subscribeEmail(
  topicArn: string,
  email: string
): Promise<string> {
  try {
    const command = new SubscribeCommand({
      TopicArn: topicArn,
      Protocol: "email",
      Endpoint: email,
    });

    const response = await snsClient.send(command);
    return response.SubscriptionArn || "";
  } catch (error) {
    console.error("Subscribe email error:", error);
    throw error;
  }
}

/**
 * Subscribe HTTP to SNS topic
 */
export async function subscribeHTTP(
  topicArn: string,
  endpoint: string
): Promise<string> {
  try {
    const command = new SubscribeCommand({
      TopicArn: topicArn,
      Protocol: "https",
      Endpoint: endpoint,
    });

    const response = await snsClient.send(command);
    return response.SubscriptionArn || "";
  } catch (error) {
    console.error("Subscribe HTTP error:", error);
    throw error;
  }
}

/**
 * Subscribe Lambda to SNS topic
 */
export async function subscribeLambda(
  topicArn: string,
  lambdaArn: string
): Promise<string> {
  try {
    const command = new SubscribeCommand({
      TopicArn: topicArn,
      Protocol: "lambda",
      Endpoint: lambdaArn,
    });

    const response = await snsClient.send(command);
    return response.SubscriptionArn || "";
  } catch (error) {
    console.error("Subscribe Lambda error:", error);
    throw error;
  }
}

/**
 * Unsubscribe from SNS topic
 */
export async function unsubscribe(subscriptionArn: string): Promise<void> {
  try {
    const command = new UnsubscribeCommand({
      SubscriptionArn: subscriptionArn,
    });

    await snsClient.send(command);
  } catch (error) {
    console.error("Unsubscribe error:", error);
    throw error;
  }
}

/**
 * List subscriptions for topic
 */
export async function listSubscriptions(
  topicArn: string
): Promise<Array<{ subscriptionArn: string; email: string; protocol: string }>> {
  try {
    const command = new ListSubscriptionsByTopicCommand({
      TopicArn: topicArn,
    });

    const response = await snsClient.send(command);
    const subscriptions = response.Subscriptions || [];

    return subscriptions.map((sub) => ({
      subscriptionArn: sub.SubscriptionArn || "",
      email: sub.Endpoint || "",
      protocol: sub.Protocol || "",
    }));
  } catch (error) {
    console.error("List subscriptions error:", error);
    throw error;
  }
}

/**
 * Publish to multiple topics
 */
export async function publishToMultiple(
  topicArns: string[],
  message: string,
  subject?: string
): Promise<string[]> {
  try {
    const messageIds = await Promise.all(
      topicArns.map((arn) => publishMessage(arn, message, { subject }))
    );

    return messageIds;
  } catch (error) {
    console.error("Publish to multiple error:", error);
    throw error;
  }
}

export default snsClient;
