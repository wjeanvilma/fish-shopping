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
 * Phase 22: anonymous uid is restored across sessions via Secure Token refresh_token.
 * Firestore security rules are not shipped in-repo (ask for a snippet if you need them).
 */
data class CloudAuthSession(
    val uid: String,
    /** Identity Toolkit refresh token — persisted for guest recovery. Null for local backends. */
    val refreshToken: String?,
)

interface CloudBackend {
    val kind: String
    val available: Boolean
    fun ensureAccount(existingUid: String?, refreshToken: String?): CloudAuthSession
    fun get(uid: String): String?
    fun put(uid: String, snapshot: String)
    fun clear(uid: String)
}

class NullCloudBackend : CloudBackend {
    override val kind = "null"
    override val available = false
    override fun ensureAccount(existingUid: String?, refreshToken: String?): CloudAuthSession =
        CloudAuthSession(existingUid ?: UUID.randomUUID().toString(), null)
    override fun get(uid: String): String? = null
    override fun put(uid: String, snapshot: String) = Unit
    override fun clear(uid: String) = Unit
}

/** In-process remote for instrumentation / unit tests of the merge path. */
class MemoryCloudBackend : CloudBackend {
    override val kind = "memory"
    override val available = true
    private val slots = ConcurrentHashMap<String, String>()
    override fun ensureAccount(existingUid: String?, refreshToken: String?): CloudAuthSession =
        CloudAuthSession(existingUid ?: UUID.randomUUID().toString(), null)
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
    @Volatile private var refreshToken: String? = null

    override fun ensureAccount(existingUid: String?, existingRefresh: String?): CloudAuthSession {
        uid?.let { if (idToken != null) return CloudAuthSession(it, refreshToken) }
        if (!existingRefresh.isNullOrBlank()) {
            tryRefresh(existingRefresh)?.let { return it }
        }
        val body = postJson(
            "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey",
            """{"returnSecureToken":true}""",
        )
        val json = JSONObject(body)
        uid = json.getString("localId")
        idToken = json.getString("idToken")
        refreshToken = if (json.has("refreshToken")) {
            json.getString("refreshToken").takeIf { it.isNotBlank() }
        } else {
            null
        }
        return CloudAuthSession(uid!!, refreshToken)
    }

    private fun tryRefresh(token: String): CloudAuthSession? {
        return try {
            val body = postForm(
                "https://securetoken.googleapis.com/v1/token?key=$apiKey",
                "grant_type=refresh_token&refresh_token=${java.net.URLEncoder.encode(token, Charsets.UTF_8.name())}",
            )
            val json = JSONObject(body)
            val userId = json.optString("user_id", "")
            val idTok = json.optString("id_token", "")
            if (userId.isBlank() || idTok.isBlank()) return null
            uid = userId
            idToken = idTok
            refreshToken = json.optString("refresh_token", token).ifBlank { token }
            CloudAuthSession(userId, refreshToken)
        } catch (_: Exception) {
            null
        }
    }

    override fun get(uid: String): String? {
        ensureAccount(uid, refreshToken)
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
        ensureAccount(uid, refreshToken)
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
        ensureAccount(uid, refreshToken)
        val conn = request("DELETE", "https://firestore.googleapis.com/v1/${docName(uid)}")
        if (conn.responseCode !in 200..299 && conn.responseCode != 404) {
            error("Cloud clear failed (${conn.responseCode})")
        }
    }

    private fun docName(uid: String) =
        "projects/$projectId/databases/(default)/documents/${CloudProductionPath.documentPathFor(uid)}"

    private fun postJson(url: String, body: String): String {
        val conn = request("POST", url, body, auth = false)
        if (conn.responseCode !in 200..299) error("Cloud auth failed (${conn.responseCode})")
        return conn.inputStream.bufferedReader().readText()
    }

    private fun postForm(url: String, body: String): String {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 12_000
            readTimeout = 12_000
            doInput = true
            doOutput = true
            setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
            OutputStreamWriter(outputStream, Charsets.UTF_8).use { it.write(body) }
        }
        if (conn.responseCode !in 200..299) error("Cloud token refresh failed (${conn.responseCode})")
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
        if (CloudProductionPath.keysConfigured(apiKey, projectId)) {
            return FirestoreRestBackend(apiKey!!, projectId!!)
        }
        return NullCloudBackend()
    }
}
