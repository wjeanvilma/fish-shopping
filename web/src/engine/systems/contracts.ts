/**
 * Extracted Finish 4.0 Phase 3 — delivery contracts / standing orders / chains.
 */
import type { ContentPack, ContractTemplateDef } from "../content";
import { idiv, SafeMath } from "../foundations";
import { ContractState, GameState, Receipt, Stats, type ContractOffer } from "../state";
import { systemsBridge } from "./bridge";
import { StepContext } from "./context";
import { ReputationSystem } from "./progression";

/**
 * Timed delivery contracts with standing orders, festival gates, and Finish 2.0
 * Phase 17 Contracts 2.0: delivery chains, reputation-tier board gates/payouts,
 * and global failure-streak board pressure.
 */
export const ContractSystem = {
  streakStatKey(templateId: string): string {
    return `stat.contract_standing_streak.${templateId}`;
  },
  cooldownStatKey(templateId: string): string {
    return `stat.contract_standing_cd.${templateId}`;
  },
  standingStreak(state: GameState, templateId: string): number {
    return Math.max(0, state.stat(ContractSystem.streakStatKey(templateId)));
  },
  standingCooldownUntil(state: GameState, templateId: string): number {
    return state.stat(ContractSystem.cooldownStatKey(templateId));
  },
  failStreak(state: GameState): number {
    return Math.max(0, state.stat(Stats.CONTRACT_FAIL_STREAK));
  },
  scaleAmount(base: number, escalatePermille: number, streak: number, maxStreak: number): number {
    const steps = Math.min(Math.max(0, streak), Math.max(0, maxStreak));
    let value = base;
    for (let i = 0; i < steps; i++) value = idiv(value * escalatePermille, 1000);
    return value;
  },
  isStanding(t: { kind?: string } | undefined | null): boolean {
    return t?.kind === "standing";
  },
  isChain(t: { chainId?: string | null } | undefined | null): boolean {
    return t?.chainId != null;
  },
  isChainHead(t: { chainId?: string | null; chainStep?: number } | undefined | null): boolean {
    if (!t?.chainId) return true;
    return (t.chainStep ?? 1) <= 1;
  },
  chainLength(content: ContentPack, chainId: string): number {
    return content.contracts.templates.filter((t) => t.chainId === chainId).length;
  },
  nextChainTemplate(content: ContentPack, current: ContractTemplateDef): ContractTemplateDef | null {
    const chainId = current.chainId;
    if (!chainId) return null;
    const step = (current.chainStep ?? 1) + 1;
    const matches = content.contracts.templates
      .filter((t) => t.chainId === chainId && (t.chainStep ?? 1) === step)
      .sort((a, b) => a.id.localeCompare(b.id));
    return matches[0] ?? null;
  },
  reputationPayoutMultPermille(content: ContentPack, state: GameState): number {
    const table = content.contracts.reputationPayoutMultPermille ?? [];
    if (table.length === 0) return 1000;
    const band = Math.min(table.length - 1, Math.max(0, ReputationSystem.band(content, state)));
    return table[band]!;
  },
  offerWeight(content: ContentPack, state: GameState, t: ContractTemplateDef): number {
    let weight = t.weight;
    const def = content.contracts;
    const threshold = def.failStreakThreshold ?? 3;
    if (ContractSystem.failStreak(state) >= threshold) {
      weight = idiv(weight * (def.failStreakOfferWeightMultPermille ?? 700), 1000);
    }
    return Math.max(1, weight);
  },
  effectiveBoardSlots(content: ContentPack, state: GameState): number {
    const def = content.contracts;
    let slots = def.boardSlots;
    const threshold = def.failStreakThreshold ?? 3;
    if (ContractSystem.failStreak(state) >= threshold) {
      slots -= def.failStreakBoardSlotPenalty ?? 1;
    }
    return Math.max(1, slots);
  },

  /** Finish 5.0 Phase 3 — ticks until nearest active contract deadline. */
  ticksUntilNearestDeadline(state: GameState): number | null {
    if (state.activeContracts.length === 0) return null;
    let best: number | null = null;
    for (const c of state.activeContracts) {
      const left = Math.max(0, c.deadlineTick - state.tick);
      if (best === null || left < best) best = left;
    }
    return best;
  },

  /**
   * Finish 5.0 Phase 3 — board pressure from fail streak (0..1000+).
   * 1000 = at failStreakThreshold (offer weight / slot penalties apply).
   */
  contractBoardPressurePermille(content: ContentPack, state: GameState): number {
    if (!ContractSystem.boardUnlocked(content, state)) return 0;
    const threshold = Math.max(1, content.contracts.failStreakThreshold ?? 3);
    return idiv(ContractSystem.failStreak(state) * 1000, threshold);
  },

  step(ctx: StepContext): void {
    expireDeadlines(ctx);
    maybeRefreshBoard(ctx);
  },

  boardUnlocked(content: ContentPack, s: GameState): boolean {
    return content.contracts.requires.every((it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it));
  },

  missingBoardRequirement(content: ContentPack, s: GameState): string | null {
    const missing = content.contracts.requires.find((it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
  },

  accept(ctx: StepContext, offerId: string, requestId: string): void {
    const s = ctx.state;
    const existing = s.purchaseReceipts.get(requestId);
    if (existing) {
      ctx.emit({ type: "contract_accepted", tick: s.tick, contractId: existing.reference, offerId, receipt: existing, replayed: true });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "contract_rejected", tick: s.tick, referenceId: offerId, requestId, reason });
    };
    if (!ContractSystem.boardUnlocked(ctx.content, s)) {
      reject(`Requires: ${ContractSystem.missingBoardRequirement(ctx.content, s)}`);
      return;
    }
    const offer = s.contractOffers.find((it) => it.id === offerId);
    if (!offer) {
      reject("Offer no longer available");
      return;
    }
    if (s.activeContracts.length >= ctx.content.contracts.maxActive) {
      reject(`Max ${ctx.content.contracts.maxActive} active contracts`);
      return;
    }
    if (s.activeContracts.some((c) => c.templateId === offer.templateId)) {
      reject("Already running that standing order");
      return;
    }
    const template = ctx.content.contractTemplatesById.get(offer.templateId);
    const chainId = template?.chainId;
    if (chainId) {
      const runningChain = s.activeContracts.some((job) =>
        ctx.content.contractTemplatesById.get(job.templateId)?.chainId === chainId);
      if (runningChain) {
        reject("Already running that delivery chain");
        return;
      }
    }
    for (let i = s.contractOffers.length - 1; i >= 0; i--) {
      if (s.contractOffers[i]!.id === offerId) s.contractOffers.splice(i, 1);
    }
    const contract = new ContractState(
      s.newId("job"),
      offer.templateId,
      offer.itemId,
      offer.quantity,
      0,
      s.tick + offer.durationTicks,
      offer.payout,
      offer.penalty,
    );
    s.activeContracts.push(contract);
    const receipt: Receipt = { id: s.newId("contract"), type: "contract_accept", coinDelta: 0, tick: s.tick, reference: contract.id };
    s.record(receipt);
    s.purchaseReceipts.set(requestId, receipt);
    ctx.emit({ type: "contract_accepted", tick: s.tick, contractId: contract.id, offerId, receipt, replayed: false });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "contract" });
  },

  deliver(ctx: StepContext, contractId: string, requestId: string): void {
    const s = ctx.state;
    const existing = s.purchaseReceipts.get(requestId);
    if (existing) {
      ctx.emit({
        type: "contract_delivered", tick: s.tick, contractId, count: 0,
        completed: existing.type === "contract_payout", receipt: existing, replayed: true,
      });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "contract_rejected", tick: s.tick, referenceId: contractId, requestId, reason });
    };
    const idx = s.activeContracts.findIndex((it) => it.id === contractId);
    if (idx < 0) {
      reject("Unknown contract");
      return;
    }
    const c = s.activeContracts[idx]!;
    const need = c.quantity - c.delivered;
    if (need <= 0) {
      reject("Already complete");
      return;
    }
    const have = s.player.bag.available(c.itemId);
    if (have <= 0) {
      reject(`Need ${ctx.content.itemName(c.itemId)} in your bag`);
      return;
    }
    const take = Math.min(need, have);
    s.player.bag.remove(c.itemId, take);
    c.delivered += take;
    s.bumpStat(Stats.CONTRACT_ITEMS_DELIVERED, take);
    if (c.delivered >= c.quantity) {
      const payout = c.payout;
      s.coins = SafeMath.creditCoins(s.coins, payout);
      s.bumpStat(Stats.CONTRACTS_COMPLETED);
      s.bumpStat(Stats.CONTRACT_REVENUE, payout);
      s.stats.set(Stats.CONTRACT_FAIL_STREAK, 0);
      const receipt: Receipt = { id: s.newId("contract"), type: "contract_payout", coinDelta: payout, tick: s.tick, reference: c.id };
      s.record(receipt);
      s.purchaseReceipts.set(requestId, receipt);
      ctx.emit({ type: "contract_delivered", tick: s.tick, contractId: c.id, count: take, completed: true, receipt, replayed: false });
      ctx.emit({ type: "contract_completed", tick: s.tick, contractId: c.id, templateId: c.templateId, payout });
      const template = ctx.content.contractTemplatesById.get(c.templateId);
      if (ContractSystem.isStanding(template)) {
        refreshStandingJob(s, c, template!);
      } else if (template && ContractSystem.isChain(template)) {
        advanceOrFinishChain(ctx, idx, c, template);
      } else {
        s.activeContracts.splice(idx, 1);
      }
      ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "contract" });
    } else {
      const receipt: Receipt = { id: s.newId("contract"), type: "contract_deliver", coinDelta: 0, tick: s.tick, reference: `${contractId}:${take}` };
      s.record(receipt);
      s.purchaseReceipts.set(requestId, receipt);
      ctx.emit({ type: "contract_delivered", tick: s.tick, contractId: c.id, count: take, completed: false, receipt, replayed: false });
    }
  },

  templateEligibleForBoard(content: ContentPack, s: GameState, t: ContractTemplateDef): boolean {
    return templateEligibleForBoard(content, s, t);
  },
};

