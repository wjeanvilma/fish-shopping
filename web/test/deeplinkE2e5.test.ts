import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEEPLINK_E2E_5_MARKER,
  DEEPLINK_E2E_5_MIN_ID_COUNT,
  DEEPLINK_E2E_5_MIN_TAG_COUNT,
  DEEPLINK_E2E_5_PANEL_ALIAS_FLOOR,
  DEEPLINK_E2E_5_PHASE,
  measureDeeplinkE2e5,
} from "../src/ship/deeplinkE2e5";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import { parseDeepLink } from "../src/deeplink/deepLinks";
import { WEB_E2E_ID_LIST } from "../src/e2e/webE2eIds";
import { SCHEMA_VERSION } from "../src/engine";

const root = resolve(__dirname, "../..");

describe("deeplink e2e 5 (Finish 5.0 Phase 26)", () => {
  it("locks floors and closes deeplinkE2e5Thin", () => {
    expect(DEEPLINK_E2E_5_PHASE).toBe(26);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
    expect(DEEPLINK_E2E_5_MARKER).toBe("authored-finish-5.0-phase-26");
    expect(DEEPLINK_E2E_5_PANEL_ALIAS_FLOOR).toBe(40);
    expect(DEEPLINK_E2E_5_MIN_ID_COUNT).toBe(32);
    expect(DEEPLINK_E2E_5_MIN_TAG_COUNT).toBe(32);
    expect(WEB_E2E_ID_LIST.length).toBeGreaterThanOrEqual(32);
    const m = measureDeeplinkE2e5(root);
    expect(m.aliasesEnough).toBe(true);
    expect(m.idsEnough).toBe(true);
    expect(m.tagsEnough).toBe(true);
    expect(m.webScenariosEnough).toBe(true);
    expect(m.composeScenariosEnough).toBe(true);
    expect(m.uriVectorsEnough).toBe(true);
    expect(m.finish5AliasesWired).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("deeplinkE2e5Thin");
    expect(FINISH5_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(3);
    const listing = JSON.parse(
      readFileSync(resolve(root, "shared/store/listing.json"), "utf8"),
    ) as { deeplinkE2e5Phase?: number };
    expect(listing.deeplinkE2e5Phase).toBe(26);
    expect(parseDeepLink({ href: "/?panel=weekly" }).panel).toBe("quests");
    expect(parseDeepLink({ href: "/?go=pierledger" }).panel).toBe("dashboard");
    expect(parseDeepLink({ href: "/#endgame" }).panel).toBe("quests");
  });

  it("deeplinke2e5:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-deeplink-e2e-5.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK deeplinke2e5:validate");
  });
});
