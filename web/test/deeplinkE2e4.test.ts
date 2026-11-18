import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEEPLINK_E2E_4_PHASE,
  DEEPLINK_MIN_ID_COUNT,
  DEEPLINK_MIN_TAG_COUNT,
  DEEPLINK_PANEL_ALIAS_FLOOR,
  measureDeeplinkE2e4,
} from "../src/ship/deeplinkE2e4";
import { FINISH4_OPEN_GAP_FLAGS } from "../src/ship/finish4Kickoff";
import { parseDeepLink } from "../src/deeplink/deepLinks";
import { WEB_E2E_ID_LIST } from "../src/e2e/webE2eIds";

const root = resolve(__dirname, "../..");

describe("deeplink e2e 4 (Finish 4.0 Phase 26)", () => {
  it("locks floors and closes deeplinkE2eThin", () => {
    expect(DEEPLINK_E2E_4_PHASE).toBe(26);
    expect(DEEPLINK_PANEL_ALIAS_FLOOR).toBe(28);
    expect(DEEPLINK_MIN_ID_COUNT).toBe(24);
    expect(DEEPLINK_MIN_TAG_COUNT).toBe(24);
    expect(WEB_E2E_ID_LIST.length).toBeGreaterThanOrEqual(24);
    const m = measureDeeplinkE2e4(root);
    expect(m.aliasesEnough).toBe(true);
    expect(m.idsEnough).toBe(true);
    expect(m.tagsEnough).toBe(true);
    expect(m.webScenariosEnough).toBe(true);
    expect(m.composeScenariosEnough).toBe(true);
    expect(m.uriVectorsEnough).toBe(true);
    expect(m.hudToolbarWired).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("deeplinkE2eThin");
    expect(FINISH4_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(3);
    const listing = JSON.parse(
      readFileSync(resolve(root, "shared/store/listing.json"), "utf8"),
    ) as { deeplinkE2e4Phase?: number };
    expect(listing.deeplinkE2e4Phase).toBe(26);
    expect(parseDeepLink({ href: "/?panel=bag" }).panel).toBe("bag");
    expect(parseDeepLink({ href: "/?go=bank" }).panel).toBe("dashboard");
  });

  it("deeplinke2e4:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-deeplink-e2e-4.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK deeplinke2e4:validate");
  });
});
