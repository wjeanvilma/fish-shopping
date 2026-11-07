import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUTHORED_FISH_FLOOR,
  FISH_ART_MARKER,
  FISH_ART_PASS,
  FISH_ART_PHASE,
} from "../src/ship/fishArtPass";
import { loadContent } from "../src/engine";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

function parseGlbJson(buf: Buffer): Record<string, unknown> {
  const chunkLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + chunkLen).toString("utf8").replace(/\0+$/, ""));
}

describe("fish art pass (Finish 2.0 Phase 20)", () => {
  it("locks catalog floors", () => {
    expect(FISH_ART_PHASE).toBe(20);
    expect(AUTHORED_FISH_FLOOR).toBe(10);
    expect(FISH_ART_PASS.authoredSpecies.length).toBeGreaterThanOrEqual(10);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        fishArtPassPhase?: number;
      }).fishArtPassPhase,
    ).toBe(20);
    for (const entry of FISH_ART_PASS.authoredSpecies) {
      expect(content.speciesById.has(entry.speciesId)).toBe(true);
    }
  });

  it("ships distinct authored fish GLBs with FishArt parts", () => {
    const digests = new Set<string>();
    for (const entry of FISH_ART_PASS.authoredSpecies) {
      const path = resolve(root, entry.asset);
      const buf = readFileSync(path);
      expect(statSync(path).size).toBeLessThanOrEqual(FISH_ART_PASS.maxBytesPerFish);
      digests.add(buf.toString("binary"));
      const extras = (parseGlbJson(buf).extras ?? {}) as Record<string, unknown>;
      expect(extras.fishArt).toBe(FISH_ART_MARKER);
      expect(extras.fishTheme).toBe(entry.theme);
      expect(extras.phase).toBe(20);
      const nodes = ((parseGlbJson(buf).nodes ?? []) as { name: string }[]).map((n) => n.name);
      expect(nodes.filter((n) => n.startsWith("FishArt_")).length).toBeGreaterThanOrEqual(6);
    }
    expect(digests.size).toBe(FISH_ART_PASS.authoredSpecies.length);
  });

  it("fishart:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-fish-art-pass.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK fishart:validate");
  });
});
