package com.willio.jeanvilma.fishshopping

import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.willio.jeanvilma.fishshopping.billing.BillingActivityHost
import com.willio.jeanvilma.fishshopping.game.GameViewModel
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
        setContent {
            FishShoppingTheme {
                GameScreen(game)
            }
        }
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
