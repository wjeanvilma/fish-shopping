/**
 * Finish 3.0 Phase 28 — content-pack id collision helpers for scaffolds.
 * Read-only; never mutates content-pack.json.
 */
import type { ScaffoldKind } from "./ids";

export interface PackIdIndex {
  species: Set<string>;
  quests: Set<string>;
  harbors: Set<string>;
  contracts: Set<string>;
  bait: Set<string>;
  decor: Set<string>;
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

export function indexPackIds(pack: Record<string, unknown>): PackIdIndex {
  const decorRoot = (pack.decor as { items?: unknown } | undefined) ?? {};
  const contractsRoot = (pack.contracts as { templates?: unknown } | undefined) ?? {};
  return {
    species: new Set(asArray(pack.species).map((x) => String(x.id))),
    quests: new Set(asArray(pack.quests).map((x) => String(x.id))),
    harbors: new Set(asArray(pack.harbors).map((x) => String(x.id))),
    contracts: new Set(asArray(contractsRoot.templates).map((x) => String(x.id))),
    bait: new Set(asArray(pack.bait).map((x) => String(x.id))),
    decor: new Set(asArray(decorRoot.items).map((x) => String(x.id))),
  };
}

export function packHasId(index: PackIdIndex, kind: ScaffoldKind, id: string): boolean {
  if (kind === "species") return index.species.has(id);
  if (kind === "quest") return index.quests.has(id);
  if (kind === "harbor") return index.harbors.has(id);
  if (kind === "contract") return index.contracts.has(id);
  if (kind === "bait") return index.bait.has(id);
  return index.decor.has(id);
}
