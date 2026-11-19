/**
 * Phase 25/26 — consent-gated analytics bus for the web client.
 * Drops events when consent is off; never attaches PII or save blobs.
 * Post-1.0 Phase 26: session lifecycle + dashboard ledger.
 * Finish 3.0 Phase 26: optional remote batch sink (env base URL).
 */
import {
  Analytics,
  type AnalyticsEvent,
  MemoryAnalyticsSink,
  sanitizeAnalytics,
} from "../engine/analytics";
import type { GameEvent, GameState } from "../engine/state";
import type { OfflineReport } from "../engine/foundations";
import type { QualityPreset } from "../game/settingsStore";
import {
  sharedAnalyticsDashboardLedger,
  type AnalyticsDashboardLedger,
} from "./analyticsDashboardLedger";
import {
  FanoutAnalyticsSink,
  RemoteAnalyticsSink,
  resolveAnalyticsApiBase,
} from "./remoteAnalyticsSink";

export type AnalyticsTrackSink = { track(event: AnalyticsEvent | null): void };

const FRAME_SUMMARY_EVERY = 600;

function buildDefaultSink(): { sink: AnalyticsTrackSink; remote: RemoteAnalyticsSink | null } {
  const memory = new MemoryAnalyticsSink();
  const base = resolveAnalyticsApiBase();
  if (!base) return { sink: memory, remote: null };
  const remote = new RemoteAnalyticsSink({ baseUrl: base, platform: "web" });
  return { sink: new FanoutAnalyticsSink([memory, remote]), remote };
}

export class AnalyticsBus {
  private consent = false;
  private sink: AnalyticsTrackSink;
  private remote: RemoteAnalyticsSink | null;
  private firstSaleSent = false;
  private unlockedHarbors = new Set<string>();
  private frameSamples = 0;
  private lastEmaMs = 0;
  private lastQuality: QualityPreset = "medium";
  private ledger: AnalyticsDashboardLedger;

  constructor(
    sink?: AnalyticsTrackSink,
    ledger: AnalyticsDashboardLedger = sharedAnalyticsDashboardLedger,
    remote: RemoteAnalyticsSink | null = null,
  ) {
    if (sink) {
      this.sink = sink;
      this.remote = remote;
    } else {
      const built = buildDefaultSink();
      this.sink = built.sink;
      this.remote = built.remote;
    }
    this.ledger = ledger;
    this.ledger.bindEmitter((event) => this.track(event));
  }

  setConsent(consent: boolean): void {
    this.consent = consent;
    this.ledger.setConsent(consent);
    this.remote?.setConsent(consent);
  }

  getConsent(): boolean {
    return this.consent;
  }

  /** Test / override sink. */
  setSink(sink: AnalyticsTrackSink): void {
    this.sink = sink;
  }

  getSink(): AnalyticsTrackSink {
    return this.sink;
  }

  track(event: AnalyticsEvent | null): void {
    if (!this.consent || !event) return;
    // Re-sanitize at the edge in case callers pass crafted props.
    const clean = sanitizeAnalytics(event.name, event.props);
    if (!clean) return;
    this.sink.track(clean);
    this.ledger.onTracked(clean);
  }

  onGameEvents(events: readonly GameEvent[], state: GameState): void {
    if (!this.consent) return;
    for (const e of events) {
      switch (e.type) {
        case "tutorial_advanced":
          this.track(Analytics.tutorialStepCompleted(e.stepIndex));
          break;
        case "sale_committed":
          if (!this.firstSaleSent && state.stat("stat.sales") === 1) {
            this.firstSaleSent = true;
            this.track(Analytics.firstSale(e.coins));
          }
          break;
        case "harbor_traveled":
          if (!e.replayed && !this.unlockedHarbors.has(e.toHarborId)) {
            this.unlockedHarbors.add(e.toHarborId);
            this.track(Analytics.harborUnlocked(e.toHarborId));
          }
          break;
        case "full_harbor_unlock_granted":
          if (!e.replayed) this.track(Analytics.harborUnlockedFull());
          break;
        default:
          break;
      }
    }
  }

  onOfflineClaimed(report: OfflineReport): void {
    this.track(Analytics.offlineClaimed({
      elapsedMillis: report.elapsedMillis,
      ticksCredited: report.ticksCredited,
      coinsDelta: report.coinsDelta,
      capped: report.capped,
    }));
  }

  onSaveRecovery(source: string): void {
    this.track(Analytics.saveRecovery(source));
  }

  /** Finish 6.0 Phase 26: nest endgame sigil progress. */
  onNestSigilEarned(sigilId: string, count: number): void {
    this.track(Analytics.nestSigilEarned(sigilId, count));
  }

  /** Finish 6.0 Phase 26: nest contract settlement. */
  onNestContractSettled(contractId: string, coins: number): void {
    this.track(Analytics.nestContractSettled(contractId, coins));
  }

  /** Finish 6.0 Phase 26: loadtest bank probe telemetry. */
  onLoadtestBankProbed(bank: string, floorsMet: boolean): void {
    this.track(Analytics.loadtestBankProbed(bank, floorsMet, "web"));
  }

  /** Call once per display frame with current EMA + quality. */
  onFrameSample(emaMs: number, quality: QualityPreset): void {
    if (!this.consent || emaMs <= 0) return;
    this.frameSamples += 1;
    this.lastEmaMs = emaMs;
    this.lastQuality = quality;
    if (this.frameSamples >= FRAME_SUMMARY_EVERY) {
      this.track(Analytics.frameTimeSummary(this.lastEmaMs, this.lastQuality, this.frameSamples, "web"));
      this.frameSamples = 0;
    }
  }

  /** Phase 26: start a consent-gated analytics session (crash-free bookkeeping). */
  onSessionStart(): void {
    this.ledger.onSessionStart();
  }

  /** Phase 26: mark a clean session end for crash-free rate. */
  onSessionEndClean(): void {
    this.ledger.onSessionEndClean();
    void this.remote?.onSessionEnd();
  }

  /** Finish 3.0 Phase 26: remote sink attached when VITE_ANALYTICS_API_BASE is set. */
  remoteSinkEnabled(): boolean {
    return this.remote?.enabled() === true;
  }

  exportDashboardJson(): string {
    return this.ledger.exportJson();
  }

  hasDashboardAlerts(): boolean {
    return this.ledger.hasActiveAlerts();
  }

  resetSessionFlags(): void {
    this.firstSaleSent = false;
    this.unlockedHarbors.clear();
    this.frameSamples = 0;
  }
}

export const sharedAnalyticsBus = new AnalyticsBus();
