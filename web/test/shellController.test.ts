import { describe, expect, it } from "vitest";
import {
  EMPTY_SHELL_PANEL_FLAGS,
  ShellHudPolicy,
  ShellModalPolicy,
  ShellPanelController,
  SHELL_PANEL_IDS,
} from "../src/shell/shellPanels";
import { enrichWithJournal } from "../src/shell/offlineShell";
import type { OfflineReport } from "../src/engine";

describe("Shell controller (Finish 3.0 Phase 4)", () => {
  it("opens one panel and closes others", () => {
    const c = new ShellPanelController();
    c.open("staff");
    expect(c.isOpen("staff")).toBe(true);
    expect(c.isOpen("upgrades")).toBe(false);
    c.open("quests");
    expect(c.isOpen("quests")).toBe(true);
    expect(c.isOpen("staff")).toBe(false);
  });

  it("close only clears that panel", () => {
    const c = new ShellPanelController();
    c.open("bag");
    c.close("bag");
    expect(c.anyHudPanelOpen()).toBe(false);
    expect(c.snapshot()).toEqual(EMPTY_SHELL_PANEL_FLAGS);
  });

  it("modal policy truth table", () => {
    const open = new ShellPanelController().open("settings");
    expect(ShellModalPolicy.blocksWorldInput(open, false)).toBe(true);
    expect(ShellModalPolicy.shouldCommitPanelCommand(open, false)).toBe(true);
    expect(ShellModalPolicy.shouldCommitPanelCommand(open, true)).toBe(false);
    expect(ShellModalPolicy.blocksWorldInput(EMPTY_SHELL_PANEL_FLAGS, true)).toBe(true);
    expect(ShellModalPolicy.shouldCommitPanelCommand(EMPTY_SHELL_PANEL_FLAGS, false)).toBe(false);
    expect(ShellModalPolicy.allowsSimTick(EMPTY_SHELL_PANEL_FLAGS, false)).toBe(true);
    expect(ShellModalPolicy.allowsSimTick(open, false)).toBe(false);
  });

  it("locks twelve panel wires + hud interval", () => {
    expect(SHELL_PANEL_IDS).toHaveLength(12);
    expect(ShellHudPolicy.PUBLISH_INTERVAL_MS).toBe(100);
  });

  it("enrichWithJournal sets hadActivity from journal lines", () => {
    const base: OfflineReport = {
      elapsedMillis: 60_000,
      ticksCredited: 1200,
      capped: false,
      coinsDelta: 0,
      fishCaught: 0,
      sales: 0,
      itemsSold: 0,
      workerFishCaught: 0,
      workerItemsMoved: 0,
      hadActivity: false,
    };
    const enriched = enrichWithJournal(base, ["Daily streak kept"]);
    expect(enriched.journalLines).toEqual(["Daily streak kept"]);
    expect(enriched.hadActivity).toBe(true);
  });
});
