/**
 * Finish 5.0 Phase 5 — fishing loop intents (reel / bait / technique)
 * extracted from HostEconomyIntents for cast-phase + spoil depth wiring.
 */
import type { Command } from "../../engine";
import type { HostPanelCommand } from "./hostIntentHost";

export class HostFishingIntents {
  constructor(private readonly host: HostPanelCommand) {}

  private push(command: Command): void {
    this.host.enqueuePanelCommand(command);
  }

  buyBait(baitId: string): void {
    this.push({ type: "buy_bait", baitId, requestId: crypto.randomUUID() });
  }

  selectBait(baitId: string | null): void {
    this.push({ type: "select_bait", baitId });
  }

  selectTechnique(techniqueId: string | null): void {
    this.push({ type: "select_technique", techniqueId });
  }

  reel(): void {
    if (this.host.panelBlocksWorld()) return;
    this.host.enqueueCommand({ type: "reel" });
  }
}
