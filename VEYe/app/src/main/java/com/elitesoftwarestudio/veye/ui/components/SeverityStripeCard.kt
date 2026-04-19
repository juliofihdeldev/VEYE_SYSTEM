package com.elitesoftwarestudio.veye.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.ui.theme.SeverityKind
import com.elitesoftwarestudio.veye.ui.theme.VEyeRadius
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing
import com.elitesoftwarestudio.veye.ui.theme.severityTokensOf

/** Convenience model used inside [SeverityStripeCard]'s footer row. */
data class SeverityCardMetric(
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val label: String,
    val tint: Color? = null,
)

/**
 * The hero card from the screenshots — a coloured severity stripe on the left,
 * a small badge + timestamp at the top, the headline, a body line, and a metric row
 * (distance · witnesses · verified). The whole card is clickable.
 */
@Composable
fun SeverityStripeCard(
    kind: SeverityKind,
    title: String,
    subtitle: String?,
    body: String?,
    timeLabel: String?,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    badgeOverride: String? = null,
    metrics: List<SeverityCardMetric> = emptyList(),
    trailing: (@Composable () -> Unit)? = null,
) {
    val tokens = severityTokensOf(kind)
    Surface(
        modifier =
            modifier
                .fillMaxWidth()
                .let { if (onClick != null) it.clickable(onClick = onClick) else it },
        shape = RoundedCornerShape(VEyeRadius.card),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        tonalElevation = 0.dp,
    ) {
        Row(modifier = Modifier.height(IntrinsicSize.Min)) {
            Box(
                modifier =
                    Modifier
                        .width(4.dp)
                        .fillMaxHeight()
                        .background(tokens.accent),
            )
            Column(
                modifier =
                    Modifier
                        .weight(1f)
                        .padding(VEyeSpacing.md),
                verticalArrangement = Arrangement.spacedBy(VEyeSpacing.xs),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    SeverityBadge(tokens = tokens, label = badgeOverride, compact = true)
                    if (!timeLabel.isNullOrBlank()) {
                        Text(
                            text = timeLabel,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Text(
                    text = title,
                    style =
                        MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (!body.isNullOrBlank()) {
                    Text(
                        text = body,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (metrics.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(VEyeSpacing.sm),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        metrics.forEach { metric ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = metric.icon,
                                    contentDescription = null,
                                    tint =
                                        metric.tint
                                            ?: MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(14.dp),
                                )
                                Text(
                                    text = metric.label,
                                    style = MaterialTheme.typography.labelSmall,
                                    color =
                                        metric.tint
                                            ?: MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(start = 4.dp),
                                )
                            }
                        }
                    }
                }
            }
            if (trailing != null) {
                Box(
                    modifier =
                        Modifier
                            .padding(end = VEyeSpacing.md, top = VEyeSpacing.md)
                            .clip(RoundedCornerShape(12.dp)),
                ) {
                    trailing()
                }
            }
        }
    }
}
