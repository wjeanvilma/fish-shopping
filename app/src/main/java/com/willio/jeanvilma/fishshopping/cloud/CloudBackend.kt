package com.willio.jeanvilma.fishshopping.cloud

import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Pluggable cloud save backend. Local play never requires a backend — [NullCloudBackend]
 * is the default. When `fish.firebase.apiKey` + `fish.firebase.projectId` are set in
 * local.properties / BuildConfig, [FirestoreRestBackend] links an anonymous Identity
 * Toolkit account to `users/{uid}/saves/harbor`.
 *
 * Firestore security rules are not shipped in-repo (ask for a snippet if you need them).
 */
interface CloudBackend {
    val kind: String
    val available: Boolean
    fun ensureAccount(existingUid: String?): String
    fun get(uid: String): String?
    fun put(uid: String, snapshot: String)
    fun clear(uid: String)
}

class NullCloudBackend : CloudBackend {
    override val kind = "null"
    override val available = false
    override fun ensureAccount(existingUid: String?): String = existingUid ?: UUID.randomUUID().toString()
    override fun get(uid: String): String? = null
    override fun put(uid: String, snapshot: String) = Unit
    override fun clear(uid: String) = Unit
}

/** In-process remote for instrumentation / unit tests of the merge path. */
class MemoryCloudBackend : CloudBackend {
    override val kind = "memory"
    override val available = true
    private val slots = ConcurrentHashMap<String, String>()
    override fun ensureAccount(existingUid: String?): String = existingUid ?: UUID.randomUUID().toString()
    override fun get(uid: String): String? = slots[uid]
    override fun put(uid: String, snapshot: String) { slots[uid] = snapshot }
    override fun clear(uid: String) { slots.remove(uid) }
}

class FirestoreRestBackend(
    private val apiKey: String,
    private val projectId: String,
) : CloudBackend {
    override val kind = "firestore"
    override val available = true
    @Volatile private var idToken: String? = null
    @Volatile private var uid: String? = null

    override fun ensureAccount(existingUid: String?): String {
        uid?.let { if (idToken != null) return it }
        val body = postJson(
            "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}",
            """{"returnSecureToken":true}""",
        )
        val json = JSONObject(body)
        uid = json.getString("localId")
        idToken = json.getString("idToken")
        return uid!!
    }

    override fun get(uid: String): String? {
        ensureAccount(uid)
        val conn = request("GET", "https://firestore.googleapis.com/v1/${docName(uid)}")
        return when (conn.responseCode) {
            404 -> null
            in 200..299 -> {
                val fields = JSONObject(conn.inputStream.bufferedReader().readText())
                    .optJSONObject("fields") ?: return null
                fields.optJSONObject("snapshot")?.optString("stringValue")
            }
            else -> error("Cloud get failed (${conn.responseCode})")
        }
    }

    override fun put(uid: String, snapshot: String) {
        ensureAccount(uid)
        var savedAt = 0L
        var checksum = ""
        runCatching {
            val env = JSONObject(snapshot)
            savedAt = env.optLong("savedAtEpochMs", 0L)
            checksum = env.optString("checksum", "")
        }
        val payload = """
            {"fields":{
              "snapshot":{"stringValue":${JSONObject.quote(snapshot)}},
              "savedAtEpochMs":{"integerValue":"$savedAt"},
              "checksum":{"stringValue":${JSONObject.quote(checksum)}}
            }}
        """.trimIndent()
        val patch = request(
            "PATCH",
            "https://firestore.googleapis.com/v1/${docName(uid)}",
            payload,
        )
        if (patch.responseCode in 200..299) return
        if (patch.responseCode == 404 || patch.responseCode == 400) {
            val create = request(
                "POST",
                "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents/users/${uid}/saves?documentId=harbor",
                payload,
            )
            if (create.responseCode !in 200..299) {
                error("Cloud put failed (${create.responseCode})")
            }
            return
        }
        error("Cloud put failed (${patch.responseCode})")
    }

    override fun clear(uid: String) {
        ensureAccount(uid)
        val conn = request("DELETE", "https://firestore.googleapis.com/v1/${docName(uid)}")
        if (conn.responseCode !in 200..299 && conn.responseCode != 404) {
            error("Cloud clear failed (${conn.responseCode})")
        }
    }

    private fun docName(uid: String) =
        "projects/$projectId/databases/(default)/documents/users/$uid/saves/harbor"

    private fun postJson(url: String, body: String): String {
        val conn = request("POST", url, body, auth = false)
        if (conn.responseCode !in 200..299) error("Cloud auth failed (${conn.responseCode})")
        return conn.inputStream.bufferedReader().readText()
    }

    private fun request(
        method: String,
        url: String,
        body: String? = null,
        auth: Boolean = true,
    ): HttpURLConnection {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 12_000
            readTimeout = 12_000
            doInput = true
            if (auth) setRequestProperty("Authorization", "Bearer $idToken")
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                OutputStreamWriter(outputStream, Charsets.UTF_8).use { it.write(body) }
            }
        }
        return conn
    }
}

object CloudBackends {
    @Volatile
    var override: CloudBackend? = null

    fun create(apiKey: String?, projectId: String?): CloudBackend {
        override?.let { return it }
        if (!apiKey.isNullOrBlank() && !projectId.isNullOrBlank()) {
            return FirestoreRestBackend(apiKey, projectId)
        }
        return NullCloudBackend()
    }
}
