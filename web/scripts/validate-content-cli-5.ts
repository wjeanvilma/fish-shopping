/**
 * Finish 5.0 Phase 28 — content authoring CLI wave 5 readiness.
 *
 * Usage:
 *   npm run contentcli5:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { validateScaffoldFragment } from "../src/contentAuthoring/scaffoldValidate";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  CONTENT_CLI5_EXAMPLE_FLOOR,
  CONTENT_CLI5_FEATURE_FLOOR,
  CONTENT_CLI5_KIND_FLOOR,
  CONTENT_CLI_5,
  CONTENT_CLI_5_MARKER,
  CONTENT_CLI_5_PHASE,
  CONTENT_CLI_5_SCHEMA,
  measureContentCli5,
} from "../src/ship/contentCli5";
import {
  ALL_SCAFFOLD_KINDS,
  SCAFFOLD_KINDS,
  SCAFFOLD_KINDS_2,
  SCAFFOLD_KINDS_3,
  SCAFFOLD_KINDS_5,
} from "../../shared/tools/content_cli/ids";
import { indexPackIds, packHasId } from "../../shared/tools/content_cli/packIds";
import { FINISH5_PACK_FLOORS, measurePackFloors } from "../../shared/tools/content_cli/packFloors";
import { buildScaffold } from "../../shared/tools/content_cli/scaffolds";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function inferExampleKind(path: string): string | null {
  if (path.includes("entitlement.cosmetic.")) return "cosmetic";
  if (path.includes("endgame.tier.")) return "endgame";
  if (path.includes("/event.") || path.includes("event.")) return "seasonal";
  const order = [
    "species",
    "quest",
    "harbor",
    "contract",
    "bait",
    "decor",
    "machine",
    "rival",
  ] as const;
  return order.find((k) => path.includes(`/${k}.`) || path.includes(`${k}.`)) ?? null;
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/content-cli-5.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-content-cli-5.json"));
  const finish3 = readJson(resolve(root, "shared/ship/content-cli-3.json"));
  const finish2 = readJson(resolve(root, "shared/ship/content-cli-2.json"));
  const finish1 = readJson(resolve(root, "shared/ship/content-authoring-cli.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const scaffoldTs = readFileSync(resolve(root, "web/scripts/content-scaffold.ts"), "utf8");
  const cliTs = readFileSync(resolve(root, "shared/tools/content_cli/cli.ts"), "utf8");
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ContentCli5.kt"),
    "utf8",
  );
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));

  if (catalog.phase !== 28) errors.push(`phase expected 28, got ${catalog.phase}`);
  if (catalog.schema !== CONTENT_CLI_5_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (CONTENT_CLI_5_PHASE !== 28) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 26) errors.push("catalog schemaVersion must be 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (catalog.contentCli5Marker !== CONTENT_CLI_5_MARKER) errors.push("marker mismatch");
  if (fixture.contentCli5Marker !== CONTENT_CLI_5_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (catalog.closesGap !== "contentCli5Missing") errors.push("closesGap mismatch");
  if (catalog.extendsContentCli3 !== "shared/ship/content-cli-3.json") {
    errors.push("extendsContentCli3 path mismatch");
  }
  if (catalog.extendsContentCli2 !== "shared/ship/content-cli-2.json") {
    errors.push("extendsContentCli2 path mismatch");
  }
  if (catalog.extendsContentCli !== "shared/ship/content-authoring-cli.json") {
    errors.push("extendsContentCli path mismatch");
  }

  // Soft floors: prior CLI catalogs keep historical kind floors.
  if (finish1.scaffoldKindMin !== 3 || finish1.scaffoldKinds?.length !== 3) {
    errors.push("Finish 2.0 content-authoring-cli floors must stay at 3 kinds");
  }
  if (finish2.scaffoldKindMin !== 6 || (finish2.scaffoldKinds?.length ?? 0) < 6) {
    errors.push("Finish 3.0 content-cli-2 soft floor must stay ≥6 kinds");
  }
  if (finish3.scaffoldKindMin !== 8 || (finish3.scaffoldKinds?.length ?? 0) < 8) {
    errors.push("Finish 4.0 content-cli-3 soft floor must stay ≥8 kinds");
  }
  if ((catalog.softFloors?.contentCliHistoricalKindMin as number) < 3) {
    errors.push("soft floor contentCliHistoricalKindMin must stay ≥3");
  }
  if ((catalog.softFloors?.contentCli2HistoricalKindMin as number) < 6) {
    errors.push("soft floor contentCli2HistoricalKindMin must stay ≥6");
  }
  if ((catalog.softFloors?.contentCli3HistoricalKindMin as number) < 8) {
    errors.push("soft floor contentCli3HistoricalKindMin must stay ≥8");
  }

  if (catalog.scaffoldKindMin !== 11 || CONTENT_CLI5_KIND_FLOOR !== 11) {
    errors.push("scaffoldKindMin must be 11");
  }
  if (catalog.exampleFileMin !== 11 || CONTENT_CLI5_EXAMPLE_FLOOR !== 11) {
    errors.push("exampleFileMin must be 11");
  }
  if ((catalog.featureMin ?? 0) < 8 || CONTENT_CLI5_FEATURE_FLOOR < 8) {
    errors.push("featureMin must be ≥ 8");
  }
  if (ALL_SCAFFOLD_KINDS.length < CONTENT_CLI5_KIND_FLOOR) {
    errors.push(`ALL_SCAFFOLD_KINDS ${ALL_SCAFFOLD_KINDS.length} < ${CONTENT_CLI5_KIND_FLOOR}`);
  }
  if (SCAFFOLD_KINDS.length !== 3) errors.push("core SCAFFOLD_KINDS must stay length 3");
  if (SCAFFOLD_KINDS_2.length !== 3) errors.push("SCAFFOLD_KINDS_2 must be contract/bait/decor");
  if (SCAFFOLD_KINDS_3.length !== 2) errors.push("SCAFFOLD_KINDS_3 must be machine/rival");
  if (SCAFFOLD_KINDS_5.length !== 3) errors.push("SCAFFOLD_KINDS_5 must be seasonal/endgame/cosmetic");

  for (const kind of fixture.expect.kinds as string[]) {
    if (!(ALL_SCAFFOLD_KINDS as readonly string[]).includes(kind)) {
      errors.push(`missing scaffold kind ${kind}`);
    }
  }
  for (const kind of fixture.expect.wave5Kinds as string[]) {
    if (!(SCAFFOLD_KINDS_5 as readonly string[]).includes(kind as any)) {
      errors.push(`missing wave5 kind ${kind}`);
    }
  }
  for (const feature of fixture.expect.features as string[]) {
    if (!(CONTENT_CLI_5.features as readonly string[]).includes(feature)) {
      errors.push(`missing feature ${feature}`);
    }
  }
  if (!scaffoldTs.includes("--list") || !scaffoldTs.includes("--check-pack")) {
    errors.push("content-scaffold.ts missing --list/--check-pack");
  }
  if (!scaffoldTs.includes("--check-floors")) {
    errors.push("content-scaffold.ts missing --check-floors");
  }
  if (!cliTs.includes("--list") || !cliTs.includes("--check-pack") || !cliTs.includes("--check-floors")) {
    errors.push("cli.ts missing --list/--check-pack/--check-floors");
  }
  if (!cliTs.includes("Finish 5.0 floors") && !cliTs.includes("FINISH5_PACK_FLOORS")) {
    errors.push("cli.ts missing Finish 5.0 floors wiring");
  }

  for (const path of fixture.expect.exampleFiles as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing example ${path}`);
  }
  for (const path of fixture.expect.moduleFiles as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing module ${path}`);
  }

  const exampleIds = fixture.expect.exampleIds as string[];
  const exampleFiles = fixture.expect.exampleFiles as string[];
  for (let i = 0; i < exampleIds.length; i++) {
    const path = exampleFiles[i]!;
    const doc = readJson(resolve(root, path));
    if (doc.id !== exampleIds[i]) errors.push(`${path} id expected ${exampleIds[i]}`);
    const kind = inferExampleKind(path);
    if (!kind) {
      errors.push(`cannot infer kind for ${path}`);
      continue;
    }
    const schemaErrors = validateScaffoldFragment(kind as any, doc);
    for (const e of schemaErrors) errors.push(`example ${path}: ${e}`);
  }

  for (const kind of ALL_SCAFFOLD_KINDS) {
    const built = buildScaffold({ kind, id: `validate_${kind}_tmp` });
    const schemaErrors = validateScaffoldFragment(kind, built.document);
    for (const e of schemaErrors) errors.push(`live ${kind}: ${e}`);
  }

  const index = indexPackIds(pack, { repoRoot: root });
  if (!packHasId(index, "machine", "machine.basic_cutter")) {
    errors.push("packIds index missing known machine.basic_cutter");
  }
  const firstRival = ((pack.rivalMarkets as { rivals?: { id: string }[] } | undefined)?.rivals ?? [])[0]
    ?.id;
  if (!firstRival || !packHasId(index, "rival", firstRival)) {
    errors.push("packIds index missing known rival from content-pack");
  }
  const firstSeasonal = (
    (pack.seasonalEvents as { events?: { id: string }[] } | undefined)?.events ?? []
  )[0]?.id;
  if (!firstSeasonal || !packHasId(index, "seasonal", firstSeasonal)) {
    errors.push("packIds index missing known seasonal event from content-pack");
  }
  if (packHasId(index, "seasonal", "event.scaffold_aurora_tide")) {
    errors.push("example seasonal id should not be merged into content-pack");
  }
  if (packHasId(index, "endgame", "endgame.tier.scaffold_crest_harbor")) {
    errors.push("example endgame id should not be merged into content-pack");
  }
  if (packHasId(index, "cosmetic", "entitlement.cosmetic.scaffold_aurora_bunting")) {
    errors.push("example cosmetic id should not be merged into entitlements");
  }

  const packMeasure = measurePackFloors(pack, FINISH5_PACK_FLOORS, { repoRoot: root });
  if (!packMeasure.met) {
    for (const s of packMeasure.shortfalls) errors.push(`pack floor short: ${s}`);
  }
  for (const key of fixture.expect.packFloorKeys as string[]) {
    if (!(key in (catalog.packFloors ?? {}))) errors.push(`catalog.packFloors missing ${key}`);
  }

  const measure = measureContentCli5(root);
  if (!measure.floorsMet) {
    errors.push(
      `floors short (kinds=${measure.kindCount} wave5=${measure.wave5Count} ` +
        `examples=${measure.exampleCount} features=${measure.featureCount} ` +
        `packOk=${measure.packFloorsMet} gap=${measure.gapClosed} wired=${measure.kickoffWired})`,
    );
  }
  if (!measure.gapClosed) errors.push("kickoff.gaps.contentCli5Missing must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((dod.quotas?.contentScaffoldKinds ?? 0) < 11) {
    errors.push("DoD quotas.contentScaffoldKinds must be ≥ 11");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 1) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 1");
  }
  if (kickoff.gaps?.contentCli5Missing !== false) {
    errors.push("kickoff gap contentCli5Missing must be false");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("contentCli5Missing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed contentCli5Missing");
  }
  // Soft floor: later Finish 5.0 phases close remaining flags; Phase 28 only requires ≤1 open.
  if (FINISH5_OPEN_GAP_FLAGS.length > 1) {
    errors.push(`OPEN_GAP_FLAGS unexpectedly large after Phase 28: ${FINISH5_OPEN_GAP_FLAGS.length}`);
  }

  const phase28 = (kickoff.phases as any[])?.find((p: any) => p.phase === 28);
  if (!phase28 || phase28.validate !== "contentcli5:validate") {
    errors.push("kickoff phase 28 validate must be contentcli5:validate");
  }
  if (phase28?.id !== "content-cli-5") errors.push("kickoff phase 28 id must be content-cli-5");
  if (!finish5Kt.includes("contentcli5:validate")) {
    errors.push("Finish5Kickoff.kt phase 28 missing contentcli5:validate");
  }
  {
    const openBlock = finish5Kt.slice(
      finish5Kt.indexOf("OPEN_GAP_FLAGS"),
      finish5Kt.indexOf("fun score"),
    );
    if (openBlock.includes("contentCli5Missing")) {
      errors.push("Finish5Kickoff.OPEN_GAP_FLAGS must drop contentCli5Missing");
    }
  }

  if (listing.contentCli5Phase !== 28) errors.push("listing.contentCli5Phase must be 28");
  if (listing.contentCli5Catalog !== "shared/ship/content-cli-5.json") {
    errors.push("listing.contentCli5Catalog mismatch");
  }
  if (!pkg.scripts?.["contentcli5:validate"]) {
    errors.push("package.json missing contentcli5:validate");
  }
  if (!pkg.scripts?.["content:scaffold"]) {
    errors.push("package.json missing content:scaffold");
  }
  if (!ci.includes("contentcli5:validate")) errors.push("ci.yml missing contentcli5:validate");
  if (!ci.includes("contentcli3:validate")) {
    errors.push("ci.yml missing soft contentcli3:validate");
  }
  if (!pin.fixtures?.includes("parity-content-cli-5.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-content-cli-5.json");
  }
  if (pin.contentCli5 !== "shared/ship/content-cli-5.json") {
    errors.push("RELEASE_PIN.contentCli5 path mismatch");
  }
  if (pin.schemaVersion < 26) errors.push("RELEASE_PIN.schemaVersion must be >= 26");

  if (!kotlin.includes("CONTENT_CLI_5_MARKER") || !kotlin.includes("WAVE5_KINDS")) {
    errors.push("Kotlin ContentCli5 missing constants");
  }
  if (!kotlin.includes("CLOSES_GAP") || !kotlin.includes("PACK_FLOOR")) {
    errors.push("Kotlin ContentCli5 missing gap/pack floor constants");
  }

  const block = dod.contentCli5;
  if (!block) errors.push("DoD missing contentCli5 block");
  else {
    if (block.phase !== 28) errors.push("DoD contentCli5.phase must be 28");
    if (block.plan !== "30_finish_5.0") errors.push("DoD contentCli5.plan mismatch");
    if (block.status !== "complete") errors.push("DoD contentCli5.status must be complete");
    if (block.contentCli5Marker !== CONTENT_CLI_5_MARKER) {
      errors.push("DoD contentCli5 marker mismatch");
    }
  }

  if (catalog.softContentCli3Validate !== "npm run contentcli3:validate") {
    errors.push("catalog softContentCli3Validate must pin contentcli3:validate");
  }

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("contentcli5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK contentcli5:validate — Finish 5.0 content CLI wave 5 ready");
