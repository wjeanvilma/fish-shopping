/**
 * Finish 5.0 Phase 22 — offline/cloud/analytics hardening 3
 * (mirrors shared/ship/offline-cloud-3.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/offline-cloud-3.json";

export interface OfflineCloud3Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  offlineCloud3Marker: string;
  extendsOfflineCloud2: string;
  journalDeltaFields: string[];
  conflictFields: string[];
  syncDiagnosticsFields: string[];
  analyticsRetry: {
    requeueOnFlushFailure: boolean;
    maxFlushRetries: number;
    retryBackoffMs: number;
    retryJitterMs: number;
    deadLetterAfterMaxRetries: boolean;
  };
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  softOfflineCloud2Validate: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const OFFLINE_CLOUD_3 = catalogJson as unknown as OfflineCloud3Catalog;
export const OFFLINE_CLOUD_3_PHASE = OFFLINE_CLOUD_3.phase;
export const OFFLINE_CLOUD_3_SCHEMA = OFFLINE_CLOUD_3.schema;
export const OFFLINE_CLOUD_3_MARKER = OFFLINE_CLOUD_3.offlineCloud3Marker;

export interface OfflineCloud3Measure {
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

export function measureOfflineCloud3(repoRoot: string): OfflineCloud3Measure {
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

  const kickoff = readJson(resolve(repoRoot, OFFLINE_CLOUD_3.kickoffCatalog));
  const phase22 = (kickoff.phases as any[])?.find((p) => p.phase === 22);

  const missingGates: string[] = [];
  for (const gate of OFFLINE_CLOUD_3.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    journalFieldsPresent: OFFLINE_CLOUD_3.journalDeltaFields.every(
      (f) =>
        offlineKt.includes(f) &&
        offlineTs.includes(f) &&
        journalTs.includes(f) &&
        journalKt.includes(f),
    ),
    conflictFieldsPresent: OFFLINE_CLOUD_3.conflictFields.every(
      (f) => cloudKt.includes(f) && cloudTs.includes(f) && snapTs.includes(f) && snapKt.includes(f),
    ),
    syncDiagnosticsPresent: OFFLINE_CLOUD_3.syncDiagnosticsFields.every(
      (f) => queueTs.includes(f) && queueKt.includes(f),
    ),
    analyticsRetryWired:
      policy.batch?.requeueOnFlushFailure === true &&
      (policy.batch?.maxFlushRetries ?? 0) >= OFFLINE_CLOUD_3.analyticsRetry.maxFlushRetries &&
      // Soft-floor: Finish 6.0 Phase 18 raised jitter; keep ≥ Phase-22 floor.
      (policy.batch?.retryJitterMs ?? 0) >= OFFLINE_CLOUD_3.analyticsRetry.retryJitterMs &&
      policy.batch?.deadLetterAfterMaxRetries === true &&
      remoteTs.includes("shouldDeadLetterRemoteFlush") &&
      remoteTs.includes("deadLetterCount") &&
      remoteKt.includes("shouldDeadLetter") &&
      remoteKt.includes("deadLetterCount") &&
      policyKt.includes("DEAD_LETTER_AFTER_MAX_RETRIES") &&
      policyKt.includes("RETRY_JITTER_MS") &&
      remoteEngineTs.includes("REMOTE_RETRY_JITTER_MS"),
    conflictUxPresent:
      titleTsx.includes("syncDiagnostics") &&
      titleTsx.includes("cloud.severity") &&
      titleKt.includes("syncDiagnostics") &&
      titleKt.includes("cloud.severity"),
    kickoffClosed: kickoff.gaps?.offlineCloud3Incomplete === false,
    kickoffWired:
      phase22?.id === "offline-cloud-3" && phase22?.validate === "offlinecloud3:validate",
    missingGates,
  };
}
