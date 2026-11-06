package com.willio.jeanvilma.fishshopping.core.content

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Data-driven balance knob dump for designers / CI (Phase 27).
 * Mirrors live [ContentPack] fields — changing content-pack.json is the only
 * way to retune; this export never invents new knobs in code.
 */
object BalanceExport {
    const val SCHEMA = "fish.balance.v2"

    fun build(content: ContentPack): JsonObject = buildJsonObject {
        put("schema", SCHEMA)
        put("contentVersion", content.contentVersion)
        put("ticksPerSecond", content.ticksPerSecond)
        put(
            "derivedRateFormulas",
            buildJsonObject {
                put("abandonPermille", "lost_customers * 1000 / (sales + lost_customers)")
                put("wageRatioPermille", "wages_paid * 1000 / revenue")
                put("speciesCatchSharePermille", "speciesCatches[id] * 1000 / fish_caught")
            },
        )
        put(
            "player",
            buildJsonObject {
                val p = content.player
                put("startCoins", p.startCoins)
                put("startCarryCapacityUnits", p.startCarryCapacityUnits)
                put("moveSpeedMmPerTick", p.moveSpeedMmPerTick)
                put("transferIntervalTicks", p.transferIntervalTicks)
                put("startCatchSpeedPermille", p.startCatchSpeedPermille)
                put("startFishRegenPermille", p.startFishRegenPermille)
                put("timingWindowStartPermille", p.timingWindowStartPermille)
                put("timingWindowEndPermille", p.timingWindowEndPermille)
                put("timingPerfectStartPermille", p.timingPerfectStartPermille)
                put("timingPerfectEndPermille", p.timingPerfectEndPermille)
                put("timingGoodBonusPermille", p.timingGoodBonusPermille)
                put("timingPerfectBonusPermille", p.timingPerfectBonusPermille)
            },
        )
        put(
            "offline",
            buildJsonObject {
                put("capHours", content.offline.capHours)
                put("summaryMinSeconds", content.offline.summaryMinSeconds)
            },
        )
        put(
            "economy",
            buildJsonObject {
                val e = content.economy
                put("requires", JsonArray(e.requires.map { JsonPrimitive(it) }))
                put("maintenancePeriodTicks", e.maintenancePeriodTicks)
                put("maintenanceCoinsPerStation", e.maintenanceCoinsPerStation)
                put(
                    "wear",
                    buildJsonObject {
                        put("checkPeriodTicks", e.wear.checkPeriodTicks)
                        put("chancePermille", e.wear.chancePermille)
                        put("breakChancePermille", e.wear.breakChancePermille)
                        put("slowDurationTicks", e.wear.slowDurationTicks)
                        put("slowProcessMultPermille", e.wear.slowProcessMultPermille)
                        put("repairCoins", e.wear.repairCoins)
                    },
                )
                put("counterSpoilPeriodTicks", e.counterSpoilPeriodTicks)
                put("counterSpoilUnits", e.counterSpoilUnits)
                put("bagFishSpoilPeriodTicks", e.bagFishSpoilPeriodTicks)
                put("bagFishSpoilUnits", e.bagFishSpoilUnits)
                put(
                    "scarcityPriceCurvePermille",
                    JsonArray(e.scarcityPriceCurvePermille.map { JsonPrimitive(it) }),
                )
            },
        )
        put(
            "ecology",
            buildJsonObject {
                val eco = content.ecology
                put("dayLengthTicks", eco.dayLengthTicks)
                put(
                    "parts",
                    buildJsonArray {
                        for (part in eco.parts) {
                            add(
                                buildJsonObject {
                                    put("id", part.id)
                                    put("name", part.name)
                                    put("endPermille", part.endPermille)
                                    put("regenMultPermille", part.regenMultPermille)
                                    put("catchSpeedMultPermille", part.catchSpeedMultPermille)
                                },
                            )
                        }
                    },
                )
            },
        )
        put(
            "staffProgression",
            buildJsonObject {
                val sp = content.staffProgression
                put("maxLevel", sp.maxLevel)
                put("xpThresholds", JsonArray(sp.xpThresholds.map { JsonPrimitive(it) }))
                put("moveSpeedPermillePerLevel", sp.moveSpeedPermillePerLevel)
                put("catchSpeedPermillePerLevel", sp.catchSpeedPermillePerLevel)
                put("carryBonusEveryLevels", sp.carryBonusEveryLevels)
                put("xpFishCaught", sp.xpFishCaught)
                put("xpItemMoved", sp.xpItemMoved)
                put("xpSaleAssisted", sp.xpSaleAssisted)
                put("traitsOnHire", sp.traitsOnHire)
                put(
                    "shifts",
                    buildJsonObject {
                        put("baseOnShiftSlots", sp.shifts.baseOnShiftSlots)
                        put("overtimeWagePermille", sp.shifts.overtimeWagePermille)
                        put("supervisorExtraSlots", sp.shifts.supervisorExtraSlots)
                    },
                )
                put(
                    "roleBuffs",
                    buildJsonObject {
                        put("greeterPatienceDrainMultPermille", sp.roleBuffs.greeterPatienceDrainMultPermille)
                        put(
                            "smokerSpecialistProcessSpeedPermille",
                            sp.roleBuffs.smokerSpecialistProcessSpeedPermille,
                        )
                        put("iceRunnerFragileSpoilTierMin", sp.roleBuffs.iceRunnerFragileSpoilTierMin)
                        put("iceRunnerSpoilScoreBonus", sp.roleBuffs.iceRunnerSpoilScoreBonus)
                    },
                )
                put(
                    "loadouts",
                    buildJsonObject {
                        put(
                            "slots",
                            buildJsonArray {
                                for (slot in sp.loadouts.slots) {
                                    add(
                                        buildJsonObject {
                                            put("id", slot.id)
                                            put("name", slot.name)
                                            put(
                                                "upgradeIds",
                                                buildJsonArray { slot.upgradeIds.forEach { add(JsonPrimitive(it)) } },
                                            )
                                        },
                                    )
                                }
                            },
                        )
                    },
                )
                put(
                    "traits",
                    buildJsonArray {
                        for (t in sp.traits) {
                            add(
                                buildJsonObject {
                                    put("id", t.id)
                                    put("name", t.name)
                                    put("weight", t.weight)
                                    put("moveSpeedPermille", t.moveSpeedPermille)
                                    put("catchSpeedPermille", t.catchSpeedPermille)
                                    put("carryBonus", t.carryBonus)
                                    put("transferIntervalMultPermille", t.transferIntervalMultPermille)
                                },
                            )
                        }
                    },
                )
            },
        )
        put(
            "routing",
            buildJsonObject {
                val r = content.routing
                put("urgencyWeight", r.urgencyWeight)
                put("distanceWeight", r.distanceWeight)
                put("demandWeight", r.demandWeight)
                put("supervisorDemandBoostPermille", r.supervisorDemandBoostPermille)
            },
        )
        put(
            "automationAlerts",
            buildJsonObject {
                val a = content.automationAlerts
                put("machineIdleTicksDuringRush", a.machineIdleTicksDuringRush)
                put("alertCooldownTicks", a.alertCooldownTicks)
            },
        )
        put(
            "decor",
            buildJsonObject {
                put(
                    "items",
                    buildJsonArray {
                        for (d in content.decor.items) {
                            add(
                                buildJsonObject {
                                    put("id", d.id)
                                    put("name", d.name)
                                    put("cost", d.cost)
                                    put("patienceBonusTicks", d.patienceBonusTicks)
                                    d.requiresCosmetic?.let { put("requiresCosmetic", it) }
                                },
                            )
                        }
                    },
                )
            },
        )
        put(
            "seasonalEvents",
            buildJsonObject {
                put(
                    "events",
                    buildJsonArray {
                        for (e in content.seasonalEvents.events) {
                            add(
                                buildJsonObject {
                                    put("id", e.id)
                                    put("name", e.name)
                                    put("periodTicks", e.periodTicks)
                                    put("startTick", e.startTick)
                                    put("durationTicks", e.durationTicks)
                                    e.banner?.let { put("banner", it) }
                                    put(
                                        "speciesWeightMultPermille",
                                        buildJsonObject {
                                            for ((sp, mult) in e.speciesWeightMultPermille.toSortedMap()) {
                                                put(sp, mult)
                                            }
                                        },
                                    )
                                },
                            )
                        }
                    },
                )
            },
        )
        put(
            "bank",
            buildJsonObject {
                put("loanPrincipal", content.bank.loanPrincipal)
                put("repayPermille", content.bank.repayPermille)
                put("repayAmount", content.bank.repayAmount())
                put("termTicks", content.bank.termTicks)
                put("collectionPeriodTicks", content.bank.collectionPeriodTicks)
                put("goalPresets", JsonArray(content.bank.goalPresets.map { JsonPrimitive(it) }))
                put("requires", JsonArray(content.bank.requires.map { JsonPrimitive(it) }))
            },
        )
        put(
            "species",
            buildJsonArray {
                for (s in content.species) {
                    add(
                        buildJsonObject {
                            put("id", s.id)
                            put("catchTicks", s.catchTicks)
                            put("baseValue", s.baseValue)
                            put("rarityWeight", s.rarityWeight)
                            put("carryUnits", s.carryUnits)
                            put("spoilTier", s.spoilTier)
                            val rare = s.rareUpgrade
                            if (rare != null) {
                                put(
                                    "rareUpgrade",
                                    buildJsonObject {
                                        put("to", rare.to)
                                        put("chancePermille", rare.chancePermille)
                                    },
                                )
                            } else {
                                put("rareUpgrade", JsonNull)
                            }
                        },
                    )
                }
            },
        )
        put(
            "products",
            buildJsonArray {
                for (p in content.products) {
                    add(
                        buildJsonObject {
                            put("id", p.id)
                            put("unitPrice", p.unitPrice)
                            put("carryUnits", p.carryUnits)
                            put("spoilTier", p.spoilTier)
                        },
                    )
                }
            },
        )
        put(
            "bait",
            buildJsonArray {
                for (b in content.bait) {
                    add(
                        buildJsonObject {
                            put("id", b.id)
                            put("carryUnits", b.carryUnits)
                            put("packQuantity", b.packQuantity)
                            put("cost", b.cost)
                            put("rareSpeciesWeightMultPermille", b.rareSpeciesWeightMultPermille)
                            put("rareChanceBonusPermille", b.rareChanceBonusPermille)
                        },
                    )
                }
            },
        )
        put(
            "recipes",
            buildJsonArray {
                for (r in content.recipes) {
                    add(
                        buildJsonObject {
                            put("id", r.id)
                            put("machine", r.machine)
                            put("durationTicks", r.durationTicks)
                            put(
                                "inputs",
                                buildJsonArray {
                                    r.inputs.forEach { iq ->
                                        add(buildJsonObject {
                                            put("item", iq.item); put("quantity", iq.quantity)
                                        })
                                    }
                                },
                            )
                            put(
                                "outputs",
                                buildJsonArray {
                                    r.outputs.forEach { iq ->
                                        add(buildJsonObject {
                                            put("item", iq.item); put("quantity", iq.quantity)
                                        })
                                    }
                                },
                            )
                        },
                    )
                }
            },
        )
        put(
            "customers",
            buildJsonArray {
                for (c in content.customers) {
                    add(
                        buildJsonObject {
                            put("id", c.id)
                            put("kind", c.kind.wire)
                            put("basketMin", c.basketMin)
                            put("basketMax", c.basketMax)
                            put("patienceTicks", c.patienceTicks)
                            put("spawnWeight", c.spawnWeight)
                            put("priceMultPermille", c.priceMultPermille)
                            put("unmetPriceMultPermille", c.unmetPriceMultPermille)
                            put("unmetPatienceDrainPermille", c.unmetPatienceDrainPermille)
                            put(
                                "dayPartSpawnMultPermille",
                                buildJsonObject {
                                    for ((k, v) in c.dayPartSpawnMultPermille.toSortedMap()) put(k, v)
                                },
                            )
                        },
                    )
                }
            },
        )
        put(
            "harborRushes",
            buildJsonArray {
                for (h in content.harbors) {
                    for (r in h.rushes) {
                        add(
                            buildJsonObject {
                                put("harborId", h.id)
                                put("id", r.id)
                                put("periodTicks", r.periodTicks)
                                put("startTick", r.startTick)
                                put("durationTicks", r.durationTicks)
                                put("spawnSpeedPermille", r.spawnSpeedPermille)
                                put("queueBonus", r.queueBonus)
                                put("priceMultPermille", r.priceMultPermille)
                            },
                        )
                    }
                }
            },
        )
        put(
            "harbors",
            buildJsonArray {
                for (h in content.harbors) {
                    add(
                        buildJsonObject {
                            put("id", h.id)
                            put("customerSpawnTicks", h.customerSpawnTicks)
                            put("customerWalkMmPerTick", h.customerWalkMmPerTick)
                            h.specialization?.let { sp ->
                                put(
                                    "specialization",
                                    buildJsonObject {
                                        put("id", sp.id)
                                        put("name", sp.name)
                                        put("maintenanceDiscountPerStation", sp.maintenanceDiscountPerStation)
                                        put("rareChanceBonusPermille", sp.rareChanceBonusPermille)
                                        put(
                                            "kindSpawnMultPermille",
                                            buildJsonObject {
                                                for ((k, v) in sp.kindSpawnMultPermille) put(k, v)
                                            },
                                        )
                                    },
                                )
                            }
                            put(
                                "fishingSpots",
                                buildJsonArray {
                                    for (s in h.fishingSpots) {
                                        add(
                                            buildJsonObject {
                                                put("zone", s.zone)
                                                put("stockMax", s.stockMax)
                                                put("regenTicks", s.regenTicks)
                                                put(
                                                    "regenCurvePermille",
                                                    JsonArray(s.regenCurvePermille.map { JsonPrimitive(it) }),
                                                )
                                                put(
                                                    "dayPartRegenMultPermille",
                                                    buildJsonObject {
                                                        for ((k, v) in s.dayPartRegenMultPermille) {
                                                            put(k, v)
                                                        }
                                                    },
                                                )
                                            },
                                        )
                                    }
                                },
                            )
                            put(
                                "counters",
                                buildJsonArray {
                                    for (c in h.counters) {
                                        add(
                                            buildJsonObject {
                                                put("id", c.id)
                                                put("capacityUnits", c.capacityUnits)
                                                put("checkoutTicks", c.checkoutTicks)
                                                put("maxQueue", c.maxQueue)
                                            },
                                        )
                                    }
                                },
                            )
                        },
                    )
                }
            },
        )
        put(
            "workers",
            buildJsonArray {
                for (w in content.workers) {
                    add(
                        buildJsonObject {
                            put("id", w.id)
                            put("role", w.role.wire)
                            put("hireCost", w.hireCost)
                            put("maxHired", w.maxHired)
                            put("carryCapacityUnits", w.carryCapacityUnits)
                            put("moveSpeedMmPerTick", w.moveSpeedMmPerTick)
                            put("catchSpeedPermille", w.catchSpeedPermille)
                            put("transferIntervalTicks", w.transferIntervalTicks)
                            put("leaseTicks", w.leaseTicks)
                        },
                    )
                }
            },
        )
        put(
            "upgrades",
            buildJsonArray {
                for (u in content.upgrades) {
                    add(
                        buildJsonObject {
                            put("id", u.id)
                            put("cost", u.cost)
                            put("effect", effectJson(u.effect))
                        },
                    )
                }
            },
        )
        put(
            "contracts",
            buildJsonObject {
                val c = content.contracts
                put("boardSlots", c.boardSlots)
                put("maxActive", c.maxActive)
                put("refreshPeriodTicks", c.refreshPeriodTicks)
                put(
                    "templates",
                    buildJsonArray {
                        for (t in c.templates) {
                            add(
                                buildJsonObject {
                                    put("id", t.id)
                                    put("item", t.item)
                                    put("quantity", t.quantity)
                                    put("durationTicks", t.durationTicks)
                                    put("payout", t.payout)
                                    put("penalty", t.penalty)
                                    put("kind", t.kind.wire)
                                    put("payoutEscalatePermille", t.payoutEscalatePermille)
                                    put("penaltyEscalatePermille", t.penaltyEscalatePermille)
                                    put("maxStreak", t.maxStreak)
                                    put("failCooldownTicks", t.failCooldownTicks)
                                },
                            )
                        }
                    },
                )
            },
        )
        put(
            "trophies",
            buildJsonObject {
                val t = content.trophies
                put("sizeMinPermille", t.sizeMinPermille)
                put("sizeMaxPermille", t.sizeMaxPermille)
                put(
                    "sets",
                    buildJsonArray {
                        for (set in t.sets) {
                            add(
                                buildJsonObject {
                                    put("id", set.id)
                                    put("speciesCount", set.species.size)
                                    put("completeStat", set.completeStat)
                                },
                            )
                        }
                    },
                )
            },
        )
        put(
            "prestige",
            buildJsonObject {
                val p = content.prestige
                put("ratingThresholds", JsonArray(p.ratingThresholds.map { JsonPrimitive(it) }))
                put(
                    "ratingPriceMultPermille",
                    JsonArray(p.ratingPriceMultPermille.map { JsonPrimitive(it) }),
                )
                put(
                    "milestones",
                    buildJsonArray {
                        for (m in p.milestones) {
                            add(
                                buildJsonObject {
                                    put("id", m.id)
                                    put("goalStat", m.goal.stat)
                                    put("goalAtLeast", m.goal.atLeast)
                                    put("rewardCoins", m.reward.coins)
                                    put("rewardCatchSpeedPermille", m.reward.catchSpeedPermille)
                                    put("rewardPriceBonusPermille", m.reward.priceBonusPermille)
                                },
                            )
                        }
                    },
                )
            },
        )
        put(
            "reputation",
            buildJsonObject {
                val rep = content.reputation
                put("minSample", rep.minSample)
                put("neutralScorePermille", rep.neutralScorePermille)
                put(
                    "scoreBandThresholdsPermille",
                    JsonArray(rep.scoreBandThresholdsPermille.map { JsonPrimitive(it) }),
                )
                put(
                    "kindSpawnMultPermille",
                    buildJsonArray {
                        for (row in rep.kindSpawnMultPermille) {
                            add(
                                buildJsonObject {
                                    for ((k, v) in row.toSortedMap()) put(k, v)
                                },
                            )
                        }
                    },
                )
                put("unmetPreferencePenaltyPermille", rep.unmetPreferencePenaltyPermille)
                put("coachingLostRatioPermille", rep.coachingLostRatioPermille)
                put("coachingPraiseScorePermille", rep.coachingPraiseScorePermille)
            },
        )
    }

