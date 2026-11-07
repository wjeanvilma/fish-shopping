/** Phase 8 species book — mirrors game-core inventory/SpeciesBook.kt. */
import type { ContentPack } from "./content";
import { compareStrings } from "./foundations";
import type { GameState } from "./state";

export interface SpeciesBookEntryView {
  speciesId: string;
  name: string;
  discovered: boolean;
  catches: number;
  harborNames: string[];
  recipeNames: string[];
  trophyBestSizePermille: number | null;
  trophyBestValueCoins: number | null;
  rarityWeight: number;
  baseSpeciesId: string | null;
}

export interface SpeciesBookView {
  entries: SpeciesBookEntryView[];
  discovered: number;
  total: number;
  empty: boolean;
}

export const SpeciesBook = {
  build(content: ContentPack, state: GameState): SpeciesBookView {
    const harborsBySpecies = new Map<string, Set<string>>();
    const baseOfRare = new Map<string, string>();
    for (const sp of content.raw.species) {
      if (sp.rareUpgrade) baseOfRare.set(sp.rareUpgrade.to, sp.id);
    }
    const addHarbor = (speciesId: string, harborName: string) => {
      let set = harborsBySpecies.get(speciesId);
      if (!set) {
        set = new Set();
        harborsBySpecies.set(speciesId, set);
      }
      set.add(harborName);
    };
    for (const harbor of content.raw.harbors) {
      const spotSpecies = new Set(harbor.fishingSpots.flatMap((s) => s.species));
      for (const speciesId of spotSpecies) {
        addHarbor(speciesId, harbor.name);
        const rare = content.speciesById.get(speciesId)?.rareUpgrade;
        if (rare) addHarbor(rare.to, harbor.name);
      }
    }

    const recipesBySpecies = new Map<string, Set<string>>();
    for (const recipe of content.raw.recipes) {
      const machineName = content.machinesById.get(recipe.machine)?.name ?? recipe.machine;
      const outputs = recipe.outputs.map((o) => content.itemName(o.item)).join(", ");
      const label = outputs.length === 0 ? machineName : `${machineName} → ${outputs}`;
      for (const input of recipe.inputs) {
        if (content.speciesById.has(input.item)) {
          let set = recipesBySpecies.get(input.item);
          if (!set) {
            set = new Set();
            recipesBySpecies.set(input.item, set);
          }
          set.add(label);
        }
      }
    }

    const entries: SpeciesBookEntryView[] = content.raw.species.map((sp) => {
      const catches = state.speciesCatches.get(sp.id) ?? 0;
      const trophy = state.trophies.get(sp.id);
      const discovered = catches > 0 || trophy !== undefined;
      const harbors = [...(harborsBySpecies.get(sp.id) ?? [])].sort(compareStrings);
      const recipes = [...(recipesBySpecies.get(sp.id) ?? [])].sort(compareStrings);
      return {
        speciesId: sp.id,
        name: discovered ? sp.name : "???",
        discovered,
        catches,
        harborNames: discovered ? harbors : [],
        recipeNames: discovered ? recipes : [],
        trophyBestSizePermille: discovered && trophy ? trophy.sizePermille : null,
        trophyBestValueCoins: discovered && trophy ? trophy.valueCoins : null,
        rarityWeight: sp.rarityWeight,
        baseSpeciesId: baseOfRare.get(sp.id) ?? null,
      };
    });

    const discoveredCount = entries.filter((e) => e.discovered).length;
    return {
      entries,
      discovered: discoveredCount,
      total: entries.length,
      empty: discoveredCount === 0,
    };
  },
};
