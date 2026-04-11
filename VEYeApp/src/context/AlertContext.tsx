import React, { createContext, useState, useContext, useEffect, useRef, useMemo, useCallback } from 'react'
import firestore from '@react-native-firebase/firestore'
import axios from 'axios'
import analytics from '@react-native-firebase/analytics'
import { UserContext } from './UserContext'
import { Alert } from 'react-native'
import auth from '@react-native-firebase/auth'
import i18n from '../i18n'
import { config } from '../config'
import { getDistanceKm } from '../utils/distance'

type initialAlertContextStateType = {
  currentAlert?: any
  alertList?: any
  /** ZoneDanger docs ordered by date desc, filtered by user radius (same rules as Danger Zones screen). */
  filteredDangerZones?: any[]
  handleGetALert?: any
  handleCurrentAlert: any
  handleSendAlert: any
  konfimeManti?: any
}

const initialAlertContextState: initialAlertContextStateType = {
  currentAlert: undefined,
  alertList: [],
  filteredDangerZones: [],
  handleGetALert: () => { },
  handleCurrentAlert: () => { },
  handleSendAlert: () => { },
  konfimeManti: () => { },
}

export const AlertContext = createContext(initialAlertContextState)

export const AlertProvider = ({ children }: any) => {
  const t = i18n.t.bind(i18n)

  const [currentAlert, setcurrentAlert] = useState(
    initialAlertContextState.currentAlert,
  )

  const [alertList, setAlertListState] = useState(
    initialAlertContextState.alertList,
  )

  const { userPreferences, radiusKm } = useContext(UserContext)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const filteredDangerZones = useMemo(() => {
    const list = alertList || []
    const userLocation =
      userPreferences?.latitude != null && userPreferences?.longitude != null
        ? {
            latitude: Number(userPreferences.latitude),
            longitude: Number(userPreferences.longitude),
          }
        : null
    return list.filter((zone: any) => {
      if (!zone?.latitude || !zone?.longitude || !userLocation) return true
      const dist = getDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        Number(zone.latitude),
        Number(zone.longitude),
      )
      return dist <= radiusKm
    })
  }, [alertList, userPreferences?.latitude, userPreferences?.longitude, radiusKm])

  const handleCurrentAlert = (data: any) => {
    setcurrentAlert(data)
  }

  const formatBlockedDate = (ts: number | null): string => {
    if (!ts) return ''
    return new Date(ts).toLocaleString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // send alert to the global alert collection
  const handleSendAlert = async (data: any) => {
    data.position = userPreferences?.coords
    try {
      await axios.post(config.PROCESS_GLOBAL_ALERT_URL, data)
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 403 && err.response?.data?.skipped === 'user_blocked') {
        const unblockedAtMs: number | null = err.response.data.unblockedAt ?? null
        const dateStr = formatBlockedDate(unblockedAtMs)
        const msg = dateStr
          ? t('blocked.message', { date: dateStr })
          : t('blocked.messageNoDate')
        Alert.alert(t('blocked.title'), msg, [{ text: t('blocked.alertButton') }])
      }
      throw err
    }
  }

  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)
  const alertShownRef = useRef(false)

  const clearRetryTimer = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }

  /** Real-time ZoneDanger listener. Waits for auth (see effect below). Retries on transient errors instead of assuming “no internet”. */
  const subscribeZoneDanger = useCallback(() => {
    clearRetryTimer()
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    attemptRef.current = 0
    alertShownRef.current = false

    const MAX_ATTEMPTS = 8

    const attach = () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      const unsubscribe = firestore()
        .collection('ZoneDanger')
        .orderBy('date', 'desc')
        .onSnapshot(
          querySnapshot => {
            attemptRef.current = 0
            const zoneList: any[] = []
            querySnapshot.forEach(documentSnapshot => {
              zoneList.push({
                id: documentSnapshot.id,
                name: documentSnapshot.data().name,
                latitude: documentSnapshot.data()?.latitude,
                longitude: documentSnapshot.data()?.longitude,
                imageSource: documentSnapshot.data()?.imageSource,
                rezon: documentSnapshot.data()?.rezon,
                date: documentSnapshot.data()?.date,
                mantiCount: documentSnapshot.data()?.mantiCount,
                incidentType: documentSnapshot.data()?.incidentType,
                tag: documentSnapshot.data()?.tag,
              })
            })
            setAlertListState(zoneList)
          },
          () => {
            attemptRef.current += 1
            if (attemptRef.current < MAX_ATTEMPTS) {
              const delayMs = Math.min(4000, 500 * 2 ** (attemptRef.current - 1))
              clearRetryTimer()
              retryTimeoutRef.current = setTimeout(attach, delayMs)
              return
            }
            if (!alertShownRef.current) {
              alertShownRef.current = true
              Alert.alert(t('errors.loadFailedTitle'), t('errors.loadFailedMessage'), [
                {
                  text: t('common.ok'),
                  onPress: () => {
                    alertShownRef.current = false
                    attemptRef.current = 0
                    attach()
                  },
                },
              ])
            }
          },
        )
      unsubscribeRef.current = unsubscribe
    }

    attach()
  }, [t])

  const handleGetALert = useCallback(() => {
    if (!auth().currentUser?.uid) return
    subscribeZoneDanger()
  }, [subscribeZoneDanger])

  useEffect(() => {
    const unsubAuth = auth().onAuthStateChanged(user => {
      clearRetryTimer()
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      attemptRef.current = 0
      alertShownRef.current = false
      if (!user?.uid) {
        setAlertListState([])
        return
      }
      subscribeZoneDanger()
    })
    return () => {
      unsubAuth()
      clearRetryTimer()
      if (unsubscribeRef.current) unsubscribeRef.current()
    }
  }, [subscribeZoneDanger])

  const konfimeManti = async (data: any) => {
    if (!data) return

    firestore()
      .collection('DemantiAlert')
      .doc(auth()?.currentUser?.uid + data.id)
      .get()
      .then(function (doc) {
        if (doc.exists()) {
          Alert.alert(t('context.attention'), t('context.alreadyDenied'))
        } else {
          firestore()
            .collection('DemantiAlert')
            .doc(auth()?.currentUser?.uid + data.id)
            .set({
              information: data.name + ' ' + data?.rezon,
              userId: auth()?.currentUser?.uid,
            })
          firestore()
            .collection('ZoneDanger')
            .doc(data.id)
            .update({
              mantiCount: firestore.FieldValue.increment(1),
              userId: auth()?.currentUser?.uid,
            })

          Alert.alert(t('context.thanks'), t('context.noted'))
        }
      })
      .catch(() => { })

    await analytics().logEvent('DemantiAlert', data)
  }

  return (
    <AlertContext.Provider
      value={{
        currentAlert,
        handleSendAlert,
        handleCurrentAlert,
        alertList,
        filteredDangerZones,
        handleGetALert,
        konfimeManti,
      }}>
      {children}
    </AlertContext.Provider>
  )
}
