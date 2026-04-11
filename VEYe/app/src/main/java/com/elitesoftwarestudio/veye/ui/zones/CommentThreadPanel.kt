package com.elitesoftwarestudio.veye.ui.zones

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.comments.CommentListRow
import com.elitesoftwarestudio.veye.data.comments.CommentsRepository
import com.elitesoftwarestudio.veye.data.comments.StoredComment
import com.elitesoftwarestudio.veye.data.comments.flattenCommentThread
import kotlinx.coroutines.launch
import java.text.DateFormat
import java.util.Date
import java.util.concurrent.TimeUnit

private val IgHeart = Color(0xFFFF3040)
private val PostActionBlue = Color(0xFF2196F3)
private val DefaultUserAvatarRed = Color(0xFFFF3040)
private val ReplyIndent = 16.dp

private val AvatarPalette =
    listOf(
        Color(0xFFC13584),
        Color(0xFFE1306C),
        Color(0xFFF56040),
        Color(0xFFFCAF45),
        Color(0xFF405DE6),
        Color(0xFF5851DB),
        Color(0xFF833AB4),
    )

private fun avatarColor(seed: String): Color {
    var h = 0
    for (i in seed.indices) {
        h = (h + seed[i].code * (i + 1)) % 997
    }
    return AvatarPalette[h % AvatarPalette.size]
}

@Composable
private fun commentDisplayName(c: StoredComment): String =
    if (c.isSelf) stringResource(R.string.comments_you) else stringResource(R.string.common_user)

