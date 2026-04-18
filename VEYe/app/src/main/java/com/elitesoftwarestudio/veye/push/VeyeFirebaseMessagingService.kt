package com.elitesoftwarestudio.veye.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.elitesoftwarestudio.veye.MainActivity
import com.elitesoftwarestudio.veye.MainActivityIntents
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.navigation.MainDestination
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Replaces OneSignal's notification + token plumbing.
 *
 * Responsibilities:
 *  - Persist token rotations to Postgres (`onNewToken`).
 *  - Render incoming pushes when the app is in the foreground (`onMessageReceived`),
 *    or when the server sent a data-only message. The system handles display itself
 *    when the message has a `notification` payload AND the app is backgrounded.
 *  - Build a PendingIntent that re-opens [MainActivity] with `EXTRA_TARGET_TAB` so
 *    notification taps deep-link into the right bottom-tab (mirrors the OneSignal
 *    `additionalData.target_tab` flow).
 */
@AndroidEntryPoint
class VeyeFirebaseMessagingService : FirebaseMessagingService() {

    @Inject
    lateinit var fcmDeviceRepository: FcmDeviceRepository

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val validTabRoutes by lazy { MainDestination.entries.map { it.route }.toSet() }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "onNewToken: ${token.take(12)}…")
        scope.launch {
            runCatching { fcmDeviceRepository.syncTokenToBackend(token) }
                .exceptionOrNull()?.let { Log.w(TAG, "token sync", it) }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val data = message.data
        val notification = message.notification
        val title = notification?.title
            ?: data["title"]
            ?: getString(R.string.app_name)
        val body = notification?.body
            ?: data["contents"]
            ?: data["body"]
            ?: return

        val targetTab = data["target_tab"]?.takeIf { it in validTabRoutes }
        showNotification(title, body, targetTab)
    }

    private fun showNotification(title: String, body: String, targetTab: String?) {
        val channelId = getString(R.string.default_notification_channel_id)
        ensureChannel(channelId)

        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (targetTab != null) {
                putExtra(MainActivityIntents.EXTRA_TARGET_TAB, targetTab)
            }
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            REQUEST_CODE_OPEN_MAIN,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_stat_veye)
            .setColor(getColor(R.color.notification_color))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun ensureChannel(channelId: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(channelId) != null) return
        val channel = NotificationChannel(
            channelId,
            getString(R.string.default_notification_channel_name),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = getString(R.string.default_notification_channel_description)
            enableLights(true)
            enableVibration(true)
        }
        manager.createNotificationChannel(channel)
    }

    private companion object {
        const val TAG = "VeyeFcmService"
        const val REQUEST_CODE_OPEN_MAIN = 4011
    }
}
