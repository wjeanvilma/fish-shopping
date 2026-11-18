import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateScaffoldFragment } from "../src/contentAuthoring/scaffoldValidate";
import {
  CONTENT_CLI2_KIND_FLOOR,
  CONTENT_CLI_2_MARKER,
  CONTENT_CLI_2_PHASE,
} from "../src/ship/contentCli2";
import { ALL_SCAFFOLD_KINDS, SCAFFOLD_KINDS, SCAFFOLD_KINDS_2 } from "../../shared/tools/content_cli/ids";
import { indexPackIds, packHasId } from "../../shared/tools/content_cli/packIds";
import { buildScaffold } from "../../shared/tools/content_cli/scaffolds";

const root = resolve(__dirname, "../..");

describe("content CLI 2 (Finish 3.0 Phase 28)", () => {
  it("locks expansion floors and keeps Finish 2.0 core kinds", () => {
    expect(CONTENT_CLI_2_PHASE).toBe(28);
    expect(CONTENT_CLI_2_MARKER).toBe("authored-finish-3.0-phase-28");
    expect(SCAFFOLD_KINDS).toEqual(["species", "quest", "harbor"]);
    expect(SCAFFOLD_KINDS_2).toEqual(["contract", "bait", "decor"]);
    expect(ALL_SCAFFOLD_KINDS.length).toBeGreaterThanOrEqual(CONTENT_CLI2_KIND_FLOOR);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        contentCli2Phase?: number;
      }).contentCli2Phase,
    ).toBe(28);
  });

  it("builds schema-valid scaffolds for all expansion kinds", () => {
    for (const kind of SCAFFOLD_KINDS_2) {
      const built = buildScaffold({ kind, id: `test_${kind}` });
      expect(validateScaffoldFragment(kind, built.document)).toEqual([]);
    }
  });

  it("pack id index detects collisions", () => {
    const pack = JSON.parse(
      readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8"),
    ) as Record<string, unknown>;
    const index = indexPackIds(pack);
    expect(packHasId(index, "bait", "bait.shrimp_nibble")).toBe(true);
    expect(packHasId(index, "decor", "decor.scaffold_pier_bunting")).toBe(false);
  });

  it("content:scaffold --list and contentcli2:validate pass", () => {
    const list = execFileSync("npx", ["vite-node", "scripts/content-scaffold.ts", "--list"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(list).toContain("contract");
    expect(list).toContain("bait");
    expect(list).toContain("decor");

    const out = execFileSync("npx", ["vite-node", "scripts/validate-content-cli-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK contentcli2:validate");
  }, 60_000);
});
