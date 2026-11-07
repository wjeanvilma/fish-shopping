package com.willio.jeanvilma.fishshopping.analytics

import com.willio.jeanvilma.fishshopping.core.sim.Analytics
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.MemoryAnalyticsSink
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.persistence.QualityPreset

/**
 * Phase 25 — consent-gated analytics bus for Android.
 * Drops events when consent is off; never attaches PII or save blobs.
 */
fun interface AnalyticsTrackSink {
    fun track(event: Analytics.Event?)
}

class AnalyticsBus(
    private var sink: AnalyticsTrackSink = NOOP,
) {
    @Volatile
    var consent: Boolean = false
        private set

    private var firstSaleSent = false
    private val unlockedHarbors = mutableSetOf<String>()
    private var frameSamples = 0
    private var lastEmaMs = 0.0
    private var lastQuality = QualityPreset.MEDIUM

    fun setSink(sink: AnalyticsTrackSink) {
        this.sink = sink
    }

    fun setConsent(consent: Boolean) {
        this.consent = consent
    }

    fun track(event: Analytics.Event?) {
        if (!consent || event == null) return
        val clean = Analytics.sanitize(event.name, event.props) ?: return
        sink.track(clean)
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

    fun resetSessionFlags() {
        firstSaleSent = false
        unlockedHarbors.clear()
        frameSamples = 0
    }

    companion object {
        const val FRAME_SUMMARY_EVERY = 600
        private val NOOP = AnalyticsTrackSink { }
        val shared = AnalyticsBus()

        fun recording(memory: MemoryAnalyticsSink = MemoryAnalyticsSink()): AnalyticsBus {
            val bus = AnalyticsBus { memory.track(it) }
            return bus
        }
    }
}
