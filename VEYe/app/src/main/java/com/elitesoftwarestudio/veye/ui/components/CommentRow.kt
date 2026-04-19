package com.elitesoftwarestudio.veye.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing

/**
 * Single comment row from the alert detail mockup. The avatar is a coloured initial circle
 * (passed via [avatarColor]); body content sits beneath the name + meta line.
 */
@Composable
fun CommentRow(
    authorName: String,
    timeLabel: String,
    body: String,
    modifier: Modifier = Modifier,
    distanceLabel: String? = null,
    verifiedLabel: String? = null,
    avatarColor: Color = MaterialTheme.colorScheme.primary,
    initials: String? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth().padding(vertical = VEyeSpacing.xs),
    ) {
        Box(
            modifier =
                Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(avatarColor),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = initials ?: authorName.take(2).uppercase(),
                color = Color.White,
                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
            )
        }
        Column(
            modifier =
                Modifier
                    .weight(1f)
                    .padding(start = VEyeSpacing.sm),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = authorName,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = "  ·  $timeLabel",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (!distanceLabel.isNullOrBlank()) {
                    Text(
                        text = "  ·  $distanceLabel",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (!verifiedLabel.isNullOrBlank()) {
                    Text(
                        text = "  $verifiedLabel",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                        color = androidx.compose.ui.graphics.Color(0xFF22C55E),
                    )
                }
            }
            Text(
                text = body,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f),
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

/** Deterministic seed colour from a string (use for [CommentRow.avatarColor]). */
fun rememberAvatarColor(seed: String): Color {
    val palette =
        listOf(
            Color(0xFFE11D48),
            Color(0xFF22C55E),
            Color(0xFFF59E0B),
            Color(0xFF2563EB),
            Color(0xFF8B5CF6),
            Color(0xFF14B8A6),
            Color(0xFFD946EF),
        )
    val idx =
        if (seed.isEmpty()) 0 else (seed.hashCode().toLong().and(0x7FFFFFFFL) % palette.size).toInt()
    return palette[idx]
}
