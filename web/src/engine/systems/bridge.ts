/**
 * Finish 4.0 Phase 2–3 — cross-system bridge for extracted modules.
 *
 * Extracted fishing/production/movement/customers/contracts/progression modules
 * read deps from here at call time so ESM circular imports with systems.ts stay safe.
 */
import type {
  ContentPack,
  CounterDef,
  HarborDef,
  SeasonalEventDef,
} from "../content";
import type { TimingTier } from "../state";
import type { CounterState, GameState, MachineState, WorkerState } from "../state";
import type { StepContext } from "./context";

type TimingWindows = {
  perfectStart: number;
  perfectEnd: number;
  goodStart: number;
  goodEnd: number;
};

export type SystemsBridge = {
  weatherCatchSpeedMultPermille: (content: ContentPack, state: GameState) => number;
  weatherRegenMultPermille: (content: ContentPack, state: GameState) => number;
  weatherRareChanceBonusPermille: (content: ContentPack, tick: number) => number;
  weatherCustomerSpawnMultPermille: (content: ContentPack, state: GameState) => number;
  masteryCatchSpeedMultPermille: (
    content: ContentPack,
    state: GameState,
    speciesId: string | null,
  ) => number;
  masteryTimingWindows: (content: ContentPack, state: GameState) => TimingWindows;
  masteryTimingBonusPermille: (
    content: ContentPack,
    state: GameState,
    tier: TimingTier,
  ) => number;
  masteryRareChanceBonusPermille: (
    content: ContentPack,
    state: GameState,
    speciesId: string,
  ) => number;
  masteryGrantCatchXp: (
    ctx: StepContext,
    speciesId: string,
    timingTier: TimingTier,
    rare: boolean,
  ) => void;
  seasonalScaledWeight: (
    base: number,
    content: ContentPack,
    tick: number,
    speciesId: string,
    harborId?: string | null,
  ) => number;
  seasonalActive: (content: ContentPack, tick: number) => SeasonalEventDef | null;
  seasonalPriceMultPermille: (content: ContentPack, tick: number) => number;
  seasonalCustomerSpawnMultPermille: (content: ContentPack, tick: number) => number;
  smokerSpecialistOnDuty: (content: ContentPack, state: GameState, harbor: HarborDef) => boolean;
  workerGreeterOnDuty: (content: ContentPack, state: GameState) => boolean;
  workerGrantXp: (ctx: StepContext, worker: WorkerState, amount: number) => void;
  economyIsSlowed: (m: MachineState, tick: number) => boolean;
  customerIsUnlocked: (def: { requiresUpgrade?: string | null }, state: GameState) => boolean;
  productionIsUnlocked: (def: { requiresUpgrade?: string | null }, state: GameState) => boolean;
  decorPatienceBonusTicks: (content: ContentPack, state: GameState) => number;
  prestigeHarborRating: (content: ContentPack, state: GameState) => number;
  rivalNoteSaleOutcome: (
    ctx: StepContext,
    items: { item: string; quantity: number }[],
  ) => void;
  rivalSalePriceMultPermille: (
    content: ContentPack,
    state: GameState,
    harborId: string,
    def: CounterDef,
    counter: CounterState,
  ) => number;
  rivalCustomerSpawnMultPermille: (
    content: ContentPack,
    state: GameState,
    harborId: string,
  ) => number;
  plotStandingOnUpgradePlot: (
    harbor: HarborDef,
    state: GameState,
    upgradeId: string,
  ) => boolean;
};

const unset = (name: string) => (): never => {
  throw new Error(`systems bridge missing ${name} — bindSystemsBridge not called`);
};

export const systemsBridge: SystemsBridge = {
  weatherCatchSpeedMultPermille: unset("weatherCatchSpeedMultPermille") as any,
  weatherRegenMultPermille: unset("weatherRegenMultPermille") as any,
  weatherRareChanceBonusPermille: unset("weatherRareChanceBonusPermille") as any,
  weatherCustomerSpawnMultPermille: unset("weatherCustomerSpawnMultPermille") as any,
  masteryCatchSpeedMultPermille: unset("masteryCatchSpeedMultPermille") as any,
  masteryTimingWindows: unset("masteryTimingWindows") as any,
  masteryTimingBonusPermille: unset("masteryTimingBonusPermille") as any,
  masteryRareChanceBonusPermille: unset("masteryRareChanceBonusPermille") as any,
  masteryGrantCatchXp: unset("masteryGrantCatchXp") as any,
  seasonalScaledWeight: unset("seasonalScaledWeight") as any,
  seasonalActive: unset("seasonalActive") as any,
  seasonalPriceMultPermille: unset("seasonalPriceMultPermille") as any,
  seasonalCustomerSpawnMultPermille: unset("seasonalCustomerSpawnMultPermille") as any,
  smokerSpecialistOnDuty: unset("smokerSpecialistOnDuty") as any,
  workerGreeterOnDuty: unset("workerGreeterOnDuty") as any,
  workerGrantXp: unset("workerGrantXp") as any,
  economyIsSlowed: unset("economyIsSlowed") as any,
  customerIsUnlocked: unset("customerIsUnlocked") as any,
  productionIsUnlocked: unset("productionIsUnlocked") as any,
  decorPatienceBonusTicks: unset("decorPatienceBonusTicks") as any,
  prestigeHarborRating: unset("prestigeHarborRating") as any,
  rivalNoteSaleOutcome: unset("rivalNoteSaleOutcome") as any,
  rivalSalePriceMultPermille: unset("rivalSalePriceMultPermille") as any,
  rivalCustomerSpawnMultPermille: unset("rivalCustomerSpawnMultPermille") as any,
  plotStandingOnUpgradePlot: unset("plotStandingOnUpgradePlot") as any,
};

export function bindSystemsBridge(partial: Partial<SystemsBridge>): void {
  Object.assign(systemsBridge, partial);
}
