import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUTHORED_HARBOR_FLOOR,
  HARBOR_ART_MARKER,
  HARBOR_ART_PASS,
  HARBOR_ART_PHASE,
} from "../src/ship/harborArtPass";
import { loadContent } from "../src/engine";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

function parseGlbJson(buf: Buffer): Record<string, unknown> {
  const chunkLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + chunkLen).toString("utf8").replace(/\0+$/, ""));
}

describe("harbor art pass (Finish 2.0 Phase 19)", () => {
  it("locks catalog floors", () => {
    expect(HARBOR_ART_PHASE).toBe(19);
    expect(AUTHORED_HARBOR_FLOOR).toBe(3);
    expect(HARBOR_ART_PASS.authoredHarbors.length).toBeGreaterThanOrEqual(3);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        harborArtPassPhase?: number;
      }).harborArtPassPhase,
    ).toBe(19);
    for (const entry of HARBOR_ART_PASS.authoredHarbors) {
      expect(content.harborsById.has(entry.harborId)).toBe(true);
    }
  });

  it("ships distinct authored harbor GLBs with HarborArt props", () => {
    const digests = new Set<string>();
    for (const entry of HARBOR_ART_PASS.authoredHarbors) {
      const path = resolve(root, entry.asset);
      const buf = readFileSync(path);
      expect(statSync(path).size).toBeLessThanOrEqual(HARBOR_ART_PASS.maxBytesPerHarbor);
      digests.add(buf.toString("binary"));
      const extras = (parseGlbJson(buf).extras ?? {}) as Record<string, string>;
      expect(extras.harborArt).toBe(HARBOR_ART_MARKER);
      expect(extras.harborTheme).toBe(entry.theme);
      const nodes = ((parseGlbJson(buf).nodes ?? []) as { name: string }[]).map((n) => n.name);
      expect(nodes.some((n) => n.startsWith("HarborArt_"))).toBe(true);
    }
    expect(digests.size).toBe(HARBOR_ART_PASS.authoredHarbors.length);
  });

  it("harborart:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-harbor-art-pass.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK harborart:validate");
  });
});
