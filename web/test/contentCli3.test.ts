import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateScaffoldFragment } from "../src/contentAuthoring/scaffoldValidate";
import {
  CONTENT_CLI3_KIND_FLOOR,
  CONTENT_CLI_3_MARKER,
  CONTENT_CLI_3_PHASE,
  measureContentCli3,
} from "../src/ship/contentCli3";
import { FINISH4_OPEN_GAP_FLAGS } from "../src/ship/finish4Kickoff";
import {
  ALL_SCAFFOLD_KINDS,
  SCAFFOLD_KINDS,
  SCAFFOLD_KINDS_2,
  SCAFFOLD_KINDS_3,
} from "../../shared/tools/content_cli/ids";
import { indexPackIds, packHasId } from "../../shared/tools/content_cli/packIds";
import { FINISH4_PACK_FLOORS, measurePackFloors } from "../../shared/tools/content_cli/packFloors";
import { buildScaffold } from "../../shared/tools/content_cli/scaffolds";

const root = resolve(__dirname, "../..");

describe("content CLI 3 (Finish 4.0 Phase 28)", () => {
  it("locks wave-3 floors, pack floors, and closes contentCli3Missing", () => {
    expect(CONTENT_CLI_3_PHASE).toBe(28);
    expect(CONTENT_CLI_3_MARKER).toBe("authored-finish-4.0-phase-28");
    expect(SCAFFOLD_KINDS).toEqual(["species", "quest", "harbor"]);
    expect(SCAFFOLD_KINDS_2).toEqual(["contract", "bait", "decor"]);
    expect(SCAFFOLD_KINDS_3).toEqual(["machine", "rival"]);
    expect(ALL_SCAFFOLD_KINDS.length).toBeGreaterThanOrEqual(CONTENT_CLI3_KIND_FLOOR);
    const pack = JSON.parse(
      readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(measurePackFloors(pack, FINISH4_PACK_FLOORS).met).toBe(true);
    const m = measureContentCli3(root);
    expect(m.floorsMet).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("contentCli3Missing");
    expect(FINISH4_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(1);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        contentCli3Phase?: number;
      }).contentCli3Phase,
    ).toBe(28);
  });

  it("builds schema-valid scaffolds for wave-3 kinds", () => {
    for (const kind of SCAFFOLD_KINDS_3) {
      const built = buildScaffold({ kind, id: `test_${kind}` });
      expect(validateScaffoldFragment(kind, built.document)).toEqual([]);
    }
  });

  it("pack id index covers machines and rivals", () => {
    const pack = JSON.parse(
      readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8"),
    ) as Record<string, unknown>;
    const index = indexPackIds(pack);
    expect(packHasId(index, "machine", "machine.basic_cutter")).toBe(true);
    expect(packHasId(index, "machine", "machine.scaffold_dock_press")).toBe(false);
    expect(packHasId(index, "rival", "rival.scaffold_mist_hawker")).toBe(false);
  });

  it("content:scaffold --list/--check-floors and contentcli3:validate pass", () => {
    const list = execFileSync("npx", ["vite-node", "scripts/content-scaffold.ts", "--list"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(list).toContain("machine");
    expect(list).toContain("rival");

    const floors = execFileSync(
      "npx",
      ["vite-node", "scripts/content-scaffold.ts", "--check-floors"],
      {
        cwd: resolve(root, "web"),
        encoding: "utf8",
      },
    );
    expect(floors).toContain("OK content pack meets Finish 4.0 floors");

    const out = execFileSync("npx", ["vite-node", "scripts/validate-content-cli-3.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK contentcli3:validate");
  }, 90_000);
});
