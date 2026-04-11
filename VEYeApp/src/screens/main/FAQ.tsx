import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../context/ThemeContext'
import { COLORS, FONT_FAMILY } from '../../constants'
import ModernHeader from '../../components/ModernHeader'

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

type FAQItemProps = {
  question: string
  answer: string
  isExpanded: boolean
  onPress: () => void
  colors?: { card: string; text: string; textSecondary: string; border: string }
}

function FAQItem({ question, answer, isExpanded, onPress, colors }: FAQItemProps) {
  const c = colors || { card: '#FFF', text: '#222', textSecondary: '#555', border: '#F0F0F0' }
  return (
    <TouchableOpacity
      style={[styles.faqItem, { backgroundColor: c.card, borderColor: c.border }, isExpanded && styles.faqItemExpanded]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, { color: c.text }]}>{question}</Text>
        <MaterialCommunityIcons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color="#666"
        />
      </View>
      {isExpanded && <Text style={[styles.faqAnswer, { color: c.textSecondary, borderTopColor: c.border }]}>{answer}</Text>}
    </TouchableOpacity>
  )
}

export default function FAQ({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const faqKeys = [1, 2, 3, 4, 5, 6, 7, 8]

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ModernHeader
          title={t('faq.title')}
          showBack
          onBack={onClose}
          showSOS={false}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {faqKeys.map(id => (
            <FAQItem
              key={id}
              question={t(`faq.q${id}`)}
              answer={t(`faq.a${id}`)}
              isExpanded={expandedId === id}
              onPress={() => setExpandedId(expandedId === id ? null : id)}
              colors={colors}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  faqItem: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  faqItemExpanded: {
    borderColor: COLORS.severityCritical + '30',
    borderWidth: 1.5,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: '#222',
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: '#555',
    lineHeight: 22,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
})
