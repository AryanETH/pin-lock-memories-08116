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
<<<<<<< HEAD
    console.log('Fetching location fact for:', { lat, lng, category });
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyCThIh6u12VNOZpfM2R_fHbKE4SDSXTR9g';
    const UNSPLASH_ACCESS_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
=======
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const UNSPLASH_ACCESS_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
>>>>>>> e7c1de30ab2a974f10037d386ccadee2af489998
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

    const categoryDescription = categoryPrompts[category] || category;
    const userPrompt = `Given coordinates (${lat}, ${lng}), provide 3-5 concise bullet points about ${categoryDescription} for the nearest significant location. Format your response as JSON: {"placeName": "name", "facts": ["fact1", "fact2", "fact3"], "distance": distance_in_km}`;

    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an expert geographical guide. Always respond with valid JSON only.' },
            { role: 'user', content: userPrompt }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
<<<<<<< HEAD
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Failed to get location fact: ${response.status} - ${errorText}`);
=======
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      }
      throw new Error(`Failed to get location fact: ${response.status}`);
>>>>>>> e7c1de30ab2a974f10037d386ccadee2af489998
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

    // Fetch 3-5 images from Unsplash
    let imageUrls: string[] = [];
    if (UNSPLASH_ACCESS_KEY && placeName) {
      try {
        const searchQueries = [
          placeName,
          `${placeName} landscape`,
          `${placeName} architecture`,
          `${placeName} landmark`,
          `${placeName} aerial view`
        ];

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
              imageUrls.push(unsplashData.results[0].urls.regular);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching Unsplash images:', error);
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
