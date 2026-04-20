package com.elitesoftwarestudio.veye.ui.onboarding

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.PrivacyTip
import androidx.compose.material.icons.outlined.Radar
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.ui.components.PrimaryPillButton
import com.elitesoftwarestudio.veye.ui.theme.VEyeRadius
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing
import com.elitesoftwarestudio.veye.ui.util.findActivity

/**
 * Top-level container for the three-step first-launch flow. Renders the active step,
 * the progress indicator, the Skip affordance, and the bottom CTA. Step composables are
 * pure: they take state + callbacks, so they preview cleanly and stay testable.
 *
 * The host **never** calls into the system permission APIs directly — that is delegated
 * to each step which owns its own [rememberLauncherForActivityResult] launcher.
 */
@Composable
fun OnboardingHost(
    viewModel: OnboardingViewModel = hiltViewModel(),
) {
    val context = LocalContext.current
    val activity = context.findActivity()
    val step by viewModel.currentStep.collectAsStateWithLifecycle()
    val localeTag by viewModel.localeTag.collectAsStateWithLifecycle()
    val notifRadius by viewModel.notificationRadiusKm.collectAsStateWithLifecycle()
    val notificationsGranted by viewModel.notificationsGranted.collectAsStateWithLifecycle()
    val notifsDecided by viewModel.notificationsDecisionMade.collectAsStateWithLifecycle()
    val locationGranted by viewModel.locationGranted.collectAsStateWithLifecycle()
    val locationDecided by viewModel.locationDecisionMade.collectAsStateWithLifecycle()

    val notificationLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted -> viewModel.onNotificationsResult(granted) }

    val locationLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted -> viewModel.onLocationResult(granted) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.statusBars),
        ) {
            OnboardingTopBar(
                step = step,
                totalSteps = OnboardingViewModel.TOTAL_STEPS,
                onSkip = { viewModel.complete() },
            )
            AnimatedContent(
                targetState = step,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                transitionSpec = {
                    val forward = targetState > initialState
                    val slideIn = slideInHorizontally(animationSpec = tween(260)) {
                        if (forward) it else -it
                    } + fadeIn(animationSpec = tween(220))
                    val slideOut = slideOutHorizontally(animationSpec = tween(220)) {
                        if (forward) -it else it
                    } + fadeOut(animationSpec = tween(160))
                    (slideIn togetherWith slideOut).using(SizeTransform(clip = false))
                },
                label = "onboardingStep",
            ) { current ->
                when (current) {
                    0 -> WelcomeStep(
                        currentLocaleTag = localeTag,
                        onPickLanguage = { tag ->
                            activity?.let { viewModel.applyLanguage(tag, it) }
                        },
                    )
                    1 -> AwarenessStep(
                        radiusKm = notifRadius,
                        notificationsGranted = notificationsGranted,
                        decisionMade = notifsDecided,
                        onRadiusChange = { viewModel.setNotificationRadiusKm(it) },
                        onRequest = {
                            requestNotificationPermissionOrAccept(
                                context = context,
                                onAlreadyGranted = { viewModel.onNotificationsResult(true) },
                                onLaunch = { permission -> notificationLauncher.launch(permission) },
                            )
                        },
                    )
                    else -> LocationStep(
                        granted = locationGranted,
                        decisionMade = locationDecided,
                        onRequest = {
                            requestLocationPermissionOrAccept(
                                context = context,
                                onAlreadyGranted = { viewModel.onLocationResult(true) },
                                onLaunch = { locationLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION) },
                            )
                        },
                    )
                }
            }

            OnboardingBottomBar(
                step = step,
                primaryEnabled = true,
                onPrimary = {
                    if (step < OnboardingViewModel.TOTAL_STEPS - 1) {
                        viewModel.next()
                    } else {
                        viewModel.complete()
                    }
                },
            )
        }
    }
}