@Composable
fun CommentThreadPanel(
    threadId: String,
    enabled: Boolean,
    commentsRepository: CommentsRepository,
    modifier: Modifier = Modifier,
    listHeader: (@Composable () -> Unit)? = null,
    showSectionTitle: Boolean = false,
    /** Danger zone detail sheet: comments header + rows + composer match RN full-screen modal. */
    detailStyle: Boolean = false,
) {
    val context = LocalContext.current
    val res = context.resources
    val scope = rememberCoroutineScope()
    val flow = remember(threadId) { commentsRepository.observeThread(threadId) }
    val comments by flow.collectAsStateWithLifecycle(initialValue = emptyList())
    val rows = remember(comments) { flattenCommentThread(comments) }

    var draft by remember(threadId) { mutableStateOf("") }
    var replyingTo by remember(threadId) { mutableStateOf<StoredComment?>(null) }
    val listState = rememberLazyListState()

    LaunchedEffect(threadId) {
        if (!enabled) {
            draft = ""
            replyingTo = null
        }
    }

    fun formatCommentTime(ts: Long): String {
        val diffMins = TimeUnit.MILLISECONDS.toMinutes(System.currentTimeMillis() - ts).toInt().coerceAtLeast(0)
        if (diffMins < 1) return res.getString(R.string.time_just_now)
        if (diffMins < 60) return res.getString(R.string.time_min_ago, diffMins)
        val diffH = diffMins / 60
        if (diffH < 24) return res.getString(R.string.time_hours_ago, diffH)
        val diffD = diffH / 24
        if (diffD < 7) return res.getString(R.string.time_days_ago, diffD)
        return DateFormat.getDateInstance(DateFormat.MEDIUM).format(Date(ts))
    }

    // Column + weight(1): list gets all space above composer (not overlapped), so scrolling works
    // with keyboard + reply strip. Floating Box + contentPadding was hiding most of the list.
    Column(modifier = modifier.fillMaxSize()) {
        LazyColumn(
            state = listState,
            modifier =
                Modifier
                    .weight(1f, fill = true)
                    .fillMaxWidth(),
            contentPadding = PaddingValues(bottom = 8.dp),
        ) {
            listHeader?.let { header ->
                item { header() }
            }
            if (showSectionTitle) {
                item {
                    val count = comments.size
                    val badgeText =
                        if (count == 1) {
                            stringResource(R.string.comments_total_one, count)
                        } else {
                            stringResource(R.string.comments_total_other, count)
                        }
                    if (detailStyle) {
                        val scheme = MaterialTheme.colorScheme
                        Row(
                            modifier =
                                Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 20.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            Text(
                                text = stringResource(R.string.comments_title),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = scheme.onSurface,
                            )
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = scheme.surfaceContainerHighest,
                            ) {
                                Text(
                                    text = badgeText,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = scheme.onSurfaceVariant,
                                )
                            }
                        }
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.outlineVariant,
                        )
                    } else {
                        Text(
                            text = stringResource(R.string.comments_title),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        )
                        Text(
                            text = badgeText,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 8.dp),
                        )
                        HorizontalDivider()
                    }
                }
            }
            if (rows.isEmpty()) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            text = stringResource(R.string.comments_empty_title),
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            text = stringResource(R.string.comments_empty_hint),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            } else {
                items(rows, key = { it.comment.id }) { row ->
                    CommentRow(
                        row = row,
                        formatTime = ::formatCommentTime,
                        onReply = { replyingTo = it },
                        onToggleLike = { id ->
                            scope.launch { commentsRepository.toggleCommentLike(id) }
                        },
                        stackedLayout = detailStyle,
                    )
                }
            }
        }

        Surface(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .imePadding()
                    .windowInsetsPadding(WindowInsets.navigationBars),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 3.dp,
            shadowElevation = 6.dp,
        ) {
            Column(Modifier.fillMaxWidth()) {
                replyingTo?.let { r ->
                    Surface(tonalElevation = 0.dp, modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = stringResource(R.string.comments_replying_to, commentDisplayName(r)),
                                style = MaterialTheme.typography.labelMedium,
                                modifier = Modifier.weight(1f),
                            )
                            TextButton(onClick = { replyingTo = null }) {
                                Text(stringResource(android.R.string.cancel))
                            }
                        }
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                }
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(
                                horizontal = if (detailStyle) 16.dp else 8.dp,
                                vertical = if (detailStyle) 12.dp else 8.dp,
                            ),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    val fieldShape = RoundedCornerShape(22.dp)
                    val scheme = MaterialTheme.colorScheme
                    val fieldColors =
                        if (detailStyle) {
                            OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = scheme.surfaceContainerHigh,
                                unfocusedContainerColor = scheme.surfaceContainerHigh,
                                disabledContainerColor = scheme.surfaceContainerHigh,
                                focusedTextColor = scheme.onSurface,
                                unfocusedTextColor = scheme.onSurface,
                                disabledTextColor = scheme.onSurface.copy(alpha = 0.38f),
                                cursorColor = scheme.primary,
                                focusedPlaceholderColor = scheme.onSurfaceVariant,
                                unfocusedPlaceholderColor = scheme.onSurfaceVariant,
                                focusedBorderColor = Color.Transparent,
                                unfocusedBorderColor = Color.Transparent,
                                disabledBorderColor = Color.Transparent,
                            )
                        } else {
                            OutlinedTextFieldDefaults.colors()
                        }
                    OutlinedTextField(
                        value = draft,
                        onValueChange = { draft = it },
                        modifier = Modifier.weight(1f),
                        shape = fieldShape,
                        colors = fieldColors,
                        placeholder = {
                            Text(
                                if (replyingTo != null) {
                                    stringResource(R.string.comments_placeholder_reply)
                                } else {
                                    stringResource(R.string.comments_placeholder)
                                },
                            )
                        },
                        maxLines = 4,
                    )
                    TextButton(
                        onClick = {
                            val text = draft.trim()
                            if (text.isEmpty()) return@TextButton
                            val parent = replyingTo?.id
                            draft = ""
                            replyingTo = null
                            scope.launch {
                                commentsRepository.appendComment(threadId, text, parent)
                            }
                        },
                        enabled = draft.isNotBlank(),
                    ) {
                        Text(
                            stringResource(R.string.comments_post),
                            color = if (detailStyle) PostActionBlue else MaterialTheme.colorScheme.primary,
                            fontWeight = if (detailStyle) FontWeight.SemiBold else FontWeight.Normal,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CommentRow(
    row: CommentListRow,
    formatTime: (Long) -> String,
    onReply: (StoredComment) -> Unit,
    onToggleLike: (String) -> Unit,
    stackedLayout: Boolean,
) {
    val item = row.comment
    val depth = row.depth
    val name = commentDisplayName(item)
    val genericUser = stringResource(R.string.common_user)
    val av =
        if (!item.isSelf && name == genericUser) {
            DefaultUserAvatarRed
        } else {
            avatarColor(name + item.id)
        }
    val avatarSize = if (depth > 0) 30.dp else 40.dp
    val hPad = if (stackedLayout) 20.dp else 12.dp
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(
                start = (depth * ReplyIndent.value).dp + hPad,
                end = hPad,
                top = if (stackedLayout) 14.dp else 10.dp,
            ),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            modifier = Modifier
                .size(avatarSize)
                .clip(CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Surface(color = av, shape = CircleShape, modifier = Modifier.fillMaxSize()) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Text(
                        text = name.take(1).uppercase(),
                        color = Color.White,
                        style =
                            if (depth > 0) {
                                MaterialTheme.typography.labelMedium
                            } else {
                                MaterialTheme.typography.titleSmall
                            },
                    )
                }
            }
        }
        Column(Modifier.padding(start = 12.dp)) {
            if (stackedLayout) {
                val scheme = MaterialTheme.colorScheme
                Text(
                    text = name,
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    color = scheme.onSurface,
                )
                Text(
                    text = item.text,
                    style = MaterialTheme.typography.bodyMedium,
                    color = scheme.onSurface,
                    modifier = Modifier.padding(top = 4.dp),
                )
                Text(
                    text = formatTime(item.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = scheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 6.dp),
                )
            } else {
                Text(
                    text =
                        buildAnnotatedString {
                            withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                                append(name)
                            }
                            append(" ")
                            append(item.text)
                        },
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    text = formatTime(item.createdAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = if (stackedLayout) 6.dp else 4.dp),
            ) {
                TextButton(
                    onClick = { onToggleLike(item.id) },
                    contentPadding = PaddingValues(0.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (item.likedBySelf) Icons.Outlined.Favorite else Icons.Outlined.FavoriteBorder,
                            contentDescription = null,
                            tint = if (item.likedBySelf) IgHeart else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(Modifier.size(4.dp))
                        val likeLabel =
                            when {
                                item.likeCount == 0 -> stringResource(R.string.comments_like_verb)
                                item.likeCount == 1 -> stringResource(R.string.comments_likes_one, item.likeCount)
                                else -> stringResource(R.string.comments_likes_other, item.likeCount)
                            }
                        Text(
                            text = likeLabel,
                            style = MaterialTheme.typography.labelMedium,
                            color = if (item.likedBySelf) IgHeart else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Text(
                    text = " · ",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                TextButton(
                    onClick = { onReply(item) },
                    contentPadding = PaddingValues(0.dp),
                ) {
                    Text(
                        stringResource(R.string.comments_reply),
                        style = MaterialTheme.typography.labelMedium,
                    )
                }
            }
        }
    }
}
