import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, limit = 5 } = await req.json()
    
    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Step 1: Search local database first (fast)
    const { data: localAddresses } = await supabase
      .from('addresses')
      .select('*')
      .or(`name.ilike.%${query}%, formatted_address.ilike.%${query}%, search_keywords.cs.{${query.toLowerCase()}}`)
      .limit(3)

    const suggestions = []
    
    // Add local addresses
    if (localAddresses) {
      localAddresses.forEach(addr => {
        suggestions.push({
          id: `local_${addr.id}`,
          title: addr.name,
          subtitle: `${addr.formatted_address} • ${addr.area_type}`,
          coordinates: {
            latitude: addr.latitude,
            longitude: addr.longitude
          },
          source: 'database',
          truckAccessible: addr.is_truck_accessible
        })
      })
    }

    // Step 2: If we need more results, search Google Places API
    if (suggestions.length < limit) {
      const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
      
      if (googleApiKey) {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=establishment|geocode&language=en&key=${googleApiKey}`
          )
          
          const googleData = await response.json()
          
          if (googleData.predictions) {
            const remainingSlots = limit - suggestions.length
            
            googleData.predictions.slice(0, remainingSlots).forEach((prediction: any) => {
              suggestions.push({
                id: `google_${prediction.place_id}`,
                title: prediction.structured_formatting?.main_text || prediction.description,
                subtitle: prediction.structured_formatting?.secondary_text || prediction.description,
                coordinates: null, // Will be fetched when selected
                source: 'google',
                placeId: prediction.place_id
              })
            })
          }
        } catch (error) {
          console.error('Google Places API error:', error)
        }
      }
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Places search error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to search places' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
