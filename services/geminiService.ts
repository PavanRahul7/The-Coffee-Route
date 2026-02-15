import { GoogleGenAI, Type } from "@google/genai";
import { Route, RunHistory, LatLng } from "../types";

/**
 * Gemini service providing AI-driven features for route generation, 
 * geocoding, and personalized coaching.
 */
export const geminiService = {
  // Geocode a location query to LatLng coordinates
  async geocodeLocation(query: string): Promise<LatLng | null> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Given the location query "${query}", return ONLY a JSON object with "lat" and "lng" properties for that location. If you don't know the exact location, provide coordinates for a major landmark or city center associated with it. Do not include any other text.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["lat", "lng"]
          }
        }
      });
      const jsonStr = response.text.trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Geocoding error:', e);
      return null;
    }
  },

  // Reverse geocode coordinates to a human-readable city/region string
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Identify the city and region/country for these coordinates: Lat ${lat}, Lng ${lng}. Return ONLY a short string like "Brooklyn, NY" or "Shinjuku, Tokyo". Do not include any other text.`,
      });
      return response.text.trim() || null;
    } catch (e) {
      console.error('Reverse geocoding error:', e);
      return null;
    }
  },

  // Fetch cafe ratings using Google Search grounding
  // Refactored to use Type.ARRAY of Type.OBJECT with specific properties to fix API schema error
  async getCafeRatings(cafes: { name: string; id: string }[], locationHint: string): Promise<any[]> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const cafeList = cafes.map(c => c.name).join(", ");
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Find the current Google Maps ratings and review counts for these coffee shops in or near ${locationHint}: ${cafeList}. 
        Return ONLY a JSON array of objects, each containing: "name" (the exact cafe name), "rating" (number), "reviews" (string e.g. "1.2k"), and "url" (google maps URL).`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "The name of the cafe" },
                rating: { type: Type.NUMBER, description: "The 1-5 star rating" },
                reviews: { type: Type.STRING, description: "Formatted review count" },
                url: { type: Type.STRING, description: "Google Maps URL" }
              },
              required: ["name", "rating", "reviews", "url"]
            }
          }
        }
      });

      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        console.debug('Cafe Search Grounding Chunks:', response.candidates[0].groundingMetadata.groundingChunks);
      }

      const jsonStr = response.text.trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Error fetching cafe ratings:', e);
      return [];
    }
  },

  // Generate an engaging description for a new route
  async generateRouteDescription(name: string, distance: number, elevation: number, cafeNames: string[]): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = cafeNames.length > 0
        ? `Write a short, engaging 2-sentence description for a coffee-themed running route named "${name}". 
           It is ${distance}km long with ${elevation}m elevation gain. 
           It passes by: ${cafeNames.join(', ')}. Mention why this is a great destination for a coffee lover.`
        : `Write a short, engaging 2-sentence description for a running route named "${name}". 
           It is ${distance}km long with ${elevation}m elevation gain. Focus on the vibe and why every run deserves a destination.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      return response.text || "A great path for your next run. Don't forget the espresso at the end!";
    } catch (e) {
      console.error(e);
      return "A custom route perfect for all skill levels. Great coffee potentially nearby.";
    }
  },

  // Provide motivational coaching tips after a session
  async getCoachingTips(run: RunHistory): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `I just finished a run. 
        Distance: ${run.distance}km
        Duration: ${Math.floor(run.duration / 60)} minutes
        Average Pace: ${run.averagePace} min/km
        Route: ${run.routeName}
        
        Provide a single paragraph of motivational coaching advice. 
        Since this app is "The Coffee Route", mention a coffee-related reward or energy metaphor (e.g., "Full-bodied effort", "Rich performance").
        Keep it encouraging and brief.`
      });
      return response.text || "That was a full-bodied effort today! Reward yourself with a rich brew and focus on recovery.";
    } catch (e) {
      console.error(e);
      return "Excellent effort today! Your performance was as strong as an espresso. Focus on recovery and hydration.";
    }
  }
};