package com.willio.jeanvilma.fishshopping.core.ship

import java.io.File
import java.io.InputStream

/**
 * Large realistic loadtest JSON banks (save + telemetry) shared with web.
 * Mirrors shared/ship/loadtest-banks.json — probe headers/size without full parse.
 */
object LoadtestBanks {
    const val SCHEMA = "fish.ship.loadtest_banks.v1"
    const val CATALOG = "shared/ship/loadtest-banks.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-loadtest-banks.json"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26
    const val MIN_BYTES = 85_000_000L

    const val SAVE_FIXTURE = "shared/fixtures/loadtest-save-bank.json"
    const val TELEMETRY_FIXTURE = "shared/fixtures/loadtest-telemetry-bank.json"
    const val SAVE_ASSET = "loadtest-save-bank.json"
    const val TELEMETRY_ASSET = "loadtest-telemetry-bank.json"
    const val SAVE_SCHEMA = "fish.fixtures.loadtest_save_bank.v1"
    const val TELEMETRY_SCHEMA = "fish.fixtures.loadtest_telemetry_bank.v1"

    data class Probe(
        val pathOrAsset: String,
        val bytes: Long,
        val schema: String?,
        val label: String?,
        val contentVersion: String?,
        val schemaVersion: Int?,
        val sampleKey: String?,
        val floorsMet: Boolean,
    )

    fun probeFile(file: File, expectedSchema: String): Probe {
        if (!file.isFile) {
            return Probe(file.path, 0, null, null, null, null, null, false)
        }
        val bytes = file.length()
        val header = file.inputStream().use { readHeader(it) }
        return toProbe(file.path, bytes, header, expectedSchema)
    }

    fun probeStream(pathOrAsset: String, bytes: Long, stream: InputStream, expectedSchema: String): Probe {
        val header = readHeader(stream)
        return toProbe(pathOrAsset, bytes, header, expectedSchema)
    }

    fun measureFromRepo(root: File): Pair<Probe, Probe> {
        val save = probeFile(File(root, SAVE_FIXTURE), SAVE_SCHEMA)
        val tele = probeFile(File(root, TELEMETRY_FIXTURE), TELEMETRY_SCHEMA)
        return save to tele
    }

    private fun readHeader(stream: InputStream): String {
        val buf = ByteArray(4096)
        val n = stream.read(buf)
        return if (n <= 0) "" else String(buf, 0, n, Charsets.UTF_8)
    }

    private fun toProbe(path: String, bytes: Long, header: String, expectedSchema: String): Probe {
        val schema = extractField(header, "\$schema")
        val label = extractField(header, "label")
        val contentVersion = extractField(header, "contentVersion")
        val schemaVersion = extractInt(header, "schemaVersion")
        val sampleKey = when {
            header.contains("\"records\"") -> "records"
            header.contains("\"events\"") -> "events"
            else -> null
        }
        val floorsMet =
            bytes >= MIN_BYTES &&
                schema == expectedSchema &&
                contentVersion == CONTENT_VERSION &&
                (schemaVersion ?: 0) >= SCHEMA_VERSION
        return Probe(path, bytes, schema, label, contentVersion, schemaVersion, sampleKey, floorsMet)
    }

    private fun extractField(header: String, key: String): String? {
        val re = Regex("\"${Regex.escape(key)}\"\\s*:\\s*\"([^\"]+)\"")
        return re.find(header)?.groupValues?.get(1)
    }

    private fun extractInt(header: String, key: String): Int? {
        val re = Regex("\"${Regex.escape(key)}\"\\s*:\\s*(-?\\d+)")
        return re.find(header)?.groupValues?.get(1)?.toIntOrNull()
    }
}
