import React, { useState } from 'react'
import { StyleSheet, View, Text, Modal, KeyboardAvoidingView, Platform, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'
import { FONT_FAMILY } from '../constants'
import CommentThreadPanel from './CommentThreadPanel'

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

type InstagramCommentsModalProps = {
  visible: boolean
  onClose: () => void
  threadId: string
  subtitle?: string
}

export default function InstagramCommentsModal({
  visible,
  onClose,
  threadId,
  subtitle,
}: InstagramCommentsModalProps) {
  const { t } = useTranslation()
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const [commentCount, setCommentCount] = useState(0)

  const borderHairline = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <View style={[styles.header, { borderBottomColor: borderHairline, paddingTop: insets.top + 6 }]}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.headerSide}>
            <MaterialCommunityIcons name="close" size={26} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t('comments.title')}</Text>
              {commentCount > 0 ? (
                <View style={[styles.headerCountPill, { backgroundColor: colors.inputBg ?? colors.card }]}>
                  <Text style={[styles.headerCountText, { color: colors.textSecondary }]}>
                    {t('comments.totalCount', { count: commentCount })}
                  </Text>
                </View>
              ) : null}
            </View>
            {subtitle ? (
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={styles.headerSide} />
        </View>

        <CommentThreadPanel
          threadId={threadId}
          enabled={visible}
          onCommentCountChange={setCommentCount}
          emptyHero
        />
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  headerSide: { width: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerTitle: { fontSize: 16, fontFamily: FONT_FAMILY.bold },
  headerCountPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  headerCountText: { fontSize: 12, fontFamily: FONT_FAMILY.bold },
  headerSubtitle: { fontSize: 12, fontFamily: FONT_FAMILY.medium, marginTop: 2 },
})
