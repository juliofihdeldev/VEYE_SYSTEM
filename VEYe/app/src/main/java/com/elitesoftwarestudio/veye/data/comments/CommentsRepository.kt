package com.elitesoftwarestudio.veye.data.comments

import com.elitesoftwarestudio.veye.data.map.ViktimAlert
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.postgrest.query.filter.FilterOperator
import io.github.jan.supabase.realtime.PostgresAction
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.realtime
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
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
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.URLEncoder
import java.util.Date
import javax.inject.Inject
import javax.inject.Singleton

/**
 * RN `VeyeComments` + `commentsStorage.ts`.
 *
 * **Reads:** `veye_comments` via PostgREST + **Realtime** (filtered by `thread_id`). **Writes:** Edge **`process-veye-comment`**.
 */
@Singleton
class CommentsRepository @Inject constructor(
    private val supabase: SupabaseClient,
    private val auth: FirebaseAuth,
) {

    fun zoneThreadId(zoneId: String): String = "zone:$zoneId"

    /** RN `alertCommentsThreadId` — prefer stable doc id when present. */
    fun alertCommentsThreadId(alert: ViktimAlert): String {
        if (alert.id.isNotBlank()) return "alert:${alert.id}"
        val dPart = threadIdDatePart(alert.date)
        val slug = "${alert.fullName ?: "unknown"}_$dPart"
        val encoded = URLEncoder.encode(slug, Charsets.UTF_8.name())
        return "alert:$encoded"
    }

    private fun threadIdDatePart(date: Any?): String =
        when (date) {
            is Timestamp -> date.toDate().time.toString()
            is Date -> date.time.toString()
            is Number -> date.toLong().toString()
            else -> date?.toString().orEmpty()
        }

    private fun realtimeChannelIdForThread(threadId: String): String {
        val slug = threadId.replace(Regex("[^a-zA-Z0-9_-]"), "_").take(80)
        return "veye_comments_$slug"
    }

    private suspend fun fetchThreadComments(threadId: String): List<StoredComment> {
        val uid = auth.currentUser?.uid
        return supabase.from("veye_comments").select {
            filter {
                eq("thread_id", threadId)
            }
            order("sort_time", Order.ASCENDING)
            limit(500)
        }.decodeList<CommentSupabaseRow>()
            .map { it.toStoredComment(uid) }
    }

    fun observeThread(threadId: String): Flow<List<StoredComment>> = callbackFlow {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        var job: Job? = null

        job =
            scope.launch {
                val channelId = realtimeChannelIdForThread(threadId)
                val channel = supabase.channel(channelId)
                try {
                    val changes =
                        channel.postgresChangeFlow<PostgresAction>(schema = "public") {
                            table = "veye_comments"
                            filter("thread_id", FilterOperator.EQ, threadId)
                        }
                    channel.subscribe(blockUntilSubscribed = true)
                    trySend(runCatching { fetchThreadComments(threadId) }.getOrElse { emptyList() })
                    changes.collect {
                        if (!isActive) return@collect
                        trySend(runCatching { fetchThreadComments(threadId) }.getOrElse { emptyList() })
                    }
                } catch (_: Exception) {
                    trySend(runCatching { fetchThreadComments(threadId) }.getOrElse { emptyList() })
                } finally {
                    withContext(NonCancellable) {
                        runCatching { channel.unsubscribe() }
                        runCatching { supabase.realtime.removeChannel(channel) }
                    }
                }
            }

        awaitClose {
            runBlocking(Dispatchers.IO) {
                job?.cancelAndJoin()
            }
            scope.cancel()
        }
    }

    suspend fun appendComment(threadId: String, text: String, parentId: String? = null) {
        val uid = auth.currentUser?.uid ?: return
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return
        val sortTime = System.currentTimeMillis()
        withContext(Dispatchers.IO) {
            val json =
                JSONObject().apply {
                    put("action", "append")
                    put("userId", uid)
                    put("threadId", threadId)
                    put("body", trimmed)
                    put("sortTime", sortTime)
                    if (!parentId.isNullOrBlank()) put("parentId", parentId)
                }
            supabase.functions.invoke("process-veye-comment") {
                contentType(ContentType.Application.Json)
                setBody(json.toString())
            }
        }
    }

    suspend fun toggleCommentLike(commentId: String) {
        val uid = auth.currentUser?.uid ?: return
        withContext(Dispatchers.IO) {
            val json =
                JSONObject().apply {
                    put("action", "toggleLike")
                    put("userId", uid)
                    put("commentId", commentId)
                }
            supabase.functions.invoke("process-veye-comment") {
                contentType(ContentType.Application.Json)
                setBody(json.toString())
            }
        }
    }
}

private val commentSort =
    Comparator<StoredComment> { a, b ->
        val t = a.createdAt.compareTo(b.createdAt)
        if (t != 0) t else a.id.compareTo(b.id)
    }

fun flattenCommentThread(items: List<StoredComment>): List<CommentListRow> {
    val byId = items.associateBy { it.id }
    val children = mutableMapOf<String?, MutableList<StoredComment>>()
    for (c in items) {
        var key: String? = c.parentId
        if (key != null && !byId.containsKey(key)) key = null
        children.getOrPut(key) { mutableListOf() }.add(c)
    }
    for (list in children.values) {
        list.sortWith(commentSort)
    }
    val rows = mutableListOf<CommentListRow>()
    fun walk(parentKey: String?, depth: Int) {
        for (c in children[parentKey].orEmpty()) {
            rows.add(CommentListRow(c, depth))
            walk(c.id, depth + 1)
        }
    }
    walk(null, 0)
    return rows
}
