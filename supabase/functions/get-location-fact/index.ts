import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
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
    
    let locationPlaceName = 'Unknown Location';
    let placeDetails = '';
    
    if (geocodeResponse.ok) {
      const geocodeData = await geocodeResponse.json();
      locationPlaceName = geocodeData.display_name || geocodeData.name || 'Unknown Location';
      
      // Build detailed context from address components
      const addr = geocodeData.address || {};
      placeDetails = `Location: ${locationPlaceName}. `;
      if (addr.road) placeDetails += `Street: ${addr.road}. `;
      if (addr.suburb || addr.neighbourhood) placeDetails += `Area: ${addr.suburb || addr.neighbourhood}. `;
      if (addr.city || addr.town || addr.village) placeDetails += `City: ${addr.city || addr.town || addr.village}. `;
      if (addr.state) placeDetails += `State: ${addr.state}. `;
      if (addr.country) placeDetails += `Country: ${addr.country}. `;
    }

    const categoryDescription = categoryPrompts[category] || category;
    const systemPrompt = `You are a location information expert. Provide a clean, concise summary about ${categoryDescription} for this location.

LOCATION: Coordinates (${lat}, ${lng})
${placeDetails}

CRITICAL RULES - READ CAREFULLY:
1. Return EXACTLY 6 points total - NO MORE, NO LESS
2. Each point = ONE complete paragraph (2-3 lines, roughly 2-3 sentences)
3. NEVER split a single idea or paragraph into multiple points
4. Each point must be self-contained and complete
5. Focus on the TOP 6 most relevant aspects only
6. Keep tone informative, engaging, and easy to read
7. Each paragraph should be substantial but concise

EXAMPLE FORMAT (follow this structure):
{
  "placeName": "Location Name",
  "facts": [
    "First complete paragraph about one key aspect. This covers the topic fully in 2-3 sentences without breaking up.",
    "Second complete paragraph about another aspect. Again, this is one unified idea presented clearly.",
    "Third complete paragraph covering a different topic. Each point stands alone as a complete thought.",
    "Fourth complete paragraph with another interesting fact. Keep it informative and engaging.",
    "Fifth complete paragraph about yet another aspect. Make sure it's a full, unbroken idea.",
    "Sixth and final complete paragraph. This wraps up the top 6 most important points about this location."
  ],
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
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    interface ParsedFactData {
      placeName: string;
      facts: string[];
      distance: number;
    }

    let parsedData: ParsedFactData;
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

    let { placeName, facts, distance } = parsedData;

    // Ensure exactly 6 facts
    if (facts.length > 6) {
      facts = facts.slice(0, 6);
    } else if (facts.length < 6) {
      // Pad with placeholder if needed (shouldn't happen with good prompt)
      while (facts.length < 6) {
        facts.push('Additional information about this location is being gathered.');
      }
    }

    // Generate relevant source links
    const sources: Array<{ name: string; url: string }> = [];
    
    // Extract location components for better search
    const locationParts = placeName.split(',').map(p => p.trim());
    const mainLocation = locationParts[0];
    const searchQuery = encodeURIComponent(placeName);
    const categoryQuery = encodeURIComponent(`${mainLocation} ${category}`);
    
    // Add Wikipedia link
    sources.push({
      name: 'Wikipedia',
      url: `https://en.wikipedia.org/wiki/Special:Search?search=${searchQuery}`
    });
    
    // Add Google search for the category
    sources.push({
      name: `Google - ${category}`,
      url: `https://www.google.com/search?q=${categoryQuery}`
    });
    
    // Add OpenStreetMap link
    sources.push({
      name: 'OpenStreetMap',
      url: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`
    });
    
    // Add category-specific sources
    if (category === 'News' || category === 'Current Affairs') {
      sources.push({
        name: 'Google News',
        url: `https://news.google.com/search?q=${searchQuery}`
      });
    } else if (category === 'Tourism') {
      sources.push({
        name: 'TripAdvisor',
        url: `https://www.tripadvisor.com/Search?q=${searchQuery}`
      });
    } else if (category === 'History') {
      sources.push({
        name: 'Historical Info',
        url: `https://www.google.com/search?q=${encodeURIComponent(`${mainLocation} history`)}`
      });
    }

    // Fetch 3-5 images from Unsplash with more specific queries
    let imageUrls: string[] = [];
    if (placeName && placeName !== 'Unknown Location') {
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
        coordinates: { lat, lng },
        sources
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
