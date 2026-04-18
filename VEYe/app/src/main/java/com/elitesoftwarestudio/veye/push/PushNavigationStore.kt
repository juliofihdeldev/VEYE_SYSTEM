package com.elitesoftwarestudio.veye.push

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/** Pending tab from notification clicks (FCM) or legacy intent extras. */
@Singleton
class PushNavigationStore @Inject constructor() {
    private val _pendingTabRoute = MutableStateFlow<String?>(null)
    val pendingTabRoute: StateFlow<String?> = _pendingTabRoute.asStateFlow()

    fun setPendingTab(route: String) {
        _pendingTabRoute.value = route
    }

    fun consumePendingTab() {
        _pendingTabRoute.value = null
    }
}
