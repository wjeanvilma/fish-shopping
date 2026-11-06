package com.willio.jeanvilma.fishshopping.core.persistence

import com.willio.jeanvilma.fishshopping.core.content.ContentException
import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.ItemQuantity
import com.willio.jeanvilma.fishshopping.core.content.Node
import com.willio.jeanvilma.fishshopping.core.inventory.Inventory
import com.willio.jeanvilma.fishshopping.core.progression.UpgradeSystem
import com.willio.jeanvilma.fishshopping.core.sim.Batch
import com.willio.jeanvilma.fishshopping.core.sim.CustomerState
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.zip.CRC32

open class SnapshotException(message: String, cause: Throwable? = null) : Exception(message, cause)

/** The save was written by a newer app. Callers must keep the file untouched. */
class NewerSaveException(val schemaVersion: Int) :
    SnapshotException("Save schema $schemaVersion is newer than this app supports (${SimConstants.SCHEMA_VERSION}). Update the app; the save was not changed.")

/**
 * Serialises one consistent tick of canonical state.
 *
 * Envelope: { schemaVersion, contentVersion, checksum, state }. The checksum (CRC-32
 * of the compact state JSON) catches accidental corruption, not deliberate editing.
 * Capacities are not stored: they are rebuilt from content plus owned upgrades, so
 * a content update cannot leave a save with stale limits.
 */
object SnapshotCodec {

    fun encode(content: ContentPack, s: GameState): String {
        val state = buildJsonObject {
            put("harborId", s.harborId)
            put("tick", s.tick)
            put("coins", s.coins)
            put("rngState", s.rng.state)
            put("nextSerial", s.nextSerial)
            put("tutorialIndex", s.tutorialIndex)
            put("customerSpawnProgress", s.customerSpawnProgress)
            put("player", buildJsonObject {
                val p = s.player
                put("x", p.x); put("z", p.z)
                put("facingX", p.facingX); put("facingZ", p.facingZ)
                put("zoneId", p.zoneId)
                put("transferCooldown", p.transferCooldown)
                put("fishingSpecies", p.fishingSpecies)
                put("fishingProgress", p.fishingProgress)
                put("fishingCatchTicks", p.fishingCatchTicks)
                put("reelAttemptedThisCast", p.reelAttemptedThisCast)
                put("bag", inv(p.bag))
            })
            put("fishingSpots", buildJsonArray {
                s.fishingSpots.forEach { f ->
                    add(buildJsonObject { put("zoneId", f.zoneId); put("stock", f.stock); put("regenProgress", f.regenProgress) })
                }
            })
            put("machines", buildJsonArray {
                s.machines.forEach { m ->
                    add(buildJsonObject {
                        put("stationId", m.stationId)
                        put("paused", m.paused)
                        put("status", m.status.name)
                        put("input", inv(m.input))
                        put("output", inv(m.output))
                        put("activeBatch", m.activeBatch?.let { b ->
                            buildJsonObject {
                                put("id", b.id); put("recipeId", b.recipeId)
                                put("durationTicks", b.durationTicks); put("remainingTicks", b.remainingTicks)
                                put("consumed", buildJsonArray {
                                    b.consumed.forEach { add(buildJsonObject { put("item", it.item); put("quantity", it.quantity) }) }
                                })
                            }
                        } ?: JsonNull)
                    })
                }
            })
            put("counters", buildJsonArray {
                s.counters.forEach { c ->
                    add(buildJsonObject { put("counterId", c.counterId); put("checkoutProgress", c.checkoutProgress); put("stock", inv(c.stock)) })
                }
            })
            put("customers", buildJsonArray {
                s.customers.forEach { c ->
                    add(buildJsonObject {
                        put("id", c.id); put("typeId", c.typeId); put("counterId", c.counterId)
                        put("wants", c.wants); put("patienceLeft", c.patienceLeft)
                        put("reservedItems", JsonObject(c.reservedItems.mapValues { JsonPrimitive(it.value) }))
                        put("walkTicksTotal", c.walkTicksTotal); put("walkTicksLeft", c.walkTicksLeft)
                    })
                }
            })
            put("ownedUpgrades", JsonArray(s.ownedUpgrades.map { JsonPrimitive(it) }))
            put("completedQuests", JsonArray(s.completedQuests.map { JsonPrimitive(it) }))
            put("stats", JsonObject(s.stats.mapValues { JsonPrimitive(it.value) }))
            put("purchaseReceipts", JsonObject(s.purchaseReceipts.mapValues { receipt(it.value) }))
            put("ledger", JsonArray(s.ledger.map { receipt(it) }))
        }
        val envelope = buildJsonObject {
            put("schemaVersion", SimConstants.SCHEMA_VERSION)
            put("contentVersion", content.contentVersion)
            put("checksum", checksum(state))
            put("state", state)
        }
        return envelope.toString()
    }

