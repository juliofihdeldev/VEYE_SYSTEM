package com.elitesoftwarestudio.veye.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.runtime.Immutable
import androidx.compose.ui.unit.dp

/**
 * Spacing scale used by the VEYe design system. Keep in sync with the mockups:
 * 4 / 8 / 12 / 16 / 20 / 24.
 */
@Immutable
object VEyeSpacing {
    val xxs = 4.dp
    val xs = 8.dp
    val sm = 12.dp
    val md = 16.dp
    val lg = 20.dp
    val xl = 24.dp
    val xxl = 32.dp
}

/** Corner radii used across cards, chips and buttons in the redesigned UI. */
@Immutable
object VEyeRadius {
    val pill = 999.dp
    val chip = 22.dp
    val card = 16.dp
    val tile = 18.dp
    val sheet = 24.dp
}

/** Optional centralized [Shapes] mirroring [VEyeRadius] for components that read [MaterialTheme.shapes]. */
val VEyeShapes: Shapes =
    Shapes(
        extraSmall = RoundedCornerShape(8.dp),
        small = RoundedCornerShape(12.dp),
        medium = RoundedCornerShape(VEyeRadius.card),
        large = RoundedCornerShape(VEyeRadius.tile),
        extraLarge = RoundedCornerShape(VEyeRadius.sheet),
    )
