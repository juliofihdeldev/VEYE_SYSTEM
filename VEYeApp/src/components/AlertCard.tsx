import React, { useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, Share } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { COLORS, FONT_FAMILY } from '../constants'
import CustomImage from './atoms/CustomImage'
import { getDistanceKm, formatDistance } from '../utils/distance'

export const getSeverityStyle = (type: string, status?: string, t?: any) => {
  const label = t || ((k: string) => k)
  if (status === 'Libérer') return { color: COLORS.severitySafe, label: label('severity.released'), dot: '#22C55E' }
  switch (type) {
    case 'kidnaping':
    case 'kidnapped':
    case 'kidnapping':
      return { color: COLORS.severityCritical, label: label('severity.kidnapping'), dot: COLORS.severityCritical }
    case 'disparut':
    case 'missing':
      return { color: COLORS.severityWarning, label: label('severity.missing'), dot: '#EAB308' }
    case 'danger':
    case 'shooting':
      return { color: COLORS.severityHigh, label: label('severity.shooting'), dot: COLORS.severityHigh }
    case 'released':
      return { color: COLORS.severitySafe, label: label('severity.released'), dot: '#22C55E' }
    default:
      return { color: COLORS.severityInfo, label: label('severity.alert'), dot: COLORS.severityInfo }
  }
}

type AlertCardProps = {
  item: any
  userLocation?: { latitude: number; longitude: number } | null
  onPress: () => void
  onShare?: () => void
  showActions?: boolean
  compact?: boolean
}

export default function AlertCard({ item, userLocation, onPress, onShare, showActions = false, compact = false }: AlertCardProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const type = item.type || 'kidnapped'
  const severity = getSeverityStyle(type, item.status, t)

  const distance = useMemo(() => {
    if (!userLocation?.latitude || !item.latitude || !item.longitude) return null
    const km = getDistanceKm(userLocation.latitude, userLocation.longitude, Number(item.latitude), Number(item.longitude))
    return formatDistance(km)
  }, [userLocation, item.latitude, item.longitude])

  const handleShare = async () => {
    try {
      await Share.share({ message: t('alertDetails.shareMessage', { name: item.fullName, city: item.city, details: item.details || '' }) })
    } catch (e) { }
    onShare?.()
  }

  if (compact) {
    return (
      <TouchableOpacity style={[s.compactCard, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.7}>
        <View style={[s.dot, { backgroundColor: severity.dot }]} />
        <View style={s.compactBody}>
          <Text style={[s.compactType, { color: colors.textSecondary }]}>{severity.label}</Text>
          <Text style={[s.compactName, { color: colors.text }]} numberOfLines={1}>{item.fullName}</Text>
          <Text style={[s.compactMeta, { color: colors.textSecondary }]}>{distance ? `${distance} · ` : ''}{formatTime(item.date, t)}</Text>
        </View>
        <TouchableOpacity style={[s.viewPill, { borderColor: colors.border }]} onPress={onPress}>
          <Text style={[s.viewPillText, { color: colors.textSecondary }]}>{t('common.view')}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity style={[s.card, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.85}>
      <View style={s.cardTop}>
        <View style={[s.dot, { backgroundColor: severity.dot }]} />
        <Text style={[s.typeLabel, { color: severity.color }]}>{severity.label}</Text>
      </View>
      <View style={s.cardBody}>
        <View style={s.cardInfo}>
          <Text style={[s.name, { color: colors.text }]}>{item.fullName}</Text>
          {item.city && (
            <View style={s.metaRow}>
              <Text style={[s.metaLabel, { color: colors.textSecondary }]}>{t('alerts.location')}</Text>
              <Text style={[s.metaValue, { color: colors.text }]}>{item.city}</Text>
            </View>
          )}
          {item.details && <Text style={[s.details, { color: colors.textSecondary }]} numberOfLines={2}>{item.details}</Text>}
          <View style={s.metaRow}>
            <Text style={[s.timeText, { color: colors.textSecondary }]}>{formatTime(item.date, t)}</Text>
            {distance && <Text style={[s.distText, { color: colors.textSecondary }]}>  {distance}</Text>}
          </View>
        </View>
        <CustomImage url={item.imageSource} style={[s.photo, { backgroundColor: colors.inputBg }]} />
      </View>
      {showActions && (
        <View style={[s.actions, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.inputBg }]} onPress={onPress}>
            <Text style={[s.actionBtnText, { color: colors.text }]}>{t('alerts.viewDetails')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.shareBtn, { backgroundColor: colors.inputBg }]} onPress={handleShare}>
            <Text style={[s.shareBtnText, { color: colors.text }]}>{t('common.share')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  )
}

function formatTime(dateStr: any, t: any) {
  if (!dateStr) return '—'
  const d = dateStr?.toDate ? dateStr.toDate() : new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)
  if (diffMins < 1) return t('time.justNow')
  if (diffMins < 60) return t('time.minAgo', { count: diffMins })
  if (diffHours < 24) return t('time.hoursAgo', { count: diffHours })
  if (diffDays === 1) return t('time.yesterday')
  if (diffDays < 7) return t('time.daysAgo', { count: diffDays })
  if (diffWeeks < 5) return t('time.weeksAgo', { count: diffWeeks })
  if (diffMonths < 12) return t('time.monthsAgo', { count: diffMonths })
  return t('time.yearsAgo', { count: diffYears })
}

const F = FONT_FAMILY

const s = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 14, marginHorizontal: 16, marginBottom: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  typeLabel: { fontSize: 15, fontFamily: F.extraBold, letterSpacing: 0.5 },
  cardBody: { flexDirection: 'row' },
  cardInfo: { flex: 1, paddingRight: 12 },
  name: { fontSize: 17, fontFamily: F.bold, color: '#111', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  metaLabel: { fontSize: 12, color: '#888', fontFamily: F.regular },
  metaValue: { fontSize: 12, color: '#444', fontFamily: F.medium },
  details: { fontSize: 12, color: '#666', marginTop: 4, lineHeight: 17, fontFamily: F.regular },
  timeText: { fontSize: 11, color: '#AAA', marginTop: 2, fontFamily: F.regular },
  distText: { fontSize: 11, color: '#AAA', marginTop: 2, fontFamily: F.regular },
  photo: { width: 70, height: 70, borderRadius: 10, backgroundColor: '#f0f0f0' },
  actions: { flexDirection: 'row', marginTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F0F0F0', alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontFamily: F.semiBold, color: '#333' },
  shareBtn: { backgroundColor: '#F0F0F0' },
  shareBtnText: { fontSize: 13, fontFamily: F.semiBold, color: '#333' },
  compactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  compactBody: { flex: 1, marginLeft: 4 },
  compactType: { fontSize: 12, fontFamily: F.bold, color: '#888', letterSpacing: 0.5, marginBottom: 2 },
  compactName: { fontSize: 15, fontFamily: F.bold, color: '#222' },
  compactMeta: { fontSize: 12, color: '#AAA', marginTop: 2, fontFamily: F.regular },
  viewPill: { borderWidth: 1.5, borderColor: '#DDD', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5 },
  viewPillText: { fontSize: 12, fontFamily: F.semiBold, color: '#555' },
})
