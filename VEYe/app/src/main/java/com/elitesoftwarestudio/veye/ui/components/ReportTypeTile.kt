package com.elitesoftwarestudio.veye.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.ui.theme.SeverityKind
import com.elitesoftwarestudio.veye.ui.theme.VEyeRadius
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing
import com.elitesoftwarestudio.veye.ui.theme.label
import com.elitesoftwarestudio.veye.ui.theme.severityTokensOf

/**
 * Big "MISSING / INFO" tile from the Report mockup. Selected = filled accent
 * background; unselected = subtle surface with a soft icon halo.
 */
@Composable
fun ReportTypeTile(
    kind: SeverityKind,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    titleOverride: String? = null,
    description: String? = null,
) {
    val tokens = severityTokensOf(kind)
    val container =
        if (selected) tokens.accent else MaterialTheme.colorScheme.surfaceContainerHigh
    val onContainer =
        if (selected) tokens.onAccent else MaterialTheme.colorScheme.onSurface
    val descColor =
        if (selected) tokens.onAccent.copy(alpha = 0.85f)
        else MaterialTheme.colorScheme.onSurfaceVariant
    Surface(
        modifier =
            modifier
                .fillMaxWidth()
                .clickable(onClick = onClick),
        shape = RoundedCornerShape(VEyeRadius.tile),
        color = container,
        tonalElevation = 0.dp,
    ) {
        Column(modifier = Modifier.padding(VEyeSpacing.md)) {
            Box(
                modifier =
                    Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(
                            if (selected) tokens.onAccent.copy(alpha = 0.2f)
                            else tokens.containerSoft,
                        ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = tokens.icon,
                    contentDescription = null,
                    tint = if (selected) tokens.onAccent else tokens.accent,
                    modifier = Modifier.size(22.dp),
                )
            }
            Spacer(modifier = Modifier.height(VEyeSpacing.sm))
            Text(
                text = (titleOverride ?: tokens.label()).uppercase(),
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Black),
                color = onContainer,
            )
            if (!description.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = descColor,
                )
            }
        }
    }
}

/** Two-up grid of [ReportTypeTile]s (top of the new-report flow). */
@Composable
fun ReportTypePair(
    primary: ReportTypeTileSpec,
    secondary: ReportTypeTileSpec,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(VEyeSpacing.sm),
    ) {
        ReportTypeTile(
            kind = primary.kind,
            selected = primary.selected,
            onClick = primary.onClick,
            titleOverride = primary.title,
            description = primary.description,
            modifier = Modifier.weight(1f),
        )
        ReportTypeTile(
            kind = secondary.kind,
            selected = secondary.selected,
            onClick = secondary.onClick,
            titleOverride = secondary.title,
            description = secondary.description,
            modifier = Modifier.weight(1f),
        )
    }
}

data class ReportTypeTileSpec(
    val kind: SeverityKind,
    val selected: Boolean,
    val onClick: () -> Unit,
    val title: String? = null,
    val description: String? = null,
)
