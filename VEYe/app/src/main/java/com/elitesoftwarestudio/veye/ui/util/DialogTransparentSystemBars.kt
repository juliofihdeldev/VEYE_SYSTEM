package com.elitesoftwarestudio.veye.ui.util

import android.graphics.Color
import android.os.Build
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.window.DialogWindowProvider
import androidx.core.view.WindowCompat

/** Transparent status/navigation bars for [androidx.compose.ui.window.Dialog] windows (matches MainActivity edge-to-edge). */
@Composable
fun DialogTransparentSystemBars() {
    val view = LocalView.current
    SideEffect {
        val w = (view.parent as? DialogWindowProvider)?.window ?: return@SideEffect
        WindowCompat.setDecorFitsSystemWindows(w, false)
        w.statusBarColor = Color.TRANSPARENT
        w.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            w.isStatusBarContrastEnforced = false
            w.isNavigationBarContrastEnforced = false
        }
    }
}
