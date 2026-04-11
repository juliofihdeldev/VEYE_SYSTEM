package com.elitesoftwarestudio.veye.data.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceLocationRepository @Inject constructor(
    @param:ApplicationContext private val context: Context,
) {
    private val fused get() = LocationServices.getFusedLocationProviderClient(context)

    fun hasFineLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    suspend fun getCoordinatesOrNull(): Pair<Double, Double>? = withContext(Dispatchers.Main.immediate) {
        if (!hasFineLocationPermission()) return@withContext null
        try {
            val current = fused.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, null).await()
            if (current != null) return@withContext current.latitude to current.longitude
            val last = fused.lastLocation.await() ?: return@withContext null
            last.latitude to last.longitude
        } catch (_: Exception) {
            null
        }
    }
}
