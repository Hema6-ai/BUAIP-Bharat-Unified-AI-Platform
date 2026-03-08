import { CloudWatchClient, PutMetricDataCommand, StandardUnit } from '@aws-sdk/client-cloudwatch';

// ============================================================================
// TYPES
// ============================================================================

export interface AnalyticsEvent {
  engineName: string;
  userId: string;
  timestamp: number;
  duration?: number;
  success: boolean;
  errorMessage?: string;
}

// ============================================================================
// CLOUDWATCH CLIENT
// ============================================================================

let cloudwatchClient: CloudWatchClient | null = null;

function getCloudwatchClient(): CloudWatchClient {
  if (!cloudwatchClient) {
    const region = process.env.AWS_REGION || 'ap-south-1';
    cloudwatchClient = new CloudWatchClient({ region });
  }
  return cloudwatchClient;
}

// ============================================================================
// ANALYTICS LOGGING
// ============================================================================

/**
 * Log engine usage to CloudWatch
 * @param engineName Name of the AI engine
 * @param userId User identifier
 * @param duration Execution duration in milliseconds (optional)
 */
export async function logEngineUsage(
  engineName: string,
  userId: string = 'anonymous',
  duration: number = 0
): Promise<void> {
  try {
    const client = getCloudwatchClient();

    const command = new PutMetricDataCommand({
      Namespace: 'BUAIP/Engines',
      MetricData: [
        {
          MetricName: `${engineName}Usage`,
          Value: 1,
          Unit: StandardUnit.Count,
          Timestamp: new Date(),
          Dimensions: [
            {
              Name: 'EngineType',
              Value: engineName,
            },
            {
              Name: 'UserType',
              Value: userId === 'anonymous' ? 'Anonymous' : 'Authenticated',
            },
          ],
        },
        ...(duration > 0
          ? [
              {
                MetricName: `${engineName}Duration`,
                Value: duration,
                Unit: StandardUnit.Milliseconds,
                Timestamp: new Date(),
                Dimensions: [
                  {
                    Name: 'EngineType',
                    Value: engineName,
                  },
                ],
              },
            ]
          : []),
      ],
    });

    await client.send(command);

    console.log(
      `[CloudWatch] Engine usage logged: ${engineName}, duration: ${duration}ms`
    );
  } catch (error) {
    // Don't throw - analytics failure shouldn't break the main request
    console.error('[CloudWatch] Error logging engine usage:', error);
  }
}

/**
 * Log engine error to CloudWatch
 * @param engineName Name of the engine
 * @param errorMessage Error message
 */
export async function logEngineError(
  engineName: string,
  errorMessage: string
): Promise<void> {
  try {
    const client = getCloudwatchClient();

    const command = new PutMetricDataCommand({
      Namespace: 'BUAIP/Engines',
      MetricData: [
        {
          MetricName: `${engineName}Errors`,
          Value: 1,
          Unit: StandardUnit.Count,
          Timestamp: new Date(),
          Dimensions: [
            {
              Name: 'EngineType',
              Value: engineName,
            },
          ],
        },
      ],
    });

    await client.send(command);

    console.log(`[CloudWatch] Engine error logged: ${engineName}`);
  } catch (error) {
    console.error('[CloudWatch] Error logging engine error:', error);
  }
}

/**
 * Log custom metric to CloudWatch
 * @param metricName Name of the metric
 * @param value Metric value
 * @param dimensions Additional dimensions for the metric
 */
export async function logCustomMetric(
  metricName: string,
  value: number,
  dimensions?: Record<string, string>
): Promise<void> {
  try {
    const client = getCloudwatchClient();

    const dimensionsArray = dimensions
      ? Object.entries(dimensions).map(([name, value]) => ({
          Name: name,
          Value: value,
        }))
      : [];

    const command = new PutMetricDataCommand({
      Namespace: 'BUAIP/Platform',
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: StandardUnit.Count,
          Timestamp: new Date(),
          Dimensions: dimensionsArray,
        },
      ],
    });

    await client.send(command);

    console.log(`[CloudWatch] Custom metric logged: ${metricName}=${value}`);
  } catch (error) {
    console.error('[CloudWatch] Error logging custom metric:', error);
  }
}

/**
 * Wrapper function to track engine execution with metrics
 * @param engineName Engine name
 * @param userId User identifier
 * @param handler The handler function to execute
 * @returns Handler response
 */
export async function withAnalytics<T>(
  engineName: string,
  userId: string,
  handler: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await handler();
    const duration = Date.now() - startTime;

    await logEngineUsage(engineName, userId, duration);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await logEngineError(engineName, errorMessage);
    await logEngineUsage(engineName, userId, duration);

    throw error;
  }
}

/**
 * Get CloudWatch insights query for engine analytics
 */
export function getEngineAnalyticsQuery(
  engineName: string,
  hoursBack: number = 24
): string {
  return `
fields @timestamp, @message, engineName, userId
| filter engineName = '${engineName}'
| stats count() as TotalCalls, avg(duration) as AvgDuration, max(duration) as MaxDuration by userId
| sort TotalCalls desc
  `.trim();
}
