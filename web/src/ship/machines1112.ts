/**
 * Finish 4.0 Phase 13 — machines 11–12 catalog
 * (mirrors shared/ship/machines-11-12.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/machines-11-12.json";
import { loadContent } from "../engine";

export interface Machines1112Entry {
  id: string;
  name: string;
  unlockUpgrade: string;
  recipeCount: number;
  sampleRecipe: string;
  products: string[];
  moduleGlb: string;
}

export interface Machines1112Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  machineCount: number;
  newMachineCount: number;
  machines1112Marker: string;
  newMachines: Machines1112Entry[];
  kickoffCatalog: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const MACHINES_1112 = catalogJson as unknown as Machines1112Catalog;
export const MACHINES_1112_PHASE = MACHINES_1112.phase;
export const MACHINES_1112_SCHEMA = MACHINES_1112.schema;
export const MACHINES_1112_MARKER = MACHINES_1112.machines1112Marker;
export const MACHINE_COUNT_1112 = MACHINES_1112.machineCount;

export interface Machines1112Measure {
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

export function measureMachines1112(repoRoot: string): Machines1112Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);

  let recipesWired = true;
  let productsPresent = true;
  let upgradesWired = true;
  let plotsWired = true;
  let stationsWired = true;
  const missingAssets: string[] = [];

  for (const entry of MACHINES_1112.newMachines) {
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
  const kickoffPath = resolve(repoRoot, MACHINES_1112.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    kickoffMachinesMet =
      (kickoff?.baseline?.machines ?? 0) >= 12 &&
      (kickoff?.gaps?.machinesRemaining ?? 1) === 0 &&
      (kickoff?.gapTargets?.machinesMin ?? 0) >= 12;
  }

  const missingGates: string[] = [];
  for (const gate of MACHINES_1112.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    machineCount: content.machines.length,
    newMachinesPresent: MACHINES_1112.newMachines.every((e) => content.machinesById.has(e.id)),
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