@Composable
private fun OnboardingTopBar(
    step: Int,
    totalSteps: Int,
    onSkip: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = VEyeSpacing.lg, vertical = VEyeSpacing.md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        StepDots(step = step, totalSteps = totalSteps)
        Spacer(Modifier.weight(1f))
        // Skip is only meaningful before the final step. On the last step the primary CTA
        // already finishes the flow, so a redundant Skip would just add visual noise.
        if (step < totalSteps - 1) {
            TextButton(onClick = onSkip) {
                Text(
                    text = stringResource(R.string.onboarding_skip),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun StepDots(step: Int, totalSteps: Int) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        repeat(totalSteps) { index ->
            val active = index == step
            val completed = index < step
            val width = if (active) 24.dp else 8.dp
            val color = when {
                active -> MaterialTheme.colorScheme.primary
                completed -> MaterialTheme.colorScheme.primary.copy(alpha = 0.45f)
                else -> MaterialTheme.colorScheme.outlineVariant
            }
            Box(
                modifier = Modifier
                    .width(width)
                    .height(8.dp)
                    .clip(CircleShape)
                    .background(color),
            )
            if (index < totalSteps - 1) Spacer(Modifier.width(6.dp))
        }
    }
}

@Composable
private fun OnboardingBottomBar(
    step: Int,
    primaryEnabled: Boolean,
    onPrimary: () -> Unit,
) {
    val ctaLabel = when (step) {
        0 -> stringResource(R.string.onboarding_welcome_cta)
        1 -> stringResource(R.string.onboarding_continue)
        else -> stringResource(R.string.onboarding_location_finish)
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(horizontal = VEyeSpacing.lg, vertical = VEyeSpacing.md),
    ) {
        PrimaryPillButton(
            label = ctaLabel,
            enabled = primaryEnabled,
            onClick = onPrimary,
        )
    }
}

// region Step 1 — Welcome + language ------------------------------------------------------

@Composable
private fun WelcomeStep(
    currentLocaleTag: String,
    onPickLanguage: (String) -> Unit,
) {
    // Layout choice: the language picker sits BELOW the headline but ABOVE the value
    // props so it lands above the fold on a typical phone (~640dp viewport). Picking a
    // language is the single most consequential thing the user can do on this screen
    // — burying it under three pills meant they had to scroll to find it.
    StepScaffold {
        BrandHero()
        Spacer(Modifier.height(VEyeSpacing.md))
        StepHeadline(text = stringResource(R.string.onboarding_welcome_kreyol_headline))
        Spacer(Modifier.height(VEyeSpacing.xs))
        Spacer(Modifier.height(VEyeSpacing.lg))
        LanguagePicker(
            currentTag = currentLocaleTag,
            onPick = onPickLanguage,
        )
        Spacer(Modifier.height(VEyeSpacing.lg))
        ValuePropPill(
            icon = Icons.Outlined.Lock,
            title = stringResource(R.string.onboarding_welcome_pill_anonymous_title),
            body = stringResource(R.string.onboarding_welcome_pill_anonymous_body),
        )
        Spacer(Modifier.height(VEyeSpacing.xs))
        ValuePropPill(
            icon = Icons.Outlined.Visibility,
            title = stringResource(R.string.onboarding_welcome_pill_local_title),
            body = stringResource(R.string.onboarding_welcome_pill_local_body),
        )
        Spacer(Modifier.height(VEyeSpacing.xs))
        ValuePropPill(
            icon = Icons.Outlined.Bolt,
            title = stringResource(R.string.onboarding_welcome_pill_free_title),
            body = stringResource(R.string.onboarding_welcome_pill_free_body),
        )
    }
}

@Composable
private fun BrandHero() {
    val gradient = Brush.verticalGradient(
        listOf(
            MaterialTheme.colorScheme.primary.copy(alpha = 0.18f),
            MaterialTheme.colorScheme.primary.copy(alpha = 0.04f),
        ),
    )
    // Sized so the language picker stays above the fold on a typical 640dp viewport
    // even with the status bar inset and the bottom CTA accounted for. Don't grow this
    // back to 112dp without re-checking the whole step on a Pixel-class device.
    Box(
        modifier = Modifier
            .size(88.dp)
            .clip(CircleShape)
            .background(gradient),
        contentAlignment = Alignment.Center,
    ) {
        Image(
            painter = painterResource(R.drawable.ic_brand_mark),
            contentDescription = null,
            modifier = Modifier
                .size(56.dp)
                .clip(RoundedCornerShape(16.dp)),
        )
    }
}

@Composable
private fun ValuePropPill(
    icon: ImageVector,
    title: String,
    body: String,
) {
    Surface(
        shape = RoundedCornerShape(VEyeRadius.card),
        color = MaterialTheme.colorScheme.surfaceContainerLowest,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(VEyeSpacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                modifier = Modifier.size(40.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
            Spacer(Modifier.width(VEyeSpacing.md))
            Column(Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = body,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun LanguagePicker(
    currentTag: String,
    onPick: (String) -> Unit,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = Icons.Outlined.Language,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(18.dp),
        )
        Spacer(Modifier.width(VEyeSpacing.xs))
        Text(
            text = stringResource(R.string.onboarding_welcome_language_label),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
    Spacer(Modifier.height(VEyeSpacing.sm))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(VEyeSpacing.xs),
    ) {
        LanguageChip(
            label = stringResource(R.string.profile_lang_ht),
            tag = "ht",
            currentTag = currentTag,
            onPick = onPick,
            modifier = Modifier.weight(1f),
        )
        LanguageChip(
            label = stringResource(R.string.profile_lang_fr),
            tag = "fr",
            currentTag = currentTag,
            onPick = onPick,
            modifier = Modifier.weight(1f),
        )
        LanguageChip(
            label = stringResource(R.string.profile_lang_en),
            tag = "en",
            currentTag = currentTag,
            onPick = onPick,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun LanguageChip(
    label: String,
    tag: String,
    currentTag: String,
    onPick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val selected = currentTag.equals(tag, ignoreCase = true)
    val container = if (selected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.surfaceContainerLowest
    }
    val content = if (selected) {
        MaterialTheme.colorScheme.onPrimary
    } else {
        MaterialTheme.colorScheme.onSurface
    }
    Surface(
        shape = RoundedCornerShape(VEyeRadius.pill),
        color = container,
        border = if (selected) null
        else BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        modifier = modifier
            .height(44.dp)
            .clickable(
                onClick = { onPick(tag) },
                onClickLabel = label,
            )
            .semantics { role = Role.RadioButton },
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                color = content,
            )
        }
    }
}

// endregion

// region Step 2 — Notifications + radius -------------------------------------------------

@Composable
private fun AwarenessStep(
    radiusKm: Double,
    notificationsGranted: Boolean,
    decisionMade: Boolean,
    onRadiusChange: (Double) -> Unit,
    onRequest: () -> Unit,
) {
    StepScaffold {
        StepIcon(icon = Icons.Outlined.NotificationsActive)
        Spacer(Modifier.height(VEyeSpacing.xl))
        StepHeadline(text = stringResource(R.string.onboarding_aware_kreyol_headline))
        Spacer(Modifier.height(VEyeSpacing.sm))
        StepSubhead(text = stringResource(R.string.onboarding_aware_subhead))
        Spacer(Modifier.height(VEyeSpacing.xl))

        RadiusCard(
            radiusKm = radiusKm,
            onRadiusChange = onRadiusChange,
        )
        Spacer(Modifier.height(VEyeSpacing.lg))

        PermissionAcceptanceButton(
            granted = notificationsGranted,
            decisionMade = decisionMade,
            requestLabel = stringResource(R.string.onboarding_aware_cta_request),
            grantedLabel = stringResource(R.string.onboarding_aware_cta_enabled),
            deniedHint = stringResource(R.string.onboarding_aware_denied_hint),
            onRequest = onRequest,
        )
    }
}

@Composable
private fun RadiusCard(
    radiusKm: Double,
    onRadiusChange: (Double) -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(VEyeRadius.card),
        color = MaterialTheme.colorScheme.surfaceContainerLowest,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(VEyeSpacing.md)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Outlined.Radar,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp),
                )
                Spacer(Modifier.width(VEyeSpacing.xs))
                Text(
                    text = stringResource(R.string.onboarding_aware_radius_title),
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Spacer(Modifier.weight(1f))
                Text(
                    text = stringResource(
                        R.string.onboarding_aware_radius_value,
                        radiusKm.toInt(),
                    ),
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Slider(
                value = radiusKm.toFloat().coerceIn(SLIDER_MIN_KM, SLIDER_MAX_KM),
                valueRange = SLIDER_MIN_KM..SLIDER_MAX_KM,
                steps = (((SLIDER_MAX_KM - SLIDER_MIN_KM) / SLIDER_STEP_KM).toInt() - 1)
                    .coerceAtLeast(0),
                onValueChange = { onRadiusChange(it.toDouble()) },
                colors = SliderDefaults.colors(
                    activeTrackColor = MaterialTheme.colorScheme.primary,
                    thumbColor = MaterialTheme.colorScheme.primary,
                ),
            )
            Text(
                text = stringResource(R.string.onboarding_aware_radius_hint),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

// endregion

// region Step 3 — Location ----------------------------------------------------------------

@Composable
private fun LocationStep(
    granted: Boolean,
    decisionMade: Boolean,
    onRequest: () -> Unit,
) {
    StepScaffold {
        StepIcon(icon = Icons.Outlined.LocationOn)
        Spacer(Modifier.height(VEyeSpacing.xl))
        StepHeadline(text = stringResource(R.string.onboarding_location_kreyol_headline))
        Spacer(Modifier.height(VEyeSpacing.sm))
        StepSubhead(text = stringResource(R.string.onboarding_location_subhead))
        Spacer(Modifier.height(VEyeSpacing.xl))

        PrivacyCallout()
        Spacer(Modifier.height(VEyeSpacing.lg))

        PermissionAcceptanceButton(
            granted = granted,
            decisionMade = decisionMade,
            requestLabel = stringResource(R.string.onboarding_location_cta_request),
            grantedLabel = stringResource(R.string.onboarding_location_cta_enabled),
            deniedHint = stringResource(R.string.onboarding_location_denied_hint),
            onRequest = onRequest,
        )
    }
}

@Composable
private fun PrivacyCallout() {
    Surface(
        shape = RoundedCornerShape(VEyeRadius.card),
        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.06f),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(VEyeSpacing.md),
            verticalAlignment = Alignment.Top,
        ) {
            Icon(
                imageVector = Icons.Outlined.PrivacyTip,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.width(VEyeSpacing.sm))
            Text(
                text = stringResource(R.string.onboarding_location_privacy),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

// endregion

// region Shared step primitives ---------------------------------------------------------

/**
 * Common scaffold every step uses: vertical scroll, generous side padding, content
 * starts top-centered. Keeping this in one place enforces visual rhythm across steps.
 */
@Composable
private fun StepScaffold(
    content: @Composable ColumnScope.() -> Unit,
) {
    val scrollState = rememberScrollState()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(
                start = VEyeSpacing.lg,
                end = VEyeSpacing.lg,
                top = VEyeSpacing.md,
                bottom = VEyeSpacing.md,
            ),
        horizontalAlignment = Alignment.Start,
    ) {
        Spacer(Modifier.height(VEyeSpacing.md))
        content()
        Spacer(Modifier.height(VEyeSpacing.xl))
    }
}

@Composable
private fun StepIcon(icon: ImageVector) {
    Box(
        modifier = Modifier
            .size(96.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(40.dp),
        )
    }
}

@Composable
private fun StepHeadline(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.headlineSmall.copy(
            fontWeight = FontWeight.ExtraBold,
            lineHeight = 32.sp,
        ),
        color = MaterialTheme.colorScheme.onSurface,
    )
}

@Composable
private fun StepSubhead(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

/**
 * Inline secondary CTA pattern reused by both permission steps. Before a decision it
 * shows a bordered "Allow X" button. After a grant it flips to a check + label and
 * disables itself. After a denial it shows the denial hint without any further nag —
 * the user can still proceed via the bottom CTA, matching our chosen "auto-advance"
 * permission policy.
 */
@Composable
private fun PermissionAcceptanceButton(
    granted: Boolean,
    decisionMade: Boolean,
    requestLabel: String,
    grantedLabel: String,
    deniedHint: String,
    onRequest: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        when {
            granted -> Surface(
                shape = RoundedCornerShape(VEyeRadius.pill),
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxSize(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Check,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.width(VEyeSpacing.xs))
                    Text(
                        text = grantedLabel,
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
            decisionMade -> Text(
                text = deniedHint,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = VEyeSpacing.xxs),
            )
            else -> Surface(
                shape = RoundedCornerShape(VEyeRadius.pill),
                color = Color.Transparent,
                border = BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .clickable(onClick = onRequest),
            ) {
                Row(
                    modifier = Modifier.fillMaxSize(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Text(
                        text = requestLabel,
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }
    }
}

// endregion

// region Permission helpers --------------------------------------------------------------

private fun requestNotificationPermissionOrAccept(
    context: android.content.Context,
    onAlreadyGranted: () -> Unit,
    onLaunch: (String) -> Unit,
) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
        // Pre-13: there is no runtime permission. The OS already grants the channel,
        // so honour the user's intent without showing a system prompt.
        onAlreadyGranted()
        return
    }
    val granted = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.POST_NOTIFICATIONS,
    ) == PackageManager.PERMISSION_GRANTED
    if (granted) onAlreadyGranted() else onLaunch(Manifest.permission.POST_NOTIFICATIONS)
}

private fun requestLocationPermissionOrAccept(
    context: android.content.Context,
    onAlreadyGranted: () -> Unit,
    onLaunch: () -> Unit,
) {
    val granted = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACCESS_FINE_LOCATION,
    ) == PackageManager.PERMISSION_GRANTED
    if (granted) onAlreadyGranted() else onLaunch()
}

// endregion

private const val SLIDER_MIN_KM = 5f
private const val SLIDER_MAX_KM = 100f
private const val SLIDER_STEP_KM = 5f
