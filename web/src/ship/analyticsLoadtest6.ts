/**
 * Finish 6.0 Phase 26 — Analytics + loadtest banks expansion 6
 * (mirrors shared/ship/analytics-loadtest-6.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/analytics-loadtest-6.json";
import opsJson from "../../../shared/ops/analytics-loadtest-6.json";
import { ANALYTICS_EVENT_NAMES } from "../engine/analytics";
import { measureLoadtestBanks } from "./loadtestBanksNode";
import { LOADTEST_BANKS } from "./loadtestBanks";

export interface AnalyticsLoadtest6ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  analyticsLoadtest6Marker: string;
  closesGap: string;
  opsCatalog: string;
  extendsLoadtestBanks: string;
  extendsRemoteAnalytics: string;
  eventNameFloor: number;
  nestEvents: string[];
  soakScenarioFloor: number;
  minBytesEach: number;
  bankSchemaVersionFloor: number;
  parityFixture: string;
  validateScript: string;
  softRemoteAnalyticsValidate: string;
  kickoffCatalog: string;
  authorTool: string;
  checklist: string[];
  preflightGates: string[];
}

export interface AnalyticsLoadtest6OpsCatalog {
  phase: number;
  schema: string;
  eventNameFloor: number;
  nestEvents: string[];
  soakScenarioFloor: number;
  minBytesEach: number;
  bankSchemaVersionFloor: number;
  scenarios: Array<{ id: string; title: string }>;
}

export const ANALYTICS_LOADTEST_6 = catalogJson as unknown as AnalyticsLoadtest6ShipCatalog;
export const ANALYTICS_LOADTEST_6_OPS = opsJson as unknown as AnalyticsLoadtest6OpsCatalog;
export const ANALYTICS_LOADTEST_6_PHASE = ANALYTICS_LOADTEST_6.phase;
export const ANALYTICS_LOADTEST_6_SCHEMA = ANALYTICS_LOADTEST_6.schema;
export const ANALYTICS_LOADTEST_6_MARKER = ANALYTICS_LOADTEST_6.analyticsLoadtest6Marker;
export const ANALYTICS_LOADTEST_6_EVENT_FLOOR = ANALYTICS_LOADTEST_6.eventNameFloor;
export const ANALYTICS_LOADTEST_6_SOAK_FLOOR = ANALYTICS_LOADTEST_6.soakScenarioFloor;
export const ANALYTICS_LOADTEST_6_BANK_SCHEMA_FLOOR = ANALYTICS_LOADTEST_6.bankSchemaVersionFloor;

export interface AnalyticsLoadtest6Measure {
  eventNameCount: number;
  nestEventsPresent: boolean;
  soakScenarioCount: number;
  eventsEnough: boolean;
  soakEnough: boolean;
  banksFloorsMet: boolean;
  bankSchemaOk: boolean;
  gapClosed: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureAnalyticsLoadtest6(repoRoot: string): AnalyticsLoadtest6Measure {
  const kickoffPath = resolve(repoRoot, ANALYTICS_LOADTEST_6.kickoffCatalog);
  const banks = measureLoadtestBanks(repoRoot);
  const nestEventsPresent = ANALYTICS_LOADTEST_6.nestEvents.every((name) =>
    (ANALYTICS_EVENT_NAMES as readonly string[]).includes(name),
  );
  const soakScenarioCount = ANALYTICS_LOADTEST_6_OPS.scenarios?.length ?? 0;

  let gapClosed = false;
  let kickoffWired = false;
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed = kickoff?.gaps?.loadtestBanksIncomplete === false;
    const phase26 = (kickoff.phases as any[])?.find((p) => p.phase === 26);
    kickoffWired =
      phase26?.id === "analytics-loadtest-6" &&
      phase26?.validate === "analyticsloadtest6:validate";
  }

  const missingGates: string[] = [];
  for (const gate of ANALYTICS_LOADTEST_6.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const bankSchemaOk =
    (banks.save.schemaVersion ?? 0) >= ANALYTICS_LOADTEST_6_BANK_SCHEMA_FLOOR &&
    (banks.telemetry.schemaVersion ?? 0) >= ANALYTICS_LOADTEST_6_BANK_SCHEMA_FLOOR &&
    LOADTEST_BANKS.schemaVersion >= ANALYTICS_LOADTEST_6_BANK_SCHEMA_FLOOR;

  return {
    eventNameCount: ANALYTICS_EVENT_NAMES.length,
    nestEventsPresent,
    soakScenarioCount,
    eventsEnough: ANALYTICS_EVENT_NAMES.length >= ANALYTICS_LOADTEST_6_EVENT_FLOOR,
    soakEnough: soakScenarioCount >= ANALYTICS_LOADTEST_6_SOAK_FLOOR,
    banksFloorsMet: banks.floorsMet,
    bankSchemaOk,
    gapClosed,
    kickoffWired,
    missingGates,
  };
}
