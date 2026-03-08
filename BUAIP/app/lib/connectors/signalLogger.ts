// Signal Logger & Failsafe Mechanism
// Handles connector failures gracefully - no crashes, confidence scoring

import { PricingSignal } from './pricingConnector';
import { SellerSignal } from './sellerSignalConnector';
import { DemandSignal } from './demandConnector';
import { SupplyRiskSignal } from './supplyRiskConnector';
import { ComplianceSignal } from './complianceKnowledge';

// Unified signal type
export type ConnectorSignal =
  | PricingSignal
  | SellerSignal
  | DemandSignal
  | SupplyRiskSignal
  | ComplianceSignal;

export interface SignalLog {
  timestamp: string;
  connectorName: string;
  operation: string;
  status: 'success' | 'failure' | 'fallback';
  confidence: number;
  errorMessage?: string;
  executionTimeMs: number;
}

// Signal logs buffer (in-memory; future: CloudWatch)
const signalLogs: SignalLog[] = [];

/**
 * Log a signal event (success/failure/fallback)
 * Future: Push to CloudWatch Logs
 */
export function logSignal(
  connectorName: string,
  operation: string,
  status: 'success' | 'failure' | 'fallback',
  confidence: number,
  executionTimeMs: number,
  errorMessage?: string
): void {
  const log: SignalLog = {
    timestamp: new Date().toISOString(),
    connectorName,
    operation,
    status,
    confidence,
    errorMessage,
    executionTimeMs,
  };

  signalLogs.push(log);

  // Keep last 1000 logs in memory
  if (signalLogs.length > 1000) {
    signalLogs.shift();
  }

  // Console output for debugging
  const logLevel =
    status === 'failure' ? 'error' :
    status === 'fallback' ? 'warn' :
    'info';

  console[logLevel](`[${connectorName}] ${operation} → ${status}`, {
    confidence,
    executionTimeMs,
    error: errorMessage,
  });
}

/**
 * Failsafe wrapper for connector calls
 * Catches errors, logs them, returns null on failure
 * Calling code decides fallback behavior
 */
export async function executeConnectorWithFailsafe<T extends ConnectorSignal>(
  connectorName: string,
  operation: () => Promise<T | null>,
  fallbackSignal?: T | null
): Promise<T | null> {
  const startTime = performance.now();

  try {
    const result = await operation();
    const executionTime = Math.round(performance.now() - startTime);

    if (result) {
      logSignal(
        connectorName,
        'fetch',
        'success',
        result.signalConfidence,
        executionTime
      );
      return result;
    } else {
      // Connector returned null (handled failure)
      logSignal(
        connectorName,
        'fetch',
        'fallback',
        0,
        executionTime,
        'Connector returned null'
      );
      return fallbackSignal || null;
    }
  } catch (error) {
    const executionTime = Math.round(performance.now() - startTime);
    const errorMsg = error instanceof Error ? error.message : String(error);

    logSignal(
      connectorName,
      'fetch',
      'failure',
      0,
      executionTime,
      errorMsg
    );

    // Return fallback signal if provided, else null
    return fallbackSignal || null;
  }
}

/**
 * Build a "degraded" signal when real connector fails
 * Used as fallback - confidence = 0, indicates synthetic data
 */
export function createSyntheticSignal(
  connectorName: string,
  reason: string
): Partial<ConnectorSignal> {
  return {
    signalConfidence: 0,
    lastUpdated: new Date().toISOString(),
    // Additional fields depend on signal type
  };
}

/**
 * Get recent signal logs (for monitoring dashboard)
 */
export function getRecentSignalLogs(
  limit: number = 50,
  connectorFilter?: string
): SignalLog[] {
  let logs = [...signalLogs];

  if (connectorFilter) {
    logs = logs.filter((l) => l.connectorName === connectorFilter);
  }

  return logs.slice(-limit);
}

/**
 * Get signal health score (0-100)
 * Based on recent success rate
 */
export function getSignalHealthScore(
  connectorName?: string,
  windowMinutes: number = 60
): number {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;

  let logs = signalLogs.filter((l) => {
    const logTime = new Date(l.timestamp).getTime();
    return now - logTime <= windowMs;
  });

  if (connectorName) {
    logs = logs.filter((l) => l.connectorName === connectorName);
  }

  if (logs.length === 0) {
    return 50; // No recent data = neutral
  }

  const successCount = logs.filter((l) => l.status === 'success').length;
  return Math.round((successCount / logs.length) * 100);
}

/**
 * Clear old logs (called by scheduler)
 */
export function pruneOldLogs(retentionHours: number = 24): number {
  const now = Date.now();
  const retentionMs = retentionHours * 60 * 60 * 1000;

  const beforeCount = signalLogs.length;
  const cutoffTime = new Date(now - retentionMs).getTime();

  signalLogs.splice(
    0,
    signalLogs.findIndex(
      (l) => new Date(l.timestamp).getTime() >= cutoffTime
    )
  );

  return beforeCount - signalLogs.length;
}

/**
 * Export logs for debugging/analytics
 * Future: Push to CloudWatch, S3, or analytics pipeline
 */
export function exportSignalLogs(): {
  logs: SignalLog[];
  summary: {
    totalLogs: number;
    successRate: number;
    averageExecutionTime: number;
    connectorStats: Record<string, {
      calls: number;
      successRate: number;
      avgTime: number;
    }>;
  };
} {
  const summary = {
    totalLogs: signalLogs.length,
    successRate:
      signalLogs.length > 0
        ? signalLogs.filter((l) => l.status === 'success').length /
          signalLogs.length
        : 0,
    averageExecutionTime:
      signalLogs.length > 0
        ? signalLogs.reduce((sum, l) => sum + l.executionTimeMs, 0) /
          signalLogs.length
        : 0,
    connectorStats: {} as Record<
      string,
      { calls: number; successRate: number; avgTime: number }
    >,
  };

  // Calculate per-connector stats
  const connectors = new Set(signalLogs.map((l) => l.connectorName));
  for (const connector of connectors) {
    const connectorLogs = signalLogs.filter(
      (l) => l.connectorName === connector
    );
    const successCount = connectorLogs.filter(
      (l) => l.status === 'success'
    ).length;
    const avgTime =
      connectorLogs.reduce((sum, l) => sum + l.executionTimeMs, 0) /
      connectorLogs.length;

    summary.connectorStats[connector] = {
      calls: connectorLogs.length,
      successRate: successCount / connectorLogs.length,
      avgTime: Math.round(avgTime),
    };
  }

  return {
    logs: signalLogs,
    summary,
  };
}
