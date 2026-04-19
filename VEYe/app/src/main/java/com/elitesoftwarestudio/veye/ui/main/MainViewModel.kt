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
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
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
     * `null` until the DataStore read finishes — `MainActivity` keeps the splash on
     * screen while we resolve this so the user never sees a flash of the home shell
     * before being routed into onboarding (or vice-versa).
     */
    private val _onboardingNeeded = MutableStateFlow<Boolean?>(null)
    val onboardingNeeded: StateFlow<Boolean?> = _onboardingNeeded.asStateFlow()

    init {
        viewModelScope.launch {
            // DataStore read is fast (sub-ms in practice) but let it race the splash
            // hold so we always wait for whichever finishes last.
            _onboardingNeeded.value =
                !userPreferencesRepository.readOnboardingCompletedForStartup()
        }
        viewModelScope.launch {
            delay(SPLASH_MIN_HOLD_MS)
            _splashHoldActive.value = false
        }
    }

    /** Called by the OnboardingHost on completion to swap to the main app shell. */
    fun markOnboardingComplete() {
        _onboardingNeeded.value = false
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
