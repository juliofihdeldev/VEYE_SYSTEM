import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { MapTimeRange } from '../utils/dangerZoneTimeFilter'
import { FONT_FAMILY } from '../constants'

type Props = {
  value: MapTimeRange
  onChange: (v: MapTimeRange) => void
  labels: { live: string; sevenDays: string; all: string }
  /** Inactive chip fill (theme card / surface) */
  chipSurfaceColor: string
  activeTint: string
  textMuted: string
  /** Hairline border on inactive chips */
  borderColor: string
}

const SEGMENTS: MapTimeRange[] = ['live', '7d', 'all']

export default function MapTimeSegmentControl({
  value,
  onChange,
  labels,
  chipSurfaceColor,
  activeTint,
  textMuted,
  borderColor,
}: Props) {
  const labelFor = (k: MapTimeRange) =>
    k === 'live' ? labels.live : k === '7d' ? labels.sevenDays : labels.all

  return (
    <View style={styles.row}>
      {SEGMENTS.map(key => {
        const active = value === key
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.chip,
              active
                ? { backgroundColor: activeTint, borderColor: activeTint }
                : { backgroundColor: chipSurfaceColor, borderColor },
            ]}
            onPress={() => onChange(key)}
            activeOpacity={0.75}>
            <Text
              style={[
                styles.chipLabel,
                { color: active ? '#FFF' : textMuted },
                active && styles.chipLabelActive,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}>
              {labelFor(key)}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
    marginBottom: 16,
  },
  chip: {
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 12, borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  chipLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    letterSpacing: 0.2,
  },
  chipLabelActive: {
    fontFamily: FONT_FAMILY.bold,
  },
})
