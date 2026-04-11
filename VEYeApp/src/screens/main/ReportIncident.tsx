import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Switch,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRoute, useNavigation } from '@react-navigation/native'
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker'
import auth from '@react-native-firebase/auth'
import { AlertContext } from '../../context/AlertContext'
import { UserContext } from '../../context/UserContext'
import { useTheme } from '../../context/ThemeContext'
import { usePendingReports } from '../../context/PendingReportContext'
import { COLORS, FONT_FAMILY } from '../../constants'
import ModernHeader from '../../components/ModernHeader'

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

const MAX_PHOTOS = 4
const DEFAULT_CITY = 'Port-au-Prince'
const PLACEHOLDER_IMAGE =
  'https://cdn-icons-png.flaticon.com/512/1088/1088372.png'

function formatBlockedDate(ts: number | null): string {
  if (!ts) return ''
  return new Date(ts).toLocaleString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function cityFromFullAddress(fullAddress: string | undefined): string {
  if (!fullAddress) return DEFAULT_CITY
  try {
    const parsed = JSON.parse(fullAddress) as { city?: string }
    return parsed?.city || DEFAULT_CITY
  } catch {
    return DEFAULT_CITY
  }
}

export default function ReportIncident() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const route = useRoute<any>()
  const navigation = useNavigation<any>()
  const { handleSendAlert } = useContext(AlertContext)
  const { userPreferences, isBlocked, unblockedAt } = useContext(UserContext)
  const { addPendingReport, updateReportStatus } = usePendingReports()

  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [victimName, setVictimName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [photos, setPhotos] = useState<Asset[]>([])
  const [submitting, setSubmitting] = useState(false)

  const reportTypes = useMemo(
    () => [
      { key: 'kidnapping', label: t('report.typeKidnapping'), color: COLORS.severityCritical, icon: 'alert-circle' },
      { key: 'missing', label: t('report.typeMissing'), color: '#EAB308', icon: 'account-search' },
      { key: 'danger_zone', label: t('report.typeDangerZone'), color: COLORS.severityHigh, icon: 'alert-octagon' },
      { key: 'shooting', label: t('report.typeShooting'), color: COLORS.severityHigh, icon: 'pistol' },
      { key: 'suspicious', label: t('report.typeSuspicious'), color: '#EAB308', icon: 'eye-outline' },
    ],
    [t],
  )

  const relatedAlert = route.params?.relatedAlert
  useEffect(() => {
    if (!relatedAlert) return
    setDescription(`Info about ${relatedAlert.fullName}: ${relatedAlert.details || ''}`.trim())
  }, [relatedAlert])

  const location = userPreferences?.address || t('report.locationNotDetected')

  const handleTakePhoto = useCallback(() => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert(t('report.maxPhotos', { max: MAX_PHOTOS }))
      return
    }
    launchCamera(
      { mediaType: 'photo', maxWidth: 1200, maxHeight: 1200, quality: 0.8 },
      response => {
        if (response.didCancel || response.errorCode) return
        if (response.assets?.[0]) {
          setPhotos(prev => [...prev, response.assets![0]])
        }
      },
    )
  }, [photos.length, t])

  const handlePickFromLibrary = useCallback(() => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert(t('report.maxPhotos', { max: MAX_PHOTOS }))
      return
    }
    const remaining = MAX_PHOTOS - photos.length
    launchImageLibrary(
      { mediaType: 'photo', maxWidth: 1200, maxHeight: 1200, quality: 0.8, selectionLimit: remaining },
      response => {
        if (response.didCancel || response.errorCode) return
        if (response.assets) {
          setPhotos(prev => [...prev, ...response.assets!].slice(0, MAX_PHOTOS))
        }
      },
    )
  }, [photos.length, t])

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }, [])

  const resetForm = useCallback(() => {
    setSelectedType(null)
    setDescription('')
    setVictimName('')
    setContactPhone('')
    setPhotos([])
    setAnonymous(false)
  }, [])

  const handleSubmit = async () => {
    if (submitting) return
    if (!selectedType) {
      Alert.alert(t('report.selectType'), t('report.selectTypeMessage'))
      return
    }
    if (!description.trim()) {
      Alert.alert(t('report.descriptionRequired'), t('report.descriptionRequiredMessage'))
      return
    }

    setSubmitting(true)

    const firstPhotoUri = photos[0]?.uri || PLACEHOLDER_IMAGE
    const rezon = `[${selectedType}] ${description}`
    const name = victimName || userPreferences?.address || 'Unknown location'

    const data = {
      summary: rezon,
      source: 'user_report',
      userId: auth().currentUser?.uid ?? null,
      name,
      rezon,
      latitude: userPreferences?.latitude ?? 18.5944,
      longitude: userPreferences?.longitude ?? -72.3074,
      imageSource: firstPhotoUri,
      full_address: userPreferences?.full_address || '',
      address: userPreferences?.address || '',
      city: cityFromFullAddress(userPreferences?.full_address),
      contactPhone: anonymous ? '' : contactPhone,
      anonymous,
      photoCount: photos.length,
    }

    const pendingId = addPendingReport({ rezon, name })
    resetForm()
    setSubmitting(false)

    Alert.alert(t('report.thankYou'), t('report.reportProcessing'), [
      { text: t('common.ok'), onPress: () => navigation.navigate('DangerZones') },
    ])

    try {
      await handleSendAlert?.(data)
      updateReportStatus(pendingId, 'success')
    } catch {
      updateReportStatus(pendingId, 'error')
    }
  }

  const activeType = reportTypes.find(tp => tp.key === selectedType)
  const accentColor = activeType?.color || COLORS.severityCritical

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ModernHeader title={t('report.title')} showSOS={false} />

      {isBlocked && (
        <View style={styles.blockedBanner}>
          <MaterialCommunityIcons name="lock" size={20} color="#FFF" style={{ marginRight: 10 }} />
          <View style={styles.blockedBannerText}>
            <Text style={styles.blockedBannerTitle}>{t('blocked.bannerTitle')}</Text>
            <Text style={styles.blockedBannerBody}>
              {unblockedAt
                ? t('blocked.bannerMessage', { date: formatBlockedDate(unblockedAt) })
                : t('blocked.bannerMessageNoDate')}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('report.sectionWhat')}</Text>
        <View style={styles.typeGrid}>
          {reportTypes.map(tp => {
            const active = selectedType === tp.key
            return (
              <TouchableOpacity
                key={tp.key}
                style={[
                  styles.typeChip,
                  { backgroundColor: active ? tp.color : colors.card, borderColor: active ? tp.color : colors.border },
                ]}
                onPress={() => setSelectedType(tp.key)}
                activeOpacity={0.7}>
                <MaterialCommunityIcons name={tp.icon} size={18} color={active ? '#FFF' : tp.color} />
                <Text style={[styles.typeChipLabel, { color: active ? '#FFF' : colors.text }]}>{tp.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('report.sectionWhere')}</Text>
        <View style={[styles.locationCard, { backgroundColor: colors.card }]}>
          <View style={styles.locationIcon}>
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={COLORS.severityCritical} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>{t('report.locationAutoDetected')}</Text>
            <Text style={[styles.locationValue, { color: colors.text }]}>{location}</Text>
          </View>
          <MaterialCommunityIcons name="check-circle" size={18} color="#22C55E" />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('report.sectionEvidence')}
          <Text style={[styles.optionalHint, { color: colors.textSecondary }]}> {t('report.optional')}</Text>
        </Text>

        <View style={styles.photoSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {photos.map((photo, index) => (
              <View key={photo.uri || index} style={styles.photoThumbWrap}>
                <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                <TouchableOpacity
                  style={[styles.photoRemoveBtn, { backgroundColor: colors.card }]}
                  onPress={() => handleRemovePhoto(index)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <MaterialCommunityIcons name="close-circle" size={22} color={COLORS.severityCritical} />
                </TouchableOpacity>
              </View>
            ))}

            {photos.length < MAX_PHOTOS && (
              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={[styles.photoBtnCamera, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={handleTakePhoto}
                  activeOpacity={0.7}>
                  <MaterialCommunityIcons name="camera" size={26} color={accentColor} />
                  <Text style={[styles.photoBtnLabel, { color: accentColor }]}>{t('report.takePhoto')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoBtnGallery, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={handlePickFromLibrary}
                  activeOpacity={0.7}>
                  <MaterialCommunityIcons name="image-multiple" size={26} color={colors.textSecondary} />
                  <Text style={[styles.photoBtnLabel, { color: colors.textSecondary }]}>{t('report.chooseFromLibrary')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          {photos.length > 0 && (
            <Text style={[styles.photoCount, { color: colors.textSecondary }]}>
              {t('report.photoAdded', { count: photos.length })} / {MAX_PHOTOS}
            </Text>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('report.sectionDetails')}</Text>

        {selectedType === 'missing' && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('report.victimName')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder={t('report.victimNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={victimName}
              onChangeText={setVictimName}
            />
          </>
        )}

        <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('report.description')}</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder={t('report.descriptionPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('report.contactPhone')}</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
            anonymous && styles.inputDisabled,
          ]}
          placeholder={t('report.contactPhonePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
          value={contactPhone}
          onChangeText={setContactPhone}
          editable={!anonymous}
        />

        <View style={[styles.anonymousRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="incognito" size={20} color={colors.textSecondary} />
          <Text style={[styles.anonymousLabel, { color: colors.text }]}>{t('report.anonymous')}</Text>
          <Switch
            value={anonymous}
            onValueChange={setAnonymous}
            trackColor={{ false: colors.border, true: accentColor + '60' }}
            thumbColor={anonymous ? accentColor : colors.card}
          />
        </View>

        <View style={styles.timeRow}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{t('report.time')}</Text>
          <Text style={[styles.timeValue, { color: colors.textSecondary }]}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {'  ·  '}
            {new Date().toLocaleDateString()}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: isBlocked ? '#9CA3AF' : accentColor },
            (submitting || isBlocked) && styles.submitBtnDisabled,
          ]}
          onPress={() => void handleSubmit()}
          disabled={submitting || isBlocked}
          activeOpacity={0.8}>
          {submitting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>{t('report.submitReport')}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },

  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    color: '#222',
    marginTop: 20,
    marginBottom: 12,
  },
  optionalHint: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: '#BBB',
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    gap: 6,
  },
  typeChipLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: '#444',
  },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.severityCritical + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: 11, color: '#999', fontFamily: FONT_FAMILY.medium },
  locationValue: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: '#222', marginTop: 2 },

  photoSection: { marginBottom: 4 },
  photoRow: { gap: 10, paddingVertical: 4 },
  photoThumbWrap: { position: 'relative' },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  // TODO: Add shadow to the photo remove button
  photoRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  photoActions: { flexDirection: 'row', gap: 10 },
  photoBtnCamera: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    gap: 4,
  },
  photoBtnGallery: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    gap: 4,
  },
  photoBtnLabel: { fontSize: 9, fontFamily: FONT_FAMILY.semiBold, color: '#666', textAlign: 'center' },
  photoCount: { fontSize: 12, color: '#999', marginTop: 8, fontFamily: FONT_FAMILY.medium },

  fieldLabel: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: '#444', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: '#222',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  inputDisabled: { opacity: 0.4 },
  textArea: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: '#222',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  anonymousLabel: { flex: 1, fontSize: 14, fontFamily: FONT_FAMILY.medium, color: '#444' },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    gap: 8,
  },
  timeLabel: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: '#999' },
  timeValue: { fontSize: 13, color: '#666', fontFamily: FONT_FAMILY.medium },

  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontFamily: FONT_FAMILY.bold },

  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  blockedBannerText: { flex: 1 },
  blockedBannerTitle: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    marginBottom: 2,
  },
  blockedBannerBody: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 18,
  },
})
