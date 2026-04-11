import React, { useState, useContext } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Share,
  Linking,
  Alert,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import auth from '@react-native-firebase/auth'
import { useTranslation } from 'react-i18next'
import { UserContext } from '../../context/UserContext'
import { useTheme } from '../../context/ThemeContext'
import { useIsTablet } from '../../utils/useIsTablet'
import { COLORS, FONT_FAMILY } from '../../constants'
import ModernHeader from '../../components/ModernHeader'
import FAQ from './FAQ'

const APP_VERSION = require('../../../package.json').version

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ht', label: 'Kreyòl', flag: '🇭🇹' },
]

const RADIUS_OPTIONS = [5, 10, 15, 25, 50, 100, 300]

export default function Profile() {
  const { t, i18n } = useTranslation()
  const { isDark, setDark, colors } = useTheme()
  const isTablet = useIsTablet()
  const { radiusKm, setRadiusKm, notificationRadiusKm, setNotificationRadiusKm } = useContext(UserContext)
  const [notifications, setNotifications] = useState(true)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [showRadiusPicker, setShowRadiusPicker] = useState(false)
  const [showNotificationRadiusPicker, setShowNotificationRadiusPicker] = useState(false)
  const [showFAQ, setShowFAQ] = useState(false)
  const [customRadius, setCustomRadius] = useState('')
  const [customNotificationRadius, setCustomNotificationRadius] = useState('')

  const displayName = auth().currentUser?.displayName || auth().currentUser?.email || t('common.user')
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[2]

  const handleShare = async () => {
    try {
      await Share.share({ message: t('profile.shareMessage') })
    } catch (e) { }
  }

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: () => auth().signOut() },
    ])
  }

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code)
    setShowLangPicker(false)
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ModernHeader title={t('profile.title')} showSOS={false} />

      <Modal visible={showLangPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLangPicker(false)}>
          <View style={[styles.langSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.langTitle, { color: colors.text }]}>{t('profile.selectLanguage')}</Text>
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langRow, i18n.language === lang.code && styles.langRowActive]}
                onPress={() => changeLanguage(lang.code)}>
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, { color: colors.text }, i18n.language === lang.code && styles.langLabelActive]}>{lang.label}</Text>
                {i18n.language === lang.code && (
                  <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.severityCritical} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showRadiusPicker} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlayInner} activeOpacity={1} onPress={() => setShowRadiusPicker(false)}>
            <View style={styles.langSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.langTitle}>{t('profile.radius')}</Text>
              <Text style={styles.radiusDesc}>{t('profile.radiusDesc')}</Text>
              <View style={styles.radiusGrid}>
                {RADIUS_OPTIONS.map(km => (
                  <TouchableOpacity
                    key={km}
                    style={[styles.radiusChip, radiusKm === km && !customRadius && styles.radiusChipActive]}
                    onPress={() => { setCustomRadius(''); setRadiusKm(km); setShowRadiusPicker(false) }}>
                    <Text style={[styles.radiusChipText, radiusKm === km && !customRadius && styles.radiusChipTextActive]}>
                      {t('profile.radiusValue', { km })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customRadiusDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('profile.orCustom')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.customRadiusRow}>
                <TextInput
                  style={styles.customRadiusInput}
                  placeholder="e.g. 30"
                  placeholderTextColor="#BBB"
                  keyboardType="numeric"
                  value={customRadius}
                  onChangeText={setCustomRadius}
                  maxLength={4}
                />
                <Text style={styles.customRadiusUnit}>km</Text>
                <TouchableOpacity
                  style={[styles.customRadiusBtn, !customRadius && styles.customRadiusBtnDisabled]}
                  disabled={!customRadius}
                  onPress={() => {
                    const val = Math.max(1, Math.min(500, parseInt(customRadius, 10) || 0))
                    if (val > 0) {
                      setRadiusKm(val)
                      setCustomRadius('')
                      setShowRadiusPicker(false)
                    }
                  }}>
                  <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showNotificationRadiusPicker} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlayInner} activeOpacity={1} onPress={() => setShowNotificationRadiusPicker(false)}>
            <View style={styles.langSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.langTitle}>{t('profile.notificationRadius')}</Text>
              <Text style={styles.radiusDesc}>{t('profile.notificationRadiusDesc')}</Text>
              <View style={styles.radiusGrid}>
                {RADIUS_OPTIONS.map(km => (
                  <TouchableOpacity
                    key={km}
                    style={[styles.radiusChip, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipActive]}
                    onPress={() => { setCustomNotificationRadius(''); setNotificationRadiusKm(km); setShowNotificationRadiusPicker(false) }}>
                    <Text style={[styles.radiusChipText, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipTextActive]}>
                      {t('profile.radiusValue', { km })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customRadiusDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('profile.orCustom')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.customRadiusRow}>
                <TextInput
                  style={styles.customRadiusInput}
                  placeholder="e.g. 30"
                  placeholderTextColor="#BBB"
                  keyboardType="numeric"
                  value={customNotificationRadius}
                  onChangeText={setCustomNotificationRadius}
                  maxLength={4}
                />
                <Text style={styles.customRadiusUnit}>km</Text>
                <TouchableOpacity
                  style={[styles.customRadiusBtn, !customNotificationRadius && styles.customRadiusBtnDisabled]}
                  disabled={!customNotificationRadius}
                  onPress={() => {
                    const val = Math.max(1, Math.min(500, parseInt(customNotificationRadius, 10) || 0))
                    if (val > 0) {
                      setNotificationRadiusKm(val)
                      setCustomNotificationRadius('')
                      setShowNotificationRadiusPicker(false)
                    }
                  }}>
                  <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showNotificationRadiusPicker} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlayInner} activeOpacity={1} onPress={() => setShowNotificationRadiusPicker(false)}>
            <View style={styles.langSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.langTitle}>{t('profile.notificationRadius')}</Text>
              <Text style={styles.radiusDesc}>{t('profile.notificationRadiusDesc')}</Text>
              <View style={styles.radiusGrid}>
                {RADIUS_OPTIONS.map(km => (
                  <TouchableOpacity
                    key={km}
                    style={[styles.radiusChip, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipActive]}
                    onPress={() => { setCustomNotificationRadius(''); setNotificationRadiusKm(km); setShowNotificationRadiusPicker(false) }}>
                    <Text style={[styles.radiusChipText, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipTextActive]}>
                      {t('profile.radiusValue', { km })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customRadiusDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('profile.orCustom')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.customRadiusRow}>
                <TextInput
                  style={styles.customRadiusInput}
                  placeholder="e.g. 30"
                  placeholderTextColor="#BBB"
                  keyboardType="numeric"
                  value={customNotificationRadius}
                  onChangeText={setCustomNotificationRadius}
                  maxLength={4}
                />
                <Text style={styles.customRadiusUnit}>km</Text>
                <TouchableOpacity
                  style={[styles.customRadiusBtn, !customNotificationRadius && styles.customRadiusBtnDisabled]}
                  disabled={!customNotificationRadius}
                  onPress={() => {
                    const val = Math.max(1, Math.min(500, parseInt(customNotificationRadius, 10) || 0))
                    if (val > 0) {
                      setNotificationRadiusKm(val)
                      setCustomNotificationRadius('')
                      setShowNotificationRadiusPicker(false)
                    }
                  }}>
                  <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showNotificationRadiusPicker} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlayInner} activeOpacity={1} onPress={() => setShowNotificationRadiusPicker(false)}>
            <View style={styles.langSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.langTitle}>{t('profile.notificationRadius')}</Text>
              <Text style={styles.radiusDesc}>{t('profile.notificationRadiusDesc')}</Text>
              <View style={styles.radiusGrid}>
                {RADIUS_OPTIONS.map(km => (
                  <TouchableOpacity
                    key={km}
                    style={[styles.radiusChip, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipActive]}
                    onPress={() => { setCustomNotificationRadius(''); setNotificationRadiusKm(km); setShowNotificationRadiusPicker(false) }}>
                    <Text style={[styles.radiusChipText, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipTextActive]}>
                      {t('profile.radiusValue', { km })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customRadiusDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('profile.orCustom')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.customRadiusRow}>
                <TextInput
                  style={styles.customRadiusInput}
                  placeholder="e.g. 30"
                  placeholderTextColor="#BBB"
                  keyboardType="numeric"
                  value={customNotificationRadius}
                  onChangeText={setCustomNotificationRadius}
                  maxLength={4}
                />
                <Text style={styles.customRadiusUnit}>km</Text>
                <TouchableOpacity
                  style={[styles.customRadiusBtn, !customNotificationRadius && styles.customRadiusBtnDisabled]}
                  disabled={!customNotificationRadius}
                  onPress={() => {
                    const val = Math.max(1, Math.min(500, parseInt(customNotificationRadius, 10) || 0))
                    if (val > 0) {
                      setNotificationRadiusKm(val)
                      setCustomNotificationRadius('')
                      setShowNotificationRadiusPicker(false)
                    }
                  }}>
                  <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showNotificationRadiusPicker} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlayInner} activeOpacity={1} onPress={() => setShowNotificationRadiusPicker(false)}>
            <View style={styles.langSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.langTitle}>{t('profile.notificationRadius')}</Text>
              <Text style={styles.radiusDesc}>{t('profile.notificationRadiusDesc')}</Text>
              <View style={styles.radiusGrid}>
                {RADIUS_OPTIONS.map(km => (
                  <TouchableOpacity
                    key={km}
                    style={[styles.radiusChip, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipActive]}
                    onPress={() => { setCustomNotificationRadius(''); setNotificationRadiusKm(km); setShowNotificationRadiusPicker(false) }}>
                    <Text style={[styles.radiusChipText, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipTextActive]}>
                      {t('profile.radiusValue', { km })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customRadiusDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('profile.orCustom')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.customRadiusRow}>
                <TextInput
                  style={styles.customRadiusInput}
                  placeholder="e.g. 30"
                  placeholderTextColor="#BBB"
                  keyboardType="numeric"
                  value={customNotificationRadius}
                  onChangeText={setCustomNotificationRadius}
                  maxLength={4}
                />
                <Text style={styles.customRadiusUnit}>km</Text>
                <TouchableOpacity
                  style={[styles.customRadiusBtn, !customNotificationRadius && styles.customRadiusBtnDisabled]}
                  disabled={!customNotificationRadius}
                  onPress={() => {
                    const val = Math.max(1, Math.min(500, parseInt(customNotificationRadius, 10) || 0))
                    if (val > 0) {
                      setNotificationRadiusKm(val)
                      setCustomNotificationRadius('')
                      setShowNotificationRadiusPicker(false)
                    }
                  }}>
                  <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showNotificationRadiusPicker} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlayInner} activeOpacity={1} onPress={() => setShowNotificationRadiusPicker(false)}>
            <View style={styles.langSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.langTitle}>{t('profile.notificationRadius')}</Text>
              <Text style={styles.radiusDesc}>{t('profile.notificationRadiusDesc')}</Text>
              <View style={styles.radiusGrid}>
                {RADIUS_OPTIONS.map(km => (
                  <TouchableOpacity
                    key={km}
                    style={[styles.radiusChip, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipActive]}
                    onPress={() => { setCustomNotificationRadius(''); setNotificationRadiusKm(km); setShowNotificationRadiusPicker(false) }}>
                    <Text style={[styles.radiusChipText, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipTextActive]}>
                      {t('profile.radiusValue', { km })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customRadiusDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('profile.orCustom')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.customRadiusRow}>
                <TextInput
                  style={styles.customRadiusInput}
                  placeholder="e.g. 30"
                  placeholderTextColor="#BBB"
                  keyboardType="numeric"
                  value={customNotificationRadius}
                  onChangeText={setCustomNotificationRadius}
                  maxLength={4}
                />
                <Text style={styles.customRadiusUnit}>km</Text>
                <TouchableOpacity
                  style={[styles.customRadiusBtn, !customNotificationRadius && styles.customRadiusBtnDisabled]}
                  disabled={!customNotificationRadius}
                  onPress={() => {
                    const val = Math.max(1, Math.min(500, parseInt(customNotificationRadius, 10) || 0))
                    if (val > 0) {
                      setNotificationRadiusKm(val)
                      setCustomNotificationRadius('')
                      setShowNotificationRadiusPicker(false)
                    }
                  }}>
                  <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showNotificationRadiusPicker} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlayInner} activeOpacity={1} onPress={() => setShowNotificationRadiusPicker(false)}>
            <View style={styles.langSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.langTitle}>{t('profile.notificationRadius')}</Text>
              <Text style={styles.radiusDesc}>{t('profile.notificationRadiusDesc')}</Text>
              <View style={styles.radiusGrid}>
                {RADIUS_OPTIONS.map(km => (
                  <TouchableOpacity
                    key={km}
                    style={[styles.radiusChip, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipActive]}
                    onPress={() => { setCustomNotificationRadius(''); setNotificationRadiusKm(km); setShowNotificationRadiusPicker(false) }}>
                    <Text style={[styles.radiusChipText, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipTextActive]}>
                      {t('profile.radiusValue', { km })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customRadiusDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('profile.orCustom')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.customRadiusRow}>
                <TextInput
                  style={styles.customRadiusInput}
                  placeholder="e.g. 30"
                  placeholderTextColor="#BBB"
                  keyboardType="numeric"
                  value={customNotificationRadius}
                  onChangeText={setCustomNotificationRadius}
                  maxLength={4}
                />
                <Text style={styles.customRadiusUnit}>km</Text>
                <TouchableOpacity
                  style={[styles.customRadiusBtn, !customNotificationRadius && styles.customRadiusBtnDisabled]}
                  disabled={!customNotificationRadius}
                  onPress={() => {
                    const val = Math.max(1, Math.min(500, parseInt(customNotificationRadius, 10) || 0))
                    if (val > 0) {
                      setNotificationRadiusKm(val)
                      setCustomNotificationRadius('')
                      setShowNotificationRadiusPicker(false)
                    }
                  }}>
                  <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showNotificationRadiusPicker} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlayInner} activeOpacity={1} onPress={() => setShowNotificationRadiusPicker(false)}>
            <View style={styles.langSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.langTitle}>{t('profile.notificationRadius')}</Text>
              <Text style={styles.radiusDesc}>{t('profile.notificationRadiusDesc')}</Text>
              <View style={styles.radiusGrid}>
                {RADIUS_OPTIONS.map(km => (
                  <TouchableOpacity
                    key={km}
                    style={[styles.radiusChip, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipActive]}
                    onPress={() => { setCustomNotificationRadius(''); setNotificationRadiusKm(km); setShowNotificationRadiusPicker(false) }}>
                    <Text style={[styles.radiusChipText, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipTextActive]}>
                      {t('profile.radiusValue', { km })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customRadiusDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('profile.orCustom')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.customRadiusRow}>
                <TextInput
                  style={styles.customRadiusInput}
                  placeholder="e.g. 30"
                  placeholderTextColor="#BBB"
                  keyboardType="numeric"
                  value={customNotificationRadius}
                  onChangeText={setCustomNotificationRadius}
                  maxLength={4}
                />
                <Text style={styles.customRadiusUnit}>km</Text>
                <TouchableOpacity
                  style={[styles.customRadiusBtn, !customNotificationRadius && styles.customRadiusBtnDisabled]}
                  disabled={!customNotificationRadius}
                  onPress={() => {
                    const val = Math.max(1, Math.min(500, parseInt(customNotificationRadius, 10) || 0))
                    if (val > 0) {
                      setNotificationRadiusKm(val)
                      setCustomNotificationRadius('')
                      setShowNotificationRadiusPicker(false)
                    }
                  }}>
                  <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showNotificationRadiusPicker} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlayInner} activeOpacity={1} onPress={() => setShowNotificationRadiusPicker(false)}>
            <View style={styles.langSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.langTitle}>{t('profile.notificationRadius')}</Text>
              <Text style={styles.radiusDesc}>{t('profile.notificationRadiusDesc')}</Text>
              <View style={styles.radiusGrid}>
                {RADIUS_OPTIONS.map(km => (
                  <TouchableOpacity
                    key={km}
                    style={[styles.radiusChip, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipActive]}
                    onPress={() => { setCustomNotificationRadius(''); setNotificationRadiusKm(km); setShowNotificationRadiusPicker(false) }}>
                    <Text style={[styles.radiusChipText, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipTextActive]}>
                      {t('profile.radiusValue', { km })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customRadiusDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('profile.orCustom')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.customRadiusRow}>
                <TextInput
                  style={styles.customRadiusInput}
                  placeholder="e.g. 30"
                  placeholderTextColor="#BBB"
                  keyboardType="numeric"
                  value={customNotificationRadius}
                  onChangeText={setCustomNotificationRadius}
                  maxLength={4}
                />
                <Text style={styles.customRadiusUnit}>km</Text>
                <TouchableOpacity
                  style={[styles.customRadiusBtn, !customNotificationRadius && styles.customRadiusBtnDisabled]}
                  disabled={!customNotificationRadius}
                  onPress={() => {
                    const val = Math.max(1, Math.min(500, parseInt(customNotificationRadius, 10) || 0))
                    if (val > 0) {
                      setNotificationRadiusKm(val)
                      setCustomNotificationRadius('')
                      setShowNotificationRadiusPicker(false)
                    }
                  }}>
                  <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showNotificationRadiusPicker} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlayInner} activeOpacity={1} onPress={() => setShowNotificationRadiusPicker(false)}>
            <View style={styles.langSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.langTitle}>{t('profile.notificationRadius')}</Text>
              <Text style={styles.radiusDesc}>{t('profile.notificationRadiusDesc')}</Text>
              <View style={styles.radiusGrid}>
                {RADIUS_OPTIONS.map(km => (
                  <TouchableOpacity
                    key={km}
                    style={[styles.radiusChip, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipActive]}
                    onPress={() => { setCustomNotificationRadius(''); setNotificationRadiusKm(km); setShowNotificationRadiusPicker(false) }}>
                    <Text style={[styles.radiusChipText, notificationRadiusKm === km && !customNotificationRadius && styles.radiusChipTextActive]}>
                      {t('profile.radiusValue', { km })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customRadiusDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('profile.orCustom')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.customRadiusRow}>
                <TextInput
                  style={styles.customRadiusInput}
                  placeholder="e.g. 30"
                  placeholderTextColor="#BBB"
                  keyboardType="numeric"
                  value={customNotificationRadius}
                  onChangeText={setCustomNotificationRadius}
                  maxLength={4}
                />
                <Text style={styles.customRadiusUnit}>km</Text>
                <TouchableOpacity
                  style={[styles.customRadiusBtn, !customNotificationRadius && styles.customRadiusBtnDisabled]}
                  disabled={!customNotificationRadius}
                  onPress={() => {
                    const val = Math.max(1, Math.min(500, parseInt(customNotificationRadius, 10) || 0))
                    if (val > 0) {
                      setNotificationRadiusKm(val)
                      setCustomNotificationRadius('')
                      setShowNotificationRadiusPicker(false)
                    }
                  }}>
                  <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
        showsVerticalScrollIndicator={false}>

        {/* On iPad: two-column grid. Column 1: Preferences. Column 2: Info & Support */}
        <View style={isTablet ? styles.tabletColumns : undefined}>

          {/* Column 1 — Preferences */}
          <View style={isTablet ? styles.tabletColumn : undefined}>
            {isTablet && (
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('profile.preferences', 'PREFERANS').toUpperCase()}
              </Text>
            )}
            <View style={[styles.section, { backgroundColor: colors.card, marginTop: isTablet ? 0 : 12 }]}>
              <ToggleRow icon="bell-outline" title={t('profile.notifications')} value={notifications} onToggle={setNotifications} />
              <ToggleRow icon="theme-light-dark" title={t('profile.darkMode')} value={isDark} onToggle={setDark} />
              <TouchableOpacity style={[styles.menuRow, { borderBottomColor: colors.border }]} onPress={() => setShowLangPicker(true)} activeOpacity={0.6}>
                <MaterialCommunityIcons name="translate" size={22} color={colors.textSecondary} />
                <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.language')}</Text>
                <View style={[styles.langBadge, { backgroundColor: colors.inputBg }]}>
                  <Text style={styles.langBadgeText}>{currentLang.flag} {currentLang.label}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuRow, { borderBottomColor: colors.border }]} onPress={() => setShowRadiusPicker(true)} activeOpacity={0.6}>
                <MaterialCommunityIcons name="radar" size={22} color={colors.textSecondary} />
                <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.radius')}</Text>
                <View style={[styles.langBadge, { backgroundColor: COLORS.severityCritical + '12' }]}>
                  <Text style={[styles.langBadgeText, { color: COLORS.severityCritical }]}>{t('profile.radiusValue', { km: radiusKm })}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuRow, { borderBottomColor: colors.border }]} onPress={() => setShowNotificationRadiusPicker(true)} activeOpacity={0.6}>
                <MaterialCommunityIcons name="bell-ring" size={22} color={colors.textSecondary} />
                <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.notificationRadius')}</Text>
                <View style={[styles.langBadge, { backgroundColor: COLORS.severityCritical + '12' }]}>
                  <Text style={[styles.langBadgeText, { color: COLORS.severityCritical }]}>{t('profile.radiusValue', { km: notificationRadiusKm })}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Column 2 — Info & Support */}
          <View style={isTablet ? styles.tabletColumn : undefined}>
            {isTablet && (
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('profile.infoSupport', 'INFO & SIPÒ').toUpperCase()}
              </Text>
            )}
            <View style={[styles.section, { backgroundColor: colors.card, marginTop: isTablet ? 0 : 0 }]}>
              <MenuRow icon="help-circle-outline" title={t('profile.faq')} onPress={() => setShowFAQ(true)} />
              <MenuRow icon="shield-account-outline" title={t('profile.privacy')} onPress={() => Linking.openURL('https://veye-website-45c84.web.app/politique-de-confidentialite.html')} />
              <MenuRow icon="information-outline" title={t('profile.aboutVeye')} onPress={() => Linking.openURL('https://veye-website-45c84.web.app/about.html')} />
              <MenuRow icon="share-variant-outline" title={t('profile.shareVeye')} onPress={handleShare} />
              <MenuRow icon="logout" title={t('profile.logout')} onPress={handleLogout} isDestructive />
            </View>
          </View>

        </View>

        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          {t('profile.version', { version: APP_VERSION })}
        </Text>
      </ScrollView>

      <FAQ visible={showFAQ} onClose={() => setShowFAQ(false)} />
    </View>
  )
}

function ToggleRow({ icon, title, value, onToggle }: { icon: string; title: string; value: boolean; onToggle: (v: boolean) => void }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.menuRow, { borderBottomColor: colors.border }]}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.textSecondary} />
      <Text style={[styles.menuText, { color: colors.text }]}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: COLORS.severityCritical + '55' }}
        thumbColor={value ? COLORS.severityCritical : colors.textSecondary}
      />
    </View>
  )
}

