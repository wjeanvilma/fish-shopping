/**
 * Finish 2.0–6.0 — npm entry for content scaffolds + Ajv schema check.
 *
 *   npm run content:scaffold -- <kind> --id <slug> [...]
 *   npm run content:scaffold -- --list
 *   npm run content:scaffold -- --check-floors
 *   npm run content:scaffold -- --list-modpacks
 *   npm run content:scaffold -- --check-modpacks
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
import {
  FINISH5_PACK_FLOORS,
  FINISH6_PACK_FLOORS,
  measurePackFloors,
} from "../../shared/tools/content_cli/packFloors";
import { measureAllModpacks } from "../../shared/tools/content_cli/modpacks";
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
       npm run content:scaffold -- --list-modpacks
       npm run content:scaffold -- --check-modpacks

Options:
  --name <text>  --description <text>  --out <dir>  --dry-run  --check-pack
  --base-value <n>  --goal-stat <id>  --goal-at-least <n>
  --requires <id[,id]>  --fishing-species <id[,id]>
  --item <id>  --quantity <n>  --cost <n>  --patience-bonus <n>
  --recipes <ids>  --input-cap <n>  --output-cap <n>
  --harbors <ids>  --specialty <ids>  --aggression <n>  --undercut <n>
  --ai-profile <siphon|undercut|adaptive|roamer>
  --period-ticks <n>  --start-tick <n>  --duration-ticks <n>
  --prestige <n>  --sku <id>  --steps <n>  --requires-harbor <id>  --includes <kinds>
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
  const periodRaw = takeFlag(argv, "--period-ticks");
  const startRaw = takeFlag(argv, "--start-tick");
  const durationRaw = takeFlag(argv, "--duration-ticks");
  const prestigeRaw = takeFlag(argv, "--prestige");
  const stepsRaw = takeFlag(argv, "--steps");
  const includesRaw = takeFlag(argv, "--includes");
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
    periodTicks: periodRaw ? Number(periodRaw) : undefined,
    startTick: startRaw ? Number(startRaw) : undefined,
    durationTicks: durationRaw ? Number(durationRaw) : undefined,
    requiresPrestigeCount: prestigeRaw ? Number(prestigeRaw) : undefined,
    sku: takeFlag(argv, "--sku"),
    steps: stepsRaw ? Number(stepsRaw) : undefined,
    requiresHarbor: takeFlag(argv, "--requires-harbor"),
    includes: includesRaw
      ? includesRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
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
  if (argv.includes("--list-modpacks")) {
    const listed = measureAllModpacks(root);
    for (const f of listed.files) console.log(f);
    return listed.files.length > 0 ? 0 : 1;
  }
  if (argv.includes("--check-modpacks")) {
    const listed = measureAllModpacks(root);
    console.log(`modpacks=${listed.files.length}`);
    for (const m of listed.measures) {
      if (!m.ok) {
        console.error(`modpack ${m.path}:`);
        for (const e of m.errors) console.error(`  - ${e}`);
      }
    }
    if (!listed.ok) return 1;
    console.log("OK modular packs valid");
    return 0;
  }
  if (argv.includes("--check-floors")) {
    const pack = JSON.parse(readFileSync(defaultPack, "utf8")) as Record<string, unknown>;
    // Soft-floor: Finish 5.0 FINISH5_PACK_FLOORS stay importable for contentcli5:validate.
    void FINISH5_PACK_FLOORS;
    const soft5 = measurePackFloors(pack, FINISH5_PACK_FLOORS, { repoRoot: root });
    const measure = measurePackFloors(pack, FINISH6_PACK_FLOORS, { repoRoot: root });
    console.log(
      `pack floors species=${measure.species} quests=${measure.quests} harbors=${measure.harbors} ` +
        `machines=${measure.machines} rivals=${measure.rivals} baits=${measure.baits} ` +
        `seasonal=${measure.seasonal} cosmetics=${measure.cosmetics} chains=${measure.chains}`,
    );
    if (!soft5.met) {
      console.error("Finish 5.0 pack floors short (soft):");
      for (const s of soft5.shortfalls) console.error(`  - ${s}`);
    }
    if (!measure.met) {
      console.error("Finish 6.0 pack floors short:");
      for (const s of measure.shortfalls) console.error(`  - ${s}`);
      return 1;
    }
    console.log("OK content pack meets Finish 6.0 floors");
    return 0;
  }

  let req: ReturnType<typeof parse>;
  try {
    req = parse(argv);
  } catch (e) {
    console.error((e as Error).message);
    return 1;
  }

  const built = buildScaffold(req);
  const schemaErrors = validateScaffoldFragment(built.kind, built.document);
  if (schemaErrors.length) {
    console.error("Scaffold failed schema/structural validation:");
    for (const e of schemaErrors) console.error(`  - ${e}`);
    return 1;
  }

  if (req.checkPack) {
    const pack = JSON.parse(readFileSync(defaultPack, "utf8")) as Record<string, unknown>;
    const index = indexPackIds(pack, { repoRoot: root });
    if (packHasId(index, built.kind, built.id)) {
      console.error(`ID already present in pack/entitlements: ${built.id}`);
      return 1;
    }
    console.log(`OK --check-pack: ${built.id} not present`);
  }

  const json = `${JSON.stringify(built.document, null, 2)}\n`;
  if (req.dryRun) {
    console.log(json);
    return 0;
  }

  mkdirSync(req.outDir, { recursive: true });
  const outPath = resolve(req.outDir, built.fileName);
  writeFileSync(outPath, json, "utf8");
  console.log(`Wrote ${outPath}`);
  return 0;
}

process.exit(main());
