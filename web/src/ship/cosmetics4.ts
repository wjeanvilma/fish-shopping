/**
 * Finish 4.0 Phase 18 — cosmetics/IAP 12→18 power-neutral
 * (mirrors shared/ship/cosmetics-iap-4.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/cosmetics-iap-4.json";
import { CosmeticsIapSystem, loadContent } from "../engine";
import { iapCatalogMatchesPresentation } from "../engine/cosmeticPresentation";

export interface Cosmetics4Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  cosmetics4Marker: string;
  cosmeticsMin: number;
  newCosmeticIds: string[];
  newSkus: string[];
  powerNeutralRequired: boolean;
  extendsProductArt: string;
  entitlements: string;
  presentation: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const COSMETICS_4 = catalogJson as unknown as Cosmetics4Catalog;
export const COSMETICS_4_PHASE = COSMETICS_4.phase;
export const COSMETICS_4_SCHEMA = COSMETICS_4.schema;
export const COSMETICS_4_MARKER = COSMETICS_4.cosmetics4Marker;

export interface Cosmetics4Measure {
  cosmeticCount: number;
  newCosmeticsPresent: boolean;
  engineParity: boolean;
  presentationParity: boolean;
  powerNeutral: boolean;
  kickoffFloorsMet: boolean;
  missingGates: string[];
  missingAssets: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureCosmetics4(repoRoot: string): Cosmetics4Measure {
  const entitlements = readJson(resolve(repoRoot, "shared/billing/entitlements.json"));
  const presentation = readJson(resolve(repoRoot, "shared/content/cosmetic-presentation.json"));
  const kickoff = readJson(resolve(repoRoot, "shared/ship/finish-4.0-kickoff.json"));
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  loadContent(pack);

  const cosmetics = entitlements.cosmetics as Array<{
    sku: string;
    grantsCosmetic: string;
    powerNeutral: boolean;
  }>;

  const missingGates: string[] = [];
  for (const gate of COSMETICS_4.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const missingAssets: string[] = [];
  for (const id of COSMETICS_4.newCosmeticIds) {
    const item = (presentation.items as any[]).find((i) => i.cosmeticId === id);
    if (!item?.meshAsset) {
      missingAssets.push(id);
      continue;
    }
    const assetPath = resolve(repoRoot, "shared/assets", item.meshAsset);
    if (!existsSync(assetPath)) missingAssets.push(item.meshAsset);
  }

  return {
    cosmeticCount: cosmetics.length,
    newCosmeticsPresent: COSMETICS_4.newCosmeticIds.every((id) =>
      cosmetics.some((c) => c.grantsCosmetic === id),
    ),
    engineParity:
      CosmeticsIapSystem.CATALOG.length === cosmetics.length &&
      COSMETICS_4.newSkus.every((sku) => CosmeticsIapSystem.BY_SKU.has(sku)),
    presentationParity: iapCatalogMatchesPresentation(),
    powerNeutral: cosmetics.every((c) => c.powerNeutral === true),
    kickoffFloorsMet:
      (kickoff.baseline?.cosmetics ?? 0) >= COSMETICS_4.cosmeticsMin &&
      kickoff.gaps?.contentFloorsShort === false &&
      (kickoff.gapTargets?.cosmeticsMin ?? 0) >= 18,
    missingGates,
    missingAssets,
  };
}