function advanceOrFinishChain(
  ctx: StepContext,
  idx: number,
  c: ContractState,
  template: ContractTemplateDef,
): void {
  const s = ctx.state;
  const next = ContractSystem.nextChainTemplate(ctx.content, template);
  if (!next) {
    s.bumpStat(Stats.CONTRACT_CHAINS_COMPLETED);
    s.activeContracts.splice(idx, 1);
    return;
  }
  const payoutMult = ContractSystem.reputationPayoutMultPermille(ctx.content, s);
  const payout = idiv(next.payout * payoutMult, 1000);
  s.activeContracts[idx] = new ContractState(
    c.id,
    next.id,
    next.item,
    next.quantity,
    0,
    s.tick + next.durationTicks,
    payout,
    next.penalty,
  );
}

function refreshStandingJob(s: GameState, c: ContractState, template: ContractTemplateDef): void {
  const nextStreak = ContractSystem.standingStreak(s, template.id) + 1;
  s.stats.set(ContractSystem.streakStatKey(template.id), nextStreak);
  c.delivered = 0;
  c.deadlineTick = s.tick + template.durationTicks;
  c.payout = ContractSystem.scaleAmount(
    template.payout, template.payoutEscalatePermille ?? 1000, nextStreak, template.maxStreak ?? 1,
  );
  c.penalty = ContractSystem.scaleAmount(
    template.penalty, template.penaltyEscalatePermille ?? 1000, nextStreak, template.maxStreak ?? 1,
  );
}

