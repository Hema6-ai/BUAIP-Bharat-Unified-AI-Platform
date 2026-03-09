// Signal Refresher Scheduler
// Periodic updates to keep signals fresh (local simulation, future: EventBridge)

import { updatePricingCache } from './pricingConnector';
import { updateSellerMetrics } from './sellerSignalConnector';
import { updateDemandCache } from './demandConnector';
import { monitorSupplyRisks } from './supplyRiskConnector';
import { syncComplianceDatabase } from './complianceKnowledge';
import { logSignal, pruneOldLogs } from './signalLogger';

export interface SchedulerConfig {
  pricingRefreshIntervalMinutes: number;
  sellerRefreshIntervalMinutes: number;
  demandRefreshIntervalMinutes: number;
  supplyRiskRefreshIntervalMinutes: number;
  complianceSyncIntervalMinutes: number;
  logPruningIntervalMinutes: number;
}

const defaultConfig: SchedulerConfig = {
  pricingRefreshIntervalMinutes: 30, // Update every 30 min (Keepa-like)
  sellerRefreshIntervalMinutes: 60, // Every 1 hour (SP-API rate limits)
  demandRefreshIntervalMinutes: 120, // Every 2 hours
  supplyRiskRefreshIntervalMinutes: 240, // Every 4 hours
  complianceSyncIntervalMinutes: 1440, // Every 24 hours
  logPruningIntervalMinutes: 360, // Every 6 hours
};

// Scheduler state
let schedulerRunning = false;
let schedulerIntervals: NodeJS.Timeout[] = [];

/**
 * Start background scheduler (call once on app startup)
 * Simulates AWS EventBridge locally
 */
