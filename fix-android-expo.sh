#!/bin/bash
# Quick fix for Android Expo issues
# Run this script when Android gets stuck downloading

echo "🔧 Fixing Android Expo Download Issues..."

# Method 1: Clear cache and restart
echo "1. Clearing Expo cache..."
cd "d:\Building Materials Uber App\CustomerAppNew"
npx expo start --clear --tunnel

# Alternative methods (uncomment if needed):

# Method 2: Reset Metro bundler
# echo "2. Resetting Metro bundler..."
# npx expo start --clear --reset-cache

# Method 3: Use LAN instead of tunnel (faster)
# echo "3. Starting with LAN connection..."
# npx expo start --lan

# Method 4: Development build (most reliable)
# echo "4. Using development build..."
# npx expo install --fix
# npx expo start --dev-client

echo "✅ Try scanning the new QR code on your Android device"
echo "💡 If still stuck, clear Expo Go app data on Android"
