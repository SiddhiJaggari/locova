const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export type GooglePlaceResult = {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
};

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GooglePlaceResult[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn("Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY env var; skipping place search.");
    return [];
  }

  const encodedQuery = encodeURIComponent(query.trim());
  if (!encodedQuery) {
    return [];
  }

  const baseUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";
  const url = `${baseUrl}?query=${encodedQuery}&key=${GOOGLE_PLACES_API_KEY}`;

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Google Places error: ${response.status}`);
    }
    const json = await response.json();
    if (json.status && json.status !== "OK") {
      console.warn("Google Places non-OK status", json.status, json.error_message);
    }
    return (json.results ?? []) as GooglePlaceResult[];
  } catch (error) {
    if ((error as any)?.name === "AbortError") {
      return [];
    }
    console.error("searchPlaces failed", error);
    throw error;
  }
}
