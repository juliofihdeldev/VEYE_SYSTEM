package com.elitesoftwarestudio.veye.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.ui.theme.VEyeRadius
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing

/** A pill-shaped filter chip matching the "All · 14 / Near me / Last 24 h" row in the mockups. */
@Composable
fun FilterPill(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    selectedContainer: Color = MaterialTheme.colorScheme.primary,
    selectedContent: Color = MaterialTheme.colorScheme.onPrimary,
    count: Int? = null,
) {
    val container =
        if (selected) selectedContainer else MaterialTheme.colorScheme.surfaceVariant
    val content =
        if (selected) selectedContent else MaterialTheme.colorScheme.onSurface
    Surface(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(VEyeRadius.pill),
        color = container,
        border =
            if (selected) null
            else BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = label,
                color = content,
                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
            )
            if (count != null) {
                Text(
                    text = "  ·  $count",
                    color = content.copy(alpha = if (selected) 0.85f else 0.7f),
                    style = MaterialTheme.typography.labelMedium,
                )
            }
        }
    }
}

/** Convenience model for a [FilterPillRow] entry. */
data class FilterPillItem(
    val key: String,
    val label: String,
    val count: Int? = null,
    val selectedContainer: Color? = null,
    val selectedContent: Color? = null,
)

/**
 * Horizontally-scrollable row of [FilterPill]s — call sites pass a list of [FilterPillItem]s
 * and a `selectedKey`. Single source of truth for the chip rows on Alerts and Zones.
 */
@Composable
fun FilterPillRow(
    items: List<FilterPillItem>,
    selectedKey: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    contentPaddingHorizontal: androidx.compose.ui.unit.Dp = VEyeSpacing.md,
) {
    LazyRow(
        modifier = modifier,
        contentPadding =
            androidx.compose.foundation.layout.PaddingValues(
                horizontal = contentPaddingHorizontal,
            ),
        horizontalArrangement = Arrangement.spacedBy(VEyeSpacing.xs),
    ) {
        itemsIndexed(items, key = { _, it -> it.key }) { _, item ->
            FilterPill(
                label = item.label,
                selected = item.key == selectedKey,
                onClick = { onSelect(item.key) },
                count = item.count,
                selectedContainer =
                    item.selectedContainer ?: MaterialTheme.colorScheme.primary,
                selectedContent =
                    item.selectedContent ?: MaterialTheme.colorScheme.onPrimary,
            )
        }
    }
}
