
import { GoogleGenAI, Type } from "@google/genai";
import { Route, RunHistory, LatLng } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async geocodeLocation(query: string): Promise<LatLng | null> {
    try {
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

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
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

  async generateRouteDescription(name: string, distance: number, elevation: number, tags: string[]): Promise<string> {
    try {
      const isCoffee = tags.some(t => t.toLowerCase().includes('coffee') || t.toLowerCase().includes('cafe'));
      const prompt = isCoffee 
        ? `Write a short, engaging 2-sentence description for a coffee-themed running route named "${name}". 
           It is ${distance}km long with ${elevation}m elevation gain. 
           Tags: ${tags.join(', ')}. Mention why this is a great destination for a coffee lover.`
        : `Write a short, engaging 2-sentence description for a running route named "${name}". 
           It is ${distance}km long with ${elevation}m elevation gain. 
           Tags: ${tags.join(', ')}. Focus on the vibe and why every run deserves a destination.`;

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

  async getCoachingTips(run: RunHistory): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `I just finished a run. 
        Distance: ${run.distance}km
        Duration: ${Math.floor(run.duration / 60)} minutes
        Average Pace: ${run.averagePace} min/km
        Route: ${run.routeName}
        
        Provide a single paragraph of motivational coaching advice. 
        Since this app is "Coffee Routes", mention a coffee-related reward or energy metaphor (e.g., "Full-bodied effort", "Rich performance").
        Keep it encouraging and brief.`
      });
      return response.text || "That was a full-bodied effort today! Reward yourself with a rich brew and focus on recovery.";
    } catch (e) {
      console.error(e);
      return "Excellent effort today! Your performance was as strong as an espresso. Focus on recovery and hydration.";
    }
  }
};
