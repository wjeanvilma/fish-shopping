import { describe, expect, it } from "vitest";
import { openSaveStore } from "../src/game/saveStore";

describe("SaveStore recovery policy", () => {
  it("rotates latest into previous, and can rewrite latest without rotating", async () => {
    // Force memory path by clearing indexedDB if present is hard in node; openSaveStore
    // falls back to MemoryStore when indexedDB is undefined (vitest node env).
    const store = await openSaveStore();
    expect(store.persistent).toBe(false);

    await store.write("snap-a", true);
    await store.write("snap-b", true);
    let candidates = await store.readCandidates();
    expect(candidates).toEqual([
      ["latest", "snap-b"],
      ["previous", "snap-a"],
    ]);

    // Corrupt-latest recovery: keep previous, rewrite latest without rotating over it.
    await store.write("snap-recovered", false);
    candidates = await store.readCandidates();
    expect(candidates).toEqual([
      ["latest", "snap-recovered"],
      ["previous", "snap-a"],
    ]);

    await store.clear();
    expect(await store.readCandidates()).toEqual([]);
  });

  it("readCandidates skips empty slots", async () => {
    const store = await openSaveStore();
    await store.clear();
    await store.write("only-latest", false);
    expect(await store.readCandidates()).toEqual([["latest", "only-latest"]]);
  });
});
