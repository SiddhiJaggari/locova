const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "";


// Enhanced Google Places Types
export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
}

export interface GooglePlace {
  place_id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  photos?: GooglePhoto[];
  opening_hours?: {
    open_now: boolean;
  };
  price_level?: number;
}

export interface GooglePhoto {
  photo_reference: string;
  height: number;
  width: number;
}

export interface PlaceDetails extends GooglePlace {
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  reviews?: GoogleReview[];
}

export interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
}

// Cache for cost optimization
const placeCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function for API requests
async function makeRequest(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      return data;
    } else {
      throw new Error(`Google Places API Error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Google Places API request failed:', error);
    throw error;
  }
}

// Cache helper functions
function getCacheKey(prefix: string, params: any): string {
  return `${prefix}_${JSON.stringify(params)}`;
}

function getCachedData(key: string): any | null {
  const cached = placeCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  placeCache.delete(key);
  return null;
}

function setCachedData(key: string, data: any): void {
  placeCache.set(key, { data, timestamp: Date.now() });
}

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

// NEW: Search nearby places with location
export async function searchNearbyPlaces(
  latitude: number,
  longitude: number,
  radius: number = 1000,
  type: string = 'restaurant',
  keyword?: string
): Promise<GooglePlace[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn("Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY env var; skipping nearby search.");
    return [];
  }

  const cacheKey = getCacheKey('nearby', { latitude, longitude, radius, type, keyword });
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const location = `${latitude},${longitude}`;
  let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&key=${GOOGLE_PLACES_API_KEY}`;
  
  if (keyword) {
    url += `&keyword=${encodeURIComponent(keyword)}`;
  }

  try {
    const data = await makeRequest(url);
    const places = data.results || [];
    setCachedData(cacheKey, places);
    return places;
  } catch (error) {
    console.error('Failed to search nearby places:', error);
    return [];
  }
}

// NEW: Get detailed place information
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn("Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY env var; skipping place details.");
    return null;
  }

  const cacheKey = getCacheKey('details', { placeId });
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,formatted_address,formatted_phone_number,website,reviews,photos,opening_hours,price_level,geometry,vicinity,types&key=${GOOGLE_PLACES_API_KEY}`;

  try {
    const data = await makeRequest(url);
    const place = data.result;
    setCachedData(cacheKey, place);
    return place;
  } catch (error) {
    console.error('Failed to get place details:', error);
    return null;
  }
}

// NEW: Get place photo URL
export function getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
}

// NEW: Convert Google Place to Trend format
export function convertToTrend(place: GooglePlace): any {
  return {
    id: `google_${place.place_id}`,
    title: place.name,
    category: getCategoryFromTypes(place.types),
    location: place.vicinity,
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    created_at: new Date().toISOString(),
    rating: place.rating,
    total_ratings: place.user_ratings_total,
    place_id: place.place_id,
    is_google_place: true,
    opening_now: place.opening_hours?.open_now,
    price_level: place.price_level
  };
}

// Extract category from place types
function getCategoryFromTypes(types: string[]): string {
  const categoryMap: { [key: string]: string } = {
    'restaurant': 'Food & Dining',
    'cafe': 'Food & Dining',
    'food': 'Food & Dining',
    'bar': 'Nightlife',
    'night_club': 'Nightlife',
    'shopping_mall': 'Shopping',
    'store': 'Shopping',
    'tourist_attraction': 'Attractions',
    'museum': 'Attractions',
    'park': 'Outdoor',
    'entertainment': 'Entertainment',
    'movie_theater': 'Entertainment',
    'gym': 'Fitness',
    'spa': 'Wellness'
  };

  for (const type of types) {
    if (categoryMap[type]) {
      return categoryMap[type];
    }
  }
  
  return 'Other';
}

// NEW: Clear cache
export function clearPlacesCache(): void {
  placeCache.clear();
}