    fun encode(content: ContentPack): String = build(content).toString()

    private fun effectJson(e: UpgradeEffect): JsonObject = when (e) {
        is UpgradeEffect.CarryCapacity -> buildJsonObject {
            put("kind", "carry_capacity"); put("capacityUnits", e.capacityUnits)
        }
        is UpgradeEffect.RecipeDuration -> buildJsonObject {
            put("kind", "recipe_duration"); put("machine", e.machine)
            put("recipe", e.recipe); put("durationTicks", e.durationTicks)
        }
        is UpgradeEffect.CatchSpeed -> buildJsonObject {
            put("kind", "catch_speed"); put("speedPermille", e.speedPermille)
        }
        is UpgradeEffect.GrantBait -> buildJsonObject {
            put("kind", "grant_bait"); put("bait", e.bait); put("quantity", e.quantity)
        }
        is UpgradeEffect.TimingWindow -> buildJsonObject {
            put("kind", "timing_window")
            put("windowStartPermille", e.windowStartPermille)
            put("windowEndPermille", e.windowEndPermille)
            put("perfectStartPermille", e.perfectStartPermille)
            put("perfectEndPermille", e.perfectEndPermille)
        }
        is UpgradeEffect.FishRegen -> buildJsonObject {
            put("kind", "fish_regen"); put("speedPermille", e.speedPermille)
        }
        is UpgradeEffect.UnlockFishingSpot -> buildJsonObject {
            put("kind", "unlock_fishing_spot"); put("zone", e.zone)
        }
        is UpgradeEffect.UnlockMachine -> buildJsonObject {
            put("kind", "unlock_machine"); put("machine", e.machine)
        }
        is UpgradeEffect.UnlockCounter -> buildJsonObject {
            put("kind", "unlock_counter"); put("pad", e.pad)
        }
        is UpgradeEffect.WorkerMoveSpeed -> buildJsonObject {
            put("kind", "worker_move_speed"); put("speedPermille", e.speedPermille)
        }
        is UpgradeEffect.WorkerCarry -> buildJsonObject {
            put("kind", "worker_carry"); put("capacityUnits", e.capacityUnits)
        }
        is UpgradeEffect.WorkerCatchSpeed -> buildJsonObject {
            put("kind", "worker_catch_speed"); put("speedPermille", e.speedPermille)
        }
        is UpgradeEffect.WorkerWage -> buildJsonObject {
            put("kind", "worker_wage"); put("coinsPerWorkerPerHour", e.coinsPerWorkerPerHour)
        }
        is UpgradeEffect.MaintenanceDiscount -> buildJsonObject {
            put("kind", "maintenance_discount"); put("coinsOffPerStation", e.coinsOffPerStation)
        }
        is UpgradeEffect.BagSpoilResist -> buildJsonObject {
            put("kind", "bag_spoil_resist"); put("periodMultPermille", e.periodMultPermille)
        }
        is UpgradeEffect.CounterSpoilResist -> buildJsonObject {
            put("kind", "counter_spoil_resist"); put("periodMultPermille", e.periodMultPermille)
        }
    }
}
