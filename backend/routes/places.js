/**
 * Professional Places API - Following Uber's Architecture
 * Secure backend proxy for Google Places API
 */

const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// Google Places API configuration
const GOOGLE_PLACES_API_KEY = 'AIzaSyDgcKABlWbsVN5ai14wj05W1-NJM2G0GaI';
const PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

/**
 * Autocomplete endpoint - Uber-style implementation
 * POST /api/places/autocomplete
 */
router.post('/autocomplete', async (req, res) => {
  try {
    const { query, location, radius = 50000 } = req.body;
    
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Build Google Places request
    const params = new URLSearchParams({
      input: query,
      key: GOOGLE_PLACES_API_KEY,
      components: 'country:sa', // Saudi Arabia only
      language: 'en',
      location: location ? `${location.lat},${location.lng}` : '',
      radius: radius.toString()
    });

    // Call Google Places API (server-to-server)
    const response = await fetch(`${PLACES_BASE_URL}/autocomplete/json?${params}`);
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API status: ${data.status}`);
    }

    // Process results - Uber-style enhancement
    const suggestions = await Promise.all(
      (data.predictions || []).slice(0, 5).map(async (prediction) => {
        try {
          // Get detailed place information
          const detailsResponse = await fetch(
            `${PLACES_BASE_URL}/details/json?place_id=${prediction.place_id}&key=${GOOGLE_PLACES_API_KEY}&fields=geometry,formatted_address,address_components,types`
          );
          
          const detailsData = await detailsResponse.json();
          const place = detailsData.result;

          // Extract address components
          let city = '';
          let district = '';
          let postal_code = '';

          if (place.address_components) {
            place.address_components.forEach(component => {
              if (component.types.includes('locality')) {
                city = component.long_name;
              }
              if (component.types.includes('sublocality_level_1')) {
                district = component.long_name;
              }
              if (component.types.includes('postal_code')) {
                postal_code = component.long_name;
              }
            });
          }

          // Determine place category (Uber-style)
          const types = place.types || [];
          let category = 'general';
          let icon = '📍';
          
          if (types.includes('airport')) {
            category = 'airport';
            icon = '✈️';
          } else if (types.includes('hospital')) {
            category = 'hospital';
            icon = '🏥';
          } else if (types.includes('shopping_mall')) {
            category = 'shopping';
            icon = '🛒';
          } else if (types.includes('school') || types.includes('university')) {
            category = 'education';
            icon = '🎓';
          } else if (types.includes('restaurant')) {
            category = 'restaurant';
            icon = '🍽️';
          }

          return {
            id: prediction.place_id,
            title: prediction.structured_formatting?.main_text || prediction.description,
            subtitle: prediction.structured_formatting?.secondary_text || city,
            full_address: place.formatted_address,
            coordinates: {
              latitude: place.geometry?.location?.lat || 0,
              longitude: place.geometry?.location?.lng || 0
            },
            city,
            district,
            postal_code,
            category,
            icon,
            source: 'google_places'
          };
        } catch (error) {
          console.error('Error fetching place details:', error);
          // Fallback to basic info
          return {
            id: prediction.place_id,
            title: prediction.structured_formatting?.main_text || prediction.description,
            subtitle: prediction.structured_formatting?.secondary_text || '',
            full_address: prediction.description,
            coordinates: { latitude: 0, longitude: 0 },
            category: 'general',
            icon: '📍',
            source: 'google_places_basic'
          };
        }
      })
    );

    // Add popular locations if query is short
    if (query.length <= 3) {
      const popularLocations = [
        {
          id: 'popular_1',
          title: 'King Khalid International Airport',
          subtitle: 'Riyadh • Popular destination',
          coordinates: { latitude: 24.9574, longitude: 46.6987 },
          category: 'airport',
          icon: '✈️',
          source: 'popular'
        },
        {
          id: 'popular_2', 
          title: 'Kingdom Centre',
          subtitle: 'Olaya • Shopping & Business',
          coordinates: { latitude: 24.7110, longitude: 46.6750 },
          category: 'shopping',
          icon: '🛒',
          source: 'popular'
        }
      ];

      suggestions.unshift(...popularLocations.filter(loc => 
        loc.title.toLowerCase().includes(query.toLowerCase())
      ));
    }

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 5), // Limit to 5 results
      query,
      source: 'google_places_api'
    });

  } catch (error) {
    console.error('Places autocomplete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search locations',
      error: error.message
    });
  }
});

/**
 * Reverse geocoding endpoint
 * POST /api/places/reverse-geocode
 */
router.post('/reverse-geocode', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}&language=en`
    );

    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      
      res.json({
        success: true,
        address: result.formatted_address,
        coordinates: { latitude, longitude }
      });
    } else {
      res.json({
        success: false,
        message: 'Address not found'
      });
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get address'
    });
  }
});

module.exports = router;
