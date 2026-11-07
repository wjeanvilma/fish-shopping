/**
 * Finish 2.0 Phase 27 — npm entry for content scaffolds + Ajv schema check.
 *
 *   npm run content:scaffold -- <species|quest|harbor> --id <slug> [...]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCAFFOLD_KINDS, type ScaffoldKind } from "../../shared/tools/content_cli/ids";
import { buildScaffold, type ScaffoldRequest } from "../../shared/tools/content_cli/scaffolds";
import { validateScaffoldFragment } from "../src/contentAuthoring/scaffoldValidate";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");
const defaultOut = resolve(root, "shared/content/scaffolds/out");

function usage(): never {
  console.error(`Usage: npm run content:scaffold -- <species|quest|harbor> --id <slug> [options]

Options:
  --name <text>  --description <text>  --out <dir>  --dry-run
  --base-value <n>  --goal-stat <id>  --goal-at-least <n>
  --requires <id[,id]>  --fishing-species <id[,id]>
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

function parse(argv: string[]): ScaffoldRequest & { outDir: string; dryRun: boolean } {
  const kindRaw = argv.find((a) => !a.startsWith("--") && SCAFFOLD_KINDS.includes(a as ScaffoldKind));
  if (!kindRaw) usage();
  const id = takeFlag(argv, "--id");
  if (!id) usage();
  const requiresRaw = takeFlag(argv, "--requires");
  const fishingRaw = takeFlag(argv, "--fishing-species");
  const baseValueRaw = takeFlag(argv, "--base-value");
  const goalAtLeastRaw = takeFlag(argv, "--goal-at-least");
  return {
    kind: kindRaw as ScaffoldKind,
    id,
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
    dryRun: argv.includes("--dry-run"),
  };
}

function main(): number {
  const argv = process.argv.slice(2);
  if (!argv.length || argv.includes("--help") || argv.includes("-h")) usage();

  let req: ReturnType<typeof parse>;
  try {
    req = parse(argv);
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

  const errors = validateScaffoldFragment(result.kind, result.document);
  if (errors.length) {
    console.error("Scaffold failed schema validation:");
    for (const e of errors) console.error(`  - ${e}`);
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
  console.log(`OK ${result.kind} scaffold ${result.id} (schema OK; merge into content-pack.json manually)`);
  return 0;
}

process.exit(main());