function expireDeadlines(ctx: StepContext): void {
  const s = ctx.state;
  const expired = s.activeContracts.filter((c) => s.tick >= c.deadlineTick);
  if (expired.length === 0) return;
  const drop = new Set(expired);
  for (let i = s.activeContracts.length - 1; i >= 0; i--) {
    if (drop.has(s.activeContracts[i]!)) s.activeContracts.splice(i, 1);
  }
  for (const c of expired) {
    const paid = Math.min(c.penalty, s.coins);
    if (paid > 0) {
      s.coins -= paid;
      const receipt: Receipt = { id: s.newId("contract"), type: "contract_penalty", coinDelta: -paid, tick: s.tick, reference: c.id };
      s.record(receipt);
    }
    s.bumpStat(Stats.CONTRACTS_FAILED);
    s.stats.set(Stats.CONTRACT_FAIL_STREAK, ContractSystem.failStreak(s) + 1);
    const template = ctx.content.contractTemplatesById.get(c.templateId);
    if (ContractSystem.isStanding(template)) {
      s.stats.set(ContractSystem.streakStatKey(c.templateId), 0);
      s.stats.set(ContractSystem.cooldownStatKey(c.templateId), s.tick + (template!.failCooldownTicks ?? 1));
    }
    ctx.emit({ type: "contract_failed", tick: s.tick, contractId: c.id, templateId: c.templateId, penaltyPaid: paid });
  }
  ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "contract" });
}

