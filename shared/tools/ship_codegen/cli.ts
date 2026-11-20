/**
 * Finish 6.0 Phase 3 — ship catalog codegen CLI.
 *
 * Usage (from web/):
 *   npm run ship:codegen -- --list
 *   npm run ship:codegen -- --check
 *   npm run ship:codegen -- --write
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emitKotlin, emitTypeScript, extractContract, normalizeNewlines } from "./emit";
import type { ShipCodegenRegistry } from "./ids";

const here = dirname(fileURLToPath(import.meta.url));
export const SHIP_CODEGEN_REPO_ROOT = resolve(here, "../../..");
const registryPath = resolve(SHIP_CODEGEN_REPO_ROOT, "shared/ship/ship-codegen.json");

export function usage(): never {
  console.error(`Usage: ship:codegen --list
       ship:codegen --check
       ship:codegen --write

Finish 6.0-only ship catalog codegen. Emits thin TS/Kotlin constant mirrors
under web/src/ship/generated and game-core/.../ship/generated.
`);
  process.exit(2);
}

export function loadRegistry(
  root: string = SHIP_CODEGEN_REPO_ROOT,
): ShipCodegenRegistry {
  return JSON.parse(
    readFileSync(resolve(root, "shared/ship/ship-codegen.json"), "utf8"),
  ) as ShipCodegenRegistry;
}

function readCatalog(root: string, sourceRel: string): Record<string, unknown> {
  const abs = resolve(root, sourceRel);
  if (!existsSync(abs)) throw new Error(`missing catalog ${sourceRel}`);
  return JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
}

export interface CodegenArtifact {
  id: string;
  source: string;
  tsPath: string;
  ktPath: string;
  tsContent: string;
  ktContent: string;
}

export function buildArtifacts(
  registry: ShipCodegenRegistry,
  root: string = SHIP_CODEGEN_REPO_ROOT,
): CodegenArtifact[] {
  return registry.catalogs.map((entry) => {
    const catalog = readCatalog(root, entry.source);
    const contract = extractContract(catalog);
    return {
      id: entry.id,
      source: entry.source,
      tsPath: resolve(root, registry.tsOutDir, entry.tsModule),
      ktPath: resolve(root, registry.ktOutDir, entry.ktObject),
      tsContent: emitTypeScript(entry, contract, registry),
      ktContent: emitKotlin(entry, contract, registry),
    };
  });
}

export function checkArtifacts(artifacts: CodegenArtifact[]): string[] {
  const errors: string[] = [];
  for (const art of artifacts) {
    if (!existsSync(art.tsPath)) {
      errors.push(`missing generated TS ${art.tsPath}`);
      continue;
    }
    if (!existsSync(art.ktPath)) {
      errors.push(`missing generated Kotlin ${art.ktPath}`);
      continue;
    }
    const tsOnDisk = normalizeNewlines(readFileSync(art.tsPath, "utf8"));
    const ktOnDisk = normalizeNewlines(readFileSync(art.ktPath, "utf8"));
    if (tsOnDisk !== normalizeNewlines(art.tsContent)) {
      errors.push(`TS drift for ${art.id} (${art.tsPath})`);
    }
    if (ktOnDisk !== normalizeNewlines(art.ktContent)) {
      errors.push(`Kotlin drift for ${art.id} (${art.ktPath})`);
    }
  }
  return errors;
}

export function writeArtifacts(artifacts: CodegenArtifact[]): void {
  for (const art of artifacts) {
    mkdirSync(dirname(art.tsPath), { recursive: true });
    mkdirSync(dirname(art.ktPath), { recursive: true });
    writeFileSync(art.tsPath, art.tsContent, "utf8");
    writeFileSync(art.ktPath, art.ktContent, "utf8");
  }
}

export function runShipCodegenCli(argv: string[], root: string = SHIP_CODEGEN_REPO_ROOT): void {
  const list = argv.includes("--list");
  const check = argv.includes("--check");
  const write = argv.includes("--write");
  if (!list && !check && !write) usage();

  const registry = loadRegistry(root);
  if (list) {
    console.log(`ship:codegen catalogs (${registry.catalogs.length}):`);
    for (const c of registry.catalogs) {
      console.log(`  - ${c.id}: ${c.source} → ${c.tsModule} / ${c.ktObject}`);
    }
    console.log(`features: ${registry.features.join(", ")}`);
    return;
  }

  const artifacts = buildArtifacts(registry, root);
  if (write) {
    writeArtifacts(artifacts);
    console.log(`OK ship:codegen --write — ${artifacts.length} catalog mirrors emitted`);
    return;
  }

  const errors = checkArtifacts(artifacts);
  if (errors.length) {
    console.error("ship:codegen --check FAILED");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`OK ship:codegen --check — ${artifacts.length} mirrors match catalogs`);
}

// Avoid unused import warning when loaded as a library.
void registryPath;
