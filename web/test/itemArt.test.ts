/**
 * Phase 13 — species/product stylized GLB path contract + Three.js parse smoke.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { loadContent } from "../src/engine";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

function parseGlbJson(buf: Buffer): Record<string, unknown> {
  const magic = buf.readUInt32LE(0);
  expect(magic).toBe(0x46546c67); // glTF
  const chunkLen = buf.readUInt32LE(12);
  const chunkType = buf.readUInt32LE(16);
  expect(chunkType).toBe(0x4e4f534a); // JSON
  const json = buf.subarray(20, 20 + chunkLen).toString("utf8").replace(/\0+$/, "");
  return JSON.parse(json) as Record<string, unknown>;
}

describe("Phase 13 item art", () => {
  it("ships a stylized GLB for every species and product asset path", () => {
    const rows = [
      ...content.raw.species.map((s) => ({ id: s.id, asset: s.asset })),
      ...content.raw.products.map((p) => ({ id: p.id, asset: p.asset })),
    ];
    expect(rows.length).toBeGreaterThanOrEqual(36 + 21);
    for (const row of rows) {
      expect(row.asset, row.id).toBeTruthy();
      const path = resolve(root, "shared/assets", row.asset!);
      expect(existsSync(path), path).toBe(true);
      const buf = readFileSync(path);
      const gltf = parseGlbJson(buf);
      const asset = gltf.asset as { generator?: string };
      expect(asset.generator, row.id).toContain("generate_item_art");
      const extras = gltf.extras as { stylized?: boolean; phase?: number; fishArt?: string } | undefined;
      expect(extras?.stylized, row.id).toBe(true);
      expect([13, 20]).toContain(extras?.phase);
      if (extras?.phase === 20) {
        expect(extras.fishArt, row.id).toBe("authored-phase-20");
      }
      const accessors = gltf.accessors as { count: number }[];
      expect(accessors[0].count, row.id).toBeGreaterThan(24);
    }
  });

  it("parses representative fish and product GLBs with Three.js GLTFLoader", async () => {
    const samples = [
      "models/fish_silver_sprat.glb",
      "models/fish_ink_squid.glb",
      "models/fish_lava_eel.glb",
      "models/product_fillet.glb",
      "models/product_skewer_carton.glb",
      "models/product_ice_packed_crate.glb",
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

  it("keeps harbor blockouts marked with stylized item art extras", () => {
    const buf = readFileSync(resolve(root, "shared/assets/models/sunrise_pier_blockout.glb"));
    const gltf = parseGlbJson(buf);
    const extras = gltf.extras as {
      itemArt?: string; envArt?: string; characterArt?: string; machineVfx?: string;
    } | undefined;
    expect(extras?.itemArt).toBe("stylized-phase-13");
    expect(extras?.envArt ?? "").toMatch(/^modular-phase-14/);
    expect(extras?.characterArt).toBe("clips-phase-15");
    expect(extras?.machineVfx).toBe("phase-16");
    const meshes = gltf.meshes as { name: string; primitives: { attributes: { POSITION: number } }[] }[];
    const fish = meshes.find((m) => m.name === "fish");
    const portion = meshes.find((m) => m.name === "portion");
    const player = meshes.find((m) => m.name === "player");
    const worker = meshes.find((m) => m.name === "worker_porter");
    expect(fish).toBeTruthy();
    expect(portion).toBeTruthy();
    expect(player).toBeTruthy();
    expect(worker).toBeTruthy();
    // Stylized fish/portion use non-cube accessor triplets (not POSITION:0).
    expect(fish!.primitives[0].attributes.POSITION).toBeGreaterThan(0);
    expect(portion!.primitives[0].attributes.POSITION).toBeGreaterThan(0);
    expect(player!.primitives[0].attributes.POSITION).toBeGreaterThan(0);
  });

  it("ships stylized character module GLBs", () => {
    const names = [
      "player", "player_rod", "customer_0", "customer_1", "customer_2",
      "worker_fisher", "worker_porter", "worker_operator", "worker_generic",
    ];
    for (const name of names) {
      const path = resolve(root, `shared/assets/models/characters/${name}.glb`);
      expect(existsSync(path), path).toBe(true);
      const gltf = parseGlbJson(readFileSync(path));
      const extras = gltf.extras as { stylized?: boolean; phase?: number } | undefined;
      expect(extras?.stylized, name).toBe(true);
      expect(extras?.phase, name).toBe(15);
    }
  });
});
