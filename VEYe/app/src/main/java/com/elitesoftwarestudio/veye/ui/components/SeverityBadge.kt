package com.elitesoftwarestudio.veye.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.ui.theme.SeverityKind
import com.elitesoftwarestudio.veye.ui.theme.SeverityTokens
import com.elitesoftwarestudio.veye.ui.theme.VEyeRadius
import com.elitesoftwarestudio.veye.ui.theme.label
import com.elitesoftwarestudio.veye.ui.theme.severityTokensOf

/**
 * Filled "KIDNAPPING / DANGER ZONE / MISSING / RELEASED" pill that matches the badges in
 * the alert + zone cards. Use in lists, headers and detail heros — never roll your own.
 */
@Composable
fun SeverityBadge(
    kind: SeverityKind,
    modifier: Modifier = Modifier,
    label: String? = null,
    compact: Boolean = false,
) {
    val tokens = severityTokensOf(kind)
    SeverityBadge(
        tokens = tokens,
        modifier = modifier,
        label = label,
        compact = compact,
    )
}

@Composable
fun SeverityBadge(
    tokens: SeverityTokens,
    modifier: Modifier = Modifier,
    label: String? = null,
    compact: Boolean = false,
) {
    val text = label ?: tokens.label()
    val padding =
        if (compact) PaddingValues(horizontal = 8.dp, vertical = 2.dp)
        else PaddingValues(horizontal = 10.dp, vertical = 4.dp)
    Box(
        modifier =
            modifier
                .clip(RoundedCornerShape(VEyeRadius.chip))
                .background(tokens.accent)
                .padding(padding),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text.uppercase(),
            color = tokens.onAccent,
            style =
                if (compact) MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold)
                else MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
        )
    }
}

/** Outlined "verified · 3 sources" / "live" / "near me" inline tag (subtle, not coloured). */
@Composable
fun MetaTag(
    label: String,
    modifier: Modifier = Modifier,
    leadingDot: Color? = null,
) {
    Row(
        modifier =
            modifier
                .clip(RoundedCornerShape(VEyeRadius.chip))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leadingDot != null) {
            Box(
                modifier =
                    Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(leadingDot),
            )
        }
        Text(
            text = label,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(start = if (leadingDot != null) 6.dp else 0.dp),
        )
    }
}
