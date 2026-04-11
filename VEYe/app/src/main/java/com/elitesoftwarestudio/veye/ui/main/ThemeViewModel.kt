package com.elitesoftwarestudio.veye.ui.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class ThemeViewModel @Inject constructor(
    prefs: UserPreferencesRepository,
) : ViewModel() {
    val themeMode = prefs.themeMode.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        UserPreferencesRepository.THEME_LIGHT,
    )
}
