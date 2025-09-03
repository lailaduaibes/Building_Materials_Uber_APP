/**
 * Professional Places Service - Mobile App Side
 * Communicates with backend API (Uber-style architecture)
 */

const API_BASE_URL = 'http://localhost:3000/api'; // Replace with your backend URL

export interface LocationSuggestion {
  id: string;
  title: string;
  subtitle: string;
  full_address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  city?: string;
  district?: string;
  postal_code?: string;
  category: string;
  icon: string;
  source: string;
}

export interface PlacesSearchResponse {
  success: boolean;
  suggestions: LocationSuggestion[];
  query: string;
  source: string;
}

class ProfessionalPlacesService {
  private cache = new Map<string, LocationSuggestion[]>();
  private requestTimeout = 5000; // 5 seconds

  /**
   * Search for locations using backend API
   * This follows Uber's architecture pattern
   */
  async searchLocations(
    query: string, 
    userLocation?: { lat: number; lng: number }
  ): Promise<LocationSuggestion[]> {
    try {
      // Check cache first
      const cacheKey = `${query}-${userLocation?.lat}-${userLocation?.lng}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey) || [];
      }

      // Minimum query length
      if (query.length < 2) {
        return [];
      }

      // Call backend API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      const response = await fetch(`${API_BASE_URL}/places/autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          location: userLocation,
          radius: 50000 // 50km radius
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: PlacesSearchResponse = await response.json();

      if (data.success) {
        // Cache results for 5 minutes
        this.cache.set(cacheKey, data.suggestions);
        setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);

        return data.suggestions;
      } else {
        throw new Error('API returned error');
      }

    } catch (error) {
      console.error('Places search error:', error);
      
      // Fallback to local suggestions on error
      return this.getFallbackSuggestions(query);
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/places/reverse-geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude, longitude })
      });

      const data = await response.json();
      
      if (data.success) {
        return data.address;
      } else {
        throw new Error('Reverse geocoding failed');
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  /**
   * Fallback suggestions when API fails
   * Similar to what Uber does for offline mode
   */
  private getFallbackSuggestions(query: string): LocationSuggestion[] {
    const popularLocations: LocationSuggestion[] = [
      {
        id: 'fallback_1',
        title: 'King Khalid International Airport',
        subtitle: 'Riyadh • Major Airport',
        full_address: 'King Khalid International Airport, Riyadh 13455, Saudi Arabia',
        coordinates: { latitude: 24.9574, longitude: 46.6987 },
        city: 'Riyadh',
        category: 'airport',
        icon: '✈️',
        source: 'fallback'
      },
      {
        id: 'fallback_2',
        title: 'Kingdom Centre',
        subtitle: 'Olaya • Shopping Mall',
        full_address: 'Kingdom Centre, King Fahd Road, Olaya, Riyadh 12311, Saudi Arabia',
        coordinates: { latitude: 24.7110, longitude: 46.6750 },
        city: 'Riyadh',
        category: 'shopping',
        icon: '🛒',
        source: 'fallback'
      },
      {
        id: 'fallback_3',
        title: 'Al Faisaliyah Tower',
        subtitle: 'Olaya • Business District',
        full_address: 'Al Faisaliyah Tower, King Fahd Road, Olaya, Riyadh 11311, Saudi Arabia',
        coordinates: { latitude: 24.6889, longitude: 46.6857 },
        city: 'Riyadh',
        category: 'business',
        icon: '🏢',
        source: 'fallback'
      },
      {
        id: 'fallback_4',
        title: 'King Abdulaziz Historical Center',
        subtitle: 'Murabba • Cultural Site',
        full_address: 'King Abdulaziz Historical Center, Murabba, Riyadh 12631, Saudi Arabia',
        coordinates: { latitude: 24.6476, longitude: 46.7071 },
        city: 'Riyadh',
        category: 'culture',
        icon: '🏛️',
        source: 'fallback'
      },
      {
        id: 'fallback_5',
        title: 'Riyadh Park Mall',
        subtitle: 'Northern Ring Road • Shopping',
        full_address: 'Riyadh Park Mall, Northern Ring Road, Riyadh 13315, Saudi Arabia',
        coordinates: { latitude: 24.8077, longitude: 46.6252 },
        city: 'Riyadh',
        category: 'shopping',
        icon: '🛒',
        source: 'fallback'
      }
    ];

    // Filter by query
    return popularLocations.filter(location =>
      location.title.toLowerCase().includes(query.toLowerCase()) ||
      location.subtitle.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3);
  }

  /**
   * Clear search cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export const professionalPlacesService = new ProfessionalPlacesService();
