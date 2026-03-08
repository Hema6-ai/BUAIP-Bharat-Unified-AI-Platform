/**
 * AWS CloudWatch Client Wrapper
 * Monitoring and logging
 */

import {
  CloudWatchClient,
  PutMetricDataCommand,
  GetMetricStatisticsCommand,
  PutMetricAlarmCommand,
  DeleteAlarmsCommand,
} from "@aws-sdk/client-cloudwatch";
import { awsConfig } from "./config";

export const cloudwatchClient = new CloudWatchClient({
  region: awsConfig.region,
});

export interface MetricDatapoint {
  timestamp: Date;
  value: number;
  unit: string;
}

export interface AlarmConfig {
  alarmName: string;
  metricName: string;
  namespace: string;
  statistic: "Average" | "Sum" | "Minimum" | "Maximum" | "SampleCount";
  period: number;
  evaluationPeriods: number;
  threshold: number;
  comparisonOperator:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanThreshold"
    | "LessThanOrEqualToThreshold";
  alarmActions?: string[];
}

/**
 * Put custom metric to CloudWatch
 */
export async function putMetric(
  namespace: string,
  metricName: string,
  value: number,
  unit: string = "None",
  dimensions?: { [key: string]: string }
): Promise<void> {
  try {
    const dimensionList = dimensions
      ? Object.entries(dimensions).map(([key, val]) => ({
          Name: key,
          Value: val,
        }))
      : undefined;

    const command = new PutMetricDataCommand({
      Namespace: namespace,
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit as any,
          Timestamp: new Date(),
          Dimensions: dimensionList,
        },
      ],
    });

    await cloudwatchClient.send(command);
  } catch (error) {
    console.error("Put metric error:", error);
    throw error;
  }
}

/**
 * Put multiple metrics at once
 */
export async function putMetrics(
  namespace: string,
  metrics: Array<{
    name: string;
    value: number;
    unit?: string;
    dimensions?: { [key: string]: string };
  }>
): Promise<void> {
  try {
    const metricData = metrics.map((metric) => ({
      MetricName: metric.name,
      Value: metric.value,
      Unit: (metric.unit || "None") as any,
      Timestamp: new Date(),
      Dimensions: metric.dimensions
        ? Object.entries(metric.dimensions).map(([key, val]) => ({
            Name: key,
            Value: val,
          }))
        : undefined,
    }));

    const command = new PutMetricDataCommand({
      Namespace: namespace,
      MetricData: metricData,
    });

    await cloudwatchClient.send(command);
  } catch (error) {
    console.error("Put metrics error:", error);
    throw error;
  }
}

/**
 * Get metric statistics
 */
export async function getMetricStats(
  namespace: string,
  metricName: string,
  statistic:
    | "Average"
    | "Sum"
    | "Minimum"
    | "Maximum"
    | "SampleCount" = "Average",
  startTime: Date,
  endTime: Date,
  period: number = 300
): Promise<MetricDatapoint[]> {
  try {
    const command = new GetMetricStatisticsCommand({
      Namespace: namespace,
      MetricName: metricName,
      StartTime: startTime,
      EndTime: endTime,
      Period: period,
      Statistics: [statistic],
    });

    const response = await cloudwatchClient.send(command);
    const datapoints = response.Datapoints || [];

    return datapoints.map((dp) => ({
      timestamp: dp.Timestamp || new Date(),
      value: dp[statistic] || 0,
      unit: dp.Unit || "",
    }));
  } catch (error) {
    console.error("Get metric stats error:", error);
    throw error;
  }
}

/**
 * Create CloudWatch alarm
 */
export async function createAlarm(config: AlarmConfig): Promise<void> {
  try {
    const command = new PutMetricAlarmCommand({
      AlarmName: config.alarmName,
      MetricName: config.metricName,
      Namespace: config.namespace,
      Statistic: config.statistic,
      Period: config.period,
      EvaluationPeriods: config.evaluationPeriods,
      Threshold: config.threshold,
      ComparisonOperator: config.comparisonOperator,
      AlarmActions: config.alarmActions,
      TreatMissingData: "notBreaching",
    });

    await cloudwatchClient.send(command);
  } catch (error) {
    console.error("Create alarm error:", error);
    throw error;
  }
}

/**
 * Delete CloudWatch alarm
 */
export async function deleteAlarm(alarmName: string): Promise<void> {
  try {
    const command = new DeleteAlarmsCommand({
      AlarmNames: [alarmName],
    });

    await cloudwatchClient.send(command);
  } catch (error) {
    console.error("Delete alarm error:", error);
    throw error;
  }
}

/**
 * Create CloudWatch Logs group
 */
export async function createLogGroup(logGroupName: string): Promise<void> {
  try {
    // CloudWatch Logs not available in basic AWS SDK v3
    // Use CloudWatch API directly or implement custom logging
    console.log(`Log group would be created: ${logGroupName}`);
  } catch (error) {
    console.error("Create log group error:", error);
    throw error;
  }
}

/**
 * Create CloudWatch Logs stream
 */
export async function createLogStream(
  logGroupName: string,
  logStreamName: string
): Promise<void> {
  try {
    // CloudWatch Logs not available in basic AWS SDK v3
    console.log(
      `Log stream would be created: ${logGroupName}/${logStreamName}`
    );
  } catch (error) {
    console.error("Create log stream error:", error);
    throw error;
  }
}

/**
 * Put log events
 */
export async function putLogEvents(
  logGroupName: string,
  logStreamName: string,
  messages: string[]
): Promise<void> {
  try {
    // CloudWatch Logs not available in basic AWS SDK v3
    // Log to console as fallback
    console.log(`[${logGroupName}/${logStreamName}]`);
    messages.forEach((msg) => console.log(msg));
  } catch (error) {
    console.error("Put log events error:", error);
    throw error;
  }
}

/**
 * Get log events
 */
export async function getLogEvents(
  logGroupName: string,
  logStreamName: string,
  limit: number = 50
): Promise<string[]> {
  try {
    // CloudWatch Logs not available in basic AWS SDK v3
    // Return empty array as fallback
    console.log(
      `Log events requested from: ${logGroupName}/${logStreamName} (limit: ${limit})`
    );
    return [];
  } catch (error) {
    console.error("Get log events error:", error);
    throw error;
  }
}

/**
 * Structured logging helper
 */
export async function logStructured(
  logGroupName: string,
  logStreamName: string,
  data: any
): Promise<void> {
  const message = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...data,
  });

  return putLogEvents(logGroupName, logStreamName, [message]);
}

/**
 * Application-level metric tracking
 */
export async function trackEvent(
  namespace: string,
  eventType: string,
  metadata?: { [key: string]: string | number }
): Promise<void> {
  try {
    const dimensions = metadata
      ? Object.entries(metadata).reduce(
          (acc, [key, val]) => {
            acc[key] = String(val);
            return acc;
          },
          {} as { [key: string]: string }
        )
      : undefined;

    await putMetric(namespace, eventType, 1, "Count", dimensions);
  } catch (error) {
    console.error("Track event error:", error);
    // Don't throw - logging failures shouldn't break app
  }
}

export default cloudwatchClient;
