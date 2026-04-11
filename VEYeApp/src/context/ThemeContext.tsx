import React, { createContext, useState, useEffect, useContext } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COLORS } from '../constants'

const THEME_STORAGE_KEY = '@veye_theme_dark'

export type ThemeColors = typeof COLORS & {
  background: string
  backgroundAlt: string
  card: string
  text: string
  textSecondary: string
  border: string
  inputBg: string
}

const LIGHT_COLORS: ThemeColors = {
  ...COLORS,
  background: '#F9FAFB',
  backgroundAlt: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1E1F20',
  textSecondary: '#666666',
  border: '#F0F0F0',
  inputBg: '#F5F5F5',
}

const DARK_COLORS: ThemeColors = {
  ...COLORS,
  background: '#121212',
  backgroundAlt: '#1E1E1E',
  card: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#2C2C2C',
  inputBg: '#2C2C2C',
}

type ThemeContextType = {
  isDark: boolean
  setDark: (value: boolean) => void
  colors: ThemeColors
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  setDark: () => {},
  colors: LIGHT_COLORS,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDarkState] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then(val => {
      if (val !== null) setIsDarkState(val === 'true')
      setLoaded(true)
    })
  }, [])

  const setDark = (value: boolean) => {
    setIsDarkState(value)
    AsyncStorage.setItem(THEME_STORAGE_KEY, String(value))
  }

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS

  return (
    <ThemeContext.Provider value={{ isDark, setDark, colors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
