/**
 * Finish 3.0 Phase 28 — content authoring CLI expansion readiness.
 *
 * Usage:
 *   npm run contentcli2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { validateScaffoldFragment } from "../src/contentAuthoring/scaffoldValidate";
import {
  CONTENT_CLI2_EXAMPLE_FLOOR,
  CONTENT_CLI2_FEATURE_FLOOR,
  CONTENT_CLI2_KIND_FLOOR,
  CONTENT_CLI_2,
  CONTENT_CLI_2_MARKER,
  CONTENT_CLI_2_PHASE,
  CONTENT_CLI_2_SCHEMA,
} from "../src/ship/contentCli2";
import {
  ALL_SCAFFOLD_KINDS,
  SCAFFOLD_KINDS,
  SCAFFOLD_KINDS_2,
} from "../../shared/tools/content_cli/ids";
import { indexPackIds, packHasId } from "../../shared/tools/content_cli/packIds";
import { buildScaffold } from "../../shared/tools/content_cli/scaffolds";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/content-cli-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-content-cli-2.json"));
  const finish2 = readJson(resolve(root, "shared/ship/content-authoring-cli.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const scaffoldTs = readFileSync(resolve(root, "web/scripts/content-scaffold.ts"), "utf8");
  const cliTs = readFileSync(resolve(root, "shared/tools/content_cli/cli.ts"), "utf8");
  const finish3Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish3Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ContentCli2.kt"),
    "utf8",
  );
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));

  if (catalog.phase !== 28) errors.push(`phase expected 28, got ${catalog.phase}`);
  if (catalog.schema !== CONTENT_CLI_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (CONTENT_CLI_2_PHASE !== 28) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must be 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.contentCli2Marker !== CONTENT_CLI_2_MARKER) errors.push("marker mismatch");
  if (fixture.contentCli2Marker !== CONTENT_CLI_2_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (catalog.extendsContentCli !== "shared/ship/content-authoring-cli.json") {
    errors.push("extendsContentCli path mismatch");
  }
  if (finish2.scaffoldKindMin !== 3 || finish2.scaffoldKinds?.length !== 3) {
    errors.push("Finish 2.0 content-authoring-cli floors must stay at 3 kinds");
  }

  if (catalog.scaffoldKindMin !== 6 || CONTENT_CLI2_KIND_FLOOR !== 6) {
    errors.push("scaffoldKindMin must be 6");
  }
  if (catalog.exampleFileMin !== 6 || CONTENT_CLI2_EXAMPLE_FLOOR !== 6) {
    errors.push("exampleFileMin must be 6");
  }
  if ((catalog.featureMin ?? 0) < 5 || CONTENT_CLI2_FEATURE_FLOOR < 5) {
    errors.push("featureMin must be ≥ 5");
  }
  if (ALL_SCAFFOLD_KINDS.length < CONTENT_CLI2_KIND_FLOOR) {
    errors.push(`ALL_SCAFFOLD_KINDS ${ALL_SCAFFOLD_KINDS.length} < ${CONTENT_CLI2_KIND_FLOOR}`);
  }
  if (SCAFFOLD_KINDS.length !== 3) errors.push("core SCAFFOLD_KINDS must stay length 3");
  if (SCAFFOLD_KINDS_2.length !== 3) errors.push("SCAFFOLD_KINDS_2 must be contract/bait/decor");

  for (const kind of fixture.expect.kinds as string[]) {
    if (!(ALL_SCAFFOLD_KINDS as readonly string[]).includes(kind)) {
      errors.push(`missing scaffold kind ${kind}`);
    }
  }
  for (const kind of fixture.expect.expansionKinds as string[]) {
    if (!(SCAFFOLD_KINDS_2 as readonly string[]).includes(kind as any)) {
      errors.push(`missing expansion kind ${kind}`);
    }
  }
  for (const feature of fixture.expect.features as string[]) {
    if (!(CONTENT_CLI_2.features as readonly string[]).includes(feature)) {
      errors.push(`missing feature ${feature}`);
    }
  }
  if (!scaffoldTs.includes("--list") || !scaffoldTs.includes("--check-pack")) {
    errors.push("content-scaffold.ts missing --list/--check-pack");
  }
  if (!cliTs.includes("--list") || !cliTs.includes("--check-pack")) {
    errors.push("cli.ts missing --list/--check-pack");
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
    const kind = (["species", "quest", "harbor", "contract", "bait", "decor"] as const).find((k) =>
      path.includes(`${k}.`),
    );
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
  if (!packHasId(index, "bait", "bait.shrimp_nibble")) {
    errors.push("packIds index missing known bait.shrimp_nibble");
  }
  if (packHasId(index, "contract", "contract.scaffold_dawn_crate")) {
    errors.push("example contract id should not be merged into content-pack");
  }

  if ((dod.quotas?.contentScaffoldKinds ?? 0) < 6) {
    errors.push("DoD quotas.contentScaffoldKinds must be ≥ 6");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 28) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 28");
  }
  if (listing.contentCli2Phase !== 28) errors.push("listing.contentCli2Phase must be 28");
  if (listing.contentCli2Catalog !== "shared/ship/content-cli-2.json") {
    errors.push("listing.contentCli2Catalog mismatch");
  }
  if (!pkg.scripts?.["contentcli2:validate"]) {
    errors.push("package.json missing contentcli2:validate");
  }
  if (!pkg.scripts?.["content:scaffold"]) {
    errors.push("package.json missing content:scaffold");
  }
  if (!ci.includes("contentcli2:validate")) errors.push("ci.yml missing contentcli2:validate");
  if (!ci.includes("contentcli:validate")) {
    errors.push("ci.yml missing baseline contentcli:validate");
  }
  if (!pin.fixtures?.includes("parity-content-cli-2.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-content-cli-2.json");
  }
  if (pin.contentCli2 !== "shared/ship/content-cli-2.json") {
    errors.push("RELEASE_PIN.contentCli2 path mismatch");
  }
  if (pin.schemaVersion < 24) errors.push("RELEASE_PIN.schemaVersion must be >= 24");

  const phase28 = (kickoff.phases as any[])?.find((p: any) => p.phase === 28);
  if (!phase28 || phase28.validate !== "contentcli2:validate") {
    errors.push("kickoff phase 28 validate must be contentcli2:validate");
  }
  if (!finish3Kt.includes("contentcli2:validate")) {
    errors.push("Finish3Kickoff.kt phase 28 missing contentcli2:validate");
  }
  if (!kotlin.includes("CONTENT_CLI_2_MARKER") || !kotlin.includes("EXPANSION_KINDS")) {
    errors.push("Kotlin ContentCli2 missing constants");
  }

  const block = dod.contentCli2;
  if (!block) errors.push("DoD missing contentCli2 block");
  else {
    if (block.phase !== 28) errors.push("DoD contentCli2.phase must be 28");
    if (block.plan !== "30_finish_3.0") errors.push("DoD contentCli2.plan mismatch");
    if (block.status !== "complete") errors.push("DoD contentCli2.status must be complete");
    if (block.contentCli2Marker !== CONTENT_CLI_2_MARKER) {
      errors.push("DoD contentCli2 marker mismatch");
    }
  }

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("contentcli2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK contentcli2:validate — Finish 3.0 content CLI expansion ready");
