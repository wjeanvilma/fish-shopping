/**
 * Cozy art pass 5 — continuous day/night + weather atmosphere (presentation only).
 *
 * Turns the sim's day progress (0..999 permille of ecology.dayLengthTicks) and weather id
 * into light, sky, fog, lamp-glow and rain values. Pure and deterministic; mirrored by
 * app/.../render/Atmosphere.kt so both renderers light the harbor the same way.
 * Never feeds back into the 20 Hz simulation.
 */

export interface AtmosphereFrame {
  /** Sky / clear colour (sRGB hex). */
  skyHex: string;
  /** Directional key light ("sun" by day, moonlight at night). */
  sunHex: string;
  sunIntensity: number;
  /** Unit vector the light travels along (pointing from the sky toward the ground). */
  sunDir: [number, number, number];
  hemiSkyHex: string;
  hemiGroundHex: string;
  hemiIntensity: number;
  fogHex: string;
  fogNear: number;
  fogFar: number;
  /** 0..1 lamp glow / emissive strength. */
  lampGlow: number;
  /** 0..1 rain particle density. */
  rain: number;
  /** 0..1 wind (rain slant, wave height, flag flutter). */
  wind: number;
  /** True between dusk and dawn (lamps fully on). */
  night: boolean;
}

interface Key {
  p: number;
  sky: string;
  sun: string;
  sunI: number;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  fog: string;
  lamp: number;
}

/** Keyframes over one in-game day (p = day progress 0..1). Dawn 0–.25, day –.625, dusk –.8, night –1. */
const KEYS: Key[] = [
  { p: 0.0, sky: "#f1b48e", sun: "#ffb27a", sunI: 1.3, hemiSky: "#f6d2b8", hemiGround: "#6e5a4a", hemiI: 0.85, fog: "#efc3a4", lamp: 0.55 },
  { p: 0.12, sky: "#cfe4ee", sun: "#ffe2b8", sunI: 2.3, hemiSky: "#e6f0f6", hemiGround: "#8a7a5a", hemiI: 1.15, fog: "#d6e6ee", lamp: 0.0 },
  { p: 0.4, sky: "#9fd3ea", sun: "#fff6e4", sunI: 2.9, hemiSky: "#dcefff", hemiGround: "#8a7a5a", hemiI: 1.3, fog: "#b9dff0", lamp: 0.0 },
  { p: 0.6, sky: "#f3cf98", sun: "#ffcf8c", sunI: 2.2, hemiSky: "#f7e2c2", hemiGround: "#7a6448", hemiI: 1.05, fog: "#f2d4a6", lamp: 0.15 },
  { p: 0.71, sky: "#e48a5c", sun: "#ff8a52", sunI: 1.25, hemiSky: "#e9a27c", hemiGround: "#4e3e3a", hemiI: 0.8, fog: "#d98a66", lamp: 0.75 },
  { p: 0.8, sky: "#3b4070", sun: "#a9bcff", sunI: 0.55, hemiSky: "#5f6c9c", hemiGround: "#2a2a3a", hemiI: 0.6, fog: "#3a4068", lamp: 1.0 },
  { p: 0.93, sky: "#1b2848", sun: "#9db0ff", sunI: 0.45, hemiSky: "#41507c", hemiGround: "#1c1e2a", hemiI: 0.5, fog: "#1f2a48", lamp: 1.0 },
  { p: 1.0, sky: "#f1b48e", sun: "#ffb27a", sunI: 1.3, hemiSky: "#f6d2b8", hemiGround: "#6e5a4a", hemiI: 0.85, fog: "#efc3a4", lamp: 0.55 },
];

interface WeatherMod {
  sun: number;
  hemi: number;
  grey: number;
  greyHex: string;
  fogNear: number;
  fogFar: number;
  rain: number;
  wind: number;
}

