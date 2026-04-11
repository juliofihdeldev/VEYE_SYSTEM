package com.elitesoftwarestudio.veye.data.comments

import com.elitesoftwarestudio.veye.data.map.ViktimAlert
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.net.URLEncoder
import java.util.Date
import javax.inject.Inject
import javax.inject.Singleton

/** RN `VeyeComments` + `commentsStorage.ts` (threadId query, sort in client). */
@Singleton
class CommentsRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
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

    fun observeThread(threadId: String): Flow<List<StoredComment>> = callbackFlow {
        val reg: ListenerRegistration =
            firestore.collection(COLLECTION)
                .whereEqualTo("threadId", threadId)
                .addSnapshotListener { snap, err ->
                    if (err != null || snap == null) {
                        trySend(emptyList())
                        return@addSnapshotListener
                    }
                    val uid = auth.currentUser?.uid
                    val list = snap.documents.map { it.toStoredComment(uid) }.sortedWith(commentSort)
                    trySend(list)
                }
        awaitClose { reg.remove() }
    }

    suspend fun appendComment(threadId: String, text: String, parentId: String? = null) {
        val uid = auth.currentUser?.uid ?: return
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return
        val sortTime = System.currentTimeMillis()
        val data = mutableMapOf<String, Any>(
            "threadId" to threadId,
            "text" to trimmed,
            "userId" to uid,
            "createdAt" to FieldValue.serverTimestamp(),
            "sortTime" to sortTime,
            "likedUserIds" to emptyList<String>(),
        )
        if (!parentId.isNullOrBlank()) {
            data["parentId"] = parentId
        }
        firestore.collection(COLLECTION).add(data).await()
    }

    suspend fun toggleCommentLike(commentId: String) {
        val uid = auth.currentUser?.uid ?: return
        val ref = firestore.collection(COLLECTION).document(commentId)
        val snap = ref.get().await()
        if (!snap.exists()) return
        @Suppress("UNCHECKED_CAST")
        val raw = snap.get("likedUserIds") as? List<*>
        val list = raw?.filterIsInstance<String>() ?: emptyList()
        val has = list.contains(uid)
        ref.update(
            "likedUserIds",
            if (has) FieldValue.arrayRemove(uid) else FieldValue.arrayUnion(uid),
        ).await()
    }

    companion object {
        private const val COLLECTION = "VeyeComments"
    }
}

private val commentSort =
    Comparator<StoredComment> { a, b ->
        val t = a.createdAt.compareTo(b.createdAt)
        if (t != 0) t else a.id.compareTo(b.id)
    }

private fun com.google.firebase.firestore.DocumentSnapshot.toStoredComment(uid: String?): StoredComment {
    val d = data ?: emptyMap()
    val text = (d["text"] as? String) ?: ""
    val userId = d["userId"] as? String
    val sortTime = (d["sortTime"] as? Number)?.toLong()
    val createdAt =
        sortTime ?: toMillis(d["createdAt"])
    val parentRaw = d["parentId"] as? String
    val parentId = if (!parentRaw.isNullOrBlank()) parentRaw else null
    @Suppress("UNCHECKED_CAST")
    val likedRaw = d["likedUserIds"] as? List<*>
    val likedUserIds = likedRaw?.filterIsInstance<String>() ?: emptyList()
    return StoredComment(
        id = id,
        text = text,
        createdAt = createdAt,
        isSelf = uid != null && userId == uid,
        parentId = parentId,
        likeCount = likedUserIds.size,
        likedBySelf = uid != null && likedUserIds.contains(uid),
    )
}

private fun toMillis(ts: Any?): Long =
    when (ts) {
        is Timestamp -> ts.toDate().time
        is Date -> ts.time
        is Number -> ts.toLong()
        else -> System.currentTimeMillis()
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
