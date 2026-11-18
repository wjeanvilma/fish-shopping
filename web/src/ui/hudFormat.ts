import type { PrestigeView } from "../engine";

export function formatAwayDuration(elapsedMillis: number): string {
  const totalSec = Math.max(0, Math.floor(elapsedMillis / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `Away ${h}h ${m}m`;
  if (m > 0) return `Away ${m}m ${s}s`;
  return `Away ${s}s`;
}

export function prestigeRewardBits(p: PrestigeView): string[] {
  return [
    ...(p.rewardCoins > 0 ? [`${formatCoins(p.rewardCoins)} coins`] : []),
    ...(p.catchSpeedPermille > 1000 ? [`+${Math.trunc((p.catchSpeedPermille - 1000) / 10)}% catch`] : []),
    ...(p.priceBonusPermille > 1000 ? [`+${Math.trunc((p.priceBonusPermille - 1000) / 10)}% prices`] : []),
    ...(p.cosmetic ? [`Unlock ${p.cosmetic}`] : []),
  ];
}

export function formatRushSeconds(ticksRemaining: number): number {
  return Math.ceil(ticksRemaining / 20);
}

/** Compact notation for display only; stored values keep full precision. */
export function formatCoins(c: number): string {
  if (c >= 1e9) return `${(c / 1e9).toFixed(1)}B`;
  if (c >= 1e6) return `${(c / 1e6).toFixed(1)}M`;
  if (c >= 1e4) return `${(c / 1e3).toFixed(1)}K`;
  return String(c);
}
