import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  LANDING_URL,
  PRIVACY_POLICY_URL,
  SUPPORT_URL,
  isHttpsAbsoluteUrl,
  storeListing,
} from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("legal pages publish (post-1.0 Phase 7)", () => {
  it("catalog matches listing HTTPS URLs for GitHub Pages", () => {
    const catalog = JSON.parse(
      readFileSync(resolve(root, "shared/store/legal-pages.json"), "utf8"),
    );
    expect(catalog.phase).toBe(7);
    expect(catalog.schema).toBe("fish.store.legal_pages.v1");
    expect(catalog.host).toBe("github_pages");
    expect(catalog.github.owner).toBe("wjeanvilma");
    expect(catalog.github.repo).toBe("fish-shopping");
    expect(catalog.canonicalHost).toBe(storeListing.canonicalHost);
    expect(catalog.urls.privacy).toBe(PRIVACY_POLICY_URL);
    expect(catalog.urls.support).toBe(SUPPORT_URL);
    expect(catalog.urls.landing).toBe(LANDING_URL);
    expect(isHttpsAbsoluteUrl(catalog.urls.privacy)).toBe(true);
    expect(existsSync(resolve(root, catalog.github.workflow))).toBe(true);
  });

  it("pages:legal stages index + relative assets", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/build-legal-pages.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK legal pages staged");
    const dist = resolve(root, "web/dist-legal");
    for (const name of [
      "index.html",
      "landing.html",
      "privacy.html",
      "support.html",
      "favicon.svg",
      ".nojekyll",
    ]) {
      expect(existsSync(resolve(dist, name)), name).toBe(true);
    }
    const index = readFileSync(resolve(dist, "index.html"), "utf8");
    expect(index).toContain("privacy.html");
    expect(index).not.toContain('href="/');
  });
});
