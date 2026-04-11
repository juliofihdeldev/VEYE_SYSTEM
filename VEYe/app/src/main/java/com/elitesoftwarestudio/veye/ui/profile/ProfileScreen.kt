package com.elitesoftwarestudio.veye.ui.profile

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.PrivacyTip
import androidx.compose.material.icons.outlined.Radar
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitesoftwarestudio.veye.BuildConfig
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.preferences.MapSessionPrefs
import com.elitesoftwarestudio.veye.ui.theme.VEYeTheme
import com.elitesoftwarestudio.veye.ui.util.DialogTransparentSystemBars
import com.elitesoftwarestudio.veye.ui.util.findActivity

private val radiusOptionsKm = listOf(5, 10, 15, 25, 50, 100, 300)

private fun parseCustomKm(raw: String): Int? {
    val n = raw.toIntOrNull() ?: return null
    return n.coerceIn(1, 500)
}

@Composable
fun ProfileScreen(viewModel: ProfileViewModel = hiltViewModel()) {
    val context = LocalContext.current
    val activity = context.findActivity()
    val session by viewModel.mapSession.collectAsStateWithLifecycle()
    val themeMode by viewModel.themeMode.collectAsStateWithLifecycle()
    val savedLocaleTag by viewModel.localeTag.collectAsStateWithLifecycle()

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            viewModel.enableNotificationsAndSyncToken()
        } else {
            viewModel.setNotificationsEnabled(false)
        }
    }

    val userFallback = stringResource(R.string.common_user)
    val userLabel = viewModel.userDisplayLabel(userFallback)

    ProfileScreenContent(
        session = session,
        themeMode = themeMode,
        savedLocaleTag = savedLocaleTag,
        userLabel = userLabel,
        versionName = BuildConfig.VERSION_NAME,
        onNotificationsToggle = { on ->
            if (on) {
                if (Build.VERSION.SDK_INT >= 33) {
                    when {
                        ContextCompat.checkSelfPermission(
                            context,
                            android.Manifest.permission.POST_NOTIFICATIONS,
                        ) == PackageManager.PERMISSION_GRANTED -> {
                            viewModel.enableNotificationsAndSyncToken()
                        }
                        else -> {
                            notificationPermissionLauncher.launch(
                                android.Manifest.permission.POST_NOTIFICATIONS,
                            )
                        }
                    }
                } else {
                    viewModel.enableNotificationsAndSyncToken()
                }
            } else {
                viewModel.setNotificationsEnabled(false)
            }
        },
        onDarkModeToggle = { viewModel.setDarkMode(it) },
        onLanguagePick = { tag -> activity?.let { viewModel.applyLanguage(tag, it) } },
        onRadiusPick = { km -> viewModel.setRadiusKm(km) },
        onNotifRadiusPick = { km -> viewModel.setNotificationRadiusKm(km) },
        onLogoutConfirm = { activity?.let { viewModel.logout(it) } },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileScreenContent(
    session: MapSessionPrefs,
    themeMode: String,
    savedLocaleTag: String,
    userLabel: String,
    versionName: String,
    onNotificationsToggle: (Boolean) -> Unit,
    onDarkModeToggle: (Boolean) -> Unit,
    onLanguagePick: (String) -> Unit,
    onRadiusPick: (Double) -> Unit,
    onNotifRadiusPick: (Double) -> Unit,
    onLogoutConfirm: () -> Unit,
) {
    val context = LocalContext.current
    val systemDark = isSystemInDarkTheme()
    val darkSwitchChecked = when (themeMode) {
        com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository.THEME_DARK -> true
        com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository.THEME_LIGHT -> false
        else -> systemDark
    }

    var showFaq by rememberSaveable { mutableStateOf(false) }
    var showLang by rememberSaveable { mutableStateOf(false) }
    var showRadius by rememberSaveable { mutableStateOf(false) }
    var showNotifRadius by rememberSaveable { mutableStateOf(false) }
    var showLogout by rememberSaveable { mutableStateOf(false) }

    var customRadiusText by remember { mutableStateOf("") }
    var customNotifRadiusText by remember { mutableStateOf("") }

    val shareMessage = stringResource(R.string.profile_share_message)
    val privacyUrl = stringResource(R.string.profile_url_privacy)
    val aboutUrl = stringResource(R.string.profile_url_about)

    Scaffold(
        topBar = {
            TopAppBar(title = { Text(stringResource(R.string.tab_profile)) })
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
        ) {
            if (!userLabel.isEmpty()) {
                Text(
                    text = userLabel,
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(vertical = 8.dp),
                )
            }
            ProfileSectionCard {
                ProfileToggleRow(
                    icon = { Icon(Icons.Outlined.Notifications, contentDescription = null) },
                    title = stringResource(R.string.profile_notifications),
                    checked = session.notificationsEnabled,
                    onCheckedChange = onNotificationsToggle,
                )
                HorizontalDivider()
                ProfileToggleRow(
                    icon = { Icon(Icons.Outlined.DarkMode, contentDescription = null) },
                    title = stringResource(R.string.profile_dark_mode),
                    checked = darkSwitchChecked,
                    onCheckedChange = onDarkModeToggle,
                )
                HorizontalDivider()
                ProfileMenuRow(
                    icon = { Icon(Icons.Outlined.Language, contentDescription = null) },
                    title = stringResource(R.string.profile_language),
                    badge = languageBadgeLabel(savedLocaleTag),
                    onClick = { showLang = true },
                )
                HorizontalDivider()
                ProfileMenuRow(
                    icon = { Icon(Icons.Outlined.Radar, contentDescription = null) },
                    title = stringResource(R.string.profile_radius),
                    badge = stringResource(R.string.profile_radius_value, session.radiusKm.toInt()),
                    onClick = {
                        customRadiusText = ""
                        showRadius = true
                    },
                )
                HorizontalDivider()
                ProfileMenuRow(
                    icon = { Icon(Icons.Outlined.NotificationsActive, contentDescription = null) },
                    title = stringResource(R.string.profile_notification_radius),
                    badge = stringResource(
                        R.string.profile_radius_value,
                        session.notificationRadiusKm.toInt(),
                    ),
                    onClick = {
                        customNotifRadiusText = ""
                        showNotifRadius = true
                    },
                )
            }

            Spacer(Modifier.height(12.dp))

            ProfileSectionCard {
                ProfileMenuRow(
                    icon = { Icon(Icons.AutoMirrored.Outlined.HelpOutline, contentDescription = null) },
                    title = stringResource(R.string.profile_faq),
                    badge = null,
                    onClick = { showFaq = true },
                )
                HorizontalDivider()
                ProfileMenuRow(
                    icon = { Icon(Icons.Outlined.PrivacyTip, contentDescription = null) },
                    title = stringResource(R.string.profile_privacy),
                    badge = null,
                    onClick = {
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse(privacyUrl)),
                        )
                    },
                )
                HorizontalDivider()
                ProfileMenuRow(
                    icon = { Icon(Icons.Outlined.Info, contentDescription = null) },
                    title = stringResource(R.string.profile_about_veye),
                    badge = null,
                    onClick = {
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse(aboutUrl)),
                        )
                    },
                )
                HorizontalDivider()
                ProfileMenuRow(
                    icon = { Icon(Icons.Outlined.Share, contentDescription = null) },
                    title = stringResource(R.string.profile_share_veye),
                    badge = null,
                    onClick = {
                        val send = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, shareMessage)
                        }
                        context.startActivity(Intent.createChooser(send, null))
                    },
                )
                HorizontalDivider()
                ProfileMenuRow(
                    icon = {
                        Icon(
                            Icons.AutoMirrored.Outlined.Logout,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                        )
                    },
                    title = stringResource(R.string.profile_logout),
                    badge = null,
                    titleColor = MaterialTheme.colorScheme.error,
                    onClick = { showLogout = true },
                )
            }

            Text(
                text = stringResource(R.string.profile_version, versionName),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp, bottom = 24.dp),
            )
        }
    }

    if (showFaq) {
        Dialog(
            onDismissRequest = { showFaq = false },
            properties =
                DialogProperties(
                    usePlatformDefaultWidth = false,
                    decorFitsSystemWindows = false,
                ),
        ) {
            DialogTransparentSystemBars()
            androidx.compose.material3.Surface(Modifier.fillMaxSize()) {
                FaqScreen(onBack = { showFaq = false })
            }
        }
    }

    if (showLang) {
        AlertDialog(
            onDismissRequest = { showLang = false },
            title = { Text(stringResource(R.string.profile_select_language)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    LanguageRow(stringResource(R.string.profile_lang_system)) {
                        onLanguagePick("")
                        showLang = false
                    }
                    LanguageRow(stringResource(R.string.profile_lang_en)) {
                        onLanguagePick("en")
                        showLang = false
                    }
                    LanguageRow(stringResource(R.string.profile_lang_fr)) {
                        onLanguagePick("fr")
                        showLang = false
                    }
                    LanguageRow(stringResource(R.string.profile_lang_ht)) {
                        onLanguagePick("ht")
                        showLang = false
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showLang = false }) {
                    Text(stringResource(R.string.common_cancel))
                }
            },
        )
    }

    if (showRadius) {
        RadiusBottomSheet(
            title = stringResource(R.string.profile_radius),
            description = stringResource(R.string.profile_radius_desc),
            selectedKm = session.radiusKm.toInt(),
            customText = customRadiusText,
            onCustomTextChange = { customRadiusText = it },
            onDismiss = { showRadius = false },
            onPickPreset = { km ->
                onRadiusPick(km.toDouble())
                showRadius = false
            },
            onApplyCustom = {
                val km = parseCustomKm(customRadiusText)
                if (km != null) {
                    onRadiusPick(km.toDouble())
                    showRadius = false
                }
            },
        )
    }

    if (showNotifRadius) {
        RadiusBottomSheet(
            title = stringResource(R.string.profile_notification_radius),
            description = stringResource(R.string.profile_notification_radius_desc),
            selectedKm = session.notificationRadiusKm.toInt(),
            customText = customNotifRadiusText,
            onCustomTextChange = { customNotifRadiusText = it },
            onDismiss = { showNotifRadius = false },
            onPickPreset = { km ->
                onNotifRadiusPick(km.toDouble())
                showNotifRadius = false
            },
            onApplyCustom = {
                val km = parseCustomKm(customNotifRadiusText)
                if (km != null) {
                    onNotifRadiusPick(km.toDouble())
                    showNotifRadius = false
                }
            },
        )
    }

    if (showLogout) {
        AlertDialog(
            onDismissRequest = { showLogout = false },
            title = { Text(stringResource(R.string.profile_logout)) },
            text = { Text(stringResource(R.string.profile_logout_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        onLogoutConfirm()
                        showLogout = false
                    },
                ) {
                    Text(
                        stringResource(R.string.profile_logout),
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogout = false }) {
                    Text(stringResource(R.string.common_cancel))
                }
            },
        )
    }
}