const WEATHER: Record<string, WeatherMod> = {
  clear: { sun: 1.0, hemi: 1.0, grey: 0.0, greyHex: "#9fb4c2", fogNear: 34, fogFar: 85, rain: 0, wind: 0.2 },
  overcast: { sun: 0.55, hemi: 1.05, grey: 0.45, greyHex: "#9aa8b2", fogNear: 28, fogFar: 72, rain: 0, wind: 0.35 },
  rain: { sun: 0.4, hemi: 0.9, grey: 0.55, greyHex: "#62788c", fogNear: 20, fogFar: 58, rain: 1, wind: 0.5 },
  fog: { sun: 0.5, hemi: 1.0, grey: 0.6, greyHex: "#c8d0d4", fogNear: 6, fogFar: 32, rain: 0, wind: 0.1 },
  gale: { sun: 0.45, hemi: 0.85, grey: 0.6, greyHex: "#4e5e72", fogNear: 18, fogFar: 55, rain: 0.65, wind: 1 },
};

export function weatherKey(weatherId: string): keyof typeof WEATHER {
  if (weatherId.includes("gale")) return "gale";
  if (weatherId.includes("rain")) return "rain";
  if (weatherId.includes("fog")) return "fog";
  if (weatherId.includes("overcast")) return "overcast";
  return "clear";
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Interpolated day keyframe at progress p in [0, 1). */
function dayKey(p: number): Key {
  const q = ((p % 1) + 1) % 1;
  let i = 0;
  while (i < KEYS.length - 2 && q >= KEYS[i + 1]!.p) i++;
  const a = KEYS[i]!;
  const b = KEYS[i + 1]!;
  const t = smooth((q - a.p) / Math.max(1e-6, b.p - a.p));
  const n = (x: number, y: number) => x + (y - x) * t;
  return {
    p: q,
    sky: mixHex(a.sky, b.sky, t),
    sun: mixHex(a.sun, b.sun, t),
    sunI: n(a.sunI, b.sunI),
    hemiSky: mixHex(a.hemiSky, b.hemiSky, t),
    hemiGround: mixHex(a.hemiGround, b.hemiGround, t),
    hemiI: n(a.hemiI, b.hemiI),
    fog: mixHex(a.fog, b.fog, t),
    lamp: n(a.lamp, b.lamp),
  };
}

/**
 * Light direction: the sun sweeps east→west across the day part of the cycle and the moon
 * takes over at night. Elevation is clamped high enough that shadows stay readable.
 */
export function sunDirection(p: number): [number, number, number] {
  const q = ((p % 1) + 1) % 1;
  const dayT = Math.min(1, q / 0.78); // 0 at sunrise, 1 at sunset
  const isNight = q >= 0.78;
  const nightT = isNight ? (q - 0.78) / 0.22 : 0;
  const t = isNight ? nightT : dayT;
  const azimuth = -1.1 + 2.2 * t; // radians around y
  const elevation = isNight ? 0.95 : 0.55 + 0.6 * Math.sin(Math.PI * dayT); // 31°..66°
  const cx = Math.cos(elevation) * Math.sin(azimuth);
  const cz = Math.cos(elevation) * Math.cos(azimuth) * 0.6 + 0.35;
  const cy = -Math.sin(elevation);
  const len = Math.hypot(cx, cy, cz) || 1;
  return [cx / len, cy / len, cz / len];
}

export function atmosphereFrame(
  dayProgressPermille: number,
  weatherId: string,
  reducedMotion = false,
): AtmosphereFrame {
  const p = Math.max(0, Math.min(999, dayProgressPermille)) / 1000;
  const k = dayKey(p);
  const w = WEATHER[weatherKey(weatherId)]!;
  const sky = mixHex(k.sky, w.greyHex, w.grey);
  const fog = mixHex(k.fog, w.greyHex, Math.min(1, w.grey + (weatherKey(weatherId) === "fog" ? 0.25 : 0)));
  const night = p >= 0.76 || p < 0.04;
  // Dim conditions bring lamps on earlier.
  const lamp = Math.min(1, k.lamp + (w.sun < 0.6 ? 0.25 : 0));
  return {
    skyHex: sky,
    sunHex: mixHex(k.sun, "#dfe6ee", w.grey * 0.6),
    sunIntensity: k.sunI * w.sun,
    sunDir: sunDirection(p),
    hemiSkyHex: mixHex(k.hemiSky, w.greyHex, w.grey * 0.5),
    hemiGroundHex: k.hemiGround,
    hemiIntensity: k.hemiI * w.hemi,
    fogHex: fog,
    fogNear: w.fogNear,
    fogFar: w.fogFar,
    lampGlow: lamp,
    rain: reducedMotion ? 0 : w.rain,
    wind: w.wind,
    night,
  };
}
