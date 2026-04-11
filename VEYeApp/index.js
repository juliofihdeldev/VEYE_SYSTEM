import 'react-native-gesture-handler'
import {GestureHandlerRootView} from 'react-native-gesture-handler'
import './src/i18n'
import React, {useState, useEffect} from 'react'
import {AppRegistry, StyleSheet} from 'react-native'
import App from './App'
import {name as appName} from './app.json'
import {
  MD3LightTheme as DefaultTheme,
  MD3DarkTheme as DarkTheme,
  Provider as PaperProvider,
} from 'react-native-paper'
import {UserProvider} from './src/context/UserContext'
import {AlertProvider} from './src/context/AlertContext'
import {ThemeProvider, useTheme} from './src/context/ThemeContext'
import {PendingReportProvider} from './src/context/PendingReportContext'
import {WithSplashScreen} from './SplashScreen'
import {COLORS} from './src/constants'

const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.secondary,
  },
}

const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.primaryLight,
    secondary: COLORS.secondary,
  },
}

function ThemeAwareApp() {
  const {useTheme} = require('./src/context/ThemeContext')
  const {isDark} = useTheme()
  const theme = isDark ? darkTheme : lightTheme
  return (
    <PaperProvider theme={theme}>
      <UserProvider>
        <AlertProvider>
          <PendingReportProvider>
            <App />
          </PendingReportProvider>
        </AlertProvider>
      </UserProvider>
    </PaperProvider>
  )
}

export default function Main() {
  const [isAppReady, setIsAppReady] = useState(false)
  useEffect(() => {
    setIsAppReady(true)
  }, [])
  return (
    <GestureHandlerRootView style={styles.root}>
      <WithSplashScreen isAppReady={isAppReady}>
        <ThemeProvider>
          <ThemeAwareApp />
        </ThemeProvider>
      </WithSplashScreen>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {flex: 1},
})

AppRegistry.registerComponent(appName, () => Main)
