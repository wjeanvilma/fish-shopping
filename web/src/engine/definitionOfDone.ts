/**
 * Phase 30 (post-1.0) — Definition of Done 100% closeout
 * (mirrors shared/ship/definition-of-done.json).
 */
import dodJson from "../../../shared/ship/definition-of-done.json";

export interface DodPhaseGate {
  phase: number;
  catalog: string;
  validate: string | null;
}

export interface Finish2FreezeCloseout {
  phase: number;
  plan: string;
  status: string;
  statusValues: string[];
  releaseTag: string;
  contentVersion: string;
  schemaVersion: number;
  versionName: string;
  versionCode: number;
  catalog: string;
  validateScript: string;
  locEnforceMode: string;
  completeTagArchived: string;
  checklist: string[];
  manualCommands: string[];
}

export interface DefinitionOfDoneCatalog {
  phase: number;
  schema: string;
  releaseTag: string;
  completeTag: string;
  contentVersion: string;
  schemaVersion: number;
  quotas: {
    harbors: number;
    speciesMin: number;
    machineClasses: number;
    quests?: number;
    cosmetics?: number;
    baits?: number;
  };
  checks: string[];
  screensPresent: string[];
  closeout: {
    status: string;
    statusValues: string[];
    plan: string;
    planPhases: number;
    validateScript: string;
    completeTag: string;
    completeTagMessage: string;
    checklist: string[];
    phaseGates: DodPhaseGate[];
    operatorGates?: { id: string; urls?: string[]; note?: string }[];
    evidence: Record<string, string>;
    manualCommands: string[];
  };
  finish2Freeze?: Finish2FreezeCloseout;
}

export const DEFINITION_OF_DONE = dodJson as unknown as DefinitionOfDoneCatalog;
export const DOD_PHASE = DEFINITION_OF_DONE.phase;
export const DOD_SCHEMA = DEFINITION_OF_DONE.schema;
export const DOD_COMPLETE_TAG = DEFINITION_OF_DONE.completeTag;
export const DOD_CLOSEOUT_STATUS = DEFINITION_OF_DONE.closeout.status;

export function dodPhaseGateCatalogs(): string[] {
  return DEFINITION_OF_DONE.closeout.phaseGates.map((g) => g.catalog);
}

export function dodRequiredChecks(): string[] {
  return [
    "blueprint_quotas",
    "objectives_reachable",
    "inventories_reconcile",
    "rewards_idempotent",
    "latest_and_previous_restore",
    "store_urls_filled",
    "release_pin_matches",
    "post_1_0_phase_gates",
    "real_iap_catalogs",
    "real_screenshots",
    "authored_audio",
    "legal_urls_pages_ready",
    "closed_test_signoff_path",
    "hotfix_lane_ready",
    "finish2_freeze_2_0_0",
    "content_floors_2_0",
    "loc_freeze_anti_regression",
  ];
}

export function isCloseoutReady(status: string = DOD_CLOSEOUT_STATUS): boolean {
  return status === "ready_for_complete_tag" || status === "tag_cut" || status === "archived";
}

export function isFinish2FreezeReady(
  status: string = DEFINITION_OF_DONE.finish2Freeze?.status ?? "",
): boolean {
  return status === "ready_for_release_tag" || status === "tag_cut" || status === "archived";
}
