package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.content.ContentLoader
import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import org.junit.Assert.assertEquals
import java.io.File

/** Locates the repository's shared/ folder from the module's working directory. */
object Shared {
    val root: File = sequenceOf(File("../shared"), File("shared"), File("../../shared"))
        .firstOrNull { File(it, "content/content-pack.json").exists() }
        ?: error("Cannot find shared/ from ${File(".").absolutePath}")

    fun text(path: String) = File(root, path).readText()

    val content: ContentPack by lazy { ContentLoader.load(text("content/content-pack.json")) }
}

const val HARBOR = "harbor.sunrise_pier"

fun newSim(seed: Int = 1234, content: ContentPack = Shared.content) =
    Simulation(content, GameState.newGame(content, HARBOR, seed))

/** Steps one tick and fails the test on any invariant violation. */
fun Simulation.checkedStep(commands: List<Command> = emptyList()): List<GameEvent> {
    val events = step(commands)
    assertEquals("Invariants at tick ${state.tick}", emptyList<String>(), invariantProblems())
    return events
}

/**
 * Deterministic test driver that walks the player to targets with Move commands.
 * Used to record shared fixtures; the fixtures store only the resulting commands.
 */
class Autopilot(private val sim: Simulation) {
    val recorded = mutableListOf<Pair<Long, Command.Move>>()
    private var lastMove = Command.Move(0, 0)

    fun moveCommandToward(x: Int, z: Int): Command.Move {
        val p = sim.state.player
        val dx = (x - p.x).toLong()
        val dz = (z - p.z).toLong()
        val dist = SafeMath.isqrt(dx * dx + dz * dz)
        val speed = sim.content.player.moveSpeedMmPerTick.toLong()
        if (dist <= 50) return Command.Move(0, 0)
        val scale = if (dist < speed) 1000L * dist / speed else 1000L
        return Command.Move((dx * scale / dist).toInt(), (dz * scale / dist).toInt())
    }

    /** One tick. Records a Move command only when it changes. */
    fun tick(move: Command.Move, extra: List<Command> = emptyList()): List<GameEvent> {
        val cmds = mutableListOf<Command>()
        if (move != lastMove) {
            cmds += move
            recorded += (sim.state.tick + 1) to move
            lastMove = move
        }
        cmds += extra
        return sim.checkedStep(cmds)
    }

    fun walkTo(x: Int, z: Int, maxTicks: Int = 2000) {
        repeat(maxTicks) {
            val m = moveCommandToward(x, z)
            if (m.x == 0 && m.z == 0) {
                tick(m)
                return
            }
            tick(m)
        }
        error("walkTo($x,$z) did not arrive; at ${sim.state.player.x},${sim.state.player.z}")
    }

    fun waitUntil(maxTicks: Int, cond: () -> Boolean) {
        repeat(maxTicks) {
            if (cond()) return
            tick(Command.Move(0, 0))
        }
    }
}
