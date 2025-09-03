/**
 * Google Places API Configuration
 * Setup instructions for real location search
 */

// STEP 1: Get Google Places API Key
// 1. Go to Google Cloud Console: https://console.cloud.google.com/
// 2. Create a new project or select existing one
// 3. Enable these APIs:
//    - Places API
//    - Geocoding API
//    - Maps JavaScript API
// 4. Create credentials (API Key)
// 5. Restrict the API key to your app's bundle ID for security

// STEP 2: Add API Key to your environment
// Create a .env file in your project root with:
// GOOGLE_PLACES_API_KEY=your_api_key_here

// STEP 3: Install expo-dotenv for environment variables
// npm install expo-dotenv
// Add to app.json plugins: ["expo-dotenv"]

// STEP 4: Replace the API key in EnhancedRequestTruckScreen.tsx
// Change "YOUR_GOOGLE_PLACES_API_KEY" to process.env.GOOGLE_PLACES_API_KEY

export const GOOGLE_PLACES_CONFIG = {
  // Your API key goes here
  API_KEY: 'AIzaSyDgcKABlWbsVN5ai14wj05W1-NJM2G0GaI',
  
  // Base URLs
  AUTOCOMPLETE_URL: 'https://maps.googleapis.com/maps/api/place/autocomplete/json',
  PLACE_DETAILS_URL: 'https://maps.googleapis.com/maps/api/place/details/json',
  
  // Default parameters
  COUNTRY_CODE: '', // Empty = worldwide search
  LANGUAGE: 'en',
  RESULT_LIMIT: 5,
  
  // Request configuration
  getAutocompleteUrl: (query: string) => {
    const params = new URLSearchParams({
      input: query,
      key: GOOGLE_PLACES_CONFIG.API_KEY,
      language: GOOGLE_PLACES_CONFIG.LANGUAGE,
    });
    
    // Only add country restriction if specified
    if (GOOGLE_PLACES_CONFIG.COUNTRY_CODE) {
      params.set('components', `country:${GOOGLE_PLACES_CONFIG.COUNTRY_CODE}`);
    }
    
    return `${GOOGLE_PLACES_CONFIG.AUTOCOMPLETE_URL}?${params.toString()}`;
  },
  
  getPlaceDetailsUrl: (placeId: string) => {
    const params = new URLSearchParams({
      place_id: placeId,
      key: GOOGLE_PLACES_CONFIG.API_KEY,
      fields: 'geometry,formatted_address,address_components',
    });
    return `${GOOGLE_PLACES_CONFIG.PLACE_DETAILS_URL}?${params.toString()}`;
  },
};

// Alternative: Expo Location Geocoding (Free but less accurate)
import * as Location from 'expo-location';

export const useExpoGeocoding = async (query: string) => {
  try {
    // This uses Expo's built-in geocoding (free)
    const results = await Location.geocodeAsync(query);
    return results.map((result: any) => ({
      latitude: result.latitude,
      longitude: result.longitude,
      address: query,
      formatted_address: query,
      city: '',
      state: '',
      postal_code: '',
    }));
  } catch (error) {
    console.error('Expo geocoding error:', error);
    return [];
  }
};
