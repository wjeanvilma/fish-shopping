package com.willio.jeanvilma.fishshopping.deeplink

import android.content.Intent
import android.net.Uri
import com.willio.jeanvilma.fishshopping.core.deeplink.DeepLinkRoutes

/**
 * Finish 3.0 Phase 20 — parse Android App Link / custom-scheme intents.
 */
object DeepLinkHandler {
    fun parse(intent: Intent?): DeepLinkRoutes.Intent {
        if (intent == null) return DeepLinkRoutes.Intent()
        val data = intent.data ?: return DeepLinkRoutes.Intent(raw = intent.action.orEmpty())
        return parseUri(data)
    }

    fun parseUri(uri: Uri): DeepLinkRoutes.Intent =
        DeepLinkRoutes.parse(
            scheme = uri.scheme,
            host = uri.host,
            path = uri.path,
            query = uri.query,
            fragment = uri.fragment,
            raw = uri.toString(),
        )

    fun isAppLink(uri: Uri?): Boolean {
        if (uri == null) return false
        val https = uri.scheme.equals("https", ignoreCase = true) ||
            uri.scheme.equals("http", ignoreCase = true)
        return https && uri.host.equals(DeepLinkRoutes.HOST, ignoreCase = true)
    }

    fun isCustomScheme(uri: Uri?): Boolean =
        uri?.scheme.equals(DeepLinkRoutes.CUSTOM_SCHEME, ignoreCase = true)
}
