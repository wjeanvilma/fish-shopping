package com.willio.jeanvilma.fishshopping.core.content

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.longOrNull

class ContentException(message: String) : Exception(message)

/**
 * Parses and validates a content pack. Decoding is explicit (no reflection or
 * compiler plugin) so every error names the exact JSON path, matching what the
 * web client's JSON Schema validation reports.
 */
object ContentLoader {

    fun load(jsonText: String): ContentPack {
        val root = try {
            Json.parseToJsonElement(jsonText)
        } catch (e: Exception) {
            throw ContentException("Content pack is not valid JSON: ${e.message}")
        }
        val pack = parse(Node(root, "$"))
        val problems = ContentValidator.validate(pack)
        if (problems.isNotEmpty()) {
            throw ContentException("Content pack failed validation:\n" + problems.joinToString("\n") { " - $it" })
        }
        return pack
    }

    private fun parse(r: Node) = ContentPack(
        contentVersion = r["contentVersion"].string(),
        ticksPerSecond = r["ticksPerSecond"].int(min = 1),
        player = r["player"].let {
            PlayerDef(
                startCoins = it["startCoins"].long(min = 0),
                startCarryCapacityUnits = it["startCarryCapacityUnits"].int(min = 1),
                moveSpeedMmPerTick = it["moveSpeedMmPerTick"].int(min = 1),
                transferIntervalTicks = it["transferIntervalTicks"].int(min = 1),
                startCatchSpeedPermille = it["startCatchSpeedPermille"].int(min = 1),
                startFishRegenPermille = it["startFishRegenPermille"].int(min = 1),
                timingWindowStartPermille = it["timingWindowStartPermille"].int(min = 0, max = 1000),
                timingWindowEndPermille = it["timingWindowEndPermille"].int(min = 0, max = 1000),
            )
        },
        species = r["species"].list { s ->
            SpeciesDef(
                id = s["id"].string(), name = s["name"].string(),
                carryUnits = s["carryUnits"].int(min = 1), catchTicks = s["catchTicks"].int(min = 1),
                baseValue = s["baseValue"].long(min = 0), rarityWeight = s["rarityWeight"].int(min = 1),
                asset = s.optional("asset")?.string(),
                rareUpgrade = s.optional("rareUpgrade")?.let { ru ->
                    RareUpgradeDef(ru["to"].string(), ru["chancePermille"].int(min = 1, max = 1000))
                },
            )
        },
        products = r["products"].list { p ->
            ProductDef(
                id = p["id"].string(), name = p["name"].string(),
                carryUnits = p["carryUnits"].int(min = 1), unitPrice = p["unitPrice"].long(min = 0),
                asset = p.optional("asset")?.string(),
            )
        },
        recipes = r["recipes"].list { rc ->
            RecipeDef(
                id = rc["id"].string(), machine = rc["machine"].string(),
                inputs = rc["inputs"].list(::itemQuantity), outputs = rc["outputs"].list(::itemQuantity),
                durationTicks = rc["durationTicks"].int(min = 1),
            )
        },
        machines = r["machines"].list { m ->
            MachineDef(
                id = m["id"].string(), name = m["name"].string(),
                recipes = m["recipes"].list { it.string() },
                inputCapacityUnits = m["inputCapacityUnits"].int(min = 1),
                outputCapacityUnits = m["outputCapacityUnits"].int(min = 1),
            )
        },
        upgrades = r["upgrades"].list { u ->
            UpgradeDef(
                id = u["id"].string(), name = u["name"].string(), description = u["description"].string(),
                cost = u["cost"].long(min = 0), requires = u["requires"].list { it.string() },
                effect = upgradeEffect(u["effect"]),
            )
        },
        quests = r["quests"].list { q -> QuestDef(q["id"].string(), q["name"].string(), statGoal(q["goal"])) },
        customers = r["customers"].list { c ->
            val kindText = c["kind"].string()
            val kind = CustomerKind.fromWire(kindText) ?: c["kind"].fail("unknown customer kind '$kindText'")
            CustomerDef(
                id = c["id"].string(), name = c["name"].string(), kind = kind,
                basketMin = c["basketMin"].int(min = 1), basketMax = c["basketMax"].int(min = 1),
                patienceTicks = c["patienceTicks"].int(min = 1), spawnWeight = c["spawnWeight"].int(min = 1),
                priceMultPermille = c["priceMultPermille"].int(min = 1),
                preferredProducts = c["preferredProducts"].list { pw ->
                    ProductWeight(pw["item"].string(), pw["weight"].int(min = 1))
                },
                unmetPriceMultPermille = c["unmetPriceMultPermille"].int(min = 1, max = 1000),
                unmetPatienceDrainPermille = c["unmetPatienceDrainPermille"].int(min = 1),
            )
        },
        tutorial = r["tutorial"].list { t ->
            val a = t["advanceOn"]
            val trigger = when (val kind = a["kind"].string()) {
                "enter_zone" -> TutorialTrigger.EnterZone(a["zone"].string())
                "stat" -> TutorialTrigger.Stat(statGoal(a))
                else -> a.fail("unknown tutorial trigger kind '$kind'")
            }
            TutorialStepDef(t["id"].string(), t["text"].string(), trigger)
        },
        harbors = r["harbors"].list(::harbor),
    )

    private fun itemQuantity(n: Node) = ItemQuantity(n["item"].string(), n["quantity"].int(min = 1))

