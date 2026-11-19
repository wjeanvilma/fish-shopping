/**
 * Finish 6.0 Phase 27 — content authoring CLI wave 6 + modular packs readiness.
 *
 * Usage:
 *   npm run contentcli6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { validateScaffoldFragment } from "../src/contentAuthoring/scaffoldValidate";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  CONTENT_CLI6_EXAMPLE_FLOOR,
  CONTENT_CLI6_FEATURE_FLOOR,
  CONTENT_CLI6_KIND_FLOOR,
  CONTENT_CLI6_MODPACK_FLOOR,
  CONTENT_CLI_6,
  CONTENT_CLI_6_MARKER,
  CONTENT_CLI_6_PHASE,
  CONTENT_CLI_6_SCHEMA,
  measureContentCli6,
} from "../src/ship/contentCli6";
import {
  ALL_SCAFFOLD_KINDS,
  SCAFFOLD_KINDS,
  SCAFFOLD_KINDS_2,
  SCAFFOLD_KINDS_3,
  SCAFFOLD_KINDS_5,
  SCAFFOLD_KINDS_6,
} from "../../shared/tools/content_cli/ids";
import { indexPackIds, packHasId } from "../../shared/tools/content_cli/packIds";
import {
  FINISH5_PACK_FLOORS,
  FINISH6_PACK_FLOORS,
  measurePackFloors,
} from "../../shared/tools/content_cli/packFloors";
import { measureAllModpacks } from "../../shared/tools/content_cli/modpacks";
import { buildScaffold } from "../../shared/tools/content_cli/scaffolds";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/content-cli-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-content-cli-6.json"));
  const finish5 = readJson(resolve(root, "shared/ship/content-cli-5.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const scaffoldTs = readFileSync(resolve(root, "web/scripts/content-scaffold.ts"), "utf8");
  const cliTs = readFileSync(resolve(root, "shared/tools/content_cli/cli.ts"), "utf8");
  const finish6Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ContentCli6.kt"),
    "utf8",
  );

  if (catalog.phase !== 27) errors.push(`phase expected 27, got ${catalog.phase}`);
  if (catalog.schema !== CONTENT_CLI_6_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (CONTENT_CLI_6_PHASE !== 27) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 27) errors.push("catalog schemaVersion must be 27");
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");
  if (catalog.contentCli6Marker !== CONTENT_CLI_6_MARKER) errors.push("marker mismatch");
  if (fixture.contentCli6Marker !== CONTENT_CLI_6_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (catalog.closesGap !== "contentCli6Missing") errors.push("closesGap mismatch");
  if (catalog.extendsContentCli5 !== "shared/ship/content-cli-5.json") {
    errors.push("extendsContentCli5 path mismatch");
  }

  // Soft floors: Finish 5.0 content-cli-5 stays at historical mins.
  if (finish5.scaffoldKindMin !== 11 || (finish5.scaffoldKinds?.length ?? 0) < 11) {
    errors.push("Finish 5.0 content-cli-5 soft floor must stay ≥11 kinds");
  }
  if ((catalog.softFloors?.contentCli5KindMin as number) < 11) {
    errors.push("soft floor contentCli5KindMin must stay ≥11");
  }

  if (catalog.scaffoldKindMin !== 14 || CONTENT_CLI6_KIND_FLOOR !== 14) {
    errors.push("scaffoldKindMin must be 14");
  }
  if (catalog.exampleFileMin !== 14 || CONTENT_CLI6_EXAMPLE_FLOOR !== 14) {
    errors.push("exampleFileMin must be 14");
  }
  if ((catalog.featureMin ?? 0) < 11 || CONTENT_CLI6_FEATURE_FLOOR < 11) {
    errors.push("featureMin must be ≥ 11");
  }
  if ((catalog.modpackFloor ?? 0) < 1 || CONTENT_CLI6_MODPACK_FLOOR < 1) {
    errors.push("modpackFloor must be ≥ 1");
  }
  if (ALL_SCAFFOLD_KINDS.length < CONTENT_CLI6_KIND_FLOOR) {
    errors.push(`ALL_SCAFFOLD_KINDS ${ALL_SCAFFOLD_KINDS.length} < ${CONTENT_CLI6_KIND_FLOOR}`);
  }
  if (SCAFFOLD_KINDS.length !== 3) errors.push("core SCAFFOLD_KINDS must stay length 3");
  if (SCAFFOLD_KINDS_2.length !== 3) errors.push("SCAFFOLD_KINDS_2 must be contract/bait/decor");
  if (SCAFFOLD_KINDS_3.length !== 2) errors.push("SCAFFOLD_KINDS_3 must be machine/rival");
  if (SCAFFOLD_KINDS_5.length !== 3) errors.push("SCAFFOLD_KINDS_5 must be seasonal/endgame/cosmetic");
  if (SCAFFOLD_KINDS_6.length !== 3) errors.push("SCAFFOLD_KINDS_6 must be chain/sigil/modpack");

  for (const kind of fixture.expect.kinds as string[]) {
    if (!(ALL_SCAFFOLD_KINDS as readonly string[]).includes(kind)) {
      errors.push(`missing scaffold kind ${kind}`);
    }
  }
  for (const kind of fixture.expect.wave6Kinds as string[]) {
    if (!(SCAFFOLD_KINDS_6 as readonly string[]).includes(kind as any)) {
      errors.push(`missing wave6 kind ${kind}`);
    }
  }
  for (const feature of fixture.expect.features as string[]) {
    if (!(CONTENT_CLI_6.features as readonly string[]).includes(feature)) {
      errors.push(`missing feature ${feature}`);
    }
  }
  if (!scaffoldTs.includes("--list") || !scaffoldTs.includes("--check-pack")) {
    errors.push("content-scaffold.ts missing --list/--check-pack");
  }
  if (!scaffoldTs.includes("--list-modpacks") || !scaffoldTs.includes("--check-modpacks")) {
    errors.push("content-scaffold.ts missing --list-modpacks/--check-modpacks");
  }
  if (!scaffoldTs.includes("FINISH6_PACK_FLOORS")) {
    errors.push("content-scaffold.ts missing Finish 6.0 floors wiring");
  }
  if (!cliTs.includes("--list-modpacks") || !cliTs.includes("--check-modpacks")) {
    errors.push("cli.ts missing --list-modpacks/--check-modpacks");
  }
  if (!cliTs.includes("FINISH6_PACK_FLOORS")) {
    errors.push("cli.ts missing Finish 6.0 floors wiring");
  }
  if (!cliTs.includes("FINISH5_PACK_FLOORS")) {
    errors.push("cli.ts missing soft Finish 5.0 floors import");
  }

  for (const path of fixture.expect.exampleFiles as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing example ${path}`);
  }
  for (const path of fixture.expect.modpackFiles as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing modpack ${path}`);
  }
  for (const path of fixture.expect.moduleFiles as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing module ${path}`);
  }

  const exampleIds = fixture.expect.exampleIds as string[];
  const exampleFiles = fixture.expect.exampleFiles as string[];
  for (let i = 0; i < exampleIds.length; i++) {
    const path = exampleFiles[i]!;
    const doc = readJson(resolve(root, path));
    if (doc.id !== exampleIds[i]) errors.push(`example id mismatch ${path}`);
  }

  for (const kind of SCAFFOLD_KINDS_6) {
    const built = buildScaffold({ kind, id: `scaffold_test_${kind}` });
    const errs = validateScaffoldFragment(kind, built.document);
    if (errs.length) errors.push(`wave6 scaffold ${kind}: ${errs.join("; ")}`);
  }

  const index = indexPackIds(pack, { repoRoot: root });
  if (packHasId(index, "chain", "chain.scaffold_nest_relay")) {
    errors.push("example chain id should not be merged into content-pack");
  }
  if (packHasId(index, "sigil", "endgame.sigil.scaffold_nest_ember")) {
    errors.push("example sigil id should not be merged into content-pack");
  }

  const soft5 = measurePackFloors(pack, FINISH5_PACK_FLOORS, { repoRoot: root });
  if (!soft5.met) {
    for (const s of soft5.shortfalls) errors.push(`soft Finish 5 pack floor short: ${s}`);
  }
  const packMeasure = measurePackFloors(pack, FINISH6_PACK_FLOORS, { repoRoot: root });
  if (!packMeasure.met) {
    for (const s of packMeasure.shortfalls) errors.push(`pack floor short: ${s}`);
  }
  for (const key of fixture.expect.packFloorKeys as string[]) {
    if (!(key in (catalog.packFloors ?? {}))) errors.push(`catalog.packFloors missing ${key}`);
  }

  const modpacks = measureAllModpacks(root);
  if (modpacks.files.length < CONTENT_CLI6_MODPACK_FLOOR) {
    errors.push(`modpacks ${modpacks.files.length} < ${CONTENT_CLI6_MODPACK_FLOOR}`);
  }
  if (!modpacks.ok) {
    for (const m of modpacks.measures) {
      for (const e of m.errors) errors.push(`modpack ${m.path}: ${e}`);
    }
  }

  const measure = measureContentCli6(root);
  if (!measure.floorsMet) {
    errors.push(
      `floors short (kinds=${measure.kindCount} wave6=${measure.wave6Count} ` +
        `examples=${measure.exampleCount} features=${measure.featureCount} ` +
        `modpacks=${measure.modpackCount} packOk=${measure.packFloorsMet} ` +
        `gap=${measure.gapClosed} wired=${measure.kickoffWired})`,
    );
  }
  if (!measure.gapClosed) errors.push("kickoff.gaps.contentCli6Missing must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((dod.quotas?.contentCli6Kinds ?? 0) < 14) {
    errors.push("DoD quotas.contentCli6Kinds must be ≥ 14");
  }
  if (kickoff.gaps?.contentCli6Missing !== false) {
    errors.push("kickoff gap contentCli6Missing must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("contentCli6Missing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed contentCli6Missing");
  }
  // Soft-floor: Phase 29 closed parityLock6Missing → openFlags ≤0.
  if (FINISH6_OPEN_GAP_FLAGS.length > 0) {
    errors.push(`OPEN_GAP_FLAGS expected ≤0 after Phase 29, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }

  const phase27 = (kickoff.phases as any[])?.find((p: any) => p.phase === 27);
  if (!phase27 || phase27.validate !== "contentcli6:validate") {
    errors.push("kickoff phase 27 validate must be contentcli6:validate");
  }
  if (phase27?.id !== "content-cli-6") errors.push("kickoff phase 27 id must be content-cli-6");
  if (!finish6Kt.includes("contentcli6:validate")) {
    errors.push("Finish6Kickoff.kt phase 27 missing contentcli6:validate");
  }
  {
    const openBlock = finish6Kt.slice(
      finish6Kt.indexOf("OPEN_GAP_FLAGS"),
      finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
    );
    if (openBlock.includes("contentCli6Missing")) {
      errors.push("Finish6Kickoff.OPEN_GAP_FLAGS must drop contentCli6Missing");
    }
  }

  if (listing.contentCli6Phase !== 27) errors.push("listing.contentCli6Phase must be 27");
  if (listing.contentCli6Catalog !== "shared/ship/content-cli-6.json") {
    errors.push("listing.contentCli6Catalog mismatch");
  }
  if (pin.contentCli6 !== "shared/ship/content-cli-6.json") {
    errors.push("RELEASE_PIN.contentCli6 missing");
  }
  if (!pin.fixtures?.includes("parity-content-cli-6.json")) {
    errors.push("RELEASE_PIN missing parity-content-cli-6.json");
  }
  if (!dod.contentCli6 || dod.contentCli6.status !== "complete") {
    errors.push("DoD contentCli6 incomplete");
  }

  if (!pkg.scripts?.["contentcli6:validate"]) {
    errors.push("package.json missing contentcli6:validate");
  }
  if (!ci.includes("contentcli6:validate")) errors.push("ci.yml missing contentcli6:validate");
  if (!ci.includes("contentcli5:validate")) {
    errors.push("ci.yml missing soft contentcli5:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_content_cli_6.py"))) {
    errors.push("missing author_content_cli_6.py");
  }
  if (fixture.expect?.contentCli6Missing !== false) {
    errors.push("parity contentCli6Missing must be false");
  }
  // Soft-floor: Phase 29 closed last boolean gap → openGapFlagMin ≤0.
  if ((fixture.expect?.openGapFlagMin ?? 99) > 0) {
    errors.push("parity openGapFlagMin must be ≤0 after Phase 29");
  }
  if (catalog.softContentCli5Validate !== "npm run contentcli5:validate") {
    errors.push("catalog softContentCli5Validate must pin contentcli5:validate");
  }
  if (!kotlin.includes("SCAFFOLD_KIND_MIN") || !kotlin.includes("WAVE6_KINDS")) {
    errors.push("ContentCli6.kt missing constants");
  }

  for (const gate of catalog.preflightGates ?? []) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("contentcli6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK contentcli6:validate — content authoring CLI wave 6 + modular packs wired");
