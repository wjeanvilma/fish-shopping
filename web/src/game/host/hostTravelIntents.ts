/**
 * Finish 4.0 Phase 6 — harbor travel + deep-link consumption for GameHost.
 */
import type { DeepLinkIntent } from "../../deeplink/deepLinks";
import type { HostTravelIntentHost } from "./hostIntentHost";
import type { HostShellIntents } from "./hostShellIntents";

export class HostTravelIntents {
  constructor(
    private readonly host: HostTravelIntentHost,
    private readonly shell: HostShellIntents,
  ) {}

  travelToHarbor(harborId: string): void {
    this.host.enqueuePanelCommand({
      type: "travel_to_harbor",
      harborId,
      requestId: crypto.randomUUID(),
    });
  }

  applyDeepLink(
    intent: DeepLinkIntent,
    canAutoContinueFromTitle: boolean,
    queueUntilReady: (intent: DeepLinkIntent) => void,
  ): void {
    if (!intent.panel && !intent.harborId) return;
    if (this.host.isReadyWithSim()) {
      this.consumeDeepLink(intent);
      return;
    }
    queueUntilReady(intent);
    if (canAutoContinueFromTitle) this.host.continueGameFromTitle();
  }

  consumeDeepLink(intent: DeepLinkIntent): void {
    this.shell.openFromDeepLink(intent.panel ?? null);
    if (intent.harborId) this.travelToHarbor(intent.harborId);
  }
}
