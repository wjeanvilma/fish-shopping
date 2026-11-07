/**
 * Phase 26 — local rolling analytics dashboard ledger (consent-gated).
 * Presentation/local only; not part of the sim parity save.
 */
import {
  ANALYTICS_DASHBOARD,
  appendCrashFreeSample,
  buildAnalyticsDashboardSnapshot,
  encodeAnalyticsDashboardSnapshot,
  recordAnalyticsEventCounters,
  type AnalyticsDashboardSnapshot,
  type CrashFreeSample,
} from "../engine/analyticsDashboard";
import type { AnalyticsEvent } from "../engine/analytics";
import { Analytics } from "../engine/analytics";

interface PersistedState {
  counters: Record<string, number>;
  crashFreeSamples: CrashFreeSample[];
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(ANALYTICS_DASHBOARD.storage.webKey);
    if (!raw) return { counters: {}, crashFreeSamples: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const counters =
      parsed.counters && typeof parsed.counters === "object" ? parsed.counters : {};
    const crashFreeSamples = Array.isArray(parsed.crashFreeSamples)
      ? parsed.crashFreeSamples.filter((s) => typeof s?.clean === "boolean")
      : [];
    return { counters, crashFreeSamples };
  } catch {
    return { counters: {}, crashFreeSamples: [] };
  }
}

function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(ANALYTICS_DASHBOARD.storage.webKey, JSON.stringify(state));
  } catch {
    // private mode / quota
  }
}

function isSessionDirty(): boolean {
  try {
    return localStorage.getItem(ANALYTICS_DASHBOARD.session.webDirtyKey) === "1";
  } catch {
    return false;
  }
}

function setSessionDirty(dirty: boolean): void {
  try {
    if (dirty) localStorage.setItem(ANALYTICS_DASHBOARD.session.webDirtyKey, "1");
    else localStorage.removeItem(ANALYTICS_DASHBOARD.session.webDirtyKey);
  } catch {
    // ignore
  }
}

export class AnalyticsDashboardLedger {
  private counters: Record<string, number> = {};
  private crashFreeSamples: CrashFreeSample[] = [];
  private consent = false;
  private sessionOpen = false;
  private readonly platform: string;
  private emit: (event: ReturnType<typeof Analytics.sessionStart>) => void = () => {};

  constructor(platform = "web") {
    this.platform = platform;
    const loaded = loadState();
    this.counters = loaded.counters;
    this.crashFreeSamples = loaded.crashFreeSamples;
  }

  /** Wire the analytics bus track edge so counters stay in sync. */
  bindEmitter(emit: (event: ReturnType<typeof Analytics.sessionStart>) => void): void {
    this.emit = emit;
  }

  setConsent(consent: boolean): void {
    this.consent = consent;
    if (!consent) {
      // Drop in-flight session bookkeeping; do not emit while consent is off.
      this.sessionOpen = false;
    }
  }

  onTracked(event: AnalyticsEvent): void {
    if (!this.consent) return;
    this.counters = recordAnalyticsEventCounters(this.counters, event);
    if (event.name === "crash_free_session" && typeof event.props.clean === "boolean") {
      this.crashFreeSamples = appendCrashFreeSample(this.crashFreeSamples, event.props.clean);
    }
    saveState({ counters: this.counters, crashFreeSamples: this.crashFreeSamples });
  }

  /** Call once when the app becomes interactive with consent. */
  onSessionStart(): void {
    if (!this.consent || this.sessionOpen) return;
    if (isSessionDirty()) {
      this.emit(Analytics.crashFreeSession(false, this.platform));
    }
    setSessionDirty(true);
    this.sessionOpen = true;
    this.emit(Analytics.sessionStart(this.platform));
  }

  /** Call on clean pause / pagehide / title return. */
  onSessionEndClean(): void {
    if (!this.consent || !this.sessionOpen) {
      setSessionDirty(false);
      this.sessionOpen = false;
      return;
    }
    this.sessionOpen = false;
    setSessionDirty(false);
    this.emit(Analytics.crashFreeSession(true, this.platform));
  }

  snapshot(): AnalyticsDashboardSnapshot {
    return buildAnalyticsDashboardSnapshot({
      consent: this.consent,
      counters: this.counters,
      crashFreeSamples: this.crashFreeSamples,
    });
  }

  exportJson(): string {
    return encodeAnalyticsDashboardSnapshot(this.snapshot());
  }

  hasActiveAlerts(): boolean {
    return this.snapshot().activeAlertCount > 0;
  }

  /** Test helper. */
  resetForTests(): void {
    this.counters = {};
    this.crashFreeSamples = [];
    this.sessionOpen = false;
    setSessionDirty(false);
    saveState({ counters: {}, crashFreeSamples: [] });
  }
}

export const sharedAnalyticsDashboardLedger = new AnalyticsDashboardLedger("web");
