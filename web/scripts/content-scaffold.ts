/**
 * Finish 2.0 Phase 27 + Finish 3.0 Phase 28 + Finish 4.0 Phase 28 —
 * npm entry for content scaffolds + Ajv schema check.
 *
 *   npm run content:scaffold -- <species|quest|harbor|contract|bait|decor|machine|rival> --id <slug> [...]
 *   npm run content:scaffold -- --list
 *   npm run content:scaffold -- --check-floors
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALL_SCAFFOLD_KINDS,
  isScaffoldKind,
  type ScaffoldKind,
} from "../../shared/tools/content_cli/ids";
import { indexPackIds, packHasId } from "../../shared/tools/content_cli/packIds";
import { FINISH4_PACK_FLOORS, measurePackFloors } from "../../shared/tools/content_cli/packFloors";
import { buildScaffold, type ScaffoldRequest } from "../../shared/tools/content_cli/scaffolds";
import { validateScaffoldFragment } from "../src/contentAuthoring/scaffoldValidate";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");
const defaultOut = resolve(root, "shared/content/scaffolds/out");
const defaultPack = resolve(root, "shared/content/content-pack.json");

function usage(): never {
  console.error(`Usage: npm run content:scaffold -- <${ALL_SCAFFOLD_KINDS.join("|")}> --id <slug> [options]
       npm run content:scaffold -- --list
       npm run content:scaffold -- --check-floors

Options:
  --name <text>  --description <text>  --out <dir>  --dry-run  --check-pack
  --base-value <n>  --goal-stat <id>  --goal-at-least <n>
  --requires <id[,id]>  --fishing-species <id[,id]>
  --item <id>  --quantity <n>  --cost <n>  --patience-bonus <n>
  --recipes <ids>  --input-cap <n>  --output-cap <n>
  --harbors <ids>  --specialty <ids>  --aggression <n>  --undercut <n>
  --ai-profile <siphon|undercut|adaptive|roamer>
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

function parse(argv: string[]): ScaffoldRequest & {
  outDir: string;
  dryRun: boolean;
  checkPack: boolean;
} {
  const kindRaw = argv.find((a) => !a.startsWith("--") && isScaffoldKind(a));
  if (!kindRaw) usage();
  const id = takeFlag(argv, "--id");
  if (!id) usage();
  const requiresRaw = takeFlag(argv, "--requires");
  const fishingRaw = takeFlag(argv, "--fishing-species");
  const baseValueRaw = takeFlag(argv, "--base-value");
  const goalAtLeastRaw = takeFlag(argv, "--goal-at-least");
  const quantityRaw = takeFlag(argv, "--quantity");
  const costRaw = takeFlag(argv, "--cost");
  const patienceRaw = takeFlag(argv, "--patience-bonus");
  const recipesRaw = takeFlag(argv, "--recipes");
  const inputCapRaw = takeFlag(argv, "--input-cap");
  const outputCapRaw = takeFlag(argv, "--output-cap");
  const harborsRaw = takeFlag(argv, "--harbors");
  const specialtyRaw = takeFlag(argv, "--specialty");
  const aggressionRaw = takeFlag(argv, "--aggression");
  const undercutRaw = takeFlag(argv, "--undercut");
  const aiProfileRaw = takeFlag(argv, "--ai-profile") as
    | "siphon"
    | "undercut"
    | "adaptive"
    | "roamer"
    | undefined;
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
    item: takeFlag(argv, "--item"),
    quantity: quantityRaw ? Number(quantityRaw) : undefined,
    cost: costRaw ? Number(costRaw) : undefined,
    patienceBonusTicks: patienceRaw ? Number(patienceRaw) : undefined,
    recipes: recipesRaw ? recipesRaw.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    inputCapacityUnits: inputCapRaw ? Number(inputCapRaw) : undefined,
    outputCapacityUnits: outputCapRaw ? Number(outputCapRaw) : undefined,
    harbors: harborsRaw ? harborsRaw.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    specialtyProducts: specialtyRaw
      ? specialtyRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
    aggressionPermille: aggressionRaw ? Number(aggressionRaw) : undefined,
    undercutPriceMultPermille: undercutRaw ? Number(undercutRaw) : undefined,
    aiProfile: aiProfileRaw,
    outDir: resolve(takeFlag(argv, "--out") ?? defaultOut),
    dryRun: argv.includes("--dry-run"),
    checkPack: argv.includes("--check-pack"),
  };
}

function main(): number {
  const argv = process.argv.slice(2);
  if (!argv.length || argv.includes("--help") || argv.includes("-h")) usage();
  if (argv.includes("--list")) {
    console.log(ALL_SCAFFOLD_KINDS.join("\n"));
    return 0;
  }
  if (argv.includes("--check-floors")) {
    const pack = JSON.parse(readFileSync(defaultPack, "utf8")) as Record<string, unknown>;
    const measure = measurePackFloors(pack, FINISH4_PACK_FLOORS);
    console.log(
      `pack floors species=${measure.species} quests=${measure.quests} harbors=${measure.harbors} ` +
        `machines=${measure.machines} rivals=${measure.rivals} baits=${measure.baits}`,
    );
    if (!measure.met) {
      console.error("Finish 4.0 pack floors short:");
      for (const s of measure.shortfalls) console.error(`  - ${s}`);
      return 1;
    }
    console.log("OK content pack meets Finish 4.0 floors");
    return 0;
  }

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

  if (req.checkPack) {
    const pack = JSON.parse(readFileSync(defaultPack, "utf8")) as Record<string, unknown>;
    if (packHasId(indexPackIds(pack), result.kind, result.id)) {
      console.error(`Id ${result.id} already exists in content-pack.json`);
      return 1;
    }
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
