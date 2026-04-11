package com.elitesoftwarestudio.veye.ui.main

import android.content.Intent
import androidx.lifecycle.ViewModel
import com.elitesoftwarestudio.veye.MainActivityIntents
import com.elitesoftwarestudio.veye.navigation.MainDestination
import com.elitesoftwarestudio.veye.push.PushNavigationStore
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val pushNavigationStore: PushNavigationStore,
) : ViewModel() {

    private val validRoutes = MainDestination.entries.map { it.route }.toSet()

    val pendingTabRoute = pushNavigationStore.pendingTabRoute

    fun handleIntent(intent: Intent?) {
        val tab = intent?.getStringExtra(MainActivityIntents.EXTRA_TARGET_TAB) ?: return
        if (tab in validRoutes) {
            pushNavigationStore.setPendingTab(tab)
        }
    }

    fun consumePendingTab() {
        pushNavigationStore.consumePendingTab()
    }
}
