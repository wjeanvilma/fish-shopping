import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "../src/engine/content";
import { contentCatalogDetail, contentCatalogSummary } from "../src/engine/contentCatalog";

const pack = loadContent(
  JSON.parse(readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8")),
);

describe("contentCatalog", () => {
  it("summarizes entity counts from the shared pack", () => {
    const summary = contentCatalogSummary(pack);
    expect(summary).toContain(`species=${pack.raw.species.length}`);
    expect(summary).toContain(`bait=${pack.raw.bait.length}`);
    expect(summary).toContain(`trophySets=${pack.raw.trophies.sets.length}`);
    expect(summary).toContain(`recipes=${pack.raw.recipes.length}`);
    expect(summary).toContain(`quests=${pack.raw.quests.length}`);
  });

  it("lists species, bait, recipes, and quests for editors", () => {
    const detail = contentCatalogDetail(pack);
    expect(detail).toContain(pack.raw.species[0]!.id);
    expect(detail).toContain(pack.raw.bait[0]!.id);
    expect(detail).toContain(pack.raw.trophies.sets[0]!.id);
    expect(detail).toContain(pack.raw.recipes[0]!.id);
    expect(detail).toContain(pack.raw.quests[0]!.id);
  });
});
