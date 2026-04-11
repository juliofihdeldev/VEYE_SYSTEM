import {Dimensions} from 'react-native'
const {width, height} = Dimensions.get('window')

export const COLORS = {
  black: '#1E1F20',
  white: '#FFFFFF',
  lightGray: '#ABAFB8',
  gray: '#BEC1D2',
  primary: '#890F0D',
  primaryLight: '#E83A14',
  primaryDark: '#630606',
  secondary: '#D9CE3F',

  // Severity-based color system (Modern Safety UX)
  // Red = Active kidnapping / extreme danger
  severityCritical: '#C41E3A',
  // Orange = Dangerous zone / shooting
  severityHigh: '#E85D04',
  // Yellow = Suspicious / missing person
  severityWarning: '#F4C430',
  // Green = Safe / released
  severitySafe: '#228B22',
  // Blue = Information
  severityInfo: '#2563EB',

  // Neutral backgrounds for calm feel
  surface: '#F8FAFC',
  surfaceAlt: '#F1F5F9',
}

// Dark theme colors
export const COLORS_DARK = {
  ...COLORS,
  black: '#E8EAED',
  white: '#1E1E1E',
  lightGray: '#9AA0A6',
  gray: '#5F6368',
  surface: '#121212',
  surfaceAlt: '#1E1E1E',
  // Text/UI that adapts
  text: '#E8EAED',
  textSecondary: '#9AA0A6',
  card: '#252525',
  cardBorder: '#3C4043',
  inputBg: '#2D2D2D',
  modalOverlay: 'rgba(0,0,0,0.7)',
}

// Light theme extended (for theme context)
export const COLORS_LIGHT = {
  ...COLORS,
  text: '#1E1F20',
  textSecondary: '#666666',
  card: '#FFFFFF',
  cardBorder: '#F0F0F0',
  inputBg: '#F5F5F5',
  modalOverlay: 'rgba(0,0,0,0.4)',
}

export const SEVERITY = {
  CRITICAL: 'critical', // Kidnapping
  HIGH: 'high', // Danger zone, shooting
  WARNING: 'warning', // Missing, suspicious
  SAFE: 'safe', // Released
  INFO: 'info',
}

export const SIZES = {
  //globalls
  base: 8,
  font: 14,
  radius: 12,
  padding: 24,

  //fontSizes
  navTitle: 25,
  h1: 30,
  h2: 22,
  h3: 16,
  h4: 14,
  h5: 12,
  body1: 30,
  body2: 20,
  body3: 16,
  body4: 14,
  body5: 12,
  logo: 21,

  //dimension
  width,
  height,
}

export const FONT_FAMILY = {
  regular: 'Montserrat-Regular',
  medium: 'Montserrat-Medium',
  semiBold: 'Montserrat-SemiBold',
  bold: 'Montserrat-Bold',
  extraBold: 'Montserrat-ExtraBold',
  black: 'Montserrat-Black',
  italic: 'Montserrat-Italic',
}

export const FONTS = {
  navTitle: {fontSize: SIZES.navTitle, fontFamily: FONT_FAMILY.bold},
  largeTitleBold: {fontSize: SIZES.h2, fontFamily: FONT_FAMILY.bold},
  h1: {fontSize: SIZES.h1, lineHeight: 36, fontFamily: FONT_FAMILY.extraBold},
  h2: {fontSize: SIZES.h2, lineHeight: 30, fontFamily: FONT_FAMILY.bold},
  h3: {fontSize: SIZES.h3, lineHeight: 22, fontFamily: FONT_FAMILY.semiBold},
  h4: {fontSize: SIZES.h4, lineHeight: 22, fontFamily: FONT_FAMILY.medium},
  h5: {fontSize: SIZES.h5, lineHeight: 22, fontFamily: FONT_FAMILY.regular},
  body1: {fontSize: SIZES.body1, lineHeight: 36, fontFamily: FONT_FAMILY.regular},
  body2: {fontSize: SIZES.body2, lineHeight: 30, fontFamily: FONT_FAMILY.regular},
  body3: {fontSize: SIZES.body3, lineHeight: 22, fontFamily: FONT_FAMILY.regular},
  body4: {fontSize: SIZES.body4, lineHeight: 22, fontFamily: FONT_FAMILY.regular},
  body5: {fontSize: SIZES.body5, lineHeight: 22, fontFamily: FONT_FAMILY.regular},
}

const customTheme = {COLORS, SIZES, FONTS, FONT_FAMILY}

export default customTheme
