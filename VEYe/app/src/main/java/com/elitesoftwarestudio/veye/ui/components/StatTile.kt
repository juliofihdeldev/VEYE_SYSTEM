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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.ui.theme.SeverityKind
import com.elitesoftwarestudio.veye.ui.theme.VEyeRadius
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing
import com.elitesoftwarestudio.veye.ui.theme.label
import com.elitesoftwarestudio.veye.ui.theme.severityTokensOf

/**
 * Single category tile from the screenshots ("4 KIDNAPPING / 7 DANGER / 3 MISSING").
 * Used inside [StatTileRow].
 */
@Composable
fun StatTile(
    kind: SeverityKind,
    count: Int,
    modifier: Modifier = Modifier,
    label: String? = null,
) {
    val tokens = severityTokensOf(kind)
    val resolvedLabel = label ?: tokens.label()
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(VEyeRadius.tile),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        tonalElevation = 0.dp,
    ) {
        Column(
            modifier =
                Modifier.padding(
                    horizontal = VEyeSpacing.md,
                    vertical = VEyeSpacing.sm,
                ),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier =
                        Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(tokens.accent),
                )
                Text(
                    text = count.toString(),
                    style =
                        MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black),
                    color = tokens.accent,
                    modifier = Modifier.padding(start = VEyeSpacing.xs),
                )
            }
            Text(
                text = resolvedLabel.uppercase(),
                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/** Row of [StatTile]s, evenly weighted, with consistent spacing. */
@Composable
fun StatTileRow(
    items: List<StatTileEntry>,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(VEyeSpacing.xs),
    ) {
        items.forEach { entry ->
            StatTile(
                kind = entry.kind,
                count = entry.count,
                label = entry.labelOverride,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

data class StatTileEntry(
    val kind: SeverityKind,
    val count: Int,
    val labelOverride: String? = null,
)
