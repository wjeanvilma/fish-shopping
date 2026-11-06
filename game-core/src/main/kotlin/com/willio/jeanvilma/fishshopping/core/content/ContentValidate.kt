package com.willio.jeanvilma.fishshopping.core.content

import java.io.File
import kotlin.system.exitProcess

/**
 * CLI entry for Phase 28 content tooling.
 *
 * Loads [content-pack.json], runs [ContentLoader] structure + [ContentValidator]
 * cross-refs, and prints a species / recipes / quests catalog summary.
 *
 * Usage: `./gradlew :game-core:validateContent`
 * Optional arg: absolute or relative path to a pack JSON.
 */
object ContentValidate {
    fun run(packFile: File, catalog: Boolean = false): Int {
        if (!packFile.isFile) {
            System.err.println("Content pack not found: ${packFile.absolutePath}")
            return 1
        }
        return try {
            val pack = ContentLoader.load(packFile.readText())
            println("OK ${pack.contentVersion}  (${packFile.normalize()})")
            println(ContentCatalog.summary(pack))
            if (catalog) println(ContentCatalog.detail(pack))
            0
        } catch (e: ContentException) {
            System.err.println(e.message)
            1
        } catch (e: Exception) {
            System.err.println("Content validate failed: ${e.message}")
            1
        }
    }
}

fun main(args: Array<String>) {
    val catalog = args.any { it == "--catalog" || it == "-c" }
    val pathArgs = args.filter { it != "--catalog" && it != "-c" }
    val packFile = when {
        pathArgs.isNotEmpty() -> File(pathArgs[0])
        else -> sequenceOf(
            File("../shared/content/content-pack.json"),
            File("shared/content/content-pack.json"),
            File("../../shared/content/content-pack.json"),
        ).firstOrNull { it.isFile }
            ?: File("shared/content/content-pack.json")
    }
    exitProcess(ContentValidate.run(packFile, catalog = catalog))
}
