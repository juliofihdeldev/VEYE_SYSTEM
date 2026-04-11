import React, {useEffect, useMemo, useState} from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Share,
  Linking,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useNavigation} from '@react-navigation/native'
import MapPlaceholder from '../../components/MapPlaceholder'
import {useTheme} from '../../context/ThemeContext'
import {COLORS, FONT_FAMILY} from '../../constants'
import ModernHeader from '../../components/ModernHeader'
import {getSeverityStyle} from '../../components/AlertCard'
import CustomImage from '../../components/atoms/CustomImage'
import InstagramCommentsModal from '../../components/InstagramCommentsModal'
import {alertCommentsThreadId, getCommentCount} from '../../utils/commentsStorage'

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

const EMERGENCY_PHONE = '114'

type AlertDetailsProps = {
  alert?: any
  onClose?: () => void
}

export default function AlertDetails({alert = {}, onClose}: AlertDetailsProps) {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const navigation = useNavigation<any>()
  const type = alert.status === 'Libérer' ? 'released' : alert.type || 'kidnapping'
  const severity = getSeverityStyle(type, alert.status, t)

  const formatDate = (d: any) => {
    if (!d) return '—'
    const date = d?.toDate ? d.toDate() : new Date(d)
    return date.toLocaleString()
  }

  const handleShare = async () => {
    try {
      await Share.share({message: t('alertDetails.shareMessage', {name: alert.fullName, city: alert.city, details: alert.details || ''})})
    } catch (err) {}
  }

  const handleCallEmergency = () => Linking.openURL(`tel:${EMERGENCY_PHONE}`)

  const commentsThreadId = useMemo(
    () => alertCommentsThreadId(alert),
    [alert?.id, alert?.fullName, alert?.date],
  )
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(0)

  useEffect(() => {
    if (!commentsOpen) {
      void getCommentCount(commentsThreadId).then(setCommentCount)
    }
  }, [commentsOpen, commentsThreadId])

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <ModernHeader
        showBack
        onBack={onClose || (() => navigation.goBack())}
        showSOS
        onSOSPress={handleCallEmergency}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <View style={styles.severityBanner}>
          <View style={[styles.severityDot, {backgroundColor: severity.dot}]} />
          <Text style={[styles.severityLabel, {color: severity.color}]}>{severity.label}</Text>
        </View>

        <View style={[styles.mainCard, {backgroundColor: colors.card}]}>
          <CustomImage url={alert.imageSource} style={[styles.photo, {backgroundColor: colors.inputBg}]} />
          <View style={styles.infoBlock}>
            <InfoRow label={t('alertDetails.name')} value={alert.fullName} colors={colors} />
            <InfoRow label={t('alertDetails.age')} value={alert.amount ? String(alert.amount) : '—'} colors={colors} />
            <InfoRow label={t('alertDetails.location')} value={alert.city} colors={colors} />
            <InfoRow label={t('alertDetails.time')} value={formatDate(alert.date)} colors={colors} />
          </View>
        </View>

        {alert.details && (
          <View style={[styles.descCard, {backgroundColor: colors.card}]}>
            <Text style={[styles.descTitle, {color: colors.text}]}>{t('alertDetails.description')}</Text>
            <Text style={[styles.descText, {color: colors.textSecondary}]}>{alert.details}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.commentBtn, {backgroundColor: colors.card, borderColor: colors.border}]}
          onPress={() => setCommentsOpen(true)}
          activeOpacity={0.75}>
          <MaterialCommunityIcons name="comment-outline" size={22} color={colors.text} />
          <Text style={[styles.commentBtnText, {color: colors.text}]}>{t('comments.title')}</Text>
          {commentCount > 0 ? (
            <View style={[styles.commentCountPill, {backgroundColor: colors.inputBg}]}>
              <Text style={[styles.commentCountText, {color: colors.textSecondary}]}>{commentCount}</Text>
            </View>
          ) : null}
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        <InstagramCommentsModal
          visible={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          threadId={commentsThreadId}
          subtitle={alert.fullName}
        />

        <View style={styles.mapSection}>
          <Text style={[styles.mapTitle, {color: colors.text}]}>{t('alertDetails.lastKnownLocation')}</Text>
          <View style={styles.mapBox}>
            <MapPlaceholder height={130} showLabel={false} />
          </View>
        </View>

        <Text style={[styles.actionsTitle, {color: colors.text}]}>{t('alertDetails.actions')}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.shareBtn, {backgroundColor: colors.card, borderColor: colors.border}]} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.shareBtnText, {color: colors.text}]}>{t('alertDetails.shareAlert')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reportBtn, {backgroundColor: colors.card, borderColor: colors.border}]}
            onPress={() => { onClose?.(); navigation.navigate('Report', {relatedAlert: alert}) }}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.reportBtnText, {color: colors.text}]}>{t('alertDetails.reportInfo')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.emergencyBtn} onPress={handleCallEmergency} activeOpacity={0.8}>
          <MaterialCommunityIcons name="phone" size={20} color="#FFF" />
          <Text style={styles.emergencyBtnText}>{t('alertDetails.callEmergency')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

function InfoRow({label, value, colors}: {label: string; value?: string; colors: {text: string; textSecondary: string}}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>{label}:</Text>
      <Text style={[styles.infoValue, {color: colors.text}]}>{value || '—'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F9FAFB'},
  scroll: {flex: 1},
  scrollContent: {padding: 16, paddingBottom: 40},
  severityBanner: {flexDirection: 'row', alignItems: 'center', marginBottom: 16},
  severityDot: {width: 12, height: 12, borderRadius: 6, marginRight: 8},
  severityLabel: {fontSize: 18, fontFamily: FONT_FAMILY.extraBold, letterSpacing: 0.5},
  mainCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  photo: {width: 100, height: 120, borderRadius: 12, backgroundColor: '#F0F0F0', marginRight: 16},
  infoBlock: {flex: 1, justifyContent: 'center'},
  infoRow: {flexDirection: 'row', marginBottom: 8},
  infoLabel: {fontSize: 14, color: '#999', width: 75},
  infoValue: {fontSize: 14, color: '#222', fontFamily: FONT_FAMILY.semiBold, flex: 1},
  descCard: {backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12},
  descTitle: {fontSize: 15, fontFamily: FONT_FAMILY.bold, color: '#444', marginBottom: 6},
  descText: {fontSize: 15, color: '#333', lineHeight: 22},
  commentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 10,
  },
  commentBtnText: {flex: 1, fontSize: 15, fontFamily: FONT_FAMILY.semiBold},
  commentCountPill: {
    minWidth: 24,
    paddingHorizontal: 8,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentCountText: {fontSize: 13, fontFamily: FONT_FAMILY.bold},
  mapSection: {marginBottom: 16},
  mapTitle: {fontSize: 15, fontFamily: FONT_FAMILY.bold, color: '#444', marginBottom: 8},
  mapBox: {borderRadius: 14, overflow: 'hidden'},
  actionsTitle: {fontSize: 15, fontFamily: FONT_FAMILY.bold, color: '#444', marginBottom: 10},
  actions: {flexDirection: 'row', gap: 10, marginBottom: 12},
  shareBtn: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingVertical: 14, borderWidth: 1, borderColor: '#E5E5E5', gap: 6},
  shareBtnText: {fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: '#333'},
  reportBtn: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingVertical: 14, borderWidth: 1, borderColor: '#E5E5E5', gap: 6},
  reportBtnText: {fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: '#333'},
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.severityCritical,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    shadowColor: COLORS.severityCritical,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emergencyBtnText: {fontSize: 16, fontFamily: FONT_FAMILY.bold, color: '#FFF'},
})
