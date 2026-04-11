package com.elitesoftwarestudio.veye.data.comments

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class CommentSupabaseRow(
    val id: String,
    @SerialName("thread_id") val threadId: String,
    val body: String,
    @SerialName("user_id") val userId: String,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("sort_time") val sortTime: Long,
    @SerialName("parent_id") val parentId: String? = null,
    @SerialName("liked_user_ids") val likedUserIds: List<String> = emptyList(),
) {
    fun toStoredComment(currentUid: String?): StoredComment {
        val liked = likedUserIds
        return StoredComment(
            id = id,
            text = body,
            createdAt = sortTime,
            isSelf = currentUid != null && userId == currentUid,
            parentId = parentId?.ifBlank { null },
            likeCount = liked.size,
            likedBySelf = currentUid != null && liked.contains(currentUid),
        )
    }
}
