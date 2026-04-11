package com.elitesoftwarestudio.veye.ui.profile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.R

private val faqIds = 1..8

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FaqScreen(onBack: () -> Unit) {
    var expandedId by rememberSaveable { mutableIntStateOf(-1) }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.faq_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_close),
                        )
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
        ) {
            faqIds.forEach { id ->
                FaqItemRow(
                    id = id,
                    expanded = expandedId == id,
                    onToggle = {
                        expandedId = if (expandedId == id) -1 else id
                    },
                )
            }
        }
    }
}

@Composable
private fun FaqItemRow(
    id: Int,
    expanded: Boolean,
    onToggle: () -> Unit,
) {
    val qRes = faqQuestionRes(id)
    val aRes = faqAnswerRes(id)
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 5.dp),
        shape = MaterialTheme.shapes.large,
        tonalElevation = 1.dp,
        shadowElevation = 0.dp,
    ) {
        Column(
            Modifier
                .clickable(onClick = onToggle)
                .padding(16.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = stringResource(qRes),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier
                        .weight(1f)
                        .semantics { heading() },
                )
                Icon(
                    imageVector = if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                    contentDescription = null,
                )
            }
            if (expanded) {
                HorizontalDivider(Modifier.padding(vertical = 12.dp))
                Text(
                    text = stringResource(aRes),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

private fun faqQuestionRes(id: Int): Int = when (id) {
    1 -> R.string.faq_q1
    2 -> R.string.faq_q2
    3 -> R.string.faq_q3
    4 -> R.string.faq_q4
    5 -> R.string.faq_q5
    6 -> R.string.faq_q6
    7 -> R.string.faq_q7
    8 -> R.string.faq_q8
    else -> error("faq id")
}

private fun faqAnswerRes(id: Int): Int = when (id) {
    1 -> R.string.faq_a1
    2 -> R.string.faq_a2
    3 -> R.string.faq_a3
    4 -> R.string.faq_a4
    5 -> R.string.faq_a5
    6 -> R.string.faq_a6
    7 -> R.string.faq_a7
    8 -> R.string.faq_a8
    else -> error("faq id")
}
