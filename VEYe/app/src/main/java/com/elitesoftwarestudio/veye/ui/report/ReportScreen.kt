package com.elitesoftwarestudio.veye.ui.report

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.ui.components.AnonymousToggleRow
import com.elitesoftwarestudio.veye.ui.components.PinnedLocationCard
import com.elitesoftwarestudio.veye.ui.components.PrimaryPillButton
import com.elitesoftwarestudio.veye.ui.components.ReportTypePair
import com.elitesoftwarestudio.veye.ui.components.ReportTypeTileSpec
import com.elitesoftwarestudio.veye.ui.theme.SeverityKind
import com.elitesoftwarestudio.veye.ui.theme.VEyeRadius
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing
import com.elitesoftwarestudio.veye.ui.theme.severityFromReportType
import kotlinx.coroutines.flow.collectLatest
import java.io.File
import java.text.DateFormat
import java.util.Date

private const val MAX_PHOTOS = 4

private val BlockedBanner = Color(0xFFDC2626)

private data class ReportTypeOption(
    val key: String,
    val kind: SeverityKind,
    val labelRes: Int,
    val descriptionRes: Int? = null,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportScreen(
    modifier: Modifier = Modifier,
    viewModel: ReportViewModel = hiltViewModel(),
    onThankYouNavigateToZones: () -> Unit = {},
) {
    val context = LocalContext.current
    val session by viewModel.mapSession.collectAsStateWithLifecycle()
    val moderation by viewModel.moderation.collectAsStateWithLifecycle()

    var selectedType by rememberSaveable { mutableStateOf<String?>(null) }
    var description by rememberSaveable { mutableStateOf("") }
    var victimName by rememberSaveable { mutableStateOf("") }
    var contactPhone by rememberSaveable { mutableStateOf("") }
    var anonymous by rememberSaveable { mutableStateOf(false) }
    val photos = remember { mutableStateListOf<Uri>() }

    var showSelectType by remember { mutableStateOf(false) }
    var showDescriptionRequired by remember { mutableStateOf(false) }
    var showThankYou by remember { mutableStateOf(false) }
    var showServerBlocked by remember { mutableStateOf(false) }
    var serverBlockedUntil by remember { mutableStateOf<Long?>(null) }

    LaunchedEffect(Unit) {
        val pre = viewModel.consumeStagedPrefillText()
        if (!pre.isNullOrBlank() && description.isBlank()) {
            description = pre
        }
    }

    LaunchedEffect(Unit) {
        viewModel.effects.collectLatest { e ->
            when (e) {
                ReportUiEffect.ThankYou -> showThankYou = true
                is ReportUiEffect.ServerBlocked -> {
                    serverBlockedUntil = e.unblockedAtMs
                    showServerBlocked = true
                }
            }
        }
    }

    val reportTypes =
        remember {
            listOf(
                ReportTypeOption(
                    key = "missing",
                    kind = SeverityKind.Missing,
                    labelRes = R.string.severity_missing,
                    descriptionRes = R.string.report_type_missing_desc,
                ),
                ReportTypeOption(
                    key = "info",
                    kind = SeverityKind.Info,
                    labelRes = R.string.report_type_info_label,
                    descriptionRes = R.string.report_type_info_desc,
                ),
                ReportTypeOption(
                    key = "kidnapping",
                    kind = SeverityKind.Kidnapping,
                    labelRes = R.string.report_type_kidnapping,
                ),
                ReportTypeOption(
                    key = "danger_zone",
                    kind = SeverityKind.DangerZone,
                    labelRes = R.string.report_type_danger_zone,
                ),
                ReportTypeOption(
                    key = "shooting",
                    kind = SeverityKind.Shooting,
                    labelRes = R.string.report_type_shooting,
                ),
                ReportTypeOption(
                    key = "suspicious",
                    kind = SeverityKind.Suspicious,
                    labelRes = R.string.report_type_suspicious,
                ),
            )
        }

    val activeKind =
        selectedType?.let { key -> severityFromReportType(key) } ?: SeverityKind.Kidnapping
    val accent = com.elitesoftwarestudio.veye.ui.theme.severityAccent(activeKind)

    val locationText =
        if (session.latitude != null && session.longitude != null) {
            "%.4f°, %.4f°".format(session.latitude, session.longitude)
        } else {
            stringResource(R.string.report_location_not_detected)
        }

    val cameraPermission = Manifest.permission.CAMERA
    var pendingCameraLaunch by remember { mutableStateOf(false) }
    var pendingCaptureUri by remember { mutableStateOf<Uri?>(null) }

    val takePictureLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
            val uri = pendingCaptureUri
            pendingCaptureUri = null
            if (ok && uri != null && photos.size < MAX_PHOTOS) {
                photos.add(uri)
            }
        }

    val permissionLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted && pendingCameraLaunch && photos.size < MAX_PHOTOS) {
                pendingCameraLaunch = false
                val dir = File(context.cacheDir, "report_photos").apply { mkdirs() }
                val file = File.createTempFile("veye_cap_", ".jpg", dir)
                val uri =
                    FileProvider.getUriForFile(
                        context,
                        "${context.packageName}.fileprovider",
                        file,
                    )
                pendingCaptureUri = uri
                takePictureLauncher.launch(uri)
            } else {
                pendingCameraLaunch = false
            }
        }

    val pickGallery =
        rememberLauncherForActivityResult(
            ActivityResultContracts.PickMultipleVisualMedia(maxItems = MAX_PHOTOS),
        ) { uris ->
            val room = MAX_PHOTOS - photos.size
            if (room <= 0) return@rememberLauncherForActivityResult
            uris.take(room).forEach { photos.add(it) }
        }

    fun launchCamera() {
        if (photos.size >= MAX_PHOTOS) return
        val hasCam =
            ContextCompat.checkSelfPermission(context, cameraPermission) == PackageManager.PERMISSION_GRANTED
        if (hasCam) {
            val dir = File(context.cacheDir, "report_photos").apply { mkdirs() }
            val file = File.createTempFile("veye_cap_", ".jpg", dir)
            val uri =
                FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    file,
                )
            pendingCaptureUri = uri
            takePictureLauncher.launch(uri)
        } else {
            pendingCameraLaunch = true
            permissionLauncher.launch(cameraPermission)
        }
    }

    fun resetForm() {
        selectedType = null
        description = ""
        victimName = ""
        contactPhone = ""
        anonymous = false
        photos.clear()
    }

    fun submit() {
        if (moderation.isBlocked) return
        val type = selectedType
        if (type == null) {
            showSelectType = true
            return
        }
        if (description.isBlank()) {
            showDescriptionRequired = true
            return
        }
        viewModel.submitReport(
            typeKey = type,
            description = description,
            victimName = victimName,
            contactPhone = contactPhone,
            anonymous = anonymous,
            photoUris = photos.toList(),
            displayAddress = locationText,
            fullAddressJson = "",
        )
        resetForm()
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = { ReportTopBar() },
    ) { padding ->
        Column(
            modifier =
                Modifier
                    .padding(padding)
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp)
                    .padding(bottom = 88.dp),
        ) {
            if (moderation.isBlocked) {
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .background(BlockedBanner)
                            .padding(16.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Icon(Icons.Outlined.Lock, contentDescription = null, tint = Color.White)
                    Column(Modifier.padding(start = 10.dp)) {
                        Text(
                            stringResource(R.string.blocked_banner_title),
                            color = Color.White,
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Text(
                            text =
                                moderation.unblockedAtMs?.let { ms ->
                                    stringResource(
                                        R.string.blocked_banner_message,
                                        formatBlockedDate(ms),
                                    )
                                } ?: stringResource(R.string.blocked_banner_message_no_date),
                            color = Color.White.copy(alpha = 0.88f),
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }

            Text(
                stringResource(R.string.report_section_what),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(top = VEyeSpacing.md, bottom = VEyeSpacing.sm),
            )
            val primary = reportTypes[0]
            val secondary = reportTypes[1]
            ReportTypePair(
                primary =
                    ReportTypeTileSpec(
                        kind = primary.kind,
                        selected = selectedType == primary.key,
                        onClick = { selectedType = primary.key },
                        title = stringResource(primary.labelRes),
                        description = primary.descriptionRes?.let { stringResource(it) },
                    ),
                secondary =
                    ReportTypeTileSpec(
                        kind = secondary.kind,
                        selected = selectedType == secondary.key,
                        onClick = { selectedType = secondary.key },
                        title = stringResource(secondary.labelRes),
                        description = secondary.descriptionRes?.let { stringResource(it) },
                    ),
            )
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(top = VEyeSpacing.sm)
                        .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(VEyeSpacing.xs),
            ) {
                reportTypes.drop(2).forEach { tp ->
                    val active = selectedType == tp.key
                    val tpAccent =
                        com.elitesoftwarestudio.veye.ui.theme.severityAccent(tp.kind)
                    Surface(
                        modifier = Modifier.clickable { selectedType = tp.key },
                        shape = RoundedCornerShape(VEyeRadius.pill),
                        color =
                            if (active) tpAccent
                            else MaterialTheme.colorScheme.surfaceContainerHigh,
                        border =
                            if (active) null
                            else BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                    ) {
                        Text(
                            stringResource(tp.labelRes),
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            color =
                                if (active) Color.White
                                else MaterialTheme.colorScheme.onSurface,
                            style = MaterialTheme.typography.labelLarge,
                        )
                    }
                }
            }

            Text(
                stringResource(R.string.report_section_where),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(top = VEyeSpacing.md, bottom = VEyeSpacing.sm),
            )
            PinnedLocationCard(
                locationLabel = locationText,
                accuracyLabel = "± 300 m",
            )

            Row(Modifier.padding(top = 20.dp, bottom = 8.dp)) {
                Text(stringResource(R.string.report_section_evidence), style = MaterialTheme.typography.titleMedium)
                Text(
                    " ${stringResource(R.string.report_optional)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                photos.forEachIndexed { index, uri ->
                    Box {
                        AsyncImage(
                            model = uri,
                            contentDescription = null,
                            modifier =
                                Modifier
                                    .size(90.dp)
                                    .clip(RoundedCornerShape(12.dp)),
                            contentScale = ContentScale.Crop,
                        )
                        IconButton(
                            onClick = { photos.removeAt(index) },
                            modifier =
                                Modifier
                                    .align(Alignment.TopEnd)
                                    .offset(x = 4.dp, y = (-4).dp)
                                    .size(28.dp),
                        ) {
                            Icon(
                                Icons.Filled.Close,
                                contentDescription = stringResource(R.string.report_remove_photo),
                                tint = accent,
                            )
                        }
                    }
                }
                if (photos.size < MAX_PHOTOS) {
                    OutlinedButton(
                        onClick = { launchCamera() },
                        modifier = Modifier.size(90.dp),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Outlined.CameraAlt, contentDescription = null, tint = accent)
                            Text(stringResource(R.string.report_take_photo), style = MaterialTheme.typography.labelSmall, color = accent)
                        }
                    }
                    OutlinedButton(
                        onClick = {
                            pickGallery.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                            )
                        },
                        modifier = Modifier.size(90.dp),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Outlined.Image, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                stringResource(R.string.report_choose_from_library),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
            if (photos.isNotEmpty()) {
                Text(
                    stringResource(R.string.report_photo_added, photos.size, MAX_PHOTOS),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            Text(
                stringResource(R.string.report_section_details),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(top = 20.dp, bottom = 12.dp),
            )

            if (selectedType == "missing") {
                Text(stringResource(R.string.report_victim_name), style = MaterialTheme.typography.labelLarge)
                OutlinedTextField(
                    value = victimName,
                    onValueChange = { victimName = it },
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(top = 6.dp),
                    placeholder = { Text(stringResource(R.string.report_victim_name_placeholder)) },
                    singleLine = true,
                )
            }

            Text(
                stringResource(R.string.report_describe_what_you_see),
                style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.padding(top = VEyeSpacing.sm),
            )
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(top = VEyeSpacing.xs)
                        .height(120.dp),
                placeholder = { Text(stringResource(R.string.report_description_placeholder)) },
                minLines = 4,
                shape = RoundedCornerShape(VEyeRadius.card),
                colors =
                    OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                    ),
            )

            Text(stringResource(R.string.report_contact_phone), style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 12.dp))
            OutlinedTextField(
                value = contactPhone,
                onValueChange = { contactPhone = it },
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                placeholder = { Text(stringResource(R.string.report_contact_phone_placeholder)) },
                enabled = !anonymous,
                singleLine = true,
            )

            AnonymousToggleRow(
                title = stringResource(R.string.report_anonymous),
                description = stringResource(R.string.report_anonymous_desc),
                checked = anonymous,
                onCheckedChange = { anonymous = it },
                modifier = Modifier.padding(top = VEyeSpacing.md),
            )

            Row(
                modifier = Modifier.padding(top = VEyeSpacing.sm, bottom = VEyeSpacing.lg),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(VEyeSpacing.xs),
            ) {
                Text(
                    stringResource(R.string.report_time),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    DateFormat.getTimeInstance(DateFormat.SHORT).format(Date()) + "  ·  " +
                        DateFormat.getDateInstance(DateFormat.MEDIUM).format(Date()),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            PrimaryPillButton(
                label = stringResource(R.string.report_submit_report),
                onClick = { submit() },
                enabled = !moderation.isBlocked,
                accent = accent,
                trailingIcon = Icons.AutoMirrored.Outlined.Send,
            )
        }
    }

    if (showSelectType) {
        AlertDialog(
            onDismissRequest = { showSelectType = false },
            title = { Text(stringResource(R.string.report_select_type)) },
            text = { Text(stringResource(R.string.report_select_type_message)) },
            confirmButton = {
                TextButton(onClick = { showSelectType = false }) {
                    Text(stringResource(android.R.string.ok))
                }
            },
        )
    }

    if (showDescriptionRequired) {
        AlertDialog(
            onDismissRequest = { showDescriptionRequired = false },
            title = { Text(stringResource(R.string.report_description_required)) },
            text = { Text(stringResource(R.string.report_description_required_message)) },
            confirmButton = {
                TextButton(onClick = { showDescriptionRequired = false }) {
                    Text(stringResource(android.R.string.ok))
                }
            },
        )
    }

    if (showThankYou) {
        AlertDialog(
            onDismissRequest = {
                showThankYou = false
                onThankYouNavigateToZones()
            },
            title = { Text(stringResource(R.string.report_thank_you)) },
            text = { Text(stringResource(R.string.report_report_processing)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showThankYou = false
                        onThankYouNavigateToZones()
                    },
                ) {
                    Text(stringResource(android.R.string.ok))
                }
            },
        )
    }

    if (showServerBlocked) {
        AlertDialog(
            onDismissRequest = { showServerBlocked = false },
            title = { Text(stringResource(R.string.blocked_title)) },
            text = {
                Text(
                    serverBlockedUntil?.let { ms ->
                        stringResource(R.string.blocked_message, formatBlockedDate(ms))
                    } ?: stringResource(R.string.blocked_message_no_date),
                )
            },
            confirmButton = {
                TextButton(onClick = { showServerBlocked = false }) {
                    Text(stringResource(R.string.blocked_alert_button))
                }
            },
        )
    }
}

private fun formatBlockedDate(epochMs: Long): String =
    DateFormat.getDateTimeInstance(DateFormat.FULL, DateFormat.SHORT).format(Date(epochMs))

/**
 * Single-line bold title for the report form. The screen used to claim "Step 1 of 3"
 * with a non-functional close + help affordance, but the form has always been a single
 * step — the indicator was misleading and the icons were no-ops. The bottom tab bar
 * is the proper escape from this destination, so no header chrome is needed.
 */
@Composable
private fun ReportTopBar() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = VEyeSpacing.md, vertical = VEyeSpacing.sm),
    ) {
        Text(
            text = stringResource(R.string.report_title),
            style = MaterialTheme.typography.titleLarge.copy(
                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
            ),
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.align(Alignment.CenterStart),
        )
    }
}
