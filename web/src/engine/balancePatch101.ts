/**
 * Phase 23 (post-1.0) — balance patch 1.0.1 catalog (economy/XP knobs).
 */
import patchJson from "../../../shared/content/balance-patch-1.0.1.json";

export interface BalanceTweak {
  path: string;
  from: number | number[];
  to: number | number[];
  why: string;
}

export interface BalancePatchCatalog {
  phase: number;
  schema: string;
  fromContentVersion: string;
  toContentVersion: string;
  schemaVersion: number;
  constraints: {
    noSchemaBreak: boolean;
    keepSchemaVersion: number;
    patchBumpOnly: boolean;
  };
  tweaks: BalanceTweak[];
}

export const balancePatch101 = patchJson as unknown as BalancePatchCatalog;
export const BALANCE_PATCH_PHASE = balancePatch101.phase;
export const BALANCE_PATCH_SCHEMA = balancePatch101.schema;
export const BALANCE_PATCH_FROM = balancePatch101.fromContentVersion;
export const BALANCE_PATCH_TO = balancePatch101.toContentVersion;

export const BAG_CAPACITY_2_COST = 30;
export const BASIC_PORTION_UNIT_PRICE = 6;
export const FILLET_UNIT_PRICE = 13;
export const PORTER_HIRE_COST = 85;
export const FISHER_HIRE_COST = 105;
export const XP_FISH_CAUGHT = 5;
export const XP_SALE_ASSISTED = 4;
export const REPAIR_COINS = 35;
export const XP_THRESHOLDS = [0, 35, 90, 160, 250] as const;
