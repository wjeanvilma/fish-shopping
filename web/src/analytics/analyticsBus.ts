/**
 * Phase 25 — consent-gated analytics bus for the web client.
 * Drops events when consent is off; never attaches PII or save blobs.
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

export type AnalyticsTrackSink = { track(event: AnalyticsEvent | null): void };

const FRAME_SUMMARY_EVERY = 600;

export class AnalyticsBus {
  private consent = false;
  private sink: AnalyticsTrackSink;
  private firstSaleSent = false;
  private unlockedHarbors = new Set<string>();
  private frameSamples = 0;
  private lastEmaMs = 0;
  private lastQuality: QualityPreset = "medium";

  constructor(sink: AnalyticsTrackSink = new MemoryAnalyticsSink()) {
    this.sink = sink;
  }

  setConsent(consent: boolean): void {
    this.consent = consent;
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
    this.sink.track(clean);
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

  resetSessionFlags(): void {
    this.firstSaleSent = false;
    this.unlockedHarbors.clear();
    this.frameSamples = 0;
  }
}

export const sharedAnalyticsBus = new AnalyticsBus();
