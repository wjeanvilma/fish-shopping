/**
 * Finish 6.0 Phase 18 — offline/cloud/analytics hardening 4
 * (mirrors shared/ship/offline-cloud-4.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/offline-cloud-4.json";

export interface OfflineCloud4Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  offlineCloud4Marker: string;
  extendsOfflineCloud3: string;
  journalDeltaFields: string[];
  conflictFields: string[];
  syncDiagnosticsFields: string[];
  analyticsRetry: {
    requeueOnFlushFailure: boolean;
    maxFlushRetries: number;
    retryBackoffMs: number;
    retryJitterMs: number;
    deadLetterAfterMaxRetries: boolean;
    circuitBreakerAfterDeadLetters: number;
  };
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  softOfflineCloud3Validate: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const OFFLINE_CLOUD_4 = catalogJson as unknown as OfflineCloud4Catalog;
export const OFFLINE_CLOUD_4_PHASE = OFFLINE_CLOUD_4.phase;
export const OFFLINE_CLOUD_4_SCHEMA = OFFLINE_CLOUD_4.schema;
export const OFFLINE_CLOUD_4_MARKER = OFFLINE_CLOUD_4.offlineCloud4Marker;

export interface OfflineCloud4Measure {
  journalFieldsPresent: boolean;
  conflictFieldsPresent: boolean;
  syncDiagnosticsPresent: boolean;
  analyticsRetryWired: boolean;
  conflictUxPresent: boolean;
  kickoffClosed: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureOfflineCloud4(repoRoot: string): OfflineCloud4Measure {
  const offlineKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/OfflineEarnings.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/OfflineEarnings.kt"),
      "utf8",
    )
    : "";
  const offlineTs = existsSync(resolve(repoRoot, "web/src/engine/offline.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/offline.ts"), "utf8")
    : "";
  const journalTs = existsSync(resolve(repoRoot, "web/src/engine/systems.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/systems.ts"), "utf8")
    : "";
  const journalKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/DailyGoals.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/DailyGoals.kt"),
      "utf8",
    )
    : "";
  const cloudKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/persistence/CloudSync.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/persistence/CloudSync.kt"),
      "utf8",
    )
    : "";
  const cloudTs = existsSync(resolve(repoRoot, "web/src/engine/cloudSync.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/cloudSync.ts"), "utf8")
    : "";
  const titleTsx = existsSync(resolve(repoRoot, "web/src/ui/TitlePanels.tsx"))
    ? readFileSync(resolve(repoRoot, "web/src/ui/TitlePanels.tsx"), "utf8")
    : "";
  const titleKt = existsSync(
    resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/TitlePanels.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/TitlePanels.kt"),
      "utf8",
    )
    : "";
  const snapTs = existsSync(resolve(repoRoot, "web/src/game/snapshotChoice.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/game/snapshotChoice.ts"), "utf8")
    : "";
  const snapKt = existsSync(
    resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/SnapshotChoice.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/SnapshotChoice.kt"),
      "utf8",
    )
    : "";
  const queueTs = existsSync(resolve(repoRoot, "web/src/cloud/cloudOfflineQueue.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/cloud/cloudOfflineQueue.ts"), "utf8")
    : "";
  const queueKt = existsSync(
    resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/cloud/CloudOfflineQueue.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/cloud/CloudOfflineQueue.kt"),
      "utf8",
    )
    : "";
  const policy = readJson(resolve(repoRoot, "shared/ops/remote-analytics-sink.json"));
  const remoteTs = existsSync(resolve(repoRoot, "web/src/analytics/remoteAnalyticsSink.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/analytics/remoteAnalyticsSink.ts"), "utf8")
    : "";
  const remoteKt = existsSync(
    resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/analytics/RemoteAnalyticsSink.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/analytics/RemoteAnalyticsSink.kt"),
      "utf8",
    )
    : "";
  const policyKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/RemoteAnalyticsPolicy.kt"),
  )
    ? readFileSync(
      resolve(
        repoRoot,
        "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/RemoteAnalyticsPolicy.kt",
      ),
      "utf8",
    )
    : "";
  const remoteEngineTs = existsSync(resolve(repoRoot, "web/src/engine/remoteAnalytics.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/remoteAnalytics.ts"), "utf8")
    : "";

  const kickoff = readJson(resolve(repoRoot, OFFLINE_CLOUD_4.kickoffCatalog));
  const phase18 = (kickoff.phases as any[])?.find((p) => p.phase === 18);

  const missingGates: string[] = [];
  for (const gate of OFFLINE_CLOUD_4.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    journalFieldsPresent: OFFLINE_CLOUD_4.journalDeltaFields.every(
      (f) =>
        offlineKt.includes(f) &&
        offlineTs.includes(f) &&
        journalTs.includes(f) &&
        journalKt.includes(f),
    ),
    conflictFieldsPresent: OFFLINE_CLOUD_4.conflictFields.every(
      (f) => cloudKt.includes(f) && cloudTs.includes(f) && snapTs.includes(f) && snapKt.includes(f),
    ),
    syncDiagnosticsPresent: OFFLINE_CLOUD_4.syncDiagnosticsFields.every(
      (f) => queueTs.includes(f) && queueKt.includes(f),
    ),
    analyticsRetryWired:
      policy.batch?.requeueOnFlushFailure === true &&
      (policy.batch?.maxFlushRetries ?? 0) >= OFFLINE_CLOUD_4.analyticsRetry.maxFlushRetries &&
      policy.batch?.retryJitterMs === OFFLINE_CLOUD_4.analyticsRetry.retryJitterMs &&
      policy.batch?.deadLetterAfterMaxRetries === true &&
      policy.batch?.circuitBreakerAfterDeadLetters ===
        OFFLINE_CLOUD_4.analyticsRetry.circuitBreakerAfterDeadLetters &&
      remoteTs.includes("circuitOpen") &&
      remoteTs.includes("CIRCUIT_BREAKER") &&
      remoteKt.includes("circuitOpen") &&
      remoteKt.includes("CIRCUIT_BREAKER") &&
      policyKt.includes("CIRCUIT_BREAKER_AFTER_DEAD_LETTERS") &&
      policyKt.includes("RETRY_JITTER_MS") &&
      remoteEngineTs.includes("REMOTE_CIRCUIT_BREAKER_AFTER_DEAD_LETTERS") &&
      remoteEngineTs.includes("REMOTE_RETRY_JITTER_MS"),
    conflictUxPresent:
      titleTsx.includes("nestConflictHint") &&
      titleTsx.includes("cloud.preferredSide") &&
      titleKt.includes("nestConflictHint") &&
      titleKt.includes("cloud.preferredSide"),
    kickoffClosed: kickoff.gaps?.offlineCloud4Incomplete === false,
    kickoffWired:
      phase18?.id === "offline-cloud-4" && phase18?.validate === "offlinecloud4:validate",
    missingGates,
  };
}
