/**
 * Finish 6.0 Phase 27 — modular content pack helpers for authoring CLI.
 * Read-only; never mutates content-pack.json.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MODPACKS_DIR = "shared/content/scaffolds/modpacks";

export interface ModpackMeasure {
  path: string;
  id: string | null;
  modular: boolean;
  includesCount: number;
  ok: boolean;
  errors: string[];
}

function defaultRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../..");
}

export function listModpackFiles(repoRoot?: string): string[] {
  const root = repoRoot ?? defaultRoot();
  const dir = resolve(root, MODPACKS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => `${MODPACKS_DIR}/${name}`)
    .sort();
}

export function measureModpack(repoRoot: string, relativePath: string): ModpackMeasure {
  const full = resolve(repoRoot, relativePath);
  const errors: string[] = [];
  if (!existsSync(full)) {
    return {
      path: relativePath,
      id: null,
      modular: false,
      includesCount: 0,
      ok: false,
      errors: ["missing file"],
    };
  }
  let doc: any;
  try {
    doc = JSON.parse(readFileSync(full, "utf8"));
  } catch (e) {
    return {
      path: relativePath,
      id: null,
      modular: false,
      includesCount: 0,
      ok: false,
      errors: [`json parse: ${(e as Error).message}`],
    };
  }
  const id = typeof doc.id === "string" ? doc.id : null;
  if (!id || !/^pack\.[a-z0-9_]+$/.test(id)) errors.push("id must match pack.<slug>");
  if (typeof doc.name !== "string" || !doc.name) errors.push("name required");
  if (typeof doc.description !== "string" || !doc.description) errors.push("description required");
  if (doc.contentVersion !== "5.0.0") errors.push("contentVersion must be 5.0.0");
  if (doc.schemaVersion !== 27) errors.push("schemaVersion must be 27");
  if (!Array.isArray(doc.includes) || doc.includes.length < 1) {
    errors.push("includes must be non-empty array");
  }
  if (!Array.isArray(doc.fragments)) errors.push("fragments must be array");
  if (doc.modular !== true) errors.push("modular must be true");
  for (const frag of doc.fragments ?? []) {
    if (typeof frag !== "string" || !existsSync(resolve(repoRoot, frag))) {
      errors.push(`missing fragment ${frag}`);
    }
  }
  return {
    path: relativePath,
    id,
    modular: doc.modular === true,
    includesCount: Array.isArray(doc.includes) ? doc.includes.length : 0,
    ok: errors.length === 0,
    errors,
  };
}

export function measureAllModpacks(repoRoot?: string): {
  files: string[];
  measures: ModpackMeasure[];
  ok: boolean;
} {
  const root = repoRoot ?? defaultRoot();
  const files = listModpackFiles(root);
  const measures = files.map((f) => measureModpack(root, f));
  return { files, measures, ok: measures.length > 0 && measures.every((m) => m.ok) };
}
