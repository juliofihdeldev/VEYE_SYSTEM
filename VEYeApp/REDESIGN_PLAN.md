# VEYe App – Modern Safety UX Redesign Plan

## Overview
Transform VEYe from a list-first app into a **map-first, severity-aware, action-focused** community safety platform. Design principles: fast to scan, trustworthy, emotionally calm, action-focused, location-aware.

---

## Severity Color System (CRITICAL)
| Color | Hex | Use Case | Emotion |
|-------|-----|----------|---------|
| **Red** | `#C41E3A` | Active kidnapping / extreme danger | Urgent |
| **Orange** | `#E85D04` | Dangerous zone / Shooting | Caution |
| **Yellow** | `#F4C430` | Suspicious / Missing person | Warning |
| **Green** | `#228B22` | Safe / Released | Calm |
| **Blue** | `#2563EB` | Information | Neutral |

---

## Navigation Structure
**New:** `Map | Alerts | Report (+) | News | Profile`  
**Old:** `Accueil | Zone Instable | Actualités | Paramètres`

---

## Screen-by-Screen Implementation

### 1. Map Dashboard (Primary Home)
- Compact header: VEYe logo, location (e.g. "Delmas 33"), 🔔, 👤
- Large live map with severity-coded pins: 🔴 kidnapping, 🟠 danger zone, 🟡 suspicious
- "Nearby Alerts" section below map with scrollable severity cards
- Each card: severity badge, name, distance, time, [View] button

### 2. Alerts List
- Header: "Alerts Near You"
- Filter chips: [All] [🔴 Kidnapped] [🟡 Missing] [🟢 Released]
- Severity cards: photo, name, location, time, distance, [View Details] [Share]
- Use FlashList for performance

### 3. Alert Details (Critical)
- Full-screen detail with photo, name, age, location, time
- Description field
- Last known location map (mini map)
- Action buttons: **Share Alert** | **Report Info** | **Call Emergency**

### 4. Danger Zones
- Header: "Danger Zones Near You"
- Map with color-coded polygons: 🔴 high, 🟠 medium, 🟡 low
- List of zone cards below with severity, name, description, time, [View]

### 5. Report Incident
- Report type buttons: Kidnapping, Missing, Shooting, Dangerous zone, Suspicious
- Location auto-detected display
- Optional photo, description, time
- Submit Report button

### 6. News
- Clean card layout: image, headline, source, time, [Read]
- Pull to refresh

### 7. Profile / Settings
- User photo, name
- Settings list: Notifications, Language, Privacy, About VEYe, Share VEYe, Logout

---

## Dependencies to Add
- `@react-navigation/native` + `@react-navigation/bottom-tabs` + `@react-navigation/native-stack`
- `react-native-screens` + `react-native-safe-area-context` (already have)
- `react-native-maps` (map-first design)
- `react-native-map-clustering` (pin clustering)
- `@shopify/flash-list` (performant lists)

---

## File Structure Changes
```
src/
├── screens/
│   ├── main/
│   │   ├── MapDashboard.tsx      (NEW - primary home)
│   │   ├── AlertsList.tsx        (renamed/redesigned from Home)
│   │   ├── AlertDetails.tsx     (NEW - full screen, not modal)
│   │   ├── DangerZones.tsx      (redesigned with map)
│   │   ├── ReportIncident.tsx    (NEW - dedicated flow)
│   │   ├── News.tsx              (redesigned cards)
│   │   └── Profile.tsx           (renamed from Settings)
│   └── ...
├── components/
│   ├── AlertCard.tsx             (NEW - severity card)
│   ├── DangerZoneCard.tsx        (NEW)
│   ├── ModernHeader.tsx          (NEW - compact header)
│   └── ...
├── constants/
│   └── theme.js                  (add SEVERITY_COLORS)
└── navigation/
    └── BottomTabNavigator.tsx    (NEW - replaces Tabs)
```

---

## Implementation Order
1. ✅ Severity theme + constants
2. Add dependencies
3. Modern header component
4. Bottom tab navigator
5. Map Dashboard (map placeholder first if native maps delayed)
6. Alert cards + Alerts List
7. Alert Details screen
8. Danger Zones (map + cards)
9. Report Incident flow
10. News cards + Profile
