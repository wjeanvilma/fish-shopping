/**
 * Finish 2.0 Phase 27 + Finish 3.0 Phase 28 + Finish 4.0 Phase 28 — content authoring CLI entry.
 *
 * Usage (from web/):
 *   npm run content:scaffold -- species --id tide_perch --name "Tide perch"
 *   npm run content:scaffold -- machine --id dock_press --dry-run
 *   npm run content:scaffold -- rival --id mist_hawker --check-pack
 *   npm run content:scaffold -- --list
 *   npm run content:scaffold -- --check-floors
 *
 * Does not mutate shared/content/content-pack.json — print/write fragment only.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_SCAFFOLD_KINDS, isScaffoldKind, type ScaffoldKind } from "./ids";
import { indexPackIds, packHasId } from "./packIds";
import { FINISH4_PACK_FLOORS, measurePackFloors } from "./packFloors";
import { buildScaffold, type ScaffoldRequest } from "./scaffolds";
import { structuralScaffoldErrors } from "./validateFragment";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const defaultOut = resolve(repoRoot, "shared/content/scaffolds/out");
const defaultPack = resolve(repoRoot, "shared/content/content-pack.json");

function usage(): never {
  console.error(`Usage: content:scaffold <${ALL_SCAFFOLD_KINDS.join("|")}> --id <slug> [options]
       content:scaffold --list
       content:scaffold --check-floors

Options:
  --name <text>           Display name
  --description <text>    Description (quest/contract/bait/decor/rival)
  --out <dir>             Write JSON under dir (default shared/content/scaffolds/out)
  --dry-run               Print JSON only (no write)
  --check-pack            Fail if id already exists in content-pack.json
  --check-floors          Verify content-pack meets Finish 4.0 floors (no scaffold)
  --base-value <n>        Species baseValue
  --goal-stat <id>        Quest goal stat (default stat.fish_caught)
  --goal-at-least <n>     Quest goal atLeast (default 5)
  --requires <id[,id]>    Harbor/quest/bait requires list
  --fishing-species <ids> Comma species ids for harbor fishing spot
  --item <id>             Contract delivery item id
  --quantity <n>          Contract quantity
  --cost <n>              Bait/decor cost or contract payout
  --patience-bonus <n>    Decor patienceBonusTicks
  --recipes <ids>         Machine recipe ids (comma)
  --input-cap <n>         Machine inputCapacityUnits
  --output-cap <n>        Machine outputCapacityUnits
  --harbors <ids>         Rival harbor ids (comma)
  --specialty <ids>       Rival specialty product ids (comma)
  --aggression <n>        Rival aggressionPermille
  --undercut <n>          Rival undercutPriceMultPermille
  --ai-profile <id>       Rival aiProfile (siphon|undercut|adaptive|roamer)

Examples:
  npm run content:scaffold -- species --id tide_perch --name "Tide perch"
  npm run content:scaffold -- machine --id dock_press --dry-run
  npm run content:scaffold -- rival --id mist_hawker --check-pack
  npm run content:scaffold -- --list
  npm run content:scaffold -- --check-floors
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

function parseArgs(argv: string[]): ScaffoldRequest & {
  outDir: string;
  dryRun: boolean;
  checkPack: boolean;
} {
  const kindRaw = argv.find((a) => !a.startsWith("--") && isScaffoldKind(a));
  if (!kindRaw) usage();
  const kind = kindRaw as ScaffoldKind;
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
    dryRun: hasFlag(argv, "--dry-run"),
    checkPack: hasFlag(argv, "--check-pack"),
  };
}

function main(): number {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) usage();
  if (hasFlag(argv, "--list")) {
    console.log(ALL_SCAFFOLD_KINDS.join("\n"));
    return 0;
  }
  if (hasFlag(argv, "--check-floors")) {
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

  if (req.checkPack) {
    const pack = JSON.parse(readFileSync(defaultPack, "utf8")) as Record<string, unknown>;
    const index = indexPackIds(pack);
    if (packHasId(index, result.kind, result.id)) {
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
  console.log(`OK ${result.kind} scaffold ${result.id} (merge into content-pack.json manually)`);
  return 0;
}

process.exit(main());
