package com.elitesoftwarestudio.veye.ui.main

import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitesoftwarestudio.veye.MainActivityIntents
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import com.elitesoftwarestudio.veye.navigation.MainDestination
import com.elitesoftwarestudio.veye.push.PushNavigationStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val pushNavigationStore: PushNavigationStore,
    private val userPreferencesRepository: UserPreferencesRepository,
) : ViewModel() {

    private val validRoutes = MainDestination.entries.map { it.route }.toSet()

    val pendingTabRoute = pushNavigationStore.pendingTabRoute

    /**
     * Drives `SplashScreen.setKeepOnScreenCondition` in [com.elitesoftwarestudio.veye.MainActivity].
     * Stays `true` for [SPLASH_MIN_HOLD_MS] so the brand mark has a moment to register
     * before the system tears the splash down, then flips `false`. We deliberately do
     * NOT gate this on auth or network: this is a safety app and a slow Firebase
     * round-trip should never delay the user reaching the home shell.
     */
    private val _splashHoldActive = MutableStateFlow(true)
    val splashHoldActive: StateFlow<Boolean> = _splashHoldActive.asStateFlow()

    /**
     * `null` until the first DataStore emission — `MainActivity` keeps the splash on
     * screen while we resolve this so the user never sees a flash of the home shell
     * before being routed into onboarding (or vice-versa).
     *
     * This is a *live* projection of the pref, not a one-shot read, so any later flip
     * (e.g. the debug "Reset onboarding" action in Profile) immediately swaps the UI
     * back to [com.elitesoftwarestudio.veye.ui.onboarding.OnboardingHost] without
     * needing an app restart.
     */
    val onboardingNeeded: StateFlow<Boolean?> = userPreferencesRepository.onboardingCompleted
        .map<Boolean, Boolean?> { completed -> !completed }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    init {
        viewModelScope.launch {
            delay(SPLASH_MIN_HOLD_MS)
            _splashHoldActive.value = false
        }
    }

    fun handleIntent(intent: Intent?) {
        val tab = intent?.getStringExtra(MainActivityIntents.EXTRA_TARGET_TAB) ?: return
        if (tab in validRoutes) {
            pushNavigationStore.setPendingTab(tab)
        }
    }

    fun consumePendingTab() {
        pushNavigationStore.consumePendingTab()
    }

    private companion object {
        // Static brand mark — long enough for the user to register the logo as
        // intentional, short enough to never feel like a delay. Pair with the
        // 240ms exit crossfade in MainActivity for a perceived hand-off near 700ms.
        const val SPLASH_MIN_HOLD_MS = 450L
    }
}
