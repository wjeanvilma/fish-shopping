import { describe, expect, it } from "vitest";
import { HAPTIC_CUES, sfxFromEvent } from "../src/audio/sfxCues";

describe("sfxFromEvent", () => {
  it("maps catch, machine, sale, upgrade, rush", () => {
    expect(sfxFromEvent({ type: "fish_caught" })).toBe("catch");
    expect(sfxFromEvent({ type: "batch_completed" })).toBe("machine_done");
    expect(sfxFromEvent({ type: "sale_committed" })).toBe("sale");
    expect(sfxFromEvent({ type: "upgrade_purchased", replayed: false })).toBe("upgrade");
    expect(sfxFromEvent({ type: "upgrade_purchased", replayed: true })).toBeNull();
    expect(sfxFromEvent({ type: "rush_started" })).toBe("rush");
  });

  it("plays abandon only when the customer left unpaid", () => {
    expect(sfxFromEvent({ type: "customer_left", paid: false })).toBe("abandon");
    expect(sfxFromEvent({ type: "customer_left", paid: true })).toBeNull();
  });

  it("ignores unrelated events", () => {
    expect(sfxFromEvent({ type: "items_transferred" })).toBeNull();
    expect(sfxFromEvent({ type: "checkpoint_requested" })).toBeNull();
  });

  it("marks catch and sale for haptics", () => {
    expect(HAPTIC_CUES.has("catch")).toBe(true);
    expect(HAPTIC_CUES.has("sale")).toBe(true);
    expect(HAPTIC_CUES.has("rush")).toBe(false);
  });
});
