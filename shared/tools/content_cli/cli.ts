/**
 * Finish 2.0 Phase 27 — content authoring CLI entry.
 *
 * Usage (from web/):
 *   npm run content:scaffold -- species --id tide_perch --name "Tide perch"
 *   npm run content:scaffold -- quest --id morning_haul
 *   npm run content:scaffold -- harbor --id mist_cove --out ../shared/content/scaffolds/out
 *   npm run content:scaffold -- species --id x --dry-run
 *
 * Does not mutate shared/content/content-pack.json — print/write fragment only.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCAFFOLD_KINDS, type ScaffoldKind } from "./ids";
import { buildScaffold, type ScaffoldRequest } from "./scaffolds";
import { structuralScaffoldErrors } from "./validateFragment";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const defaultOut = resolve(repoRoot, "shared/content/scaffolds/out");

function usage(): never {
  console.error(`Usage: content:scaffold <species|quest|harbor> --id <slug> [options]

Options:
  --name <text>           Display name
  --description <text>    Quest description
  --out <dir>             Write JSON under dir (default shared/content/scaffolds/out)
  --dry-run               Print JSON only (no write)
  --base-value <n>        Species baseValue
  --goal-stat <id>        Quest goal stat (default stat.fish_caught)
  --goal-at-least <n>     Quest goal atLeast (default 5)
  --requires <id[,id]>    Harbor/quest requires list
  --fishing-species <ids> Comma species ids for harbor fishing spot

Examples:
  npm run content:scaffold -- species --id tide_perch --name "Tide perch"
  npm run content:scaffold -- quest --id morning_haul --dry-run
  npm run content:scaffold -- harbor --id mist_cove
`);
  process.exit(2);
}

function takeFlag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  if (!v || v.startsWith("--")) return undefined;
  return v;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function parseArgs(argv: string[]): ScaffoldRequest & { outDir: string; dryRun: boolean } {
  const kindRaw = argv.find((a) => !a.startsWith("--") && SCAFFOLD_KINDS.includes(a as ScaffoldKind));
  if (!kindRaw) usage();
  const kind = kindRaw as ScaffoldKind;
  const id = takeFlag(argv, "--id");
  if (!id) usage();

  const requiresRaw = takeFlag(argv, "--requires");
  const fishingRaw = takeFlag(argv, "--fishing-species");
  const baseValueRaw = takeFlag(argv, "--base-value");
  const goalAtLeastRaw = takeFlag(argv, "--goal-at-least");

  return {
    kind,
    id: id!,
    name: takeFlag(argv, "--name"),
    description: takeFlag(argv, "--description"),
    baseValue: baseValueRaw ? Number(baseValueRaw) : undefined,
    goalStat: takeFlag(argv, "--goal-stat"),
    goalAtLeast: goalAtLeastRaw ? Number(goalAtLeastRaw) : undefined,
    requires: requiresRaw ? requiresRaw.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    fishingSpecies: fishingRaw
      ? fishingRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
    outDir: resolve(takeFlag(argv, "--out") ?? defaultOut),
    dryRun: hasFlag(argv, "--dry-run"),
  };
}

function main(): number {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) usage();

  let req: ReturnType<typeof parseArgs>;
  try {
    req = parseArgs(argv);
  } catch (e) {
    console.error((e as Error).message);
    return 1;
  }

  let result;
  try {
    result = buildScaffold(req);
  } catch (e) {
    console.error((e as Error).message);
    return 1;
  }

  const structural = structuralScaffoldErrors(result.kind, result.document);
  if (structural.length) {
    console.error("Scaffold failed structural checks:");
    for (const e of structural) console.error(`  - ${e}`);
    return 1;
  }

  const json = `${JSON.stringify(result.document, null, 2)}\n`;
  if (req.dryRun) {
    process.stdout.write(json);
    return 0;
  }

  mkdirSync(req.outDir, { recursive: true });
  const outPath = resolve(req.outDir, result.fileName);
  writeFileSync(outPath, json, "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(`OK ${result.kind} scaffold ${result.id} (merge into content-pack.json manually)`);
  return 0;
}

process.exit(main());
