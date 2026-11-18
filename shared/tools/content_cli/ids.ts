/**
 * Finish 2.0 Phase 27 + Finish 3.0 Phase 28 — content authoring id helpers.
 */

const SLUG = /^[a-z][a-z0-9_]*$/;

/** Finish 2.0 core kinds (historical floor for contentcli:validate). */
export type CoreScaffoldKind = "species" | "quest" | "harbor";

/** Finish 3.0 Phase 28 expansion kinds. */
export type ExpansionScaffoldKind = "contract" | "bait" | "decor";

export type ScaffoldKind = CoreScaffoldKind | ExpansionScaffoldKind;

export const SCAFFOLD_KINDS: CoreScaffoldKind[] = ["species", "quest", "harbor"];

export const SCAFFOLD_KINDS_2: ExpansionScaffoldKind[] = ["contract", "bait", "decor"];

export const ALL_SCAFFOLD_KINDS: ScaffoldKind[] = [...SCAFFOLD_KINDS, ...SCAFFOLD_KINDS_2];

const PREFIXES: Record<ScaffoldKind, string> = {
  species: "species.",
  quest: "quest.",
  harbor: "harbor.",
  contract: "contract.",
  bait: "bait.",
  decor: "decor.",
};

export function normalizeSlug(raw: string): string {
  let slug = raw.trim().toLowerCase();
  for (const prefix of Object.values(PREFIXES)) {
    if (slug.startsWith(prefix)) slug = slug.slice(prefix.length);
  }
  slug = slug
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  if (!SLUG.test(slug)) {
    throw new Error(`Invalid slug '${raw}' (need [a-z][a-z0-9_]*)`);
  }
  return slug;
}

export function qualifyId(kind: ScaffoldKind, slug: string): string {
  return `${PREFIXES[kind]}${normalizeSlug(slug)}`;
}

export function titleFromSlug(slug: string): string {
  return normalizeSlug(slug)
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function isScaffoldKind(value: string): value is ScaffoldKind {
  return (ALL_SCAFFOLD_KINDS as readonly string[]).includes(value);
}
