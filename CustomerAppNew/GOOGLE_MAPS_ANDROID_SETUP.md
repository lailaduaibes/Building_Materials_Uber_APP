# Google Maps Setup Guide for Android

## Current Status
✅ **React Native Maps**: Installed (v1.20.1)  
✅ **MapView Configuration**: Updated with PROVIDER_GOOGLE  
✅ **App.json Configuration**: Added Google Maps plugin configuration  
⚠️ **API Key**: Needs to be configured with your actual Google Maps API key  

## Steps to Complete Google Maps Setup

### 1. Get Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the following APIs:
   - **Maps SDK for Android**
   - **Maps SDK for iOS** 
   - **Geocoding API**
   - **Directions API**
   - **Places API** (if using autocomplete)

4. Create credentials:
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Copy the API key

### 2. Configure API Key Restrictions (Important for Security)
For Android:
- Application restrictions: **Android apps**
- Add your package name: `com.yourcompany.customerapp`
- Add SHA-1 certificate fingerprint from your keystore

For Development (Expo):
- Get SHA-1 from: `expo credentials:manager`
- Or use unrestricted key for development only

### 3. Update Configuration Files

**Update `app.json`:**
```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE"
        }
      }
    },
    "plugins": [
      [
        "react-native-maps",
        {
          "googleMapsApiKey": "YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE"
        }
      ]
    ]
  }
}
```

**Update `services/RealTimeTrackingService.ts`:**
Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual API key.

### 4. Test Google Maps on Android

**Current Implementation Features:**
- ✅ Google Maps provider specified
- ✅ User location enabled
- ✅ Custom markers for customer and driver
- ✅ Real-time location updates
- ✅ Map animations and clustering
- ✅ ETA calculations using Google Directions API

**To Test:**
1. Replace API key placeholders with your actual Google Maps API key
2. Run: `expo start --clear` 
3. Test on Android device/emulator
4. Check that maps load properly and show your location

### 5. Common Android Issues & Solutions

**Issue**: Map shows gray/blank screen  
**Solution**: Verify API key is correct and Maps SDK for Android is enabled

**Issue**: Location not showing  
**Solution**: Check location permissions in app.json and device settings

**Issue**: "Authentication error"  
**Solution**: Check API key restrictions and package name matching

**Issue**: Maps work in development but not in production build  
**Solution**: Add production SHA-1 certificate to API key restrictions

## Environment Variables (Recommended)
For security, use environment variables:

**Create `.env` file:**
```env
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

**Update app.json:**
```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": process.env.GOOGLE_MAPS_API_KEY
        }
      }
    }
  }
}
```

## Current Implementation Status
- ✅ **MapView**: Uses PROVIDER_GOOGLE for Android
- ✅ **Markers**: Custom customer and driver markers
- ✅ **Real-time Updates**: Supabase integration for live tracking
- ✅ **Animations**: Marker animations and map fitting
- ✅ **Permissions**: Location permissions configured
- ⚠️ **API Key**: Replace placeholder with actual key

**Next Steps:**
1. Get Google Maps API key from Google Cloud Console
2. Replace "YOUR_GOOGLE_MAPS_API_KEY_HERE" in app.json
3. Replace "YOUR_GOOGLE_MAPS_API_KEY" in RealTimeTrackingService.ts
4. Test on Android device

The Google Maps implementation is ready for Android and will work properly once you configure the API key!
