import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  Pressable,
  Dimensions,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'
import { FONT_FAMILY } from '../constants'
import {
  appendComment,
  flattenCommentThread,
  StoredComment,
  subscribeComments,
  toggleCommentLike,
  type CommentListRow,
} from '../utils/commentsStorage'

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

const IG_BLUE = '#0095F6'
const IG_HEART = '#FF3040'
const REPLY_INDENT = 16
const EMPTY_HERO_MIN_H = Math.round(Dimensions.get('window').height * 0.32)

export function avatarColor(seed: string): string {
  const palette = ['#C13584', '#E1306C', '#F56040', '#FCAF45', '#405DE6', '#5851DB', '#833AB4']
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997
  return palette[h % palette.length]
}

export function commentDisplayName(c: StoredComment, t: (k: string) => string): string {
  return c.isSelf ? t('comments.you') : t('common.user')
}

type CommentThreadPanelProps = {
  threadId: string
  enabled: boolean
  /** Content above the comment list (e.g. zone details card) */
  listHeader?: React.ReactNode
  /** Renders a “Comments” heading with count under listHeader */
  showSectionTitle?: boolean
  /** For parent chrome (e.g. full-screen modal header badge) */
  onCommentCountChange?: (count: number) => void
  /** Taller centered empty state (e.g. Instagram-style full-screen modal) */
  emptyHero?: boolean
}

