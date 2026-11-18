/**
 * Finish 4.0 Phase 6 — shared host surface for GameHost intent modules
 * (shell / economy / travel / IAP), mirroring Android VmIntentHost.
 */
import type { Command, Simulation } from "../../engine";
import type { EntitlementBilling, RestoredEntitlement } from "../../billing/entitlementBilling";
import type { PendingEntitlementLedger } from "../../billing/pendingEntitlementLedger";
import type { ShellPanelId } from "../../shell/shellPanels";

export interface HostPanelCommand {
  enqueuePanelCommand(command: Command): void;
  enqueueCommand(command: Command): void;
  say(text: string): void;
  panelBlocksWorld(): boolean;
  hasPendingOffline(): boolean;
  isPanelOpen(id: ShellPanelId): boolean;
}

export interface HostShellIntentHost extends HostPanelCommand {
  setPanelOpen(which: ShellPanelId, open: boolean): void;
  syncWallClockNow(): void;
}

export interface HostTravelIntentHost extends HostShellIntentHost {
  travelToHarbor(harborId: string): void;
  isReadyWithSim(): boolean;
  continueGameFromTitle(): void;
}

export interface HostIapIntentHost {
  cloudAccountId(): string | null;
  readonly billing: EntitlementBilling;
  readonly pendingEntitlements: PendingEntitlementLedger;
  say(text: string): void;
  applyStoreOwned(owned: RestoredEntitlement[], announceRestore: boolean): void;
}

export interface HostStationIntentHost extends HostPanelCommand {
  withSim(block: (sim: Simulation) => void): void;
  buildLatestView(): void;
  publish(force: boolean): void;
}
