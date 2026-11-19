/**
 * Finish 3.0/4.0/5.0/6.0 — content-pack id collision helpers for scaffolds.
 * Read-only; never mutates content-pack.json / entitlements.json.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ScaffoldKind } from "./ids";

export interface PackIdIndex {
  species: Set<string>;
  quests: Set<string>;
  harbors: Set<string>;
  contracts: Set<string>;
  bait: Set<string>;
  decor: Set<string>;
  machines: Set<string>;
  rivals: Set<string>;
  seasonal: Set<string>;
  endgame: Set<string>;
  cosmetics: Set<string>;
  chains: Set<string>;
  sigils: Set<string>;
  modpacks: Set<string>;
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function loadCosmeticIds(repoRoot?: string): Set<string> {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = repoRoot ?? resolve(here, "../../..");
    const ents = JSON.parse(
      readFileSync(resolve(root, "shared/billing/entitlements.json"), "utf8"),
    ) as { cosmetics?: Array<{ id?: string }> };
    return new Set(asArray(ents.cosmetics).map((x) => String(x.id)));
  } catch {
    return new Set();
  }
}

export function indexPackIds(
  pack: Record<string, unknown>,
  opts?: { repoRoot?: string },
): PackIdIndex {
  const decorRoot = (pack.decor as { items?: unknown } | undefined) ?? {};
  const contractsRoot = (pack.contracts as { templates?: unknown } | undefined) ?? {};
  const rivalsRoot = (pack.rivalMarkets as { rivals?: unknown } | undefined) ?? {};
  const seasonalRoot = (pack.seasonalEvents as { events?: unknown } | undefined) ?? {};
  const endgameRoot = (pack.endgame as { tiers?: unknown; challenges?: unknown } | undefined) ?? {};
  const chainIds = new Set(
    asArray(contractsRoot.templates)
      .map((t) => t?.chainId)
      .filter((cid): cid is string => typeof cid === "string" && cid.length > 0),
  );
  const sigilIds = new Set(
    asArray(endgameRoot.challenges)
      .map((c) => c?.grantsSigil)
      .filter((sid): sid is string => typeof sid === "string" && sid.length > 0),
  );
  return {
    species: new Set(asArray(pack.species).map((x) => String(x.id))),
    quests: new Set(asArray(pack.quests).map((x) => String(x.id))),
    harbors: new Set(asArray(pack.harbors).map((x) => String(x.id))),
    contracts: new Set(asArray(contractsRoot.templates).map((x) => String(x.id))),
    bait: new Set(asArray(pack.bait).map((x) => String(x.id))),
    decor: new Set(asArray(decorRoot.items).map((x) => String(x.id))),
    machines: new Set(asArray(pack.machines).map((x) => String(x.id))),
    rivals: new Set(asArray(rivalsRoot.rivals).map((x) => String(x.id))),
    seasonal: new Set(asArray(seasonalRoot.events).map((x) => String(x.id))),
    endgame: new Set(asArray(endgameRoot.tiers).map((x) => String(x.id))),
    cosmetics: loadCosmeticIds(opts?.repoRoot),
    chains: chainIds,
    sigils: sigilIds,
    modpacks: new Set<string>(),
  };
}

export function packHasId(index: PackIdIndex, kind: ScaffoldKind, id: string): boolean {
  if (kind === "species") return index.species.has(id);
  if (kind === "quest") return index.quests.has(id);
  if (kind === "harbor") return index.harbors.has(id);
  if (kind === "contract") return index.contracts.has(id);
  if (kind === "bait") return index.bait.has(id);
  if (kind === "decor") return index.decor.has(id);
  if (kind === "machine") return index.machines.has(id);
  if (kind === "rival") return index.rivals.has(id);
  if (kind === "seasonal") return index.seasonal.has(id);
  if (kind === "endgame") return index.endgame.has(id);
  if (kind === "cosmetic") return index.cosmetics.has(id);
  if (kind === "chain") return index.chains.has(id);
  if (kind === "sigil") return index.sigils.has(id);
  return index.modpacks.has(id);
}
