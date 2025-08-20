import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    
    if (!query || query.length < 3) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Google Places API key from environment
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    
    if (!googleApiKey) {
      // Fallback to local database search if no API key
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      const { data: addresses } = await supabase
        .from('addresses')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(5)
      
      const suggestions = (addresses || []).map(addr => ({
        id: addr.id,
        title: addr.name,
        subtitle: addr.formatted_address,
        coordinates: {
          latitude: addr.latitude,
          longitude: addr.longitude
        }
      }))
      
      return new Response(
        JSON.stringify({ suggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use Google Places API for real address search
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${googleApiKey}&components=country:za&types=establishment|geocode`
    )
    
    const data = await response.json()
    
    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status}`)
    }

    // Transform Google Places results to our format
    const suggestions = data.predictions.map((prediction: any) => ({
      id: prediction.place_id,
      title: prediction.structured_formatting?.main_text || prediction.description,
      subtitle: prediction.structured_formatting?.secondary_text || prediction.description,
      coordinates: {
        latitude: 0, // Will be filled by place details call
        longitude: 0
      },
      place_id: prediction.place_id
    }))

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Places search error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
