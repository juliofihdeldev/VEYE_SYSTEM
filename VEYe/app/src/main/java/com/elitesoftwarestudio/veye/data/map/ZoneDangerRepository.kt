package com.elitesoftwarestudio.veye.data.map

import com.google.firebase.auth.FirebaseAuth
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.realtime.PostgresAction
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.realtime
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

private const val ZONE_PAGE_LIMIT = 500L

@Singleton
class ZoneDangerRepository @Inject constructor(
    private val supabase: SupabaseClient,
    private val auth: FirebaseAuth,
) {
    /**
     * Zone list for signed-in users: PostgREST `zone_danger` + **Realtime** postgres changes
     * (after migration `20260412140000_realtime_veye_comments_zone_danger.sql` and publication on hosted DB).
     */
    val zones: Flow<List<DangerZone>> = callbackFlow {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        var sessionJob: Job? = null

        fun stopSession() {
            sessionJob?.cancel()
            sessionJob = null
        }

        val listener =
            FirebaseAuth.AuthStateListener { fa ->
                stopSession()
                if (fa.currentUser?.uid == null) {
                    trySend(emptyList())
                    return@AuthStateListener
                }
                sessionJob =
                    scope.launch {
                        val uid = auth.currentUser?.uid ?: return@launch
                        val channel = supabase.channel("zone_danger_zones_${uid.take(12)}")
                        try {
                            val changes =
                                channel.postgresChangeFlow<PostgresAction>(schema = "public") {
                                    table = "zone_danger"
                                }
                            channel.subscribe(blockUntilSubscribed = true)
                            trySend(runCatching { fetchZonesOnce() }.getOrElse { emptyList() })
                            changes.collect {
                                if (!isActive) return@collect
                                trySend(runCatching { fetchZonesOnce() }.getOrElse { emptyList() })
                            }
                        } catch (_: Exception) {
                            trySend(runCatching { fetchZonesOnce() }.getOrElse { emptyList() })
                        } finally {
                            withContext(NonCancellable) {
                                runCatching { channel.unsubscribe() }
                                runCatching { supabase.realtime.removeChannel(channel) }
                            }
                        }
                    }
            }

        auth.addAuthStateListener(listener)
        awaitClose {
            auth.removeAuthStateListener(listener)
            runBlocking(Dispatchers.IO) {
                sessionJob?.cancelAndJoin()
            }
            scope.cancel()
        }
    }.distinctUntilChanged()

    private suspend fun fetchZonesOnce(): List<DangerZone> {
        val rows =
            supabase.from("zone_danger").select {
                order("date", Order.DESCENDING)
                limit(ZONE_PAGE_LIMIT)
            }.decodeList<ZoneDangerRow>()
        return rows.map { it.toDangerZone() }
    }

    /**
     * Direct fetch by id, used by the detail screen as a fallback when the realtime
     * [zones] flow has not yet emitted the requested row (cold open, deep-link, or
     * the row falls outside the radius-filtered slice the source screen showed).
     *
     * Avoids `.single()` on purpose so a missing or duplicated row never bubbles up as
     * a 406 — instead callers get `null` for "row not found" and an exception for real
     * transport failures, mirroring [ViktimRepository.fetchViktimAlertById].
     */
    suspend fun fetchZoneById(id: String): DangerZone? {
        val rows =
            supabase.from("zone_danger").select {
                filter {
                    eq("id", id)
                }
                limit(1)
            }.decodeList<ZoneDangerRow>()
        return rows.firstOrNull()?.toDangerZone()
    }
}
