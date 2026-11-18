/**
 * Finish 3.0 Phase 26 — remote analytics ship catalog
 * (mirrors shared/ship/remote-analytics.json).
 */
import catalogJson from "../../../shared/ship/remote-analytics.json";

export interface RemoteAnalyticsShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  remoteAnalyticsMarker: string;
  policyCatalog: string;
  extendsDashboard: string;
  moduleRoot: string;
  localEmulatorDefaultBase: string;
  clientEnvKey: string;
  androidMetaKey: string;
  batchMaxEventsMin: number;
  eventNameMin: number;
  simHzInvariant: number;
  parityFixture: string;
  validateScript: string;
}

export const REMOTE_ANALYTICS = catalogJson as unknown as RemoteAnalyticsShipCatalog;
export const REMOTE_ANALYTICS_PHASE = REMOTE_ANALYTICS.phase;
export const REMOTE_ANALYTICS_SCHEMA = REMOTE_ANALYTICS.schema;
export const REMOTE_ANALYTICS_MARKER = REMOTE_ANALYTICS.remoteAnalyticsMarker;
export const REMOTE_BATCH_MAX_EVENTS_FLOOR = REMOTE_ANALYTICS.batchMaxEventsMin;
export const REMOTE_EVENT_NAME_FLOOR = REMOTE_ANALYTICS.eventNameMin;
