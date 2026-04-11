# VEYe — Product Description for Social Media & Marketing

**Use this document with Gemini (or other AI) to generate social media posts, ads, app store descriptions, and marketing content.**

---

## Brand Overview

**Name:** VEYe (pronounced "veye")  
**Tagline:** Community safety app for Haiti  
**Mission:** Help people stay informed about alerts and danger zones near them, report incidents, and protect their community.  
**Target audience:** Residents of Haiti, Haitian diaspora, families, travelers, and anyone concerned about safety in Haiti.  
**Languages:** English, Français (French), Kreyòl (Haitian Creole)  
**Platforms:** Android (Play Store), iOS  
**Website:** https://veye.dev  
**Play Store:** https://play.google.com/store/apps/details?id=tech.transitiondigitaleht.veye  

**Share message (Creole):** "Pataje VEYe ak fanmi w zanmi pou yo pwoteje tèt yo" — Share VEYe with your family and friends so they can protect themselves.

---

## Core Value Proposition

VEYe is a community-driven safety app that:
- Shows **real-time alerts** (kidnapping, missing persons, shootings, danger zones) on an interactive map
- Lets users **report incidents** quickly and anonymously
- Sends **push notifications** for alerts near your location
- Helps families and communities **stay informed and safe** in Haiti

---

## Features & Options (Complete List)

### 1. Map Tab
- **Interactive map** centered on Haiti (Port-au-Prince region)
- **Nearby alerts** displayed as markers with severity colors
- **Heatmap view** — toggle to show danger density (red/orange/yellow zones)
- **User location** — auto-detected, with address lookup (reverse geocoding)
- **Radius overlay** — circle showing your alert radius (configurable)
- **Legend** — Kidnapping (red), Danger Zone (orange), Missing (yellow), Info (blue)
- **Danger Zone card** — quick link to full Danger Zones screen
- **SOS button** — quick access to call emergency (114)
- **Profile shortcut** — navigate to Profile from header

### 2. Alerts Tab
- **Alerts feed** — list of all alerts (kidnapping, missing, released, shooting)
- **Filters:** All, Kidnapped, Missing, Released, Shooting
- **Full-screen map** with markers and heatmap
- **Alert cards** — name, location, time, severity, distance from you
- **Tap to view details** — full alert info, photo, share, report info, call emergency
- **Share alert** — share with family/friends via native share
- **Pull to refresh**
- **Bottom sheet** — swipe up/down to expand/collapse list

### 3. Report Tab (Center + button)
- **Report types:**
  - Kidnapping
  - Missing person
  - Dangerous zone
  - Shooting
  - Suspicious activity
- **Auto-detected location** — uses GPS
- **Description** — required text field
- **Optional fields:** Victim name, Contact phone
- **Photos** — take photo or choose from library (max 4)
- **Report anonymously** — toggle
- **Submit** — sends to Firestore, triggers push notifications to nearby users

### 4. Danger Zones Tab (Zones)
- **Map of danger zones** — community-reported dangerous areas
- **Risk levels:** High risk, Medium risk, Low risk
- **Heatmap toggle**
- **Radius filter** — only zones within your configured radius
- **Bottom sheet** — list of zones with details
- **Pull to refresh**

### 5. Profile Tab
- **Notifications** — toggle on/off
- **Dark theme** — toggle light/dark mode
- **Language** — English, Français, Kreyòl (instant switch)
- **Alert radius** — 5, 10, 15, 25, 50, 100 km or custom (1–500 km). Controls what appears on map.
- **Notification radius** — 5, 10, 15, 25, 50, 100 km or custom. Controls push notification range.
- **FAQ** — Frequently Asked Questions
- **Privacy** — links to https://veye.dev/politique-de-confidentialite.html
- **About VEYe** — links to https://veye.dev/about.html
- **Share VEYe** — share app with family and friends
- **Logout**

### 6. Alert Details (from Alerts or Map)
- **Severity banner** — Kidnapping, Missing, Released, Shooting, etc.
- **Photo** — victim or incident image
- **Info:** Name, Age, Location, Time
- **Description**
- **Actions:** Share Alert, Report Info, Call Emergency (114)
- **SOS button** in header — calls 114

### 7. FAQ Topics
- What is VEYe?
- How do I report an incident?
- Alert Radius vs Notification Radius
- How do I change the language?
- Are my reports anonymous?
- What do the alert colors mean?
- Why does VEYe need my location?
- How can I share an alert?

### 8. Technical / Backend
- **Firebase** — Firestore, Auth (anonymous), Analytics, Messaging
- **OneSignal** — push notifications
- **Cloud Function** — sends notifications when new alerts are reported
- **HERE API** — reverse geocoding for address lookup
- **Google Maps** — map tiles (Android)
- **Reports verified** by team before being shared

---

## Severity / Alert Colors

| Color  | Meaning                    | Use case                          |
|--------|----------------------------|-----------------------------------|
| Red    | Kidnapping / Extreme danger| Active kidnapping, critical      |
| Orange | Danger zone / Shooting     | Dangerous area, shooting          |
| Yellow | Missing / Suspicious       | Missing person, suspicious activity |
| Green  | Released / Safe            | Person released, resolved         |
| Blue   | Info                       | General information               |

---

## Key Messages for Social Media

**Safety:** "Stay informed. Stay safe. VEYe shows you alerts and danger zones near you in real time."  
**Community:** "Your report can save lives. Share what you see—anonymously—and help protect your community."  
**Family:** "Share VEYe with your family and friends. One app, three languages: English, Français, Kreyòl."  
**Empowerment:** "Know before you go. Check the map, get push notifications, and make informed decisions."  
**Trust:** "Reports are verified by our team. Anonymous reporting available. Your privacy matters."

---

## Hashtags (Suggested)

#VEYe #Haiti #Safety #CommunitySafety #StaySafe #Ayiti #Kreyol #HaitianDiaspora #PortAuPrince #AlertApp #SafetyApp #ProtectYourFamily #AnonymousReporting #RealTimeAlerts

---

## Tone & Voice

- **Caring, clear, empowering** — not fear-based
- **Community-first** — "we" and "together"
- **Respectful** — sensitive to kidnapping and violence
- **Action-oriented** — "Report," "Share," "Stay informed"
- **Multilingual** — content should work in EN, FR, HT

---

## App Store Description (Short)

VEYe helps you stay safe in Haiti. View real-time alerts and danger zones on a map, report incidents anonymously, and get push notifications for alerts near you. Available in English, French, and Kreyòl. Share with family and friends to protect your community.

---

## App Store Description (Long)

VEYe is a community safety app for Haiti. Stay informed about kidnapping alerts, missing persons, shootings, and danger zones—all on an interactive map. Report what you see (anonymously if you prefer), receive push notifications for incidents near your location, and share alerts with family and friends. Choose your preferred language (English, Français, or Kreyòl) and customize your alert and notification radius. Reports are verified by our team. Download VEYe and help protect your community.