@Composable
private fun languageBadgeLabel(savedTag: String): String {
    if (savedTag.isBlank()) {
        return stringResource(R.string.profile_lang_system)
    }
    return when (savedTag) {
        "fr" -> stringResource(R.string.profile_lang_fr)
        "ht" -> stringResource(R.string.profile_lang_ht)
        else -> stringResource(R.string.profile_lang_en)
    }
}

@Composable
private fun LanguageRow(label: String, onPick: () -> Unit) {
    TextButton(
        onClick = onPick,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(label, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
private fun ProfileSectionCard(content: @Composable () -> Unit) {
    androidx.compose.material3.Surface(
        shape = MaterialTheme.shapes.large,
        tonalElevation = 1.dp,
        shadowElevation = 0.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column { content() }
    }
}

@Composable
private fun ProfileToggleRow(
    icon: @Composable () -> Unit,
    title: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable { onCheckedChange(!checked) }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        icon()
        Text(
            text = title,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 14.dp),
        )
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
        )
    }
}

@Composable
private fun ProfileMenuRow(
    icon: @Composable () -> Unit,
    title: String,
    badge: String?,
    titleColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .semantics { role = Role.Button }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        icon()
        Text(
            text = title,
            style = MaterialTheme.typography.bodyLarge,
            color = titleColor,
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 14.dp),
        )
        if (badge != null) {
            Text(
                text = badge,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(end = 8.dp),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RadiusBottomSheet(
    title: String,
    description: String,
    selectedKm: Int,
    customText: String,
    onCustomTextChange: (String) -> Unit,
    onDismiss: () -> Unit,
    onPickPreset: (Int) -> Unit,
    onApplyCustom: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(
                description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp, bottom = 16.dp),
            )
            radiusOptionsKm.chunked(3).forEach { row ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(bottom = 8.dp),
                ) {
                    row.forEach { km ->
                        FilterChip(
                            selected = selectedKm == km && customText.isBlank(),
                            onClick = { onPickPreset(km) },
                            label = { Text(stringResource(R.string.profile_radius_value, km)) },
                        )
                    }
                }
            }
            HorizontalDivider(Modifier.padding(vertical = 16.dp))
            Text(
                stringResource(R.string.profile_or_custom),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(
                Modifier.padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = customText,
                    onValueChange = { onCustomTextChange(it.filter { c -> c.isDigit() }.take(4)) },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text(stringResource(R.string.profile_custom_radius_hint)) },
                    singleLine = true,
                )
                Text(stringResource(R.string.profile_km_unit))
                Button(
                    onClick = onApplyCustom,
                    enabled = customText.isNotBlank(),
                ) {
                    Icon(Icons.Filled.Check, contentDescription = null)
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun ProfileScreenPreview() {
    VEYeTheme {
        ProfileScreenContent(
            session = MapSessionPrefs(
                latitude = null,
                longitude = null,
                radiusKm = 25.0,
                notificationRadiusKm = 10.0,
                notificationsEnabled = true,
            ),
            themeMode = "light",
            savedLocaleTag = "en",
            userLabel = "Jane Doe",
            versionName = "1.0.0",
            onNotificationsToggle = {},
            onDarkModeToggle = {},
            onLanguagePick = {},
            onRadiusPick = {},
            onNotifRadiusPick = {},
            onLogoutConfirm = {},
        )
    }
}
