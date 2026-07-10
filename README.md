<div align="center">

<img src="https://img.shields.io/badge/GeoSurvey-Pro-f97316?style=for-the-badge&logo=googlemaps&logoColor=white"/>
<img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white"/>
<img src="https://img.shields.io/badge/Offline-Capable-22c55e?style=for-the-badge&logo=serviceworker&logoColor=white"/>
<img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge"/>

# 📍 GeoSurvey Pro
### Professional Geo-Tagged Field Survey Platform

*Capture photos, GPS coordinates, and structured field data — anywhere, anytime.*

**[🚀 Live Demo](https://prasad-gawade2003.github.io/geosurvey-app)** &nbsp;|&nbsp; **[📱 Install as App](#-install-as-android-app)** &nbsp;|&nbsp; **[📖 Docs](#-features)**

</div>

---

## ✨ Features

| Module | Capabilities |
|--------|-------------|
| 📊 **Dashboard** | KPI cards, live GPS status ring, mini-map, category chart, activity feed |
| 📷 **Survey Capture** | Full camera viewfinder, GPS watermark on photos, multi-photo capture |
| 📋 **Dynamic Forms** | Custom field builder (text, number, dropdown, checkbox), conditions |
| 📍 **GPS Tagging** | Real-time GPS lock, reverse geocoding (auto address), accuracy display |
| 🗺️ **Map View** | Interactive Leaflet map, color-coded markers, popups with photo previews |
| 📂 **Records** | Search, filter by category/priority, grid/list view, CSV export |
| 📈 **Analytics** | 30-day activity chart, category pie chart, priority bars, condition breakdown |
| ⚙️ **Settings** | Dark/light mode, watermark toggle, data export/backup, local storage info |

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML5 + CSS3 + JavaScript (ES6+)
- **Maps:** Leaflet.js + OpenStreetMap
- **PWA:** Service Worker + Web App Manifest
- **Camera:** Browser MediaDevices API
- **GPS:** Geolocation API + Nominatim Reverse Geocoding
- **Storage:** LocalStorage (offline-first)
- **Charts:** Canvas API (no libraries)
- **Fonts:** Inter + JetBrains Mono (Google Fonts)

---

## 🚀 Quick Start

### Run Locally
```bash
# Clone the repository
git clone https://github.com/prasad-gawade2003/geosurvey-app.git
cd geosurvey-app

# Option 1: Open directly in browser
start index.html

# Option 2: Serve with Node (recommended for full PWA features)
npx serve . -p 3000
# Then open: http://localhost:3000
```

### Deploy to GitHub Pages
```bash
# After cloning and making changes:
git add .
git commit -m "Update"
git push origin main

# Enable GitHub Pages:
# Settings → Pages → Source: main branch → / (root)
# App will be live at: https://prasad-gawade2003.github.io/geosurvey-app/
```

---

## 📱 Install as Android App

### Fastest Method (15 minutes, no coding)

1. **Host on Netlify** — Drag the folder to [netlify.com/drop](https://app.netlify.com/drop)
2. **Build APK** — Go to [pwabuilder.com](https://www.pwabuilder.com) → Enter your URL → Package for Android
3. **Install** — Transfer APK to phone → Install → Done!

### Using Bubblewrap CLI (Play Store ready)
```bash
# Install prerequisites
npm install -g @bubblewrap/cli

# Initialize Android project
mkdir android-app && cd android-app
bubblewrap init --manifest https://your-app-url/manifest.json

# Build signed APK
bubblewrap build
# Output: app-release-signed.apk  ← sideload on Android
#         app-release-bundle.aab  ← upload to Google Play Store
```

> 📄 See [BUBBLEWRAP_GUIDE.txt](./BUBBLEWRAP_GUIDE.txt) for the complete step-by-step guide including JDK, Android SDK setup, keystore creation, and Play Store publishing.

---

## 📁 Project Structure

```
geosurvey-app/
├── index.html              # Main application shell
├── style.css               # Premium dark/light UI stylesheet
├── app.js                  # Complete application logic
├── manifest.json           # PWA Web App Manifest
├── sw.js                   # Service Worker (offline + caching)
├── generate-icons.js       # Node.js icon generator script
├── BUBBLEWRAP_GUIDE.txt    # Android APK packaging guide
└── icons/                  # App icons (72px to 512px)
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

---

## 📸 Screenshots

> The app features a premium dark-mode UI with:
> - Orange accent colors (`#f97316`)
> - Glassmorphism overlays
> - Animated splash screen
> - Interactive Leaflet maps
> - Real-time GPS status indicator
> - Camera viewfinder with GPS watermark overlay

---

## 🔧 Configuration

### Enable Real GPS Watermark on Photos
- Open Settings in the app
- Toggle **"Watermark on Photos"** ON
- Every captured photo will have GPS coordinates + timestamp burned in

### Offline Mode
The service worker (`sw.js`) automatically caches all app assets on first load. The app works fully offline after that — surveys are stored in `localStorage`.

### Custom Survey Fields
In the **New Survey** page, click **"Add Custom Field"** to add:
- Text input
- Number input  
- Dropdown select
- Long text (textarea)
- Checkbox

---

## 🌐 Browser Support

| Browser | GPS | Camera | Offline | PWA Install |
|---------|-----|--------|---------|-------------|
| Chrome 80+ | ✅ | ✅ | ✅ | ✅ |
| Edge 80+ | ✅ | ✅ | ✅ | ✅ |
| Firefox 75+ | ✅ | ✅ | ✅ | ⚠️ Partial |
| Safari 14+ | ✅ | ✅ | ✅ | ✅ iOS |

> ⚠️ Camera and GPS require **HTTPS** or `localhost`. Service Worker does not work on `file://` URLs.

---

## 📊 PWA Checklist

- [x] Web App Manifest (`manifest.json`)
- [x] Service Worker with offline caching (`sw.js`)
- [x] HTTPS ready
- [x] Responsive design (mobile, tablet, desktop)
- [x] App icons (all sizes: 72 → 512px)
- [x] Theme color meta tag
- [x] Apple touch icon
- [x] `user-scalable=no` for app-like feel
- [x] Standalone display mode
- [x] Background sync (placeholder)
- [x] Push notification support (placeholder)

---

## 📜 License

MIT License — free to use, modify, and distribute.

---

## 👤 Author

**Prasad Gawade**  
Field Survey Developer · Nagpur, Maharashtra  
GitHub: [@prasad-gawade2003](https://github.com/prasad-gawade2003)

---

<div align="center">
  <sub>Built with ❤️ using Vanilla JS + Leaflet + PWA APIs</sub><br/>
  <sub>© 2026 GeoSurvey Pro · GeoTrack Pro</sub>
</div>