    fun decode(content: ContentPack, text: String): GameState {
        val root = try {
            Json.parseToJsonElement(text)
        } catch (e: Exception) {
            throw SnapshotException("Save is not valid JSON", e)
        }
        try {
            val env = Node(root, "$")
            val version = env["schemaVersion"].int()
            if (version > SimConstants.SCHEMA_VERSION) {
                throw NewerSaveException(version)
            }
            if (version < 1) throw SnapshotException("Unsupported save schema $version")
            val stateEl = (root as JsonObject)["state"] as? JsonObject ?: throw SnapshotException("Missing state")
            if (env["checksum"].string() != checksum(stateEl)) throw SnapshotException("Checksum mismatch: save is corrupt")
            return readState(content, Node(stateEl, "$.state"), version)
        } catch (e: ContentException) {
            throw SnapshotException("Malformed save: ${e.message}", e)
        }
    }

    /**
     * Migrations are applied while reading: [version] is the save's schema.
     *  - v1 -> v2: customers had no walking state; they were already queued (walk 0).
     *  - v2 -> v3: customers.reserved (int, single SKU) becomes reservedItems map.
     *  - v3 -> v4: player mid-cast fishingCatchTicks + reelAttemptedThisCast.
     */
    private fun readState(content: ContentPack, n: Node, version: Int): GameState {
        val harborId = n["harborId"].string()
        if (harborId !in content.harborsById) throw SnapshotException("Unknown harbor $harborId")
        val s = GameState.newGame(content, harborId, seed = 0)
        s.rng.state = n["rngState"].int()
        s.tick = n["tick"].long(min = 0)
        s.coins = n["coins"].long(min = 0).coerceAtMost(SimConstants.MAX_SAFE_INTEGER)
        s.nextSerial = n["nextSerial"].long(min = 1)
        s.tutorialIndex = n["tutorialIndex"].int(min = 0)
        s.customerSpawnProgress = n["customerSpawnProgress"].int(min = 0)

        n["player"].let { p ->
            s.player.x = p["x"].int(); s.player.z = p["z"].int()
            s.player.facingX = p["facingX"].int(); s.player.facingZ = p["facingZ"].int()
            s.player.zoneId = p.optional("zoneId")?.string()
            s.player.transferCooldown = p["transferCooldown"].int(min = 0)
            s.player.fishingSpecies = p.optional("fishingSpecies")?.string()?.takeIf { it in content.speciesById }
            s.player.fishingProgress = p["fishingProgress"].int(min = 0)
            if (version >= 4) {
                s.player.fishingCatchTicks = p["fishingCatchTicks"].int(min = 0)
                s.player.reelAttemptedThisCast = p["reelAttemptedThisCast"].bool()
            } else if (s.player.fishingSpecies != null) {
                val sp = content.speciesById.getValue(s.player.fishingSpecies!!)
                s.player.fishingCatchTicks = com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
                    .catchTicksFor(s.player.catchSpeedPermille, sp.catchTicks)
                s.player.reelAttemptedThisCast = false
            }
            readInv(p["bag"], s.player.bag)
        }
        n["fishingSpots"].list { it }.forEach { f ->
            val spot = s.fishingSpots.firstOrNull { it.zoneId == f["zoneId"].string() } ?: return@forEach
            spot.stock = f["stock"].int(min = 0)
            spot.regenProgress = f["regenProgress"].int(min = 0)
        }
        n["machines"].list { it }.forEach { mn ->
            val m = s.machines.firstOrNull { it.stationId == mn["stationId"].string() } ?: return@forEach
            m.paused = mn["paused"].bool()
            m.status = MachineStatus.entries.firstOrNull { it.name == mn["status"].string() } ?: MachineStatus.WAITING_FOR_INPUT
            readInv(mn["input"], m.input)
            readInv(mn["output"], m.output)
            m.activeBatch = mn.optional("activeBatch")?.let { b ->
                Batch(
                    b["id"].string(), b["recipeId"].string(), b["durationTicks"].int(min = 1), b["remainingTicks"].int(min = 0),
                    b["consumed"].list { ItemQuantity(it["item"].string(), it["quantity"].int(min = 1)) },
                )
            }
        }
        n["counters"].list { it }.forEach { cn ->
            val c = s.counters.firstOrNull { it.counterId == cn["counterId"].string() } ?: return@forEach
            c.checkoutProgress = cn["checkoutProgress"].int(min = 0)
            readInv(cn["stock"], c.stock)
        }
        n["customers"].list { cn ->
            val walkTotal = if (version >= 2) cn["walkTicksTotal"].int(min = 0) else 0
            val counterId = cn["counterId"].string()
            CustomerState(
                cn["id"].string(), cn["typeId"].string(), counterId,
                cn["wants"].int(min = 1), cn["patienceLeft"].int(), walkTotal,
            ).also { cust ->
                if (version >= 3) {
                    (cn["reservedItems"].el as? JsonObject)?.forEach { (item, v) ->
                        val qty = Node(v, "${cn.path}.reservedItems.$item").int(min = 1)
                        cust.addReservation(item, qty)
                    }
                } else {
                    val reserved = cn["reserved"].int(min = 0)
                    if (reserved > 0) {
                        val product = content.harborsById.getValue(harborId).counters
                            .firstOrNull { it.id == counterId }?.products?.firstOrNull()
                        if (product != null) cust.addReservation(product, reserved)
                    }
                }
                cust.walkTicksLeft = if (version >= 2) cn["walkTicksLeft"].int(min = 0).coerceAtMost(walkTotal) else 0
            }
        }.forEach { s.customers += it }

        n["ownedUpgrades"].list { it.string() }.filter { it in content.upgradesById }.forEach { s.ownedUpgrades += it }
        n["completedQuests"].list { it.string() }.forEach { s.completedQuests += it }
        (n["stats"].el as? JsonObject)?.forEach { (k, v) -> s.stats[k] = Node(v, "$.state.stats.$k").long() }
        (n["purchaseReceipts"].el as? JsonObject)?.forEach { (k, v) -> s.purchaseReceipts[k] = readReceipt(Node(v, "$.state.purchaseReceipts.$k")) }
        n["ledger"].list(::readReceipt).forEach { s.ledger.addLast(it) }

        // Rebuild derived limits from content + owned upgrades (idempotent effects).
        s.ownedUpgrades.forEach { UpgradeSystem.applyEffect(s, content.upgradesById.getValue(it).effect) }
        return s
    }

    private fun inv(i: Inventory) = buildJsonObject {
        put("quantities", JsonObject(i.contents().mapValues { JsonPrimitive(it.value) }))
        put("reserved", JsonObject(i.reservations().mapValues { JsonPrimitive(it.value) }))
    }

    private fun readInv(n: Node, into: Inventory) {
        fun map(key: String): Map<String, Int> =
            (n[key].el as? JsonObject)?.mapValues { (k, v) -> Node(v, "${n.path}.$key.$k").int(min = 0) } ?: emptyMap()
        into.restore(map("quantities"), map("reserved"))
    }

    private fun receipt(r: Receipt) = buildJsonObject {
        put("id", r.id); put("type", r.type); put("coinDelta", r.coinDelta); put("tick", r.tick); put("reference", r.reference)
    }

    private fun readReceipt(n: Node) =
        Receipt(n["id"].string(), n["type"].string(), n["coinDelta"].long(), n["tick"].long(), n["reference"].string())

    private fun checksum(state: JsonElement): String {
        val crc = CRC32()
        crc.update(state.toString().toByteArray(Charsets.UTF_8))
        return "%08x".format(crc.value)
    }
}
