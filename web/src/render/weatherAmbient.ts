/**
 * Finish 2.0 Phase 22 — weather ambient profiles for harbor presentation.
 * Finish 3.0 Phase 24 adds tide + rival ambient mixes (still not burst-pool).
 * Presentation-only; does not consume the VfxBurst pool or change 20 Hz sim.
 */
import type { PresenterQuality } from "./presenters";

export type WeatherAmbientId =
  | "clear"
  | "overcast"
  | "rain"
  | "fog"
  | "gale"
  | "default";

export type TideAmbientId = "dawn" | "day" | "dusk" | "night";

export interface WeatherAmbientProfile {
  id: WeatherAmbientId;
  /** Scene background hex. */
  skyHex: string;
  waterDeepHex: string;
  waterShallowHex: string;
  waterSparkleHex: string;
  /** Multiplier on water bob amplitude (1 = default). */
  bobScale: number;
  /** Optional warm festival sky mix 0..1 when a seasonal event is active. */
  festivalWarmth: number;
}

const PROFILES: Record<WeatherAmbientId, WeatherAmbientProfile> = {
  clear: {
    id: "clear",
    skyHex: "#9fd3ea",
    waterDeepHex: "#1a5f7a",
    waterShallowHex: "#3a9fc4",
    waterSparkleHex: "#cfefff",
    bobScale: 1.0,
    festivalWarmth: 0.18,
  },
  overcast: {
    id: "overcast",
    skyHex: "#8aa0b0",
    waterDeepHex: "#2a4a5a",
    waterShallowHex: "#4a7080",
    waterSparkleHex: "#b8c8d0",
    bobScale: 0.7,
    festivalWarmth: 0.12,
  },
  rain: {
    id: "rain",
    skyHex: "#5a7088",
    waterDeepHex: "#143848",
    waterShallowHex: "#2a6080",
    waterSparkleHex: "#90b0c8",
    bobScale: 1.45,
    festivalWarmth: 0.1,
  },
  fog: {
    id: "fog",
    skyHex: "#c8d0d4",
    waterDeepHex: "#4a6068",
    waterShallowHex: "#7a9098",
    waterSparkleHex: "#e0e8ec",
    bobScale: 0.4,
    festivalWarmth: 0.08,
  },
  gale: {
    id: "gale",
    skyHex: "#4a5a70",
    waterDeepHex: "#102838",
    waterShallowHex: "#285870",
    waterSparkleHex: "#88a8c0",
    bobScale: 1.85,
    festivalWarmth: 0.06,
  },
  default: {
    id: "default",
    skyHex: "#9fd3ea",
    waterDeepHex: "#1a5f7a",
    waterShallowHex: "#3a9fc4",
    waterSparkleHex: "#cfefff",
    bobScale: 1.0,
    festivalWarmth: 0.15,
  },
};

/** Tide sky/water tint targets + bob scale multipliers (Finish 3.0 Phase 24). */
const TIDE_MIX: Record<TideAmbientId, { sky: string; water: string; amount: number; bob: number }> = {
  dawn: { sky: "#f2c4a0", water: "#3a7a90", amount: 0.22, bob: 0.95 },
  day: { sky: "#9fd3ea", water: "#1a5f7a", amount: 0.0, bob: 1.0 },
  dusk: { sky: "#e08958", water: "#2a4860", amount: 0.28, bob: 0.9 },
  night: { sky: "#1a2848", water: "#0c2030", amount: 0.42, bob: 0.75 },
};

export const WEATHER_AMBIENT_PATTERN_IDS = [
  "weather.clear",
  "weather.overcast",
  "weather.rain",
  "weather.fog",
  "weather.gale",
] as const;

export const TIDE_AMBIENT_PHASE_IDS: readonly TideAmbientId[] = ["dawn", "day", "dusk", "night"];

export function weatherAmbientIdForWeatherId(weatherId: string): WeatherAmbientId {
  if (weatherId.includes("gale")) return "gale";
  if (weatherId.includes("rain")) return "rain";
  if (weatherId.includes("fog")) return "fog";
  if (weatherId.includes("overcast")) return "overcast";
  if (weatherId.includes("clear")) return "clear";
  return "default";
}

export function tideAmbientIdForPhaseId(tidePhaseId: string): TideAmbientId {
  if (tidePhaseId === "dawn") return "dawn";
  if (tidePhaseId === "dusk") return "dusk";
  if (tidePhaseId === "night") return "night";
  return "day";
}

export function weatherAmbientProfile(
  weatherId: string,
  festivalActive = false,
  quality: PresenterQuality = "medium",
  reducedMotion = false,
  tidePhaseId = "day",
  rivalActive = false,
): WeatherAmbientProfile {
  const base = { ...PROFILES[weatherAmbientIdForWeatherId(weatherId)] };
  const qScale = quality === "low" ? 0.55 : quality === "medium" ? 0.85 : 1.0;
  const tide = TIDE_MIX[tideAmbientIdForPhaseId(tidePhaseId)];
  base.bobScale *= (reducedMotion ? 0 : qScale) * tide.bob;
  if (tide.amount > 0) {
    base.skyHex = mixHex(base.skyHex, tide.sky, tide.amount * qScale);
    base.waterDeepHex = mixHex(base.waterDeepHex, tide.water, tide.amount * 0.65 * qScale);
    base.waterShallowHex = mixHex(base.waterShallowHex, tide.water, tide.amount * 0.45 * qScale);
  }
  if (festivalActive) {
    // Warm the sky slightly toward a festival gold without overriding weather identity.
    base.skyHex = mixHex(base.skyHex, "#f0c878", base.festivalWarmth * qScale);
  }
  if (rivalActive) {
    // Cool magenta tension tint when rival pressure is active.
    base.skyHex = mixHex(base.skyHex, "#8a4068", 0.18 * qScale);
    base.waterDeepHex = mixHex(base.waterDeepHex, "#3a2040", 0.12 * qScale);
  }
  return base;
}

/** Android / Filament water tint as linear RGB 0..1. */
export function weatherWaterTintRgb(
  weatherId: string,
  festivalActive = false,
  quality: PresenterQuality = "medium",
  tidePhaseId = "day",
  rivalActive = false,
): { r: number; g: number; b: number; bobScale: number } {
  const p = weatherAmbientProfile(
    weatherId,
    festivalActive,
    quality,
    false,
    tidePhaseId,
    rivalActive,
  );
  const c = hexToRgb(p.waterDeepHex);
  return { r: c.r, g: c.g, b: c.b, bobScale: p.bobScale };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const m = (x: number, y: number) => Math.round((x + (y - x) * t) * 255);
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(m(A.r, B.r))}${to(m(A.g, B.g))}${to(m(A.b, B.b))}`;
}
