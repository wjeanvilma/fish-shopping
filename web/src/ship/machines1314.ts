/**
 * Finish 5.0 Phase 15 — machines 13–14 catalog
 * (mirrors shared/ship/machines-13-14.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/machines-13-14.json";
import { loadContent } from "../engine";

export interface Machines1314Entry {
  id: string;
  name: string;
  unlockUpgrade: string;
  recipeCount: number;
  sampleRecipe: string;
  products: string[];
  moduleGlb: string;
}

export interface Machines1314Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  machineCount: number;
  newMachineCount: number;
  machines1314Marker: string;
  newMachines: Machines1314Entry[];
  kickoffCatalog: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const MACHINES_1314 = catalogJson as unknown as Machines1314Catalog;
export const MACHINES_1314_PHASE = MACHINES_1314.phase;
export const MACHINES_1314_SCHEMA = MACHINES_1314.schema;
export const MACHINES_1314_MARKER = MACHINES_1314.machines1314Marker;
export const MACHINE_COUNT_1314 = MACHINES_1314.machineCount;

export interface Machines1314Measure {
  machineCount: number;
  newMachinesPresent: boolean;
  recipesWired: boolean;
  productsPresent: boolean;
  upgradesWired: boolean;
  plotsWired: boolean;
  stationsWired: boolean;
  assetsPresent: boolean;
  kickoffMachinesMet: boolean;
  missingGates: string[];
  missingAssets: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureMachines1314(repoRoot: string): Machines1314Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);

  let recipesWired = true;
  let productsPresent = true;
  let upgradesWired = true;
  let plotsWired = true;
  let stationsWired = true;
  const missingAssets: string[] = [];

  for (const entry of MACHINES_1314.newMachines) {
    const m = content.machinesById.get(entry.id);
    if (!m) {
      recipesWired = false;
      continue;
    }
    if (m.recipes.length !== entry.recipeCount || !m.recipes.includes(entry.sampleRecipe)) {
      recipesWired = false;
    }
    if (!content.recipesById.has(entry.sampleRecipe)) recipesWired = false;

    const up = content.upgradesById.get(entry.unlockUpgrade);
    if (
      !up ||
      up.effect.kind !== "unlock_machine" ||
      (up.effect as { machine?: string }).machine !== entry.id
    ) {
      upgradesWired = false;
    }

    for (const productId of entry.products) {
      const product = content.productsById.get(productId);
      if (!product) {
        productsPresent = false;
        continue;
      }
      if (product.asset && !existsSync(resolve(repoRoot, "shared/assets", product.asset))) {
        missingAssets.push(product.asset);
      }
    }

    if (entry.moduleGlb && !existsSync(resolve(repoRoot, entry.moduleGlb))) {
      missingAssets.push(entry.moduleGlb);
    }

    for (const harbor of content.harbors) {
      const station = harbor.stations.find((s) => s.machine === entry.id);
      if (!station || station.requiresUpgrade !== entry.unlockUpgrade) {
        stationsWired = false;
      }
      const plot = harbor.plots?.find((pl) => pl.grantsUpgrade === entry.unlockUpgrade);
      if (!plot) plotsWired = false;
    }
  }

  let kickoffMachinesMet = false;
  const kickoffPath = resolve(repoRoot, MACHINES_1314.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    kickoffMachinesMet =
      (kickoff?.baseline?.machines ?? 0) >= 14 &&
      (kickoff?.gaps?.machinesRemaining ?? 1) === 0 &&
      (kickoff?.gapTargets?.machinesMin ?? 0) >= 14;
  }

  const missingGates: string[] = [];
  for (const gate of MACHINES_1314.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    machineCount: content.machines.length,
    newMachinesPresent: MACHINES_1314.newMachines.every((e) => content.machinesById.has(e.id)),
    recipesWired,
    productsPresent,
    upgradesWired,
    plotsWired,
    stationsWired,
    assetsPresent: missingAssets.length === 0,
    kickoffMachinesMet,
    missingGates,
    missingAssets,
  };
}
