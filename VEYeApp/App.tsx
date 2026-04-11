import React, { useEffect } from 'react'
import firestore from '@react-native-firebase/firestore'
import auth from '@react-native-firebase/auth'
import { Platform, StatusBar } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'

import BottomTabNavigator from './src/navigation/BottomTabNavigator'
import { useTheme } from './src/context/ThemeContext'
import {
  OneSignal,
  NotificationWillDisplayEvent,
} from 'react-native-onesignal'
import { config } from './src/config'

OneSignal.initialize(config.ONESIGNAL_APP_ID)

function App(): React.ReactElement {
  const { isDark, colors } = useTheme()

  // Save OneSignal device id to Firestore for the current user
  const saveDeviceTokenToUser = async (userId: string) => {
    try {
      const deviceToken = await OneSignal.User.getOnesignalId()
      if (deviceToken) {
        await firestore()
          .collection('Users')
          .doc(userId)
          .set({ deviceToken, userId }, { merge: true })
      }
    } catch (_) {
      // Token may not be ready yet (e.g. user denied permission)
    }
  }

  // OneSignal Notification (SDK v5)
  useEffect(() => {
    void OneSignal.Notifications.requestPermission(false)

    const onForegroundWillDisplay = (event: NotificationWillDisplayEvent) => {
      event.getNotification().display()
    }
    OneSignal.Notifications.addEventListener(
      'foregroundWillDisplay',
      onForegroundWillDisplay,
    )

    const onNotificationOpened = () => { }
    OneSignal.Notifications.addEventListener('click', onNotificationOpened)

    const onPermissionChange = (granted: boolean) => {
      if (granted) {
        const userId = auth()?.currentUser?.uid
        if (userId) void saveDeviceTokenToUser(userId)
      }
    }
    OneSignal.Notifications.addEventListener(
      'permissionChange',
      onPermissionChange,
    )

    return () => {
      OneSignal.Notifications.removeEventListener(
        'foregroundWillDisplay',
        onForegroundWillDisplay,
      )
      OneSignal.Notifications.removeEventListener('click', onNotificationOpened)
      OneSignal.Notifications.removeEventListener(
        'permissionChange',
        onPermissionChange,
      )
    }
  }, [])

  // Handle Login & device token
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async user => {
      if (!user) {
        await auth().signInAnonymously()
        return
      }
      const userId = user.uid
      await firestore()
        .collection('Users')
        .doc(userId)
        .set({ userId }, { merge: true })
      await saveDeviceTokenToUser(userId)
    })
    return () => unsubscribe()
  }, [])

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={Platform.OS === 'android' ? 'transparent' : colors.background}
        translucent={Platform.OS === 'android'}
      />
      <NavigationContainer>
        <BottomTabNavigator />
      </NavigationContainer>
    </>
  )
}

export default App
