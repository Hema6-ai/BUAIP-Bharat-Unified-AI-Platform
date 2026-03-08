// Connector Layer - Unified Exports
// All real-signal connectors with failsafe wrappers

export {
  getPricingSignal,
  updatePricingCache,
  type PricingSignal,
} from './pricingConnector';

export {
  getSellerSignal,
  updateSellerMetrics,
  type SellerSignal,
} from './sellerSignalConnector';

export {
  getDemandSignal,
  updateDemandCache,
  type DemandSignal,
} from './demandConnector';

export {
  getSupplyRiskSignal,
  monitorSupplyRisks,
  type SupplyRiskSignal,
} from './supplyRiskConnector';

export {
  getComplianceSignal,
  listAvailableMaterialTypes,
  syncComplianceDatabase,
  type ComplianceSignal,
  type CertificationRequirement,
} from './complianceKnowledge';

export {
  logSignal,
  executeConnectorWithFailsafe,
  createSyntheticSignal,
  getRecentSignalLogs,
  getSignalHealthScore,
  pruneOldLogs,
  exportSignalLogs,
  type SignalLog,
  type ConnectorSignal,
} from './signalLogger';

export {
  startSignalScheduler,
  stopSignalScheduler,
  isSchedulerRunning,
  triggerManualRefresh,
  getSchedulerStatus,
  type SchedulerConfig,
} from './signalRefresher';
