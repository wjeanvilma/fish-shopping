package com.willio.jeanvilma.fishshopping.core.content

/**
 * Human-readable inventory of balance/content entities editors touch most
 * (species, recipes, quests). Mirrors web `contentCatalog.ts`.
 */
object ContentCatalog {
    fun summary(pack: ContentPack): String = buildString {
        appendLine("counts:")
        appendLine("  species=${pack.species.size}")
        appendLine("  products=${pack.products.size}")
        appendLine("  recipes=${pack.recipes.size}")
        appendLine("  machines=${pack.machines.size}")
        appendLine("  upgrades=${pack.upgrades.size}")
        appendLine("  quests=${pack.quests.size}")
        appendLine("  workers=${pack.workers.size}")
        appendLine("  customers=${pack.customers.size}")
        appendLine("  contracts=${pack.contracts.templates.size}")
        appendLine("  harbors=${pack.harbors.size}")
        append("  tutorial=${pack.tutorial.size}")
    }

    fun detail(pack: ContentPack): String = buildString {
        appendLine("species:")
        for (s in pack.species) {
            appendLine(
                "  ${s.id}  catch=${s.catchTicks}t value=${s.baseValue} weight=${s.rarityWeight}" +
                    (s.rareUpgrade?.let { " rare→${it.to}@${it.chancePermille}" } ?: ""),
            )
        }
        appendLine("recipes:")
        for (r in pack.recipes) {
            val inputs = r.inputs.joinToString("+") { "${it.quantity}×${it.item}" }
            val outputs = r.outputs.joinToString("+") { "${it.quantity}×${it.item}" }
            appendLine("  ${r.id}  ${r.machine}  ${r.durationTicks}t  $inputs → $outputs")
        }
        appendLine("quests:")
        for (q in pack.quests) {
            appendLine(
                "  ${q.id}  ${q.name}  goal=${q.goal.stat}≥${q.goal.atLeast}" +
                    "  rewardCoins=${q.reward.coins}",
            )
        }
    }
}
