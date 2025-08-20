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

    const { placeId } = await req.json()

    if (!placeId) {
      throw new Error('Place ID parameter is required')
    }

    // Build Google Places Details API URL
    const googlePlaceDetailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    googlePlaceDetailsUrl.searchParams.set('place_id', placeId)
    googlePlaceDetailsUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY)
    googlePlaceDetailsUrl.searchParams.set('fields', 'geometry,name,formatted_address,types,business_status,opening_hours')
    
    // Call Google Places Details API
    const googleResponse = await fetch(googlePlaceDetailsUrl.toString())
    
    if (!googleResponse.ok) {
      throw new Error(`Google Places Details API error: ${googleResponse.status}`)
    }
    
    const googleData = await googleResponse.json()
    
    if (googleData.status !== 'OK') {
      throw new Error(`Google Places Details API error: ${googleData.status}`)
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
    console.error('Google Place details error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        result: null
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
