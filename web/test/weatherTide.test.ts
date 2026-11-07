import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GameState,
  Simulation,
  WeatherSystem,
  buildView,
  loadContent,
} from "../src/engine";
import {
  TIDE_PHASE_FLOOR,
  WEATHER_PATTERN_FLOOR,
  WEATHER_TIDE,
  WEATHER_TIDE_PHASE,
  WEATHER_TIDE_SCHEMA,
} from "../src/ship/weatherTide";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

function checkedStep(sim: Simulation) {
  const events = sim.step();
  const problems = sim.invariantProblems();
  if (problems.length) throw new Error(problems.join("; "));
  return events;
}

describe("Weather + tide (Finish 2.0 Phase 13)", () => {
  it("locks catalog floors", () => {
    expect(WEATHER_TIDE_PHASE).toBe(13);
    expect(WEATHER_TIDE_SCHEMA).toBe("fish.ship.weather_tide.v1");
    expect(WEATHER_PATTERN_FLOOR).toBe(5);
    expect(TIDE_PHASE_FLOOR).toBe(4);
    expect(content.weather.patterns).toHaveLength(5);
    expect(content.weather.tide.phases).toHaveLength(4);
    expect((storeListing as { weatherTidePhase?: number }).weatherTidePhase).toBe(13);
    for (const id of WEATHER_TIDE.patterns) {
      expect(content.weatherPatternsById.has(id)).toBe(true);
    }
  });

  it("rotates weather and exposes SimView fields", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-weather-tide.json"), "utf8"),
    );
    const sim = new Simulation(
      content,
      GameState.newGame(content, fx.harborId, fx.seed),
    );
    sim.state.tick = 0;
    expect(WeatherSystem.weatherAt(content, 0).id).toBe(fx.expectAtTick0.weatherId);
    expect(WeatherSystem.tidePhaseAt(content, 0).id).toBe(fx.expectAtTick0.tidePhaseId);
    expect(WeatherSystem.ticksUntilWeatherChange(content, 0)).toBe(
      fx.expectAtTick0.weatherTicksRemaining,
    );
    const view0 = buildView(sim);
    expect(view0.weatherId).toBe(fx.expectAtTick0.weatherId);
    expect(view0.tidePhaseId).toBe(fx.expectAtTick0.tidePhaseId);
    expect(view0.weatherName.length).toBeGreaterThan(0);
    expect(view0.tidePhaseName.length).toBeGreaterThan(0);

    sim.state.tick = fx.advanceToTick - 1;
    const events = checkedStep(sim);
    expect(sim.state.tick).toBe(fx.advanceToTick);
    expect(WeatherSystem.weatherAt(content, sim.state.tick).id).toBe(fx.expectAfterAdvance.weatherId);
    expect(
      events.some(
        (e) => e.type === "weather_changed" && e.weatherId === fx.expectAfterAdvance.eventWeatherId,
      ),
    ).toBe(true);
    expect(WeatherSystem.catchSpeedMultPermille(content, sim.state)).toBeGreaterThan(0);
  });

  it("weather:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-weather-tide.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK weather:validate");
  }, 60_000);
});
