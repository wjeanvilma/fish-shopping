/**
 * Phase 14 — authored pier/machine/counter modules + harbor socket contract.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { isOcclusionFadeName, isStackSlotName } from "../src/render/presenters";

const root = resolve(__dirname, "../..");
const MODULES = [
  "pier", "ground", "zone", "counter",
  "cutter", "smoker", "grill", "chiller", "fryer", "packer", "steamer", "kiln",
] as const;

function parseGlbJson(buf: Buffer): Record<string, unknown> {
  expect(buf.readUInt32LE(0)).toBe(0x46546c67);
  const chunkLen = buf.readUInt32LE(12);
  expect(buf.readUInt32LE(16)).toBe(0x4e4f534a);
  return JSON.parse(buf.subarray(20, 20 + chunkLen).toString("utf8").replace(/\0+$/, ""));
}

describe("Phase 14 environment art", () => {
  it("ships authored module GLBs under models/modules/", () => {
    for (const name of MODULES) {
      const path = resolve(root, `shared/assets/models/modules/${name}.glb`);
      expect(existsSync(path), path).toBe(true);
      const gltf = parseGlbJson(readFileSync(path));
      const asset = gltf.asset as { generator?: string };
      expect(asset.generator).toContain("generate_env_modules");
      const extras = gltf.extras as { stylized?: boolean; phase?: number; module?: string };
      expect(extras.stylized).toBe(true);
      expect(extras.phase).toBe(14);
      expect(extras.module).toBe(name);
      const accessors = gltf.accessors as { count: number }[];
      expect(accessors[0].count).toBeGreaterThan(24);
    }
  });

  it("embeds modular env art in every harbor blockout and keeps presenter sockets", () => {
    const harbors = [
      "sunrise_pier", "moon_cove", "obsidian_jetty", "northlight_harbor", "grand_marina",
      "coral_lagoon", "storm_quay", "ember_wharf",
    ];
    for (const harbor of harbors) {
      const path = resolve(root, `shared/assets/models/${harbor}_blockout.glb`);
      const gltf = parseGlbJson(readFileSync(path));
      const extras = gltf.extras as { envArt?: string; itemArt?: string; harborArt?: string };
      expect(extras.envArt ?? "", harbor).toMatch(/^modular-phase-14/);
      expect(extras.itemArt, harbor).toBe("stylized-phase-13");
      if (["sunrise_pier", "coral_lagoon", "storm_quay"].includes(harbor)) {
        expect(extras.harborArt, harbor).toBe("authored-phase-19");
      }

      const nodes = (gltf.nodes as { name: string }[]).map((n) => n.name);
      const nameSet = new Set(nodes);
      expect(nameSet.has("Player"), harbor).toBe(true);
      expect(nameSet.has("PlayerBody"), harbor).toBe(true);
      expect(nameSet.has("Water"), harbor).toBe(true);
      expect(nameSet.has("Pier") || nodes.some((n) => n.startsWith("Ground_")), harbor).toBe(true);
      expect(nodes.some((n) => n.startsWith("Footprint_")), harbor).toBe(true);
      expect(nodes.some((n) => n.startsWith("Zone_")), harbor).toBe(true);
      expect(nodes.some((n) => n.startsWith("Bag_0_")), harbor).toBe(true);
      expect(nodes.some((n) => n.startsWith("Fly_0_")), harbor).toBe(true);
      expect(nodes.some((n) => n.startsWith("In_")), harbor).toBe(true);
      expect(nodes.some((n) => n.startsWith("Out_")), harbor).toBe(true);
      expect(nodes.some((n) => n.startsWith("Stock_")), harbor).toBe(true);

      for (const n of nodes) {
        if (n.startsWith("Zone_")) expect(isOcclusionFadeName(n)).toBe(true);
        if (/^(Bag_|In_|Out_|Stock_)/.test(n)) expect(isStackSlotName(n)).toBe(true);
      }

      const meshes = gltf.meshes as { name: string; primitives: { attributes: { POSITION: number } }[] }[];
      const byName = Object.fromEntries(meshes.map((m) => [m.name, m.primitives[0].attributes.POSITION]));
      expect(byName.pier ?? byName.cutter ?? byName.counter).toBeGreaterThan(8);
      expect(byName.fish).toBe(3);
    }
  });

  it("parses module and harbor GLBs with Three.js GLTFLoader", async () => {
    const samples = [
      "models/modules/cutter.glb",
      "models/modules/pier.glb",
      "models/modules/counter.glb",
      "models/sunrise_pier_blockout.glb",
    ];
    const loader = new GLTFLoader();
    for (const asset of samples) {
      const buf = readFileSync(resolve(root, "shared/assets", asset));
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const gltf = await new Promise<{ scene: { children: unknown[] } }>((resolveP, reject) => {
        loader.parse(ab, "", resolveP as (g: unknown) => void, reject);
      });
      expect(gltf.scene.children.length, asset).toBeGreaterThan(0);
    }
  });
});