    private fun statGoal(n: Node) = StatGoal(n["stat"].string(), n["atLeast"].long(min = 0))

    private fun upgradeEffect(n: Node): UpgradeEffect = when (val kind = n["kind"].string()) {
        "carry_capacity" -> UpgradeEffect.CarryCapacity(n["capacityUnits"].int(min = 1))
        "recipe_duration" -> UpgradeEffect.RecipeDuration(
            n["machine"].string(), n["recipe"].string(), n["durationTicks"].int(min = 1),
        )
        "catch_speed" -> UpgradeEffect.CatchSpeed(n["speedPermille"].int(min = 1))
        "fish_regen" -> UpgradeEffect.FishRegen(n["speedPermille"].int(min = 1))
        "unlock_fishing_spot" -> UpgradeEffect.UnlockFishingSpot(n["zone"].string())
        else -> n.fail("unknown upgrade effect kind '$kind'")
    }

    private fun rect(n: Node) = RectMm(
        n["id"].string(), n["minX"].int(), n["minZ"].int(), n["maxX"].int(), n["maxZ"].int(),
    ).also { if (it.maxX <= it.minX || it.maxZ <= it.minZ) n.fail("rectangle has no area") }

    private fun harbor(h: Node) = HarborDef(
        id = h["id"].string(), name = h["name"].string(),
        playerSpawn = point(h["playerSpawn"]),
        walkable = h["walkable"].list(::rect),
        obstacles = h["obstacles"].list(::rect),
        zones = h["zones"].list { z ->
            val kindText = z["kind"].string()
            val kind = ZoneKind.fromWire(kindText) ?: z["kind"].fail("unknown zone kind '$kindText'")
            ZoneDef(z["id"].string(), kind, rect(z))
        },
        fishingSpots = h["fishingSpots"].list { f ->
            FishingSpotDef(
                zone = f["zone"].string(),
                species = f["species"].list { it.string() },
                stockMax = f["stockMax"].int(min = 1),
                regenTicks = f["regenTicks"].int(min = 1),
                regenCurvePermille = f["regenCurvePermille"].list { it.int(min = 1) },
                requiresUpgrade = f.optional("requiresUpgrade")?.string(),
            )
        },
        stations = h["stations"].list { s ->
            StationDef(s["id"].string(), s["machine"].string(), s["inputZone"].string(), s["outputZone"].string())
        },
        counters = h["counters"].list { c ->
            CounterDef(
                c["id"].string(), c["products"].list { it.string() }, c["capacityUnits"].int(min = 1), c["zone"].string(),
                c["checkoutTicks"].int(min = 1), c["maxQueue"].int(min = 1),
                point(c["queueAnchor"]), point(c["queueStep"]),
            )
        },
        customerSpawnTicks = h["customerSpawnTicks"].int(min = 1),
        customerEntry = point(h["customerEntry"]),
        customerWalkMmPerTick = h["customerWalkMmPerTick"].int(min = 1),
        customerPathWaypoints = h["customerPathWaypoints"].list { point(it) },
        rushes = h["rushes"].list { r ->
            RushWindowDef(
                id = r["id"].string(),
                name = r["name"].string(),
                periodTicks = r["periodTicks"].int(min = 1),
                startTick = r["startTick"].int(min = 0),
                durationTicks = r["durationTicks"].int(min = 1),
                spawnSpeedPermille = r["spawnSpeedPermille"].int(min = 1),
                queueBonus = r["queueBonus"].int(min = 0, max = 16),
            )
        },
    )

    private fun point(n: Node) = PointMm(n["x"].int(), n["z"].int())
}

/** A JSON value plus the path used to reach it, for precise error messages. */
internal class Node(val el: JsonElement, val path: String) {
    fun fail(msg: String): Nothing = throw ContentException("$path: $msg")

    private fun obj(): JsonObject = el as? JsonObject ?: fail("expected an object")

    operator fun get(key: String): Node = Node(obj()[key] ?: fail("missing required field '$key'"), "$path.$key")

    fun optional(key: String): Node? = obj()[key]?.takeIf { it !is JsonNull }?.let { Node(it, "$path.$key") }

    fun string(): String {
        val p = el as? JsonPrimitive
        if (p == null || !p.isString) fail("expected a string")
        if (p.content.isBlank()) fail("must not be blank")
        return p.content
    }

    fun long(min: Long = Long.MIN_VALUE): Long {
        val p = el as? JsonPrimitive
        val v = if (p != null && !p.isString) p.longOrNull else null
        v ?: fail("expected an integer")
        if (v < min) fail("must be >= $min (was $v)")
        return v
    }

    fun int(min: Int = Int.MIN_VALUE, max: Int = Int.MAX_VALUE): Int {
        val p = el as? JsonPrimitive
        val v = if (p != null && !p.isString) p.intOrNull else null
        v ?: fail("expected a 32-bit integer")
        if (v < min) fail("must be >= $min (was $v)")
        if (v > max) fail("must be <= $max (was $v)")
        return v
    }

    fun bool(): Boolean {
        val p = el as? JsonPrimitive
        if (p == null || p.isString) fail("expected a boolean")
        return when (p.content) {
            "true" -> true
            "false" -> false
            else -> fail("expected a boolean")
        }
    }

    fun <T> list(f: (Node) -> T): List<T> {
        val a = el as? JsonArray ?: fail("expected an array")
        return a.mapIndexed { i, e -> f(Node(e, "$path[$i]")) }
    }
}
