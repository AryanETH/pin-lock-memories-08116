import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, category = 'Facts' } = await req.json();
    console.log('Fetching location fact for:', { lat, lng, category });
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyCThIh6u12VNOZpfM2R_fHbKE4SDSXTR9g';
    const UNSPLASH_ACCESS_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Create category-specific prompt
    const categoryPrompts: Record<string, string> = {
      'Facts': 'interesting facts',
      'News': 'recent news or current events',
      'History': 'historical information and significance',
      'Geography': 'geographical features and characteristics',
      'Education': 'educational institutions and learning opportunities',
      'Current Affairs': 'current affairs and recent developments',
      'Culture': 'cultural aspects, traditions, and heritage',
      'Tourism': 'tourist attractions and travel information',
      'Economy': 'economic status, industries, and development'
    };

    // First, get the exact place name using reverse geocoding
    const geocodeResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'LocationFactApp/1.0'
        }
      }
    );
    
    let placeName = 'Unknown Location';
    let placeDetails = '';
    
    if (geocodeResponse.ok) {
      const geocodeData = await geocodeResponse.json();
      placeName = geocodeData.display_name || geocodeData.name || 'Unknown Location';
      
      // Build detailed context from address components
      const addr = geocodeData.address || {};
      placeDetails = `Location: ${placeName}. `;
      if (addr.road) placeDetails += `Street: ${addr.road}. `;
      if (addr.suburb || addr.neighbourhood) placeDetails += `Area: ${addr.suburb || addr.neighbourhood}. `;
      if (addr.city || addr.town || addr.village) placeDetails += `City: ${addr.city || addr.town || addr.village}. `;
      if (addr.state) placeDetails += `State: ${addr.state}. `;
      if (addr.country) placeDetails += `Country: ${addr.country}. `;
    }

    const categoryDescription = categoryPrompts[category] || category;
    const systemPrompt = `You are a precise geographical expert with real-time knowledge. 

EXACT LOCATION: Coordinates (${lat}, ${lng})
${placeDetails}

Task: Provide 3-5 highly accurate, specific bullet points about ${categoryDescription} for THIS EXACT LOCATION.

IMPORTANT RULES:
1. Be PINPOINT ACCURATE - focus on this specific coordinate, not just the general area
2. If it's a specific building/landmark, describe THAT place specifically
3. If it's a street/area, describe what's notable at or near these exact coordinates
4. Include current, factual information only
5. Mention specific names of places, buildings, or landmarks if applicable
6. Calculate distance as 0 km since we're describing the exact location

Format your response as JSON:
{
  "placeName": "exact name of the location",
  "facts": ["specific fact 1", "specific fact 2", "specific fact 3"],
  "distance": 0
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Failed to get location fact: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const textContent = data.choices[0].message.content;

    let parsedData;
    try {
      parsedData = JSON.parse(textContent);
    } catch (parseError) {
      const placeNameMatch = textContent.match(/"placeName"\s*:\s*"([^"]*)"/);
      const factsMatch = textContent.match(/"facts"\s*:\s*\[(.*?)\]/s);
      const distanceMatch = textContent.match(/"distance"\s*:\s*([\d.]+)/);
      
      if (placeNameMatch && factsMatch) {
        const factsArray = factsMatch[1]
          .split(',')
          .map((f: string) => f.trim().replace(/^"|"$/g, ''))
          .filter((f: string) => f);
        
        parsedData = {
          placeName: placeNameMatch[1],
          facts: factsArray.length > 0 ? factsArray : ['Information not available'],
          distance: distanceMatch ? parseFloat(distanceMatch[1]) : 0
        };
      } else {
        throw new Error('Failed to parse response');
      }
    }

    const { placeName, facts, distance } = parsedData;

    // Fetch 3-5 images from Unsplash with more specific queries
    let imageUrls: string[] = [];
    if (placeName) {
      try {
        // Use Unsplash if key is available
        if (UNSPLASH_ACCESS_KEY) {
          // Extract key location components for better image search
          const locationParts = placeName.split(',').map(p => p.trim());
          const mainLocation = locationParts[0]; // Most specific part
          const city = locationParts.find(p => p.length > 3 && p.length < 30) || locationParts[1];
          
          const searchQueries = [
            mainLocation, // Most specific
            `${mainLocation} ${city || ''}`.trim(),
            `${city || mainLocation} landmark`,
            `${city || mainLocation} architecture`,
            `${city || mainLocation} street view`
          ].filter(q => q.length > 0);

          for (const query of searchQueries) {
            if (imageUrls.length >= 5) break;

            const unsplashResponse = await fetch(
              `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
              {
                headers: {
                  'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
                }
              }
            );

            if (unsplashResponse.ok) {
              const unsplashData = await unsplashResponse.json();
              if (unsplashData.results && unsplashData.results.length > 0) {
                const imageUrl = unsplashData.results[0].urls.regular;
                // Avoid duplicates
                if (!imageUrls.includes(imageUrl)) {
                  imageUrls.push(imageUrl);
                }
              }
            }
          }
        } else {
          // Fallback: Use placeholder images or skip images
          console.log('UNSPLASH_ACCESS_KEY not configured, skipping images');
        }
      } catch (error) {
        console.error('Error fetching images:', error);
      }
    }

    return new Response(
      JSON.stringify({
        facts,
        placeName,
        distance,
        imageUrls,
        category,
        coordinates: { lat, lng }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
