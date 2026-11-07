/**
 * Phase 24 (post-1.0) — cosmetic equip/preview catalog (presentation-only).
 */
import presentationJson from "../../../shared/content/cosmetic-presentation.json";
import { CosmeticsIapSystem } from "./systems";

export interface CosmeticPresentationItem {
  cosmeticId: string;
  sku: string | null;
  title: string;
  swatchRgb: [number, number, number];
  source: string;
  powerNeutral: boolean;
}

export interface CosmeticPresentationCatalog {
  phase: number;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  constraints: {
    powerNeutral: boolean;
    noSchemaBreak: boolean;
    equipInSettingsNotSave: boolean;
    previewEphemeral: boolean;
  };
  slot: { id: string; maxEquipped: number; unequipAllowed: boolean; previewUnownedAllowed: boolean };
  anchor: { xMm: number; zMm: number; heightM: number };
  items: CosmeticPresentationItem[];
  fallback: { swatchRgb: [number, number, number]; powerNeutral: boolean };
  ui: Record<string, string>;
}

export const cosmeticPresentation = presentationJson as unknown as CosmeticPresentationCatalog;
export const COSMETIC_PRESENTATION_PHASE = cosmeticPresentation.phase;
export const COSMETIC_PRESENTATION_SCHEMA = cosmeticPresentation.schema;
export const COSMETIC_ITEMS_BY_ID = new Map(
  cosmeticPresentation.items.map((i) => [i.cosmeticId, i] as const),
);

export function cosmeticTitle(cosmeticId: string): string {
  const hit = COSMETIC_ITEMS_BY_ID.get(cosmeticId);
  if (hit) return hit.title;
  return cosmeticId
    .replace(/^banner\./, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function cosmeticSwatchRgb(cosmeticId: string): [number, number, number] {
  return COSMETIC_ITEMS_BY_ID.get(cosmeticId)?.swatchRgb ?? cosmeticPresentation.fallback.swatchRgb;
}

export function sanitizeEquippedCosmetic(
  equippedId: string | null | undefined,
  unlocked: Iterable<string>,
): string | null {
  if (!equippedId) return null;
  const set = unlocked instanceof Set ? unlocked : new Set(unlocked);
  return set.has(equippedId) ? equippedId : null;
}

/** Preview may show catalog IAP items without ownership; equipped must be owned. */
export function resolveVisibleCosmetic(
  equippedId: string | null | undefined,
  previewId: string | null | undefined,
  unlocked: Iterable<string>,
): string | null {
  if (previewId) {
    const set = unlocked instanceof Set ? unlocked : new Set(unlocked);
    if (set.has(previewId) || COSMETIC_ITEMS_BY_ID.has(previewId)) return previewId;
  }
  return sanitizeEquippedCosmetic(equippedId, unlocked);
}

export function iapCatalogMatchesPresentation(): boolean {
  return CosmeticsIapSystem.CATALOG.every((sku) => COSMETIC_ITEMS_BY_ID.has(sku.grantsCosmetic));
}