function maybeRefreshBoard(ctx: StepContext): void {
  const s = ctx.state;
  if (!ContractSystem.boardUnlocked(ctx.content, s)) {
    s.contractOffers.length = 0;
    s.contractBoardRefreshAt = 0;
    return;
  }
  if (s.contractBoardRefreshAt === 0) {
    refreshOffers(ctx);
    return;
  }
  if (s.tick < s.contractBoardRefreshAt) return;
  refreshOffers(ctx);
}

function refreshOffers(ctx: StepContext): void {
  const s = ctx.state;
  const def = ctx.content.contracts;
  s.contractOffers.length = 0;
  const activeTemplates = new Set(s.activeContracts.map((c) => c.templateId));
  const activeChains = new Set(
    s.activeContracts
      .map((c) => ctx.content.contractTemplatesById.get(c.templateId)?.chainId)
      .filter((id): id is string => !!id),
  );
  const pool = def.templates.filter((t) =>
    !activeTemplates.has(t.id) &&
    (!t.chainId || !activeChains.has(t.chainId)) &&
    templateEligibleForBoard(ctx.content, s, t));
  const slots = Math.min(ContractSystem.effectiveBoardSlots(ctx.content, s), pool.length);
  for (let n = 0; n < slots; n++) {
    if (pool.length === 0) continue;
    const idx = s.rng.pickWeighted(pool.map((t) => ContractSystem.offerWeight(ctx.content, s, t)));
    const t = pool.splice(idx, 1)[0]!;
    s.contractOffers.push(offerFrom(ctx.content, s, t));
  }
  s.contractBoardRefreshAt = s.tick + def.refreshPeriodTicks;
  ctx.emit({ type: "contract_board_refreshed", tick: s.tick, offerIds: s.contractOffers.map((o) => o.id) });
}

function templateEligibleForBoard(content: ContentPack, s: GameState, t: ContractTemplateDef): boolean {
  if (!ContractSystem.isChainHead(t)) return false;
  if (t.requiresSeasonalEvent) {
    const active = systemsBridge.seasonalActive(content, s.tick);
    if (active?.id !== t.requiresSeasonalEvent) return false;
  }
  if (t.requiresReputationBand != null) {
    if (ReputationSystem.band(content, s) < t.requiresReputationBand) return false;
  }
  if (!ContractSystem.isStanding(t)) return true;
  return s.tick >= ContractSystem.standingCooldownUntil(s, t.id);
}

function offerFrom(content: ContentPack, s: GameState, t: ContractTemplateDef): ContractOffer {
  const streak = ContractSystem.isStanding(t) ? ContractSystem.standingStreak(s, t.id) : 0;
  let payout = ContractSystem.scaleAmount(t.payout, t.payoutEscalatePermille ?? 1000, streak, t.maxStreak ?? 1);
  const repMult = ContractSystem.reputationPayoutMultPermille(content, s);
  payout = idiv(payout * repMult, 1000);
  return {
    id: s.newId("offer"),
    templateId: t.id,
    itemId: t.item,
    quantity: t.quantity,
    durationTicks: t.durationTicks,
    payout,
    penalty: ContractSystem.scaleAmount(t.penalty, t.penaltyEscalatePermille ?? 1000, streak, t.maxStreak ?? 1),
  };
}

