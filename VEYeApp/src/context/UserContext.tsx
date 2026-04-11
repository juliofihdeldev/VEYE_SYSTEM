import React, { createContext, useState, useEffect, useRef } from 'react'
import firestore from '@react-native-firebase/firestore'
import auth from '@react-native-firebase/auth'
import analytics from '@react-native-firebase/analytics'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const DEFAULT_RADIUS_KM = 300
export const DEFAULT_NOTIFICATION_RADIUS_KM = 25

export type preferenceTypes = {
  coords: {
    latitude: string
    longitude: string
  }
  userId?: string
  distance: number
  deviceToken: string
  radiusKm?: number
  notificationRadiusKm?: number
  [key: string]: any
}

type initialUserContextStateType = {
  userPreferences?: preferenceTypes
  handleUserPreferences: any
  radiusKm: number
  setRadiusKm: (km: number) => void
  notificationRadiusKm: number
  setNotificationRadiusKm: (km: number) => void
  isBlocked: boolean
  unblockedAt: number | null
  strikeCount: number
}

const initialUserContextState: initialUserContextStateType = {
  userPreferences: undefined,
  handleUserPreferences: () => { },
  radiusKm: DEFAULT_RADIUS_KM,
  setRadiusKm: () => { },
  notificationRadiusKm: DEFAULT_NOTIFICATION_RADIUS_KM,
  setNotificationRadiusKm: () => { },
  isBlocked: false,
  unblockedAt: null,
  strikeCount: 0,
}

export const UserContext = createContext(initialUserContextState)

const RADIUS_STORAGE_KEY = '@veye_radius_km'
const NOTIFICATION_RADIUS_STORAGE_KEY = '@veye_notification_radius_km'
const BLOCK_COOLDOWN_HOURS = 72

export const UserProvider = ({ children }: any) => {
  const [userPreferences, setUserPreferences] = useState(
    initialUserContextState.userPreferences,
  )
  const [radiusKm, setRadiusKmState] = useState(DEFAULT_RADIUS_KM)
  const [notificationRadiusKm, setNotificationRadiusKmState] = useState(DEFAULT_NOTIFICATION_RADIUS_KM)
  const [isBlocked, setIsBlocked] = useState(false)
  const [unblockedAt, setUnblockedAt] = useState<number | null>(null)
  const [strikeCount, setStrikeCount] = useState(0)
  const moderationUnsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(RADIUS_STORAGE_KEY).then(val => {
      if (val) setRadiusKmState(Number(val))
    })
    AsyncStorage.getItem(NOTIFICATION_RADIUS_STORAGE_KEY).then(val => {
      if (val) setNotificationRadiusKmState(Number(val))
    })

    const unsubAuth = auth().onAuthStateChanged(user => {
      if (moderationUnsubRef.current) {
        moderationUnsubRef.current()
        moderationUnsubRef.current = null
      }
      if (!user?.uid) {
        setIsBlocked(false)
        setUnblockedAt(null)
        setStrikeCount(0)
        return
      }
      const unsubModeration = firestore()
        .collection('UserModerations')
        .doc(user.uid)
        .onSnapshot(doc => {
          if (!doc.exists) {
            setIsBlocked(false)
            setUnblockedAt(null)
            setStrikeCount(0)
            return
          }
          const data = doc.data() as any
          const blocked: boolean = data?.blocked ?? false
          const blockedAtMs: number | null = data?.blockedAt?.toMillis?.() ?? null
          const computed = blocked && blockedAtMs
            ? blockedAtMs + BLOCK_COOLDOWN_HOURS * 60 * 60 * 1000
            : null
          setIsBlocked(blocked)
          setUnblockedAt(computed)
          setStrikeCount(data?.strikeCount ?? 0)
        }, () => {
          // Silently ignore permission errors (user not yet moderated)
        })
      moderationUnsubRef.current = unsubModeration
    })

    return () => {
      unsubAuth()
      if (moderationUnsubRef.current) moderationUnsubRef.current()
    }
  }, [])

  const setRadiusKm = (km: number) => {
    setRadiusKmState(km)
    AsyncStorage.setItem(RADIUS_STORAGE_KEY, String(km))
    const userId = auth()?.currentUser?.uid
    if (userId) {
      firestore().collection('Users').doc(userId).set({ radiusKm: km }, { merge: true }).catch(() => { })
    }
  }

  const setNotificationRadiusKm = (km: number) => {
    setNotificationRadiusKmState(km)
    AsyncStorage.setItem(NOTIFICATION_RADIUS_STORAGE_KEY, String(km))
    const userId = auth()?.currentUser?.uid
    if (userId) {
      firestore().collection('Users').doc(userId).set({ notificationRadiusKm: km }, { merge: true }).catch(() => { })
    }
  }

  const handleUserPreferences = async (data: preferenceTypes) => {
    const userId = auth()?.currentUser?.uid

    if (userId) {
      firestore()
        .collection('Users')
        .doc(userId)
        .set(data, { merge: true })
        .catch(() => { })
    } else {
      firestore()
        .collection('Users')
        .add(data)
        .catch(() => { })
    }
    setUserPreferences(data)

    await analytics().logEvent('userEvent', data)
  }

  return (
    <UserContext.Provider value={{ userPreferences, handleUserPreferences, radiusKm, setRadiusKm, notificationRadiusKm, setNotificationRadiusKm, isBlocked, unblockedAt, strikeCount }}>
      {children}
    </UserContext.Provider>
  )
}
