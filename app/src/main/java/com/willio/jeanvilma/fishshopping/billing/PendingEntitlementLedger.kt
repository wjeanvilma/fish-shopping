package com.willio.jeanvilma.fishshopping.billing

import android.content.Context
import com.willio.jeanvilma.fishshopping.core.progression.EntitlementReconcile
import org.json.JSONArray
import org.json.JSONObject

/**
 * Phase 3 (post-1.0) — crash-safe pending entitlement grants.
 * Survives process death until a checkpoint records the matching purchase receipt.
 */
class PendingEntitlementLedger(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun all(): List<EntitlementReconcile.StoreOwned> = synchronized(this) {
        read().map {
            EntitlementReconcile.StoreOwned(
                sku = it.sku,
                purchaseToken = it.purchaseToken,
                grantsCosmetic = it.grantsCosmetic,
            )
        }
    }

    fun enqueue(sku: String, purchaseToken: String, grantsCosmetic: String?) = synchronized(this) {
        val rows = read().toMutableList()
        val idx = rows.indexOfFirst { it.sku == sku }
        val row = PendingRow(sku, purchaseToken, grantsCosmetic, System.currentTimeMillis())
        if (idx >= 0) rows[idx] = row else rows += row
        write(rows)
    }

    fun ackRequestIds(satisfied: Set<String>) {
        synchronized(this) {
            if (satisfied.isEmpty()) return
            val kept = read().filter { row ->
                val id = EntitlementReconcile.requestId(
                    EntitlementReconcile.StoreOwned(row.sku, row.purchaseToken, row.grantsCosmetic),
                )
                id !in satisfied
            }
            write(kept)
        }
    }

    fun clear() = synchronized(this) {
        prefs.edit().remove(KEY).apply()
    }

    private fun read(): List<PendingRow> {
        val json = prefs.getString(KEY, null) ?: return emptyList()
        return try {
            val arr = JSONArray(json)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(
                        PendingRow(
                            sku = o.getString("sku"),
                            purchaseToken = o.getString("purchaseToken"),
                            grantsCosmetic = if (o.isNull("grantsCosmetic")) {
                                null
                            } else {
                                o.optString("grantsCosmetic").takeIf { it.isNotBlank() }
                            },
                            enqueuedAtEpochMs = o.optLong("enqueuedAtEpochMs", 0L),
                        ),
                    )
                }
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun write(rows: List<PendingRow>) {
        val arr = JSONArray()
        for (r in rows) {
            arr.put(
                JSONObject()
                    .put("sku", r.sku)
                    .put("purchaseToken", r.purchaseToken)
                    .put("grantsCosmetic", r.grantsCosmetic ?: JSONObject.NULL)
                    .put("enqueuedAtEpochMs", r.enqueuedAtEpochMs),
            )
        }
        prefs.edit().putString(KEY, arr.toString()).apply()
    }

    private data class PendingRow(
        val sku: String,
        val purchaseToken: String,
        val grantsCosmetic: String?,
        val enqueuedAtEpochMs: Long,
    )

    companion object {
        const val PREFS = "fish_shopping_pending_entitlements"
        private const val KEY = "pending_json"
    }
}
