/**
 * Finish 2.0 Phase 27 — content authoring CLI readiness.
 *
 * Usage:
 *   npm run contentcli:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { validateScaffoldFragment } from "../src/contentAuthoring/scaffoldValidate";
import {
  CONTENT_AUTHORING_CLI,
  CONTENT_AUTHORING_CLI_MARKER,
  CONTENT_AUTHORING_CLI_PHASE,
  CONTENT_AUTHORING_CLI_SCHEMA,
  SCAFFOLD_EXAMPLE_FLOOR,
  SCAFFOLD_KIND_FLOOR,
} from "../src/ship/contentAuthoringCli";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";
import { SCAFFOLD_KINDS } from "../../shared/tools/content_cli/ids";
import { buildScaffold } from "../../shared/tools/content_cli/scaffolds";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/content-authoring-cli.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-content-authoring-cli.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 27) errors.push(`phase expected 27, got ${catalog.phase}`);
  if (catalog.schema !== CONTENT_AUTHORING_CLI_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (CONTENT_AUTHORING_CLI_PHASE !== 27) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("catalog schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (catalog.contentCliMarker !== CONTENT_AUTHORING_CLI_MARKER) errors.push("marker mismatch");
  if (fixture.contentCliMarker !== CONTENT_AUTHORING_CLI_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.scaffoldKindMin !== 3 || SCAFFOLD_KIND_FLOOR !== 3) {
    errors.push("scaffoldKindMin must be 3");
  }
  if (catalog.exampleFileMin !== 3 || SCAFFOLD_EXAMPLE_FLOOR !== 3) {
    errors.push("exampleFileMin must be 3");
  }
  if (JSON.stringify(catalog.scaffoldKinds) !== JSON.stringify(["species", "quest", "harbor"])) {
    errors.push("scaffoldKinds must be species/quest/harbor");
  }
  if (SCAFFOLD_KINDS.length < 3) errors.push("runtime SCAFFOLD_KINDS < 3");

  for (const kind of fixture.expect.kinds as string[]) {
    if (!(SCAFFOLD_KINDS as readonly string[]).includes(kind)) {
      errors.push(`missing scaffold kind ${kind}`);
    }
  }

  for (const path of fixture.expect.exampleFiles as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing example ${path}`);
  }
  for (const path of fixture.expect.moduleFiles as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing module ${path}`);
  }

  const exampleIds = fixture.expect.exampleIds as string[];
  for (let i = 0; i < exampleIds.length; i++) {
    const path = (fixture.expect.exampleFiles as string[])[i]!;
    const doc = readJson(resolve(root, path));
    if (doc.id !== exampleIds[i]) errors.push(`${path} id expected ${exampleIds[i]}`);
    const kind = path.includes("species.")
      ? "species"
      : path.includes("quest.")
        ? "quest"
        : "harbor";
    const schemaErrors = validateScaffoldFragment(kind as "species" | "quest" | "harbor", doc);
    for (const e of schemaErrors) errors.push(`example ${path}: ${e}`);
  }

  // Live generator → schema
  for (const kind of SCAFFOLD_KINDS) {
    const built = buildScaffold({ kind, id: `validate_${kind}_tmp` });
    const schemaErrors = validateScaffoldFragment(kind, built.document);
    for (const e of schemaErrors) errors.push(`live ${kind}: ${e}`);
  }

  if ((dod.quotas?.contentScaffoldKinds ?? 0) < 3) {
    errors.push("DoD quotas.contentScaffoldKinds must be ≥ 3");
  }
  if (listing.contentAuthoringCliPhase !== 27) {
    errors.push("listing.contentAuthoringCliPhase must be 27");
  }
  if (listing.contentAuthoringCliCatalog !== "shared/ship/content-authoring-cli.json") {
    errors.push("listing.contentAuthoringCliCatalog mismatch");
  }
  if (!ci.includes("contentcli:validate")) errors.push("ci.yml missing contentcli:validate");
  if (!ci.includes("content:validate")) errors.push("ci.yml missing baseline content:validate");
  if (!pin.fixtures?.includes("parity-content-authoring-cli.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-content-authoring-cli.json");
  }
  if (pin.contentAuthoringCli !== "shared/ship/content-authoring-cli.json") {
    errors.push("RELEASE_PIN.contentAuthoringCli path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");
  if (!pkg.scripts?.["contentcli:validate"]) {
    errors.push("web/package.json missing contentcli:validate");
  }
  if (!pkg.scripts?.["content:scaffold"]) {
    errors.push("web/package.json missing content:scaffold");
  }
  if (CONTENT_AUTHORING_CLI.parityFixture !== "shared/fixtures/parity-content-authoring-cli.json") {
    errors.push("parityFixture path mismatch");
  }
  if (CONTENT_AUTHORING_CLI.moduleRoot !== "shared/tools/content_cli/") {
    errors.push("moduleRoot mismatch");
  }

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("contentcli:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK contentcli:validate — harbor/species/quest scaffolds + schema checks");
