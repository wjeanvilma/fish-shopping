import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateScaffoldFragment } from "../src/contentAuthoring/scaffoldValidate";
import {
  CONTENT_AUTHORING_CLI_MARKER,
  CONTENT_AUTHORING_CLI_PHASE,
  SCAFFOLD_KIND_FLOOR,
} from "../src/ship/contentAuthoringCli";
import { SCAFFOLD_KINDS } from "../../shared/tools/content_cli/ids";
import { buildScaffold } from "../../shared/tools/content_cli/scaffolds";

const root = resolve(__dirname, "../..");

describe("content authoring CLI (Finish 2.0 Phase 27)", () => {
  it("locks floors and listing pointers", () => {
    expect(CONTENT_AUTHORING_CLI_PHASE).toBe(27);
    expect(CONTENT_AUTHORING_CLI_MARKER).toBe("authored-finish-2.0-phase-27");
    expect(SCAFFOLD_KIND_FLOOR).toBe(3);
    expect(SCAFFOLD_KINDS).toEqual(["species", "quest", "harbor"]);
    const listing = JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
      contentAuthoringCliPhase?: number;
    };
    expect(listing.contentAuthoringCliPhase).toBe(27);
  });

  it("builds schema-valid scaffolds for all kinds", () => {
    for (const kind of SCAFFOLD_KINDS) {
      const built = buildScaffold({ kind, id: `test_${kind}` });
      expect(validateScaffoldFragment(kind, built.document)).toEqual([]);
    }
  });

  it("content:scaffold dry-run exits 0", () => {
    const out = execFileSync(
      "npx",
      ["vite-node", "scripts/content-scaffold.ts", "species", "--id", "cli_smoke", "--dry-run"],
      { cwd: resolve(root, "web"), encoding: "utf8" },
    );
    expect(out).toContain("species.cli_smoke");
  });

  it("contentcli:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-content-authoring-cli.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK contentcli:validate");
  });
});
