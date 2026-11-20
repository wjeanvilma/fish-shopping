/**
 * Finish 6.0 Phase 10 — product/cosmetic art 6 smoke.
 *
 * Usage:
 *   npm run productart6:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { measureProductArt6 } from "../src/ship/productArt6";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

const m = measureProductArt6(root);
const ok =
  m.productCount >= 52 &&
  m.bannerCount >= 24 &&
  m.productsStamped >= 52 &&
  m.bannersStamped >= 24 &&
  m.finish5Retained &&
  m.minNodesMet &&
  m.gapClosed &&
  m.kickoffWired &&
  m.missingGates.length === 0 &&
  !FINISH6_OPEN_GAP_FLAGS.includes("productArt6Incomplete") &&
  FINISH6_OPEN_GAP_FLAGS.length <= 7;

if (!ok) {
  console.error("productart6:smoke FAILED");
  console.error(JSON.stringify(m, null, 2));
  process.exit(1);
}

console.log(
  `OK productart6:smoke — products=${m.productsStamped}; banners=${m.bannersStamped}; openFlags=${FINISH6_OPEN_GAP_FLAGS.length}`,
);
