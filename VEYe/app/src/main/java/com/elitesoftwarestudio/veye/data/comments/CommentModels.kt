package com.elitesoftwarestudio.veye.data.comments

data class StoredComment(
    val id: String,
    val text: String,
    val createdAt: Long,
    val isSelf: Boolean,
    val parentId: String?,
    val likeCount: Int,
    val likedBySelf: Boolean,
)

data class CommentListRow(
    val comment: StoredComment,
    val depth: Int,
)
