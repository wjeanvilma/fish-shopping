/**
 * Finish 4.0 Phase 28 — content authoring CLI wave 3 readiness.
 *
 * Usage:
 *   npm run contentcli3:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { validateScaffoldFragment } from "../src/contentAuthoring/scaffoldValidate";
import { FINISH4_OPEN_GAP_FLAGS } from "../src/ship/finish4Kickoff";
import {
  CONTENT_CLI3_EXAMPLE_FLOOR,
  CONTENT_CLI3_FEATURE_FLOOR,
  CONTENT_CLI3_KIND_FLOOR,
  CONTENT_CLI_3,
  CONTENT_CLI_3_MARKER,
  CONTENT_CLI_3_PHASE,
  CONTENT_CLI_3_SCHEMA,
  measureContentCli3,
} from "../src/ship/contentCli3";
import {
  ALL_SCAFFOLD_KINDS,
  SCAFFOLD_KINDS,
  SCAFFOLD_KINDS_2,
  SCAFFOLD_KINDS_3,
} from "../../shared/tools/content_cli/ids";
import { indexPackIds, packHasId } from "../../shared/tools/content_cli/packIds";
import { FINISH4_PACK_FLOORS, measurePackFloors } from "../../shared/tools/content_cli/packFloors";
import { buildScaffold } from "../../shared/tools/content_cli/scaffolds";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/content-cli-3.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-content-cli-3.json"));
  const finish2 = readJson(resolve(root, "shared/ship/content-authoring-cli.json"));
  const finish3 = readJson(resolve(root, "shared/ship/content-cli-2.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const scaffoldTs = readFileSync(resolve(root, "web/scripts/content-scaffold.ts"), "utf8");
  const cliTs = readFileSync(resolve(root, "shared/tools/content_cli/cli.ts"), "utf8");
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ContentCli3.kt"),
    "utf8",
  );
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));

  if (catalog.phase !== 28) errors.push(`phase expected 28, got ${catalog.phase}`);
  if (catalog.schema !== CONTENT_CLI_3_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (CONTENT_CLI_3_PHASE !== 28) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 25) errors.push("catalog schemaVersion must be 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (catalog.contentCli3Marker !== CONTENT_CLI_3_MARKER) errors.push("marker mismatch");
  if (fixture.contentCli3Marker !== CONTENT_CLI_3_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (catalog.closesGap !== "contentCli3Missing") errors.push("closesGap mismatch");
  if (catalog.extendsContentCli2 !== "shared/ship/content-cli-2.json") {
    errors.push("extendsContentCli2 path mismatch");
  }
  if (catalog.extendsContentCli !== "shared/ship/content-authoring-cli.json") {
    errors.push("extendsContentCli path mismatch");
  }

  // Soft floors: prior CLI catalogs keep historical kind floors.
  if (finish2.scaffoldKindMin !== 3 || finish2.scaffoldKinds?.length !== 3) {
    errors.push("Finish 2.0 content-authoring-cli floors must stay at 3 kinds");
  }
  if (finish3.scaffoldKindMin !== 6 || (finish3.scaffoldKinds?.length ?? 0) < 6) {
    errors.push("Finish 3.0 content-cli-2 soft floor must stay ≥6 kinds");
  }
  if ((catalog.softFloors?.contentCliHistoricalKindMin as number) < 3) {
    errors.push("soft floor contentCliHistoricalKindMin must stay ≥3");
  }
  if ((catalog.softFloors?.contentCli2HistoricalKindMin as number) < 6) {
    errors.push("soft floor contentCli2HistoricalKindMin must stay ≥6");
  }

  if (catalog.scaffoldKindMin !== 8 || CONTENT_CLI3_KIND_FLOOR !== 8) {
    errors.push("scaffoldKindMin must be 8");
  }
  if (catalog.exampleFileMin !== 8 || CONTENT_CLI3_EXAMPLE_FLOOR !== 8) {
    errors.push("exampleFileMin must be 8");
  }
  if ((catalog.featureMin ?? 0) < 5 || CONTENT_CLI3_FEATURE_FLOOR < 5) {
    errors.push("featureMin must be ≥ 5");
  }
  if (ALL_SCAFFOLD_KINDS.length < CONTENT_CLI3_KIND_FLOOR) {
    errors.push(`ALL_SCAFFOLD_KINDS ${ALL_SCAFFOLD_KINDS.length} < ${CONTENT_CLI3_KIND_FLOOR}`);
  }
  if (SCAFFOLD_KINDS.length !== 3) errors.push("core SCAFFOLD_KINDS must stay length 3");
  if (SCAFFOLD_KINDS_2.length !== 3) errors.push("SCAFFOLD_KINDS_2 must be contract/bait/decor");
  if (SCAFFOLD_KINDS_3.length !== 2) errors.push("SCAFFOLD_KINDS_3 must be machine/rival");

  for (const kind of fixture.expect.kinds as string[]) {
    if (!(ALL_SCAFFOLD_KINDS as readonly string[]).includes(kind)) {
      errors.push(`missing scaffold kind ${kind}`);
    }
  }
  for (const kind of fixture.expect.wave3Kinds as string[]) {
    if (!(SCAFFOLD_KINDS_3 as readonly string[]).includes(kind as any)) {
      errors.push(`missing wave3 kind ${kind}`);
    }
  }
  for (const feature of fixture.expect.features as string[]) {
    if (!(CONTENT_CLI_3.features as readonly string[]).includes(feature)) {
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

  for (const path of fixture.expect.exampleFiles as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing example ${path}`);
  }
  for (const path of fixture.expect.moduleFiles as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing module ${path}`);
  }

  const exampleIds = fixture.expect.exampleIds as string[];
  const exampleFiles = fixture.expect.exampleFiles as string[];
  const kindOrder = [
    "species",
    "quest",
    "harbor",
    "contract",
    "bait",
    "decor",
    "machine",
    "rival",
  ] as const;
  for (let i = 0; i < exampleIds.length; i++) {
    const path = exampleFiles[i]!;
    const doc = readJson(resolve(root, path));
    if (doc.id !== exampleIds[i]) errors.push(`${path} id expected ${exampleIds[i]}`);
    const kind = kindOrder.find((k) => path.includes(`/${k}.`) || path.includes(`${k}.`));
    if (!kind) {
      errors.push(`cannot infer kind for ${path}`);
      continue;
    }
    const schemaErrors = validateScaffoldFragment(kind, doc);
    for (const e of schemaErrors) errors.push(`example ${path}: ${e}`);
  }

  for (const kind of ALL_SCAFFOLD_KINDS) {
    const built = buildScaffold({ kind, id: `validate_${kind}_tmp` });
    const schemaErrors = validateScaffoldFragment(kind, built.document);
    for (const e of schemaErrors) errors.push(`live ${kind}: ${e}`);
  }

  const index = indexPackIds(pack);
  if (!packHasId(index, "machine", "machine.basic_cutter")) {
    errors.push("packIds index missing known machine.basic_cutter");
  }
  const firstRival = ((pack.rivalMarkets as { rivals?: { id: string }[] } | undefined)?.rivals ?? [])[0]
    ?.id;
  if (!firstRival || !packHasId(index, "rival", firstRival)) {
    errors.push("packIds index missing known rival from content-pack");
  }
  if (packHasId(index, "machine", "machine.scaffold_dock_press")) {
    errors.push("example machine id should not be merged into content-pack");
  }
  if (packHasId(index, "rival", "rival.scaffold_mist_hawker")) {
    errors.push("example rival id should not be merged into content-pack");
  }

  const packMeasure = measurePackFloors(pack, FINISH4_PACK_FLOORS);
  if (!packMeasure.met) {
    for (const s of packMeasure.shortfalls) errors.push(`pack floor short: ${s}`);
  }
  for (const key of fixture.expect.packFloorKeys as string[]) {
    if (!(key in (catalog.packFloors ?? {}))) errors.push(`catalog.packFloors missing ${key}`);
  }

  const measure = measureContentCli3(root);
  if (!measure.floorsMet) {
    errors.push(
      `floors short (kinds=${measure.kindCount} wave3=${measure.wave3Count} ` +
        `examples=${measure.exampleCount} features=${measure.featureCount} ` +
        `packOk=${measure.packFloorsMet} gap=${measure.gapClosed})`,
    );
  }
  if (!measure.gapClosed) errors.push("kickoff.gaps.contentCli3Missing must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((dod.quotas?.contentScaffoldKinds ?? 0) < 8) {
    errors.push("DoD quotas.contentScaffoldKinds must be ≥ 8");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 28) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 28");
  }
  if (kickoff.gaps?.contentCli3Missing !== false) {
    errors.push("kickoff gap contentCli3Missing must be false");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("contentCli3Missing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed contentCli3Missing");
  }
  // Soft floor: later Finish 4.0 phases close remaining flags; Phase 28 only requires ≤1 open.
  if (FINISH4_OPEN_GAP_FLAGS.length > 1) {
    errors.push(`OPEN_GAP_FLAGS unexpectedly large after Phase 28: ${FINISH4_OPEN_GAP_FLAGS.length}`);
  }

  const phase28 = (kickoff.phases as any[])?.find((p: any) => p.phase === 28);
  if (!phase28 || phase28.validate !== "contentcli3:validate") {
    errors.push("kickoff phase 28 validate must be contentcli3:validate");
  }
  if (!finish4Kt.includes("contentcli3:validate")) {
    errors.push("Finish4Kickoff.kt phase 28 missing contentcli3:validate");
  }
  {
    const openBlock = finish4Kt.slice(
      finish4Kt.indexOf("OPEN_GAP_FLAGS"),
      finish4Kt.indexOf("fun score"),
    );
    if (openBlock.includes("contentCli3Missing")) {
      errors.push("Finish4Kickoff.OPEN_GAP_FLAGS must drop contentCli3Missing");
    }
  }

  if (listing.contentCli3Phase !== 28) errors.push("listing.contentCli3Phase must be 28");
  if (listing.contentCli3Catalog !== "shared/ship/content-cli-3.json") {
    errors.push("listing.contentCli3Catalog mismatch");
  }
  if (!pkg.scripts?.["contentcli3:validate"]) {
    errors.push("package.json missing contentcli3:validate");
  }
  if (!pkg.scripts?.["content:scaffold"]) {
    errors.push("package.json missing content:scaffold");
  }
  if (!ci.includes("contentcli3:validate")) errors.push("ci.yml missing contentcli3:validate");
  if (!ci.includes("contentcli2:validate")) {
    errors.push("ci.yml missing baseline contentcli2:validate");
  }
  if (!ci.includes("contentcli:validate")) {
    errors.push("ci.yml missing baseline contentcli:validate");
  }
  if (!pin.fixtures?.includes("parity-content-cli-3.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-content-cli-3.json");
  }
  if (pin.contentCli3 !== "shared/ship/content-cli-3.json") {
    errors.push("RELEASE_PIN.contentCli3 path mismatch");
  }
  if (pin.schemaVersion < 25) errors.push("RELEASE_PIN.schemaVersion must be >= 25");

  if (!kotlin.includes("CONTENT_CLI_3_MARKER") || !kotlin.includes("WAVE3_KINDS")) {
    errors.push("Kotlin ContentCli3 missing constants");
  }
  if (!kotlin.includes("CLOSES_GAP") || !kotlin.includes("PACK_FLOOR")) {
    errors.push("Kotlin ContentCli3 missing gap/pack floor constants");
  }

  const block = dod.contentCli3;
  if (!block) errors.push("DoD missing contentCli3 block");
  else {
    if (block.phase !== 28) errors.push("DoD contentCli3.phase must be 28");
    if (block.plan !== "30_finish_4.0") errors.push("DoD contentCli3.plan mismatch");
    if (block.status !== "complete") errors.push("DoD contentCli3.status must be complete");
    if (block.contentCli3Marker !== CONTENT_CLI_3_MARKER) {
      errors.push("DoD contentCli3 marker mismatch");
    }
  }

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("contentcli3:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK contentcli3:validate — Finish 4.0 content CLI wave 3 ready");
