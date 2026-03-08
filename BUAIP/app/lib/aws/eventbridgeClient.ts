/**
 * AWS EventBridge Client Wrapper
 * Event-driven architecture and scheduling
 */

import {
  EventBridgeClient,
  PutEventsCommand,
  PutRuleCommand,
  PutTargetsCommand,
  RemoveTargetsCommand,
  DeleteRuleCommand,
} from "@aws-sdk/client-eventbridge";
import { awsConfig } from "./config";

export const eventBridgeClient = new EventBridgeClient({
  region: awsConfig.region,
});

export interface EventBridgeEvent {
  source: string;
  detailType: string;
  detail: any;
  resources?: string[];
}

export interface RuleTarget {
  arn: string;
  roleArn: string;
  input?: string;
  inputPath?: string;
  inputTransformer?: {
    InputPathsMap?: { [key: string]: string };
    InputTemplate: string;
  };
}

/**
 * Publish custom event to EventBridge
 */
export async function publishEvent(
  event: EventBridgeEvent,
  eventBusName: string = "default"
): Promise<string> {
  try {
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: event.source,
          DetailType: event.detailType,
          Detail: JSON.stringify(event.detail),
          Resources: event.resources,
          EventBusName: eventBusName,
        },
      ],
    });

    const response = await eventBridgeClient.send(command);
    const entries = response.Entries || [];

    if (entries.length === 0 || entries[0].ErrorCode) {
      throw new Error(`Failed to publish event: ${entries[0]?.ErrorCode}`);
    }

    return entries[0].EventId || "";
  } catch (error) {
    console.error("Publish event error:", error);
    throw error;
  }
}

/**
 * Batch publish events
 */
export async function publishBatchEvents(
  events: EventBridgeEvent[],
  eventBusName: string = "default"
): Promise<string[]> {
  try {
    const command = new PutEventsCommand({
      Entries: events.map((event) => ({
        Source: event.source,
        DetailType: event.detailType,
        Detail: JSON.stringify(event.detail),
        Resources: event.resources,
        EventBusName: eventBusName,
      })),
    });

    const response = await eventBridgeClient.send(command);
    const entries = response.Entries || [];

    return entries
      .filter((entry) => !entry.ErrorCode)
      .map((entry) => entry.EventId || "");
  } catch (error) {
    console.error("Publish batch events error:", error);
    throw error;
  }
}

/**
 * Create scheduled rule
 */
export async function createScheduledRule(
  ruleName: string,
  scheduleExpression: string,
  description?: string,
  eventBusName: string = "default"
): Promise<void> {
  try {
    const command = new PutRuleCommand({
      Name: ruleName,
      ScheduleExpression: scheduleExpression,
      State: "ENABLED",
      Description: description,
      EventBusName: eventBusName,
    });

    await eventBridgeClient.send(command);
  } catch (error) {
    console.error("Create scheduled rule error:", error);
    throw error;
  }
}

/**
 * Create event pattern rule
 */
export async function createEventPatternRule(
  ruleName: string,
  eventPattern: any,
  description?: string,
  eventBusName: string = "default"
): Promise<void> {
  try {
    const command = new PutRuleCommand({
      Name: ruleName,
      EventPattern: JSON.stringify(eventPattern),
      State: "ENABLED",
      Description: description,
      EventBusName: eventBusName,
    });

    await eventBridgeClient.send(command);
  } catch (error) {
    console.error("Create event pattern rule error:", error);
    throw error;
  }
}

/**
 * Add target to rule
 */
export async function addRuleTarget(
  ruleName: string,
  targetId: string,
  target: RuleTarget,
  eventBusName: string = "default"
): Promise<void> {
  try {
    const command = new PutTargetsCommand({
      Rule: ruleName,
      Targets: [
        {
          Id: targetId,
          Arn: target.arn,
          RoleArn: target.roleArn,
          Input: target.input,
          InputPath: target.inputPath,
          InputTransformer: target.inputTransformer,
        },
      ],
      EventBusName: eventBusName,
    });

    await eventBridgeClient.send(command);
  } catch (error) {
    console.error("Add rule target error:", error);
    throw error;
  }
}

/**
 * Remove target from rule
 */
export async function removeRuleTarget(
  ruleName: string,
  targetId: string,
  eventBusName: string = "default"
): Promise<void> {
  try {
    const command = new RemoveTargetsCommand({
      Rule: ruleName,
      Ids: [targetId],
      EventBusName: eventBusName,
    });

    await eventBridgeClient.send(command);
  } catch (error) {
    console.error("Remove rule target error:", error);
    throw error;
  }
}

/**
 * Delete rule
 */
export async function deleteRule(
  ruleName: string,
  eventBusName: string = "default"
): Promise<void> {
  try {
    const command = new DeleteRuleCommand({
      Name: ruleName,
      EventBusName: eventBusName,
    });

    await eventBridgeClient.send(command);
  } catch (error) {
    console.error("Delete rule error:", error);
    throw error;
  }
}

/**
 * Schedule Lambda invocation
 */
export async function scheduleLambdaInvocation(
  ruleName: string,
  scheduleExpression: string,
  lambdaArn: string,
  lambdaRoleArn: string,
  payload?: any,
  eventBusName: string = "default"
): Promise<void> {
  try {
    await createScheduledRule(ruleName, scheduleExpression, undefined, eventBusName);

    await addRuleTarget(
      ruleName,
      "1",
      {
        arn: lambdaArn,
        roleArn: lambdaRoleArn,
        input: payload ? JSON.stringify(payload) : undefined,
      },
      eventBusName
    );
  } catch (error) {
    console.error("Schedule Lambda invocation error:", error);
    throw error;
  }
}

/**
 * Send custom metric event (for CloudWatch tracking)
 */
export async function publishMetricEvent(
  source: string,
  metricName: string,
  value: number,
  unit: string = "None"
): Promise<string> {
  return publishEvent({
    source,
    detailType: "MetricEvent",
    detail: {
      metric: metricName,
      value,
      unit,
      timestamp: new Date().toISOString(),
    },
  });
}

export default eventBridgeClient;
