package com.elitesoftwarestudio.veye.data.report

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.firebase.auth.FirebaseAuth
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import javax.inject.Inject
import javax.inject.Singleton

private const val PLACEHOLDER_IMAGE =
    "https://cdn-icons-png.flaticon.com/512/1088/1088372.png"
private const val DEFAULT_LAT = 18.5944
private const val DEFAULT_LNG = -72.3074
private const val DEFAULT_CITY = "Port-au-Prince"
private const val MAX_ENCODED_IMAGE_BYTES = 750_000

sealed class SubmitGlobalAlertResult {
    data object Success : SubmitGlobalAlertResult()

    data object NetworkError : SubmitGlobalAlertResult()

    data class UserBlocked(
        val unblockedAtMs: Long?,
    ) : SubmitGlobalAlertResult()
}

@Singleton
class GlobalAlertRepository @Inject constructor(
    @param:ApplicationContext private val context: Context,
    private val auth: FirebaseAuth,
    private val supabase: SupabaseClient,
) {
    suspend fun submitUserReport(
        selectedTypeKey: String,
        description: String,
        victimName: String,
        contactPhone: String,
        anonymous: Boolean,
        photoUris: List<Uri>,
        latitude: Double?,
        longitude: Double?,
        displayAddress: String,
        fullAddressJson: String,
    ): SubmitGlobalAlertResult =
        withContext(Dispatchers.IO) {
            val rezon = "[$selectedTypeKey] $description"
            val name = victimName.ifBlank { displayAddress.ifBlank { "Unknown location" } }
            val lat = latitude ?: DEFAULT_LAT
            val lng = longitude ?: DEFAULT_LNG
            val imageSource = firstImageSource(photoUris)
            val city = cityFromFullAddress(fullAddressJson)
            val uid = auth.currentUser?.uid

            val json =
                JSONObject().apply {
                    put("summary", rezon)
                    put("source", "user_report")
                    if (uid != null) put("userId", uid) else put("userId", JSONObject.NULL)
                    put("name", name)
                    put("rezon", rezon)
                    put("latitude", lat)
                    put("longitude", lng)
                    put("imageSource", imageSource)
                    put("full_address", fullAddressJson)
                    put("address", displayAddress)
                    put("city", city)
                    put("contactPhone", if (anonymous) "" else contactPhone)
                    put("anonymous", anonymous)
                    put("photoCount", photoUris.size)
                    put(
                        "position",
                        JSONObject().apply {
                            put("latitude", lat.toString())
                            put("longitude", lng.toString())
                        },
                    )
                }

            try {
                val response =
                    supabase.functions.invoke("process-global-alert") {
                        contentType(ContentType.Application.Json)
                        setBody(json.toString())
                    }

                when {
                    response.status.isSuccess() -> SubmitGlobalAlertResult.Success
                    response.status == HttpStatusCode.Forbidden -> {
                        val raw = response.bodyAsText()
                        val j = runCatching { JSONObject(raw) }.getOrNull()
                        if (j?.optString("skipped") == "user_blocked") {
                            val unblocked = j.optLong("unblockedAt", 0L).takeIf { it > 0 }
                            SubmitGlobalAlertResult.UserBlocked(unblocked)
                        } else {
                            SubmitGlobalAlertResult.NetworkError
                        }
                    }
                    else -> SubmitGlobalAlertResult.NetworkError
                }
            } catch (_: Exception) {
                SubmitGlobalAlertResult.NetworkError
            }
        }

    private fun firstImageSource(uris: List<Uri>): String {
        val first = uris.firstOrNull() ?: return PLACEHOLDER_IMAGE
        return encodeImageForUpload(first) ?: PLACEHOLDER_IMAGE
    }

    private fun encodeImageForUpload(uri: Uri): String? {
        var bitmap =
            context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) }
                ?: return null
        try {
            var quality = 85
            repeat(18) {
                val baos = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos)
                val bytes = baos.toByteArray()
                if (bytes.size <= MAX_ENCODED_IMAGE_BYTES) {
                    return "data:image/jpeg;base64," +
                        android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
                }
                quality -= 8
                if (quality < 38) {
                    val nw = (bitmap.width * 0.75f).toInt().coerceAtLeast(1)
                    val nh = (bitmap.height * 0.75f).toInt().coerceAtLeast(1)
                    val scaled = Bitmap.createScaledBitmap(bitmap, nw, nh, true)
                    if (scaled != bitmap) bitmap.recycle()
                    bitmap = scaled
                    quality = 78
                }
            }
            return null
        } finally {
            bitmap.recycle()
        }
    }

    private fun cityFromFullAddress(fullAddress: String): String {
        if (fullAddress.isBlank()) return DEFAULT_CITY
        return runCatching {
            val o = JSONObject(fullAddress)
            o.optString("city").ifBlank { DEFAULT_CITY }
        }.getOrDefault(DEFAULT_CITY)
    }
}
