# RapidPhoto Mobile App

React Native mobile application for RapidPhoto built with Expo.

## Features

- 📷 **Camera Integration**: Take photos with device camera
- 🖼️ **Gallery Selection**: Select multiple photos from device gallery
- 📤 **Background Uploads**: Upload photos in the background
- 📊 **Upload Queue**: Manage upload queue with pause/resume
- 🖼️ **Photo Gallery**: View uploaded photos with infinite scroll
- 🔐 **Biometric Auth**: Face ID/Touch ID support
- ⚙️ **Settings**: Upload quality, WiFi-only, storage stats

## Setup

### Prerequisites

- Node.js 20+
- pnpm
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode (for iOS development)
- Android: Android Studio (for Android development)

### Installation

```bash
cd apps/mobile
pnpm install
```

### Development

```bash
# Start Expo development server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android
```

## Project Structure

```
apps/mobile/
├── src/
│   ├── screens/          # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── UploadQueueScreen.tsx
│   │   ├── GalleryScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/         # Business logic
│   │   ├── authService.ts
│   │   └── uploadService.ts
│   └── components/      # Reusable components
├── App.tsx              # Main app component
└── package.json
```

## Configuration

Update API base URL in `packages/shared/src/constants/api.ts`:

```typescript
export const API_BASE_URL = 'http://your-api-url/api';
```

## Building for Production

### iOS

```bash
# Build iOS app
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### Android

```bash
# Build Android app
eas build --platform android

# Submit to Google Play
eas submit --platform android
```

## Features Checklist

- ✅ Photo capture with camera
- ✅ Gallery photo selection (multi-select)
- ✅ Background uploads
- ✅ Upload queue management
- ✅ Real-time upload progress
- ✅ Offline support (queue photos, upload when online)
- ✅ Photo compression options
- ✅ Biometric authentication
- ✅ Photo gallery with infinite scroll
- ✅ Photo viewer with zoom (pinch to zoom)
- ✅ Swipe between photos
- ✅ Share/download photos
- ✅ Settings management
- ✅ Dark mode support

## Troubleshooting

### Camera Permission Issues

Ensure camera permissions are properly configured in `app.json`.

### Upload Failures

Check network connectivity and API base URL configuration.

### Build Issues

Clear cache and reinstall dependencies:

```bash
rm -rf node_modules
pnpm install
expo start -c
```

