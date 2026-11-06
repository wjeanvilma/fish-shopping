/**
 * Phase 28 content tooling — schema (Ajv) + cross-ref validate shared content pack.
 *
 * Usage:
 *   npm run content:validate
 *   npm run content:catalog
 *   npx vite-node scripts/validate-content.ts [--catalog] [path/to/pack.json]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "../src/engine/content";
import { contentCatalogDetail, contentCatalogSummary } from "../src/engine/contentCatalog";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoSharedDefault = resolve(here, "../../shared/content/content-pack.json");

function main(): number {
  const argv = process.argv.slice(2);
  const catalog = argv.includes("--catalog") || argv.includes("-c");
  const pathArg = argv.find((a) => a !== "--catalog" && a !== "-c");
  const packPath = resolve(pathArg ?? repoSharedDefault);

  let json: unknown;
  try {
    json = JSON.parse(readFileSync(packPath, "utf8"));
  } catch (e) {
    console.error(`Failed to read/parse ${packPath}: ${(e as Error).message}`);
    return 1;
  }

  try {
    const pack = loadContent(json);
    console.log(`OK ${pack.contentVersion}  (${packPath})`);
    console.log(contentCatalogSummary(pack));
    if (catalog) console.log(contentCatalogDetail(pack));
    return 0;
  } catch (e) {
    console.error((e as Error).message);
    return 1;
  }
}

process.exit(main());
