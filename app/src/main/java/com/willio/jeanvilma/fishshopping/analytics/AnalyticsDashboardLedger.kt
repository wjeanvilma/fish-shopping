package com.willio.jeanvilma.fishshopping.analytics

import android.content.Context
import com.willio.jeanvilma.fishshopping.core.sim.Analytics
import com.willio.jeanvilma.fishshopping.core.sim.AnalyticsDashboard
import org.json.JSONArray
import org.json.JSONObject

/**
 * Phase 26 — local rolling analytics dashboard ledger (consent-gated).
 * Presentation/local only; not part of the sim parity save.
 */
class AnalyticsDashboardLedger(
    context: Context,
    private val platform: String = "android",
) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private var counters: MutableMap<String, Int> = loadCounters().toMutableMap()
    private var crashFreeSamples: MutableList<AnalyticsDashboard.CrashFreeSample> =
        loadCrashFree().toMutableList()
    @Volatile private var consent = false
    @Volatile private var sessionOpen = false
    private var emit: (Analytics.Event) -> Unit = {}

    fun bindEmitter(emit: (Analytics.Event) -> Unit) {
        this.emit = emit
    }

    fun setConsent(consent: Boolean) {
        this.consent = consent
        if (!consent) {
            // Drop in-flight session bookkeeping; do not emit while consent is off.
            sessionOpen = false
        }
    }

    fun onTracked(event: Analytics.Event) {
        if (!consent) return
        counters = AnalyticsDashboard.recordCounter(counters, event.name).toMutableMap()
        val clean = event.props["clean"]
        if (event.name == "crash_free_session" && clean is Boolean) {
            crashFreeSamples = AnalyticsDashboard.appendCrashFreeSample(crashFreeSamples, clean)
                .toMutableList()
        }
        persist()
    }

    fun onSessionStart() {
        if (!consent || sessionOpen) return
        if (prefs.getBoolean(KEY_DIRTY, false)) {
            emit(Analytics.crashFreeSession(clean = false, platform = platform))
        }
        prefs.edit().putBoolean(KEY_DIRTY, true).apply()
        sessionOpen = true
        emit(Analytics.sessionStart(platform))
    }

    fun onSessionEndClean() {
        if (!consent || !sessionOpen) {
            prefs.edit().putBoolean(KEY_DIRTY, false).apply()
            sessionOpen = false
            return
        }
        sessionOpen = false
        prefs.edit().putBoolean(KEY_DIRTY, false).apply()
        emit(Analytics.crashFreeSession(clean = true, platform = platform))
    }

    fun snapshot(): AnalyticsDashboard.Snapshot =
        AnalyticsDashboard.buildSnapshot(consent, counters, crashFreeSamples)

    fun exportJson(): String = AnalyticsDashboard.encodeSnapshot(snapshot())

    fun hasActiveAlerts(): Boolean = snapshot().activeAlertCount > 0

    private fun persist() {
        val countersJson = JSONObject()
        for ((k, v) in counters) countersJson.put(k, v)
        val samplesJson = JSONArray()
        for (s in crashFreeSamples) {
            samplesJson.put(JSONObject().put("clean", s.clean))
        }
        prefs.edit()
            .putString(KEY_COUNTERS, countersJson.toString())
            .putString(KEY_CRASH_FREE, samplesJson.toString())
            .apply()
    }

    private fun loadCounters(): Map<String, Int> {
        val raw = prefs.getString(KEY_COUNTERS, null) ?: return emptyMap()
        return try {
            val json = JSONObject(raw)
            buildMap {
                val keys = json.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    put(k, json.optInt(k, 0))
                }
            }
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private fun loadCrashFree(): List<AnalyticsDashboard.CrashFreeSample> {
        val raw = prefs.getString(KEY_CRASH_FREE, null) ?: return emptyList()
        return try {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val obj = arr.optJSONObject(i) ?: continue
                    if (obj.has("clean")) add(AnalyticsDashboard.CrashFreeSample(obj.getBoolean("clean")))
                }
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    companion object {
        const val PREFS = "fish_shopping_analytics_dashboard"
        const val KEY_COUNTERS = "counters_json"
        const val KEY_CRASH_FREE = "crash_free_rolling"
        const val KEY_DIRTY = "session_dirty"
    }
}