function MenuRow({ icon, title, onPress, isDestructive }: { icon: string; title: string; onPress: () => void; isDestructive?: boolean }) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity style={[styles.menuRow, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.6}>
      <MaterialCommunityIcons name={icon} size={22} color={isDestructive ? COLORS.severityCritical : colors.textSecondary} />
      <Text style={[styles.menuText, { color: colors.text }, isDestructive && { color: COLORS.severityCritical }]}>{title}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  scrollContentTablet: { paddingHorizontal: 32, paddingTop: 24 },
  tabletColumns: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  tabletColumn: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  profileCard: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#FFF', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#EAEAEA' },
  userName: { fontSize: 20, fontFamily: FONT_FAMILY.bold, color: '#222', marginTop: 12 },
  section: { backgroundColor: '#FFF', borderRadius: 14, marginHorizontal: 1, marginBottom: 12, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuText: { flex: 1, fontSize: 16, color: '#333', marginLeft: 14, fontFamily: FONT_FAMILY.medium },
  langBadge: { backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8 },
  langBadgeText: { fontSize: 12, fontFamily: FONT_FAMILY.medium, color: '#666' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalOverlayInner: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  langSheet: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '80%', maxWidth: 320 },
  langTitle: { fontSize: 18, fontFamily: FONT_FAMILY.bold, color: '#111', marginBottom: 20, textAlign: 'center' },
  langRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6 },
  langRowActive: { backgroundColor: COLORS.severityCritical + '10' },
  langFlag: { fontSize: 24, marginRight: 12 },
  langLabel: { flex: 1, fontSize: 16, fontFamily: FONT_FAMILY.medium, color: '#333' },
  langLabelActive: { fontFamily: FONT_FAMILY.bold, color: COLORS.severityCritical },
  radiusDesc: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20, fontFamily: FONT_FAMILY.regular, lineHeight: 18 },
  radiusGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  radiusChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#F5F5F5',
    minWidth: 80,
    alignItems: 'center',
  },
  radiusChipActive: {
    backgroundColor: COLORS.severityCritical + '12',
    borderColor: COLORS.severityCritical,
  },
  radiusChipText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: '#666' },
  radiusChipTextActive: { color: COLORS.severityCritical, fontFamily: FONT_FAMILY.bold },
  customRadiusDivider: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E8E8E8' },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: '#AAA', fontFamily: FONT_FAMILY.medium },
  customRadiusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customRadiusInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: '#222',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  customRadiusUnit: { fontSize: 15, fontFamily: FONT_FAMILY.bold, color: '#666' },
  customRadiusBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.severityCritical,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customRadiusBtnDisabled: { opacity: 0.35 },
  versionText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
})
