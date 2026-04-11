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
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
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
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.PersonSearch
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
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
import kotlinx.coroutines.flow.collectLatest
import java.io.File
import java.text.DateFormat
import java.util.Date

private const val MAX_PHOTOS = 4

private val TypeKidnapping = Color(0xFFC41E3A)
private val TypeMissing = Color(0xFFEAB308)
private val TypeDanger = Color(0xFFE85D04)
private val BlockedBanner = Color(0xFFDC2626)

private data class ReportTypeUi(
    val key: String,
    val labelRes: Int,
    val color: Color,
    val icon: ImageVector,
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
                ReportTypeUi("kidnapping", R.string.report_type_kidnapping, TypeKidnapping, Icons.Outlined.Warning),
                ReportTypeUi("missing", R.string.report_type_missing, TypeMissing, Icons.Outlined.PersonSearch),
                ReportTypeUi("danger_zone", R.string.report_type_danger_zone, TypeDanger, Icons.Outlined.Warning),
                ReportTypeUi("shooting", R.string.report_type_shooting, TypeDanger, Icons.Outlined.Warning),
                ReportTypeUi("suspicious", R.string.report_type_suspicious, TypeMissing, Icons.Outlined.Visibility),
            )
        }

    val activeType = reportTypes.find { it.key == selectedType }
    val accent = activeType?.color ?: TypeKidnapping

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
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(stringResource(R.string.report_title)) },
            )
        },
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
                modifier = Modifier.padding(top = 20.dp, bottom = 12.dp),
            )
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                reportTypes.forEach { tp ->
                    val active = selectedType == tp.key
                    Surface(
                        modifier = Modifier.clickable { selectedType = tp.key },
                        shape = RoundedCornerShape(24.dp),
                        color = if (active) tp.color else MaterialTheme.colorScheme.surface,
                        border =
                            BorderStroke(
                                1.5.dp,
                                if (active) tp.color else MaterialTheme.colorScheme.outlineVariant,
                            ),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(
                                tp.icon,
                                contentDescription = null,
                                tint = if (active) Color.White else tp.color,
                                modifier = Modifier.size(18.dp),
                            )
                            Text(
                                stringResource(tp.labelRes),
                                style = MaterialTheme.typography.labelLarge,
                                color = if (active) Color.White else MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                }
            }

            Text(
                stringResource(R.string.report_section_where),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(top = 20.dp, bottom = 12.dp),
            )
            Surface(
                shape = RoundedCornerShape(14.dp),
                tonalElevation = 1.dp,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier =
                            Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(TypeKidnapping.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Outlined.MyLocation, contentDescription = null, tint = TypeKidnapping)
                    }
                    Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                        Text(
                            stringResource(R.string.report_location_auto_detected),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            locationText,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(top = 2.dp),
                        )
                    }
                    Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = Color(0xFF22C55E))
                }
            }

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
                                tint = TypeKidnapping,
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

            Text(stringResource(R.string.report_description), style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 12.dp))
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp)
                        .height(120.dp),
                placeholder = { Text(stringResource(R.string.report_description_placeholder)) },
                minLines = 4,
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

            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
                        .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(stringResource(R.string.report_anonymous), modifier = Modifier.weight(1f))
                Switch(checked = anonymous, onCheckedChange = { anonymous = it })
            }

            Row(
                modifier = Modifier.padding(top = 16.dp, bottom = 24.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(stringResource(R.string.report_time), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    DateFormat.getTimeInstance(DateFormat.SHORT).format(Date()) + "  ·  " +
                        DateFormat.getDateInstance(DateFormat.MEDIUM).format(Date()),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Button(
                onClick = { submit() },
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                enabled = !moderation.isBlocked,
                colors =
                    ButtonDefaults.buttonColors(
                        containerColor = if (moderation.isBlocked) Color(0xFF9CA3AF) else accent,
                        disabledContainerColor = Color(0xFF9CA3AF),
                    ),
            ) {
                Icon(Icons.AutoMirrored.Outlined.Send, contentDescription = null, tint = Color.White)
                Text(stringResource(R.string.report_submit_report), modifier = Modifier.padding(start = 8.dp), color = Color.White)
            }
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
