import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured')
    }

    const { query, location, radius, types } = await req.json()

    if (!query) {
      throw new Error('Query parameter is required')
    }

    // Build Google Places Autocomplete API URL
    const googlePlacesUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    googlePlacesUrl.searchParams.set('input', query)
    googlePlacesUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY)
    
    if (location) {
      googlePlacesUrl.searchParams.set('location', location)
    }
    
    if (radius) {
      googlePlacesUrl.searchParams.set('radius', radius.toString())
    }
    
    if (types) {
      googlePlacesUrl.searchParams.set('types', types)
    }

    // Add country restriction to South Africa
    googlePlacesUrl.searchParams.set('components', 'country:za')
    
    // Call Google Places API
    const googleResponse = await fetch(googlePlacesUrl.toString())
    
    if (!googleResponse.ok) {
      throw new Error(`Google Places API error: ${googleResponse.status}`)
    }
    
    const googleData = await googleResponse.json()
    
    if (googleData.status !== 'OK' && googleData.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${googleData.status}`)
    }

    return new Response(
      JSON.stringify(googleData),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )

  } catch (error) {
    console.error('Google Places search error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        predictions: [] // Return empty predictions on error
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
