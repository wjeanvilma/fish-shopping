import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateScaffoldFragment } from "../src/contentAuthoring/scaffoldValidate";
import {
  CONTENT_CLI6_KIND_FLOOR,
  CONTENT_CLI_6_MARKER,
  CONTENT_CLI_6_PHASE,
  measureContentCli6,
} from "../src/ship/contentCli6";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  ALL_SCAFFOLD_KINDS,
  SCAFFOLD_KINDS_5,
  SCAFFOLD_KINDS_6,
} from "../../shared/tools/content_cli/ids";
import { FINISH6_PACK_FLOORS, measurePackFloors } from "../../shared/tools/content_cli/packFloors";
import { buildScaffold } from "../../shared/tools/content_cli/scaffolds";

const root = resolve(__dirname, "../..");

describe("content CLI 6 (Finish 6.0 Phase 27)", () => {
  it("locks wave-6 floors, modpacks, and closes contentCli6Missing", () => {
    expect(CONTENT_CLI_6_PHASE).toBe(27);
    expect(CONTENT_CLI_6_MARKER).toBe("authored-finish-6.0-phase-27");
    expect(SCAFFOLD_KINDS_5).toEqual(["seasonal", "endgame", "cosmetic"]);
    expect(SCAFFOLD_KINDS_6).toEqual(["chain", "sigil", "modpack"]);
    expect(ALL_SCAFFOLD_KINDS.length).toBeGreaterThanOrEqual(CONTENT_CLI6_KIND_FLOOR);
    const pack = JSON.parse(
      readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(measurePackFloors(pack, FINISH6_PACK_FLOORS, { repoRoot: root }).met).toBe(true);
    const m = measureContentCli6(root);
    expect(m.floorsMet).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.modpacksOk).toBe(true);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("contentCli6Missing");
    // Soft-floor: Phase 29 closed parityLock6Missing → 0 open flags.
    expect(FINISH6_OPEN_GAP_FLAGS).toHaveLength(0);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        contentCli6Phase?: number;
      }).contentCli6Phase,
    ).toBe(27);
  });

  it("builds schema-valid scaffolds for wave-6 kinds", () => {
    for (const kind of SCAFFOLD_KINDS_6) {
      const built = buildScaffold({ kind, id: `test_${kind}` });
      expect(validateScaffoldFragment(kind, built.document)).toEqual([]);
    }
  });

  it("content:scaffold list/floors/modpacks and contentcli6:validate pass", () => {
    const list = execFileSync("npx", ["vite-node", "scripts/content-scaffold.ts", "--list"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(list).toContain("chain");
    expect(list).toContain("sigil");
    expect(list).toContain("modpack");

    const floors = execFileSync(
      "npx",
      ["vite-node", "scripts/content-scaffold.ts", "--check-floors"],
      { cwd: resolve(root, "web"), encoding: "utf8" },
    );
    expect(floors).toContain("OK content pack meets Finish 6.0 floors");

    const mods = execFileSync(
      "npx",
      ["vite-node", "scripts/content-scaffold.ts", "--check-modpacks"],
      { cwd: resolve(root, "web"), encoding: "utf8" },
    );
    expect(mods).toContain("OK modular packs valid");

    const out = execFileSync("npx", ["vite-node", "scripts/validate-content-cli-6.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK contentcli6:validate");
  }, 90_000);
});
