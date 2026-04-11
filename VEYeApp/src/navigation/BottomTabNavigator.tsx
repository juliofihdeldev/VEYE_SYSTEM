import * as React from 'react'
import { View, StyleSheet, Platform, Alert } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useTranslation } from 'react-i18next'
import { COLORS, FONT_FAMILY } from '../constants'
import { useTheme } from '../context/ThemeContext'
import { useIsTablet } from '../utils/useIsTablet'
import { UserContext } from '../context/UserContext'
import MapDashboard from '../screens/main/MapDashboard'
import AlertsList from '../screens/main/AlertsList'
import ReportIncident from '../screens/main/ReportIncident'
import Profile from '../screens/main/Profile'
import DangerZones from '../screens/main/DangerZones'
import IPadSidebar from './IPadSidebar'

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

const Tab = createBottomTabNavigator()

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

export default function BottomTabNavigator() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const isTablet = useIsTablet()
  const { isBlocked, unblockedAt } = React.useContext(UserContext)

  return (
    <View style={styles.root}>
      {isTablet && <IPadSidebar />}

      <View style={styles.content}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: COLORS.severityCritical,
            tabBarInactiveTintColor: colors.textSecondary,
            // On iPad: hide the bottom tab bar — navigation lives in the sidebar
            tabBarStyle: isTablet
              ? ({ display: 'none' } as any)
              : {
                backgroundColor: colors.card,
                borderTopWidth: 0,
                height: Platform.OS === 'ios' ? 88 : 64,
                paddingTop: 6,
                paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 10,
              },
            tabBarLabelStyle: { fontSize: 11, fontFamily: FONT_FAMILY.medium },
          }}>
          <Tab.Screen
            name="Map"
            component={MapDashboard}
            options={{
              tabBarLabel: t('tabs.map'),
              tabBarIcon: ({ color, focused }) => (
                <MaterialCommunityIcons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Alerts"
            component={AlertsList}
            options={{
              tabBarLabel: t('tabs.alerts'),
              tabBarIcon: ({ color, focused }) => (
                <MaterialCommunityIcons name={focused ? 'bell-ring' : 'bell-outline'} size={24} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Report"
            component={ReportIncident}
            options={{
              tabBarIcon: () => (
                <View style={[styles.reportIconContainer, isBlocked && styles.reportIconBlocked]}>
                  <MaterialCommunityIcons
                    name={isBlocked ? 'lock' : 'plus'}
                    size={isBlocked ? 22 : 26}
                    color="#FFF"
                  />
                </View>
              ),
              tabBarLabel: () => null,
            }}
            listeners={{
              tabPress: e => {
                if (isBlocked) {
                  e.preventDefault()
                  const dateStr = formatBlockedDate(unblockedAt)
                  const msg = dateStr
                    ? t('blocked.message', { date: dateStr })
                    : t('blocked.messageNoDate')
                  Alert.alert(t('blocked.title'), msg, [
                    { text: t('blocked.alertButton') },
                  ])
                }
              },
            }}
          />
          <Tab.Screen
            name="DangerZones"
            component={DangerZones}
            options={{
              tabBarLabel: t('tabs.dangerZones'),
              tabBarIcon: ({ color, focused }) => (
                <MaterialCommunityIcons name={focused ? 'map-marker-radius' : 'map-marker-radius-outline'} size={24} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Profile"
            component={Profile}
            options={{
              tabBarLabel: t('tabs.profile'),
              tabBarIcon: ({ color, focused }) => (
                <MaterialCommunityIcons name={focused ? 'account' : 'account-outline'} size={24} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
  reportIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.severityCritical,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 16 : 10,
    shadowColor: COLORS.severityCritical,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  reportIconBlocked: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
    shadowOpacity: 0.2,
  },
})
