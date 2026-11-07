/**
 * Finish 2.0 Phase 27 — content authoring id helpers.
 */

const SLUG = /^[a-z][a-z0-9_]*$/;

export type ScaffoldKind = "species" | "quest" | "harbor";

export const SCAFFOLD_KINDS: ScaffoldKind[] = ["species", "quest", "harbor"];

export function normalizeSlug(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/^species\./, "")
    .replace(/^quest\./, "")
    .replace(/^harbor\./, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  if (!SLUG.test(slug)) {
    throw new Error(`Invalid slug '${raw}' (need [a-z][a-z0-9_]*)`);
  }
  return slug;
}

export function qualifyId(kind: ScaffoldKind, slug: string): string {
  const s = normalizeSlug(slug);
  if (kind === "species") return `species.${s}`;
  if (kind === "quest") return `quest.${s}`;
  return `harbor.${s}`;
}

export function titleFromSlug(slug: string): string {
  return normalizeSlug(slug)
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
