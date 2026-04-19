package com.elitesoftwarestudio.veye

import android.Manifest
import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.View
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.splashscreen.SplashScreenViewProvider
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.interpolator.view.animation.FastOutSlowInInterpolator
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitesoftwarestudio.veye.ui.util.localeKey
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import com.elitesoftwarestudio.veye.ui.main.MainViewModel
import com.elitesoftwarestudio.veye.ui.main.ThemeViewModel
import com.elitesoftwarestudio.veye.ui.theme.VEYeTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val themeViewModel: ThemeViewModel by viewModels()
    private val mainViewModel: MainViewModel by viewModels()

    /**
     * First-launch system prompt for `POST_NOTIFICATIONS` (Android 13+). The Profile
     * screen still re-requests if the user toggles notifications back on later.
     * We don't need the granted/denied result here — `VeyeFirebaseMessagingService`
     * registers + delivers regardless, and FCM token sync runs from `VEYeApplication`.
     */
    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        Log.d(TAG, "POST_NOTIFICATIONS granted=$granted")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        // Hold the splash on screen while the "Watchful Eye" AVD plays. The condition
        // flips false in MainViewModel after SPLASH_MIN_HOLD_MS so initial frames of the
        // home shell never overlap the brand animation.
        splashScreen.setKeepOnScreenCondition { mainViewModel.splashHoldActive.value }
        splashScreen.setOnExitAnimationListener(::handleSplashExit)
        super.onCreate(savedInstanceState)
        mainViewModel.handleIntent(intent)
        maybeRequestNotificationPermission()
        enableEdgeToEdge()
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isStatusBarContrastEnforced = false
            window.isNavigationBarContrastEnforced = false
        }
        setContent {
            val localeKey = LocalConfiguration.current.localeKey()
            key(localeKey) {
                val systemDark = isSystemInDarkTheme()
                val themeMode by themeViewModel.themeMode.collectAsStateWithLifecycle()
                val darkTheme = when (themeMode) {
                    UserPreferencesRepository.THEME_DARK -> true
                    UserPreferencesRepository.THEME_LIGHT -> false
                    else -> systemDark
                }
                val pendingTab by mainViewModel.pendingTabRoute.collectAsStateWithLifecycle()
                VEYeTheme(darkTheme = darkTheme) {
                    val view = LocalView.current
                    SideEffect {
                        val w = (view.context as? Activity)?.window ?: return@SideEffect
                        WindowCompat.getInsetsController(w, view).apply {
                            isAppearanceLightStatusBars = !darkTheme
                            isAppearanceLightNavigationBars = !darkTheme
                        }
                    }
                    VEYeRoot(
                        pendingTabRoute = pendingTab,
                        onConsumedPendingTab = { mainViewModel.consumePendingTab() },
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        mainViewModel.handleIntent(intent)
    }

    /**
     * Hand off from the platform splash to the home shell with a tiny scale-up + fade
     * on the brand mark. We honour the system-wide "remove animations" accessibility
     * setting by skipping straight to [SplashScreenViewProvider.remove] when animator
     * scale is zero — important for users on low-power profiles or with motion
     * sensitivities.
     */
    private fun handleSplashExit(provider: SplashScreenViewProvider) {
        val animScale =
            runCatching {
                Settings.Global.getFloat(
                    contentResolver,
                    Settings.Global.ANIMATOR_DURATION_SCALE,
                    1f,
                )
            }.getOrDefault(1f)
        if (animScale == 0f) {
            provider.remove()
            return
        }

        val splashView = provider.view
        val iconView = provider.iconView
        val scaleX =
            ObjectAnimator.ofFloat(iconView, View.SCALE_X, 1f, 1.06f).setDuration(EXIT_ANIM_MS)
        val scaleY =
            ObjectAnimator.ofFloat(iconView, View.SCALE_Y, 1f, 1.06f).setDuration(EXIT_ANIM_MS)
        val fade =
            ObjectAnimator.ofFloat(splashView, View.ALPHA, 1f, 0f).setDuration(EXIT_ANIM_MS)
        AnimatorSet().apply {
            interpolator = FastOutSlowInInterpolator()
            playTogether(scaleX, scaleY, fade)
            addListener(
                object : AnimatorListenerAdapter() {
                    override fun onAnimationEnd(animation: Animator) {
                        provider.remove()
                    }
                },
            )
            start()
        }
    }

    private fun maybeRequestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val alreadyGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
        if (alreadyGranted) return
        // Note: after the user explicitly denies twice the system silently no-ops this
        // call. The Profile screen surfaces a Settings deep-link in that case.
        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    private companion object {
        const val TAG = "MainActivity"
        const val EXIT_ANIM_MS = 240L
    }
}
