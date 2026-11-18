package com.willio.jeanvilma.fishshopping

import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.willio.jeanvilma.fishshopping.billing.BillingActivityHost
import com.willio.jeanvilma.fishshopping.deeplink.DeepLinkHandler
import com.willio.jeanvilma.fishshopping.game.GameUiState
import com.willio.jeanvilma.fishshopping.game.GameViewModel
import com.willio.jeanvilma.fishshopping.persistence.ThemePreference
import com.willio.jeanvilma.fishshopping.ui.hud.GameScreen
import com.willio.jeanvilma.fishshopping.ui.theme.FishShoppingTheme

class MainActivity : ComponentActivity() {

    private val game: GameViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // Immersive play (portrait + landscape); bars return with a swipe.
        WindowCompat.getInsetsController(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        // Finish 3.0 Phase 18 — reschedule opt-in daily-goal reminder after process start.
        game.syncDailyGoalReminders()
        // Finish 3.0 Phase 20 — App Links / custom-scheme cold start.
        game.applyDeepLink(DeepLinkHandler.parse(intent))
        setContent {
            val ui by game.ui.collectAsState()
            val themePreference = when (val s = ui) {
                is GameUiState.Ready -> s.settings.themePreference
                is GameUiState.Title -> s.settings.themePreference
                else -> ThemePreference.SYSTEM
            }
            FishShoppingTheme(themePreference = themePreference) {
                GameScreen(game)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        // Finish 3.0 Phase 20 — warm App Link / custom-scheme while Activity is alive.
        game.applyDeepLink(DeepLinkHandler.parse(intent))
    }

    // Phase 28 / blueprint lifecycle: pause sim + abandon audio focus + AtomicFile checkpoint
    // on background; rotation is handled via configChanges (no Activity recreate).
    // Post-1.0 Phase 1: bind Activity for Play Billing launchBillingFlow.
    // Post-1.0 Phase 13: onTrimMemory checkpoint + explicit onConfigurationChanged (no recreate).
    override fun onStart() {
        super.onStart()
        BillingActivityHost.attach(this)
        game.resume()
    }

    override fun onStop() {
        game.pause()
        BillingActivityHost.detach(this)
        super.onStop()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        // Phase 13 rotate matrix: Activity is not recreated; Compose HUD reflows and Filament
        // keeps its GL context. No ViewModel reset.
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        // Phase 13 low-memory matrix: GameViewModel checkpoints from RUNNING_LOW (level≥10).
        game.onTrimMemory(level)
    }
}
