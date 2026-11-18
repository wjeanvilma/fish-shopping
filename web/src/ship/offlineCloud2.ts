/**
 * Finish 4.0 Phase 21 — offline/cloud/analytics hardening
 * (mirrors shared/ship/offline-cloud-2.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/offline-cloud-2.json";
import { loadContent } from "../engine";

export interface OfflineCloud2Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  offlineCloud2Marker: string;
  dailyObjectiveMin: number;
  boardSlotsMin: number;
  objectiveIds: string[];
  journalDeltaFields: string[];
  conflictFields: string[];
  analyticsRetry: {
    requeueOnFlushFailure: boolean;
    maxFlushRetries: number;
    retryBackoffMs: number;
  };
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const OFFLINE_CLOUD_2 = catalogJson as unknown as OfflineCloud2Catalog;
export const OFFLINE_CLOUD_2_PHASE = OFFLINE_CLOUD_2.phase;
export const OFFLINE_CLOUD_2_SCHEMA = OFFLINE_CLOUD_2.schema;
export const OFFLINE_CLOUD_2_MARKER = OFFLINE_CLOUD_2.offlineCloud2Marker;

export interface OfflineCloud2Measure {
  dailyObjectiveCount: number;
  boardSlots: number;
  objectivesPresent: boolean;
  journalFieldsPresent: boolean;
  conflictFieldsPresent: boolean;
  analyticsRetryWired: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureOfflineCloud2(repoRoot: string): OfflineCloud2Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  loadContent(pack);
  const daily = pack.dailyGoals ?? {};
  const objectives = daily.objectives ?? [];

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

  const kickoff = readJson(resolve(repoRoot, OFFLINE_CLOUD_2.kickoffCatalog));
  const phase21 = (kickoff.phases as any[])?.find((p) => p.phase === 21);

  const missingGates: string[] = [];
  for (const gate of OFFLINE_CLOUD_2.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    dailyObjectiveCount: objectives.length,
    boardSlots: daily.boardSlots ?? 0,
    objectivesPresent: OFFLINE_CLOUD_2.objectiveIds.every((id) =>
      objectives.some((o: any) => o.id === id),
    ),
    journalFieldsPresent: OFFLINE_CLOUD_2.journalDeltaFields.every(
      (f) => offlineKt.includes(f) && offlineTs.includes(f),
    ),
    conflictFieldsPresent: OFFLINE_CLOUD_2.conflictFields.every(
      (f) =>
        cloudKt.includes(f) &&
        cloudTs.includes(f) &&
        titleTsx.includes(f) &&
        titleKt.includes(f),
    ),
    analyticsRetryWired:
      policy.batch?.requeueOnFlushFailure === true &&
      policy.batch?.maxFlushRetries === OFFLINE_CLOUD_2.analyticsRetry.maxFlushRetries &&
      policy.batch?.retryBackoffMs === OFFLINE_CLOUD_2.analyticsRetry.retryBackoffMs &&
      remoteTs.includes("requeueRemoteFlushSlice") &&
      remoteKt.includes("requeueFlushSlice") &&
      policyKt.includes("REQUEUE_ON_FLUSH_FAILURE"),
    kickoffWired:
      phase21?.id === "offline-cloud-2" && phase21?.validate === "offlinecloud2:validate",
    missingGates,
  };
}
