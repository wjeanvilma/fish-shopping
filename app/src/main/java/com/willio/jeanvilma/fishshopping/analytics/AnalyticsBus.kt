package com.willio.jeanvilma.fishshopping.analytics

import android.app.Application
import com.willio.jeanvilma.fishshopping.core.sim.Analytics
import com.willio.jeanvilma.fishshopping.core.sim.AnalyticsDashboard
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.MemoryAnalyticsSink
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.persistence.QualityPreset

/**
 * Phase 25/26 — consent-gated analytics bus for Android.
 * Drops events when consent is off; never attaches PII or save blobs.
 * Post-1.0 Phase 26: session lifecycle + dashboard ledger.
 * Finish 3.0 Phase 26: optional remote batch sink (manifest meta-data).
 */
fun interface AnalyticsTrackSink {
    fun track(event: Analytics.Event?)
}

class AnalyticsBus(
    private var sink: AnalyticsTrackSink = NOOP,
    private var ledger: AnalyticsDashboardLedger? = null,
    private var remote: RemoteAnalyticsSink? = null,
) {
    @Volatile
    var consent: Boolean = false
        private set

    private var firstSaleSent = false
    private val unlockedHarbors = mutableSetOf<String>()
    private var frameSamples = 0
    private var lastEmaMs = 0.0
    private var lastQuality = QualityPreset.MEDIUM

    fun attachLedger(ledger: AnalyticsDashboardLedger) {
        this.ledger = ledger
        ledger.bindEmitter { track(it) }
        ledger.setConsent(consent)
    }

    fun attachRemote(remote: RemoteAnalyticsSink) {
        this.remote = remote
        remote.setConsent(consent)
        if (remote.enabled()) {
            sink = FanoutAnalyticsSink(listOf(sink, remote))
        }
    }

    fun setSink(sink: AnalyticsTrackSink) {
        this.sink = sink
    }

    fun setConsent(consent: Boolean) {
        this.consent = consent
        ledger?.setConsent(consent)
        remote?.setConsent(consent)
    }

    fun track(event: Analytics.Event?) {
        if (!consent || event == null) return
        val clean = Analytics.sanitize(event.name, event.props) ?: return
        sink.track(clean)
        ledger?.onTracked(clean)
    }

    fun onGameEvents(events: List<GameEvent>, state: GameState) {
        if (!consent) return
        for (e in events) {
            when (e) {
                is GameEvent.TutorialAdvanced -> track(Analytics.tutorialStepCompleted(e.stepIndex))
                is GameEvent.SaleCommitted -> {
                    if (!firstSaleSent && state.stat(Stats.SALES) == 1L) {
                        firstSaleSent = true
                        track(Analytics.firstSale(e.coins))
                    }
                }
                is GameEvent.HarborTraveled -> {
                    if (!e.replayed && unlockedHarbors.add(e.toHarborId)) {
                        track(Analytics.harborUnlocked(e.toHarborId))
                    }
                }
                is GameEvent.FullHarborUnlockGranted -> {
                    if (!e.replayed) track(Analytics.harborUnlockedFull())
                }
                else -> Unit
            }
        }
    }

    fun onOfflineClaimed(report: OfflineReport) {
        track(
            Analytics.offlineClaimed(
                elapsedMillis = report.elapsedMillis,
                ticksCredited = report.ticksCredited,
                coinsDelta = report.coinsDelta,
                capped = report.capped,
            ),
        )
    }

    fun onSaveRecovery(source: String) {
        track(Analytics.saveRecovery(source))
    }

    /** Finish 6.0 Phase 26: nest endgame sigil progress. */
    fun onNestSigilEarned(sigilId: String, count: Int) {
        track(Analytics.nestSigilEarned(sigilId, count))
    }

    /** Finish 6.0 Phase 26: nest contract settlement. */
    fun onNestContractSettled(contractId: String, coins: Long) {
        track(Analytics.nestContractSettled(contractId, coins))
    }

    /** Finish 6.0 Phase 26: loadtest bank probe telemetry. */
    fun onLoadtestBankProbed(bank: String, floorsMet: Boolean) {
        track(Analytics.loadtestBankProbed(bank, floorsMet, "android"))
    }

    fun onFrameSample(emaMs: Double, quality: QualityPreset) {
        if (!consent || emaMs <= 0.0) return
        frameSamples += 1
        lastEmaMs = emaMs
        lastQuality = quality
        if (frameSamples >= FRAME_SUMMARY_EVERY) {
            track(
                Analytics.frameTimeSummary(
                    emaMs = lastEmaMs,
                    quality = when (lastQuality) {
                        QualityPreset.LOW -> "low"
                        QualityPreset.MEDIUM -> "medium"
                        QualityPreset.HIGH -> "high"
                    },
                    samples = frameSamples,
                    platform = "android",
                ),
            )
            frameSamples = 0
        }
    }

    /** Phase 26: start a consent-gated analytics session (crash-free bookkeeping). */
    fun onSessionStart() {
        ledger?.onSessionStart()
    }

    /** Phase 26: mark a clean session end for crash-free rate. */
    fun onSessionEndClean() {
        ledger?.onSessionEndClean()
        remote?.onSessionEnd()
    }

    /** Finish 3.0 Phase 26: remote sink attached when fish.analytics.apiBase is set. */
    fun remoteSinkEnabled(): Boolean = remote?.enabled() == true

    fun exportDashboardJson(): String = ledger?.exportJson()
        ?: AnalyticsDashboard.encodeSnapshot(
            AnalyticsDashboard.buildSnapshot(
                consent = consent,
                counters = emptyMap(),
                crashFreeSamples = emptyList(),
            ),
        )

    fun hasDashboardAlerts(): Boolean = ledger?.hasActiveAlerts() == true

    fun resetSessionFlags() {
        firstSaleSent = false
        unlockedHarbors.clear()
        frameSamples = 0
    }

    companion object {
        const val FRAME_SUMMARY_EVERY = 600
        private val NOOP = AnalyticsTrackSink { }
        val shared = AnalyticsBus()

        fun install(app: Application): AnalyticsBus {
            val ledger = AnalyticsDashboardLedger(app)
            shared.attachLedger(ledger)
            shared.attachRemote(RemoteAnalyticsSink.fromContext(app))
            return shared
        }

        fun recording(memory: MemoryAnalyticsSink = MemoryAnalyticsSink()): AnalyticsBus {
            return AnalyticsBus(sink = AnalyticsTrackSink { memory.track(it) })
        }
    }
}
