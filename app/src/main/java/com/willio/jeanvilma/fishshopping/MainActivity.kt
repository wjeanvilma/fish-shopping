package com.willio.jeanvilma.fishshopping

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.willio.jeanvilma.fishshopping.game.GameViewModel
import com.willio.jeanvilma.fishshopping.ui.hud.GameScreen
import com.willio.jeanvilma.fishshopping.ui.theme.FishShoppingTheme

class MainActivity : ComponentActivity() {

    private val game: GameViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // Immersive landscape play; bars return with a swipe.
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

    // Blueprint "Lifecycle behavior": pause the simulation in the background and checkpoint.
    override fun onStart() {
        super.onStart()
        game.resume()
    }

    override fun onStop() {
        game.pause()
        super.onStop()
    }
}