export default function CommentThreadPanel({
  threadId,
  enabled,
  listHeader,
  showSectionTitle = false,
  onCommentCountChange,
  emptyHero = false,
}: CommentThreadPanelProps) {
  const { t } = useTranslation()
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<StoredComment[]>([])
  const [draft, setDraft] = useState('')
  const [replyingTo, setReplyingTo] = useState<StoredComment | null>(null)
  const listRef = useRef<FlatList<CommentListRow>>(null)
  const likingIdsRef = useRef<Set<string>>(new Set())

  const rows = useMemo(() => flattenCommentThread(items), [items])

  useEffect(() => {
    onCommentCountChange?.(items.length)
  }, [items.length, onCommentCountChange])

  const onToggleLike = (commentId: string) => {
    if (likingIdsRef.current.has(commentId)) return
    likingIdsRef.current.add(commentId)
    void toggleCommentLike(commentId).finally(() => {
      likingIdsRef.current.delete(commentId)
    })
  }

  useEffect(() => {
    if (!enabled) {
      setItems([])
      setDraft('')
      setReplyingTo(null)
      return
    }
    setDraft('')
    setReplyingTo(null)
    const unsub = subscribeComments(threadId, setItems)
    return unsub
  }, [enabled, threadId])

  const handlePost = async () => {
    const text = draft.trim()
    if (!text) return
    const parentId = replyingTo?.id ?? null
    setDraft('')
    setReplyingTo(null)
    try {
      const next = await appendComment(threadId, text, true, parentId)
      setItems(next)
    } catch {
      // listener may still sync when back online
    }
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
  }

  const formatCommentTime = (ts: number) => {
    const diffMins = Math.floor((Date.now() - ts) / 60000)
    if (diffMins < 1) return t('time.justNow')
    if (diffMins < 60) return t('time.minAgo', { count: diffMins })
    const diffH = Math.floor(diffMins / 60)
    if (diffH < 24) return t('time.hoursAgo', { count: diffH })
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return t('time.daysAgo', { count: diffD })
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const renderItem = ({ item: row }: { item: CommentListRow }) => {
    const { comment: item, depth } = row
    const name = commentDisplayName(item, t)
    const av = avatarColor(name + item.id)
    const initial = name.charAt(0).toUpperCase()
    const avatarSize = depth > 0 ? 30 : 36
    return (
      <View style={[styles.commentRow, { marginLeft: depth * REPLY_INDENT }]}>
        <View
          style={[
            styles.avatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: av,
            },
          ]}>
          <Text style={[styles.avatarLetter, depth > 0 && styles.avatarLetterSmall]}>{initial}</Text>
        </View>
        <View style={styles.commentBody}>
          <Text style={[styles.commentText, { color: colors.text }]}>
            <Text style={[styles.username, { color: colors.text }]}>{name}</Text>
            <Text style={{ color: colors.text }}>{' '}{item.text}</Text>
          </Text>
          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
            {formatCommentTime(item.createdAt)}
          </Text>
          <View style={styles.likesReplyRow}>
            <TouchableOpacity
              onPress={() => onToggleLike(item.id)}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              activeOpacity={0.7}>
              <View style={styles.likeTapInner}>
                <MaterialCommunityIcons
                  name={item.likedBySelf ? 'heart' : 'heart-outline'}
                  size={16}
                  color={item.likedBySelf ? IG_HEART : colors.textSecondary}
                  style={styles.likeHeartIcon}
                />
                <Text
                  style={[
                    styles.likesReplyText,
                    { color: item.likedBySelf ? IG_HEART : colors.textSecondary },
                  ]}>
                  {item.likeCount === 0
                    ? t('comments.likeVerb')
                    : t('comments.likesLabel', { count: item.likeCount })}
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={[styles.likesReplySep, { color: colors.textSecondary }]}> - </Text>
            <TouchableOpacity
              onPress={() => setReplyingTo(item)}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              activeOpacity={0.7}>
              <Text style={[styles.likesReplyText, { color: colors.textSecondary }]}>
                {t('comments.reply')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  const borderHairline = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const replyBannerName = replyingTo ? commentDisplayName(replyingTo, t) : ''

  const ListHeader = () => (
    <View>
      {listHeader}
      {showSectionTitle ? (
        <View style={styles.sectionTitleWrap}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('comments.title')}</Text>
            {items.length > 0 ? (
              <View style={[styles.headerCountPill, { backgroundColor: colors.inputBg ?? colors.card }]}>
                <Text style={[styles.headerCountText, { color: colors.textSecondary }]}>
                  {t('comments.totalCount', { count: items.length })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  )

  if (!enabled) return null

  return (
    <View style={styles.flex}>
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={r => r.comment.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={rows.length === 0 ? styles.listContentEmpty : styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        onContentSizeChange={() => {
          if (rows.length === 0) return
          listRef.current?.scrollToEnd({ animated: false })
        }}
        ListEmptyComponent={
          <View
            style={[
              emptyHero ? styles.emptyHero : styles.emptyInline,
              emptyHero && { minHeight: EMPTY_HERO_MIN_H },
            ]}>
            <MaterialCommunityIcons
              name="comment-outline"
              size={emptyHero ? 48 : 40}
              color={colors.textSecondary}
            />
            {emptyHero ? (
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('comments.emptyTitle')}</Text>
            ) : null}
            <Text style={[styles.emptyHint, { color: colors.textSecondary, marginTop: 8 }]}>
              {t('comments.emptyHint')}
            </Text>
          </View>
        }
      />

      {replyingTo ? (
        <View
          style={[
            styles.replyBanner,
            {
              borderTopColor: borderHairline,
              backgroundColor: colors.card,
            },
          ]}>
          <View style={styles.replyBannerTextWrap}>
            <MaterialCommunityIcons name="reply" size={18} color={IG_BLUE} />
            <Text style={[styles.replyBannerLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {t('comments.replyingTo', { name: replyBannerName })}
            </Text>
          </View>
          <Pressable
            onPress={() => setReplyingTo(null)}
            hitSlop={12}
            style={styles.replyBannerClose}>
            <MaterialCommunityIcons name="close-circle" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
      ) : null}

      <View
        style={[
          styles.inputBar,
          {
            borderTopColor: borderHairline,
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}>
        <View style={[styles.inputPill, { backgroundColor: colors.inputBg ?? colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={
              replyingTo ? t('comments.placeholderReply') : t('comments.placeholder')
            }
            placeholderTextColor={colors.textSecondary}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2200}
          />
          <TouchableOpacity
            onPress={handlePost}
            disabled={!draft.trim()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.postLabel, !draft.trim() && styles.postDisabled]}>{t('comments.post')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, flexGrow: 1 },
  listContentEmpty: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 },
  sectionTitleWrap: { paddingBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  sectionTitle: { fontSize: 17, fontFamily: FONT_FAMILY.bold },
  headerCountPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  headerCountText: { fontSize: 12, fontFamily: FONT_FAMILY.bold },
  commentRow: { flexDirection: 'row', marginBottom: 18, alignItems: 'flex-start' },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarLetter: { color: '#FFF', fontSize: 15, fontFamily: FONT_FAMILY.bold },
  avatarLetterSmall: { fontSize: 13 },
  commentBody: { flex: 1, paddingTop: 1 },
  username: { fontFamily: FONT_FAMILY.bold, fontSize: 14 },
  commentText: { fontSize: 14, lineHeight: 20, fontFamily: FONT_FAMILY.regular },
  timeLabel: { fontSize: 12, fontFamily: FONT_FAMILY.regular, marginTop: 4 },
  likesReplyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  likeTapInner: { flexDirection: 'row', alignItems: 'center' },
  likeHeartIcon: { marginRight: 5, marginTop: 1 },
  likesReplyText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold },
  likesReplySep: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyBannerTextWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  replyBannerLabel: { flex: 1, fontSize: 13, fontFamily: FONT_FAMILY.medium },
  replyBannerClose: { padding: 4, marginLeft: 8 },
  emptyInline: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  emptyHero: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 17, fontFamily: FONT_FAMILY.bold, marginTop: 16 },
  emptyHint: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 22,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 8,
    minHeight: 44,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONT_FAMILY.regular,
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  postLabel: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: IG_BLUE,
    paddingLeft: 8,
    paddingBottom: 6,
  },
  postDisabled: { opacity: 0.35 },
})
