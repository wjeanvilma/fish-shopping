/**
 * Finish 2.0 Phase 13 — weather + tide catalog
 * (mirrors shared/ship/weather-tide.json).
 */
import weatherJson from "../../../shared/ship/weather-tide.json";

export interface WeatherTideShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  weatherPatternCount: number;
  tidePhaseCount: number;
  patterns: string[];
  tidePhases: string[];
  parityFixture: string;
  definitionOfDoneWeatherPatterns: number;
  checklist: string[];
  preflightGates: string[];
}

export const WEATHER_TIDE = weatherJson as unknown as WeatherTideShipCatalog;
export const WEATHER_TIDE_PHASE = WEATHER_TIDE.phase;
export const WEATHER_TIDE_SCHEMA = WEATHER_TIDE.schema;
export const WEATHER_PATTERN_FLOOR = WEATHER_TIDE.weatherPatternCount;
export const TIDE_PHASE_FLOOR = WEATHER_TIDE.tidePhaseCount;
