package com.elitesoftwarestudio.veye.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.ui.theme.SeverityKind
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing
import com.elitesoftwarestudio.veye.ui.theme.label
import com.elitesoftwarestudio.veye.ui.theme.severityTokensOf

/**
 * Big circular halo + icon that anchors detail screens (the "KIDNAPPING / LIVE" hero
 * in screenshot 03). Use it at the top of any single-incident detail.
 */
@Composable
fun SeverityHero(
    kind: SeverityKind,
    modifier: Modifier = Modifier,
    title: String? = null,
    statusLabel: String? = null,
) {
    val tokens = severityTokensOf(kind)
    Column(
        modifier =
            modifier
                .fillMaxWidth()
                .padding(vertical = VEyeSpacing.md),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier =
                Modifier
                    .size(120.dp)
                    .clip(CircleShape)
                    .background(tokens.containerSoft),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier =
                    Modifier
                        .size(86.dp)
                        .clip(CircleShape)
                        .background(tokens.accent),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = tokens.icon,
                    contentDescription = null,
                    tint = tokens.onAccent,
                    modifier = Modifier.size(40.dp),
                )
            }
        }
        Spacer(modifier = Modifier.height(VEyeSpacing.sm))
        SeverityBadge(tokens = tokens, label = title ?: tokens.label())
        if (!statusLabel.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(VEyeSpacing.xxs))
            Text(
                text = statusLabel,
                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}
