/**
 * Finish 3.0 Phase 26 — analytics-api catalog pins from shared ops JSON.
 */
import policyJson from "../../shared/ops/remote-analytics-sink.json";
import dashJson from "../../shared/ops/analytics-dashboard.json";

export const POLICY = policyJson as {
  batchSchema: string;
  analyticsSchema: string;
  endpoint: { path: string; healthPath: string };
  client: { localEmulatorDefaultBase: string };
  envelope: { platforms: string[] };
};

export const DASHBOARD = dashJson as {
  analyticsSchema: string;
};

export const DEFAULT_PORT = 8788;
export const BATCH_SCHEMA = POLICY.batchSchema;
export const ENDPOINT_PATH = POLICY.endpoint.path;
export const HEALTH_PATH = POLICY.endpoint.healthPath;
export const LOCAL_DEFAULT_BASE = POLICY.client.localEmulatorDefaultBase;

export const EVENT_NAMES = [
  "tutorial_step_completed",
  "first_sale",
  "harbor_unlocked",
  "offline_claimed",
  "save_recovery",
  "frame_time_summary",
  "session_start",
  "crash_free_session",
  "nest_sigil_earned",
  "nest_contract_settled",
  "loadtest_bank_probed",
] as const;

export const FORBIDDEN_KEYS = new Set([
  "uid",
  "userId",
  "displayName",
  "phone",
  "deviceId",
  "ip",
  "ipAddress",
  "snapshot",
  "save",
  "saveJson",
  "saveText",
  "payload",
  "bagContents",
]);

export const ALLOWED_PROPS: Record<(typeof EVENT_NAMES)[number], ReadonlySet<string>> = {
  tutorial_step_completed: new Set(["stepIndex"]),
  first_sale: new Set(["coins"]),
  harbor_unlocked: new Set(["harborId", "mode"]),
  offline_claimed: new Set(["elapsedMillis", "ticksCredited", "coinsDelta", "capped"]),
  save_recovery: new Set(["source"]),
  frame_time_summary: new Set(["emaMs", "quality", "samples", "platform"]),
  session_start: new Set(["platform"]),
  crash_free_session: new Set(["clean", "platform"]),
  nest_sigil_earned: new Set(["sigilId", "count"]),
  nest_contract_settled: new Set(["contractId", "coins"]),
  loadtest_bank_probed: new Set(["bank", "floorsMet", "platform"]),
};