export async function startSignalScheduler(
  customConfig?: Partial<SchedulerConfig>
): Promise<void> {
  if (schedulerRunning) {
    console.warn('[SignalScheduler] Already running, skipping start');
    return;
  }

  const config = { ...defaultConfig, ...customConfig };
  schedulerRunning = true;

  console.log('[SignalScheduler] Starting with config:', config);

  // Pricing refresh (every 30 min)
  const pricingInterval = setInterval(async () => {
    try {
      const startTime = performance.now();
      await updatePricingCache(['all']); // Refresh all cached ASINs
      const executionTime = Math.round(performance.now() - startTime);
      logSignal(
        'pricingConnector',
        'scheduled_refresh',
        'success',
        90,
        executionTime
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logSignal(
        'pricingConnector',
        'scheduled_refresh',
        'failure',
        0,
        0,
        msg
      );
    }
  }, config.pricingRefreshIntervalMinutes * 60 * 1000);

  // Seller signal refresh (every 60 min)
  const sellerInterval = setInterval(async () => {
    try {
      const startTime = performance.now();
      await updateSellerMetrics(['all']); // Refresh all monitored sellers
      const executionTime = Math.round(performance.now() - startTime);
      logSignal(
        'sellerSignalConnector',
        'scheduled_refresh',
        'success',
        90,
        executionTime
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logSignal('sellerSignalConnector', 'scheduled_refresh', 'failure', 0, 0, msg);
    }
  }, config.sellerRefreshIntervalMinutes * 60 * 1000);

  // Demand signal refresh (every 2 hours)
  const demandInterval = setInterval(async () => {
    try {
      const startTime = performance.now();
      await updateDemandCache(['IN', 'US']); // Key regions
      const executionTime = Math.round(performance.now() - startTime);
      logSignal(
        'demandConnector',
        'scheduled_refresh',
        'success',
        90,
        executionTime
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logSignal('demandConnector', 'scheduled_refresh', 'failure', 0, 0, msg);
    }
  }, config.demandRefreshIntervalMinutes * 60 * 1000);

  // Supply risk refresh (every 4 hours)
  const supplyRiskInterval = setInterval(async () => {
    try {
      const startTime = performance.now();
      await monitorSupplyRisks(['China', 'India', 'Bangladesh']); // Key regions
      const executionTime = Math.round(performance.now() - startTime);
      logSignal(
        'supplyRiskConnector',
        'scheduled_refresh',
        'success',
        85,
        executionTime
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logSignal(
        'supplyRiskConnector',
        'scheduled_refresh',
        'failure',
        0,
        0,
        msg
      );
    }
  }, config.supplyRiskRefreshIntervalMinutes * 60 * 1000);

  // Compliance database sync (every 24 hours)
  const complianceInterval = setInterval(async () => {
    try {
      const startTime = performance.now();
      await syncComplianceDatabase();
      const executionTime = Math.round(performance.now() - startTime);
      logSignal(
        'complianceKnowledge',
        'scheduled_sync',
        'success',
        95,
        executionTime
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logSignal('complianceKnowledge', 'scheduled_sync', 'failure', 0, 0, msg);
    }
  }, config.complianceSyncIntervalMinutes * 60 * 1000);

  // Log pruning (every 6 hours)
  const pruneInterval = setInterval(() => {
    try {
      const pruned = pruneOldLogs(24); // Keep 24 hours of logs
      console.log(`[SignalScheduler] Pruned ${pruned} logs`);
    } catch (error) {
      console.error('[SignalScheduler] Log pruning failed:', error);
    }
  }, config.logPruningIntervalMinutes * 60 * 1000);

  // Store intervals for cleanup
  schedulerIntervals = [
    pricingInterval,
    sellerInterval,
    demandInterval,
    supplyRiskInterval,
    complianceInterval,
    pruneInterval,
  ];

  console.log('[SignalScheduler] Started with 6 periodic tasks');
}

/**
 * Stop the background scheduler (call on app shutdown)
 */
export async function stopSignalScheduler(): Promise<void> {
  if (!schedulerRunning) {
    console.warn('[SignalScheduler] Not running, nothing to stop');
    return;
  }

  schedulerIntervals.forEach((interval) => clearInterval(interval));
  schedulerIntervals = [];
  schedulerRunning = false;

  console.log('[SignalScheduler] Stopped');
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return schedulerRunning;
}

/**
 * Manually trigger a refresh (for testing/admin)
 */
export async function triggerManualRefresh(connectorName: string): Promise<void> {
  console.log(`[SignalScheduler] Manual refresh triggered for ${connectorName}`);

  try {
    const startTime = performance.now();

    switch (connectorName) {
      case 'pricing':
        await updatePricingCache(['all']);
        break;
      case 'seller':
        await updateSellerMetrics(['all']);
        break;
      case 'demand':
        await updateDemandCache(['IN', 'US']);
        break;
      case 'supplyRisk':
        await monitorSupplyRisks(['China', 'India']);
        break;
      case 'compliance':
        await syncComplianceDatabase();
        break;
      default:
        throw new Error(`Unknown connector: ${connectorName}`);
    }

    const executionTime = Math.round(performance.now() - startTime);
    logSignal(connectorName, 'manual_refresh', 'success', 90, executionTime);

    console.log(
      `[SignalScheduler] Manual refresh completed for ${connectorName} (${executionTime}ms)`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logSignal(connectorName, 'manual_refresh', 'failure', 0, 0, msg);
    console.error(`[SignalScheduler] Manual refresh failed for ${connectorName}:`, error);
    throw error;
  }
}

/**
 * Get scheduler status for monitoring
 */
export function getSchedulerStatus(): {
  running: boolean;
  activeIntervals: number;
  nextRefreshTimes: Record<string, string>;
} {
  return {
    running: schedulerRunning,
    activeIntervals: schedulerIntervals.length,
    nextRefreshTimes: schedulerRunning
      ? {
          pricing: 'Next in ~30 min',
          seller: 'Next in ~60 min',
          demand: 'Next in ~120 min',
          supplyRisk: 'Next in ~240 min',
          compliance: 'Next in ~1440 min',
          logPruning: 'Next in ~360 min',
        }
      : { status: 'Scheduler not running' } as any,
  };
}

/**
 * Initialize scheduler on module load (for server-side)
 * Call this in your app initialization
 */
if (typeof window === 'undefined') {
  const isBuildPhase =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build';
  const shouldAutoStart = process.env.ENABLE_SIGNAL_SCHEDULER === 'true';

  if (shouldAutoStart && !isBuildPhase) {
    setTimeout(() => {
      // Delay start to allow other services to initialize.
      startSignalScheduler().catch((error) => {
        console.error('[SignalScheduler] Failed to start:', error);
      });
    }, 5000);
  }
}
