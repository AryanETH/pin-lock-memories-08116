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
    const { lat, lng, mode = 'geography' } = await req.json();
    const GEMINI_API_KEY = 'AIzaSyB2vRS-qntnQ5VXd6dj-Kv5dYQBmNXA8kM';

    console.log(`Fetching ${mode} fact for location: ${lat}, ${lng}`);

    // Customize prompt based on mode
    const systemPrompt = mode === 'history'
      ? 'You are a captivating historian. Provide fascinating historical facts about locations, including important events, famous figures, or historical significance. Always return facts in this exact JSON format: {"fact": "the fact text", "placeName": "name of the place", "distance": 0}. If the exact coordinates don\'t have historical significance, find the nearest historically important location and include the distance in kilometers.'
      : 'You are a fun and engaging geography expert. Provide interesting geographical facts about locations, including natural features, climate, ecosystems, or geographical significance. Always return facts in this exact JSON format: {"fact": "the fact text", "placeName": "name of the place", "distance": 0}. If the exact coordinates don\'t have a famous place, find the nearest interesting location and include the distance in kilometers.';

    const userPrompt = mode === 'history'
      ? `Give me one fascinating historical fact about the location at coordinates ${lat}, ${lng}. Focus on historical events, important dates, famous people, or cultural heritage. If this exact location doesn't have historical significance, find the nearest historically important place and tell me about it. Include the distance from the original coordinates if it's different. Make it engaging and educational!`
      : `Give me one fascinating geographical fact about the location at coordinates ${lat}, ${lng}. Focus on natural features, climate, ecosystems, or geographical characteristics. If this exact location doesn't have a notable landmark or geographical feature, find the nearest interesting place and tell me about it. Include the distance from the original coordinates if it's different. Make it engaging and educational!`;

    // Call Gemini API directly
    const factResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }]
      }),
    });

    if (!factResponse.ok) {
      const errorText = await factResponse.text();
      console.error('Gemini API error:', factResponse.status, errorText);
      throw new Error('Failed to get location fact');
    }

    const factData = await factResponse.json();
    const factText = factData.candidates[0].content.parts[0].text;
    
    // Parse the JSON response
    let parsedFact;
    try {
      parsedFact = JSON.parse(factText);
    } catch {
      // Fallback if AI doesn't return proper JSON
      parsedFact = {
        fact: factText,
        placeName: 'This Location',
        distance: 0
      };
    }

    // Fetch images using Unsplash API with prioritized fallbacks
    console.log('Fetching images for:', parsedFact.placeName);
    const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY') || 'your-unsplash-key';
    const headers = { 'Authorization': `Client-ID ${unsplashKey}` };
    const queries = [
      parsedFact.placeName,                                 // 1) Exact match
      `${parsedFact.placeName} related`,                    // 2) Related photos
      `${parsedFact.placeName} landmark OR scenery OR city` // 3) Relevant photos
    ];

    const imageUrlSet = new Set<string>();
    for (const q of queries) {
      try {
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=6&orientation=landscape`,
          { headers }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const urls: string[] = (data.results || []).map((img: any) => img.urls?.regular).filter(Boolean);
        urls.forEach(u => imageUrlSet.add(u));
        if (imageUrlSet.size >= 3) break;
      } catch (e) {
        console.warn('Unsplash fetch failed for query', q, e);
      }
    }

    const imageUrls: string[] = Array.from(imageUrlSet).slice(0, 3);

    return new Response(
      JSON.stringify({
        fact: parsedFact.fact,
        placeName: parsedFact.placeName,
        distance: parsedFact.distance,
        imageUrls: imageUrls,
        coordinates: { lat, lng }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
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
