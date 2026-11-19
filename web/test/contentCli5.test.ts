import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateScaffoldFragment } from "../src/contentAuthoring/scaffoldValidate";
import {
  CONTENT_CLI5_KIND_FLOOR,
  CONTENT_CLI_5_MARKER,
  CONTENT_CLI_5_PHASE,
  measureContentCli5,
} from "../src/ship/contentCli5";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
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

const root = resolve(__dirname, "../..");

describe("content CLI 5 (Finish 5.0 Phase 28)", () => {
  it("locks wave-5 floors, pack floors, and closes contentCli5Missing", () => {
    expect(CONTENT_CLI_5_PHASE).toBe(28);
    expect(CONTENT_CLI_5_MARKER).toBe("authored-finish-5.0-phase-28");
    expect(SCAFFOLD_KINDS).toEqual(["species", "quest", "harbor"]);
    expect(SCAFFOLD_KINDS_2).toEqual(["contract", "bait", "decor"]);
    expect(SCAFFOLD_KINDS_3).toEqual(["machine", "rival"]);
    expect(SCAFFOLD_KINDS_5).toEqual(["seasonal", "endgame", "cosmetic"]);
    expect(ALL_SCAFFOLD_KINDS.length).toBeGreaterThanOrEqual(CONTENT_CLI5_KIND_FLOOR);
    const pack = JSON.parse(
      readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(measurePackFloors(pack, FINISH5_PACK_FLOORS, { repoRoot: root }).met).toBe(true);
    const m = measureContentCli5(root);
    expect(m.floorsMet).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("contentCli5Missing");
    // Soft-floor: Phase 29 may close parityLock5Missing (≤1 open after Phase 28).
    expect(FINISH5_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(1);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        contentCli5Phase?: number;
      }).contentCli5Phase,
    ).toBe(28);
  });

  it("builds schema-valid scaffolds for wave-5 kinds", () => {
    for (const kind of SCAFFOLD_KINDS_5) {
      const built = buildScaffold({ kind, id: `test_${kind}` });
      expect(validateScaffoldFragment(kind, built.document)).toEqual([]);
    }
  });

  it("pack id index covers seasonal/endgame/cosmetics without scaffold examples", () => {
    const pack = JSON.parse(
      readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8"),
    ) as Record<string, unknown>;
    const index = indexPackIds(pack, { repoRoot: root });
    const firstSeasonal = (
      (pack.seasonalEvents as { events?: { id: string }[] } | undefined)?.events ?? []
    )[0]?.id;
    expect(firstSeasonal).toBeTruthy();
    expect(packHasId(index, "seasonal", firstSeasonal!)).toBe(true);
    expect(packHasId(index, "seasonal", "event.scaffold_aurora_tide")).toBe(false);
    expect(packHasId(index, "endgame", "endgame.tier.scaffold_crest_harbor")).toBe(false);
    expect(packHasId(index, "cosmetic", "entitlement.cosmetic.scaffold_aurora_bunting")).toBe(
      false,
    );
  });

  it("content:scaffold --list/--check-floors and contentcli5:validate pass", () => {
    const list = execFileSync("npx", ["vite-node", "scripts/content-scaffold.ts", "--list"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(list).toContain("seasonal");
    expect(list).toContain("endgame");
    expect(list).toContain("cosmetic");

    const floors = execFileSync(
      "npx",
      ["vite-node", "scripts/content-scaffold.ts", "--check-floors"],
      {
        cwd: resolve(root, "web"),
        encoding: "utf8",
      },
    );
    expect(floors).toContain("OK content pack meets Finish 5.0 floors");

    const out = execFileSync("npx", ["vite-node", "scripts/validate-content-cli-5.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK contentcli5:validate");
  }, 90_000);
});
