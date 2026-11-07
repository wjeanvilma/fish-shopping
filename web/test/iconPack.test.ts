import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PNG } from "../src/store/pngSize";
import { ICON_PACK_PHASE, ICON_PACK_SCHEMA, iconPack } from "../src/store/iconPack";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("icon pack (post-1.0 Phase 10)", () => {
  it("catalog locks Play feature graphic and web/Android icon paths", () => {
    expect(ICON_PACK_PHASE).toBe(10);
    expect(ICON_PACK_SCHEMA).toBe("fish.store.icon_pack.v1");
    expect(iconPack.featureGraphic).toMatchObject({ width: 1024, height: 500 });
    expect(iconPack.playHiResIcon).toMatchObject({ width: 512, height: 512 });
    expect((storeListing as { iconPackPhase?: number }).iconPackPhase).toBe(10);
    expect(existsSync(resolve(root, iconPack.tool))).toBe(true);
  });

  it("ships exact-size rasters and synced favicon", () => {
    const checks: [string, number, number][] = [
      [iconPack.featureGraphic.png, 1024, 500],
      [iconPack.playHiResIcon.path, 512, 512],
      [iconPack.web.appleTouchIcon.path, 180, 180],
      [iconPack.web.icon192.path, 192, 192],
      [iconPack.web.icon512.path, 512, 512],
      [iconPack.web.icon512Maskable.path, 512, 512],
    ];
    for (const [rel, w, h] of checks) {
      const abs = resolve(root, rel);
      expect(existsSync(abs), rel).toBe(true);
      expect(PNG.size(abs)).toEqual({ width: w, height: h });
    }
    expect(readFileSync(resolve(root, iconPack.sourceMark), "utf8")).toBe(
      readFileSync(resolve(root, iconPack.web.faviconSvg), "utf8"),
    );
    for (const [folder, size] of Object.entries(iconPack.android.legacyMipmaps)) {
      const rel = `app/src/main/res/${folder}/ic_launcher.png`;
      expect(PNG.size(resolve(root, rel))).toEqual({ width: size, height: size });
    }
    const manifest = JSON.parse(readFileSync(resolve(root, iconPack.web.manifest), "utf8"));
    const srcs = manifest.icons.map((i: { src: string }) => i.src);
    expect(srcs).toContain("/icon-192.png");
    expect(srcs).toContain("/icon-512-maskable.png");
  });

  it("icons:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-icon-pack.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK icons:validate");
  });
});
