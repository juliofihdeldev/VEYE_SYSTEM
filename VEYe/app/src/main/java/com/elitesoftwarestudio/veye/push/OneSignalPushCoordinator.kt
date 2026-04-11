package com.elitesoftwarestudio.veye.push

import com.elitesoftwarestudio.veye.navigation.MainDestination
import com.onesignal.OneSignal
import com.onesignal.notifications.INotificationClickEvent
import com.onesignal.notifications.INotificationClickListener
import com.onesignal.notifications.IPermissionObserver
import com.onesignal.user.state.IUserStateObserver
import com.onesignal.user.state.UserChangedState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OneSignalPushCoordinator @Inject constructor(
    private val pushNavigationStore: PushNavigationStore,
    private val oneSignalDeviceRepository: OneSignalDeviceRepository,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val validTabRoutes = MainDestination.entries.map { it.route }.toSet()

    private val clickListener = object : INotificationClickListener {
        override fun onClick(event: INotificationClickEvent) {
            val tab = event.notification.additionalData?.let { data ->
                optTabTarget(data)
            } ?: return
            if (tab in validTabRoutes) {
                pushNavigationStore.setPendingTab(tab)
            }
        }
    }

    private val permissionObserver = object : IPermissionObserver {
        override fun onNotificationPermissionChange(permission: Boolean) {
            if (permission) {
                scope.launch {
                    runCatching { oneSignalDeviceRepository.syncOnesignalIdToFirestore() }
                }
            }
        }
    }

    private val userStateObserver = object : IUserStateObserver {
        override fun onUserStateChange(state: UserChangedState) {
            scope.launch {
                runCatching { oneSignalDeviceRepository.syncOnesignalIdToFirestore() }
            }
        }
    }

    fun attachListeners() {
        OneSignal.Notifications.addClickListener(clickListener)
        OneSignal.Notifications.addPermissionObserver(permissionObserver)
        OneSignal.User.addObserver(userStateObserver)
    }
}

private fun optTabTarget(data: JSONObject): String? {
    val direct = data.optString("target_tab", "").takeIf { it.isNotBlank() }
    if (direct != null) return direct
    val custom = data.optJSONObject("custom") ?: return null
    return custom.optString("target_tab", "").takeIf { it.isNotBlank() }
}
