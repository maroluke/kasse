# Kasse Monorepo

Monorepo for Android POS built with Capacitor (Android) + React/TypeScript, native Kotlin plugins, and Supabase backend.

## Workspaces

- apps/pos: Capacitor Android app (React + Zustand + Tailwind)
- apps/admin: Next.js admin + KDS
- packages/core: Shared types, pricing math, receipt renderer
- supabase: SQL migrations + RLS

## Prerequisites

- Node 18+
- Yarn Classic (1.x)
- Java 17, Android SDK for Android build
- Supabase CLI

## Quick start

Install deps:

```bash
yarn install
```

Dev servers:

```bash
yarn dev:pos
yarn dev:admin
```

Android studio:

```bash
yarn android:open
```

Run tests:

```bash
yarn test
```

Migrations:

```bash
yarn db:migrate
```

## Env

Copy `.env.example` to `.env` and fill in Supabase creds.

## Android Testing

### Build and install on Android device:

```bash
# 1. Install Android SDK platform tools (if not already installed)
brew install --cask android-platform-tools

# 2. Build the web app for production
yarn workspace @kasse/pos build

# 3. Sync Capacitor with Android project
yarn workspace @kasse/pos cap sync android

# 4. Build APK
cd apps/pos/android && ./gradlew assembleDebug

# 5. Install on connected device
# First, enable USB debugging on your Android device:
# - Settings > About Phone > Tap "Build Number" 7 times
# - Settings > Developer Options > Enable "USB Debugging"
# - Connect device via USB and allow debugging

# List connected devices
adb devices -l

# Install APK (replace with your device ID) AS0609H001Q21902504
adb -s <DEVICE_ID> install app/build/outputs/apk/debug/app-debug.apk

# For re-installation with updates:
adb -s <DEVICE_ID> install -r app/build/outputs/apk/debug/app-debug.apk
```

### Quick update cycle:

```bash
yarn workspace @kasse/pos build && \
yarn workspace @kasse/pos cap sync android && \
cd apps/pos/android && ./gradlew assembleDebug && \
adb -s <DEVICE_ID> install -r app/build/outputs/apk/debug/app-debug.apk
```

### ⚠️ Troubleshooting: Changes not appearing

If code changes don't appear in the app after deployment, clear all caches:

```bash
# 1. Clear TypeScript build cache (core package)
cd packages/core && rm -rf lib/ && npm run build

# 2. Clear Vite build cache (POS app)
cd apps/pos && rm -rf dist/ && rm -rf node_modules/.vite/ && npm run build

# 3. Clear Android build cache
cd apps/pos/android && ./gradlew clean

# 4. Rebuild everything
cd apps/pos && npx cap sync android && \
cd android && ./gradlew assembleDebug && \
adb -s <DEVICE_ID> install -r app/build/outputs/apk/debug/app-debug.apk
```

**Common issues:**
- **TypeScript cache**: Core package changes not compiled
- **Vite cache**: Old JS bundles being reused
- **Android assets**: Stale web assets not updated
- **Gradle cache**: Build artifacts not refreshed

**Always run the full cache clear sequence** when making changes to shared packages (`@kasse/core`) or printer logic.

## Structure

See individual app READMEs for more.
