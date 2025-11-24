import * as Location from "expo-location";
import { Trend } from "../type";
import { clearPlacesCache, convertToTrend, searchNearbyPlaces } from "./places";

// Automated Places Configuration
const AUTOMATED_CONFIG = {
  // Search radius in meters
  DEFAULT_RADIUS: 1500,
  MAX_RADIUS: 3000,
  
  // Number of places to fetch per category
  PLACES_PER_CATEGORY: 10,
  MAX_TOTAL_PLACES: 30,
  
  // Auto-refresh intervals (in milliseconds)
  REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  LOCATION_UPDATE_INTERVAL: 30 * 1000, // 30 seconds
  
  // Categories to automatically search
  AUTO_CATEGORIES: [
    { type: 'restaurant', keyword: 'popular restaurants' },
    { type: 'cafe', keyword: 'coffee shops' },
    { type: 'tourist_attraction', keyword: 'attractions' },
    { type: 'shopping_mall', keyword: 'shopping' },
    { type: 'entertainment', keyword: 'entertainment' }
  ],
  
  // Ranking factors for automatic sorting
  RANKING_WEIGHTS: {
    rating: 0.4,
    review_count: 0.3,
    distance: 0.2,
    popularity: 0.1
  }
};

// Cache for automated discoveries
const automatedCache = new Map<string, {
  places: Trend[];
  timestamp: number;
  location: { lat: number; lng: number };
}>();

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for automated cache

export class AutomatedPlacesService {
  private currentLocation: { lat: number; lng: number } | null = null;
  private refreshTimer: any = null;
  private locationTimer: any = null;
  private isRunning = false;

  // Start automated discovery
  async startAutomatedDiscovery(): Promise<void> {
    if (this.isRunning) return;
    
    console.log("🤖 Starting automated places discovery...");
    this.isRunning = true;
    
    // Get initial location
    await this.updateCurrentLocation();
    
    // Start periodic location updates
    this.startLocationTracking();
    
    // Start periodic place refresh
    this.startPeriodicRefresh();
    
    // Initial discovery
    await this.performAutomatedDiscovery();
  }

  // Stop automated discovery
  stopAutomatedDiscovery(): void {
    console.log("🛑 Stopping automated places discovery...");
    this.isRunning = false;
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    if (this.locationTimer) {
      clearInterval(this.locationTimer);
      this.locationTimer = null;
    }
  }

  // Get current user location
  private async updateCurrentLocation(): Promise<void> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission denied for automated discovery");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      this.currentLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      };

      console.log(`📍 Updated location: ${this.currentLocation.lat}, ${this.currentLocation.lng}`);
    } catch (error) {
      console.error("Failed to update location for automated discovery:", error);
    }
  }

  // Start location tracking
  private startLocationTracking(): void {
    this.locationTimer = setInterval(async () => {
      await this.updateCurrentLocation();
    }, AUTOMATED_CONFIG.LOCATION_UPDATE_INTERVAL);
  }

  // Start periodic refresh
  private startPeriodicRefresh(): void {
    this.refreshTimer = setInterval(async () => {
      await this.performAutomatedDiscovery();
    }, AUTOMATED_CONFIG.REFRESH_INTERVAL);
  }

  // Perform automated discovery
  private async performAutomatedDiscovery(): Promise<Trend[]> {
    if (!this.currentLocation) {
      console.warn("No location available for automated discovery");
      return [];
    }

    const cacheKey = `automated_${this.currentLocation.lat}_${this.currentLocation.lng}`;
    const cached = automatedCache.get(cacheKey);
    
    // Check cache
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("📦 Using cached automated places");
      return cached.places;
    }

    console.log("🔍 Performing automated places discovery...");
    
    try {
      const allPlaces: Trend[] = [];
      
      // Search each category
      for (const category of AUTOMATED_CONFIG.AUTO_CATEGORIES) {
        try {
          const places = await searchNearbyPlaces(
            this.currentLocation.lat,
            this.currentLocation.lng,
            AUTOMATED_CONFIG.DEFAULT_RADIUS,
            category.type,
            category.keyword
          );

          const trends = places
            .slice(0, AUTOMATED_CONFIG.PLACES_PER_CATEGORY)
            .map((place: any) => convertToTrend(place));

          allPlaces.push(...trends);
          console.log(`📊 Found ${trends.length} ${category.type} places`);
        } catch (error) {
          console.warn(`Failed to fetch ${category.type} places:`, error);
        }
      }

      // Rank and filter places
      const rankedPlaces = this.rankPlaces(allPlaces);
      const finalPlaces = rankedPlaces.slice(0, AUTOMATED_CONFIG.MAX_TOTAL_PLACES);

      // Cache results
      automatedCache.set(cacheKey, {
        places: finalPlaces,
        timestamp: Date.now(),
        location: this.currentLocation
      });

      console.log(`✅ Automated discovery complete: ${finalPlaces.length} places`);
      return finalPlaces;

    } catch (error) {
      console.error("Automated discovery failed:", error);
      return [];
    }
  }

  // Intelligent place ranking
  private rankPlaces(places: Trend[]): Trend[] {
    if (!this.currentLocation) return places;

    return places
      .map(place => ({
        ...place,
        score: this.calculatePlaceScore(place)
      }))
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...place }) => place);
  }

  // Calculate place score based on multiple factors
  private calculatePlaceScore(place: Trend): number {
    const weights = AUTOMATED_CONFIG.RANKING_WEIGHTS;
    let score = 0;

    // Rating score (0-5)
    if (place.rating) {
      score += (place.rating / 5) * weights.rating;
    }

    // Review count score (normalized)
    if (place.total_ratings) {
      const reviewScore = Math.min(place.total_ratings / 1000, 1); // Cap at 1000 reviews
      score += reviewScore * weights.review_count;
    }

    // Distance score (closer is better)
    if (this.currentLocation && place.latitude && place.longitude) {
      const distance = this.calculateDistance(
        this.currentLocation.lat,
        this.currentLocation.lng,
        place.latitude,
        place.longitude
      );
      const distanceScore = Math.max(0, 1 - (distance / AUTOMATED_CONFIG.MAX_RADIUS));
      score += distanceScore * weights.distance;
    }

    // Popularity score (based on rating and review count)
    if (place.rating && place.total_ratings) {
      const popularityScore = (place.rating * Math.log(place.total_ratings + 1)) / 10;
      score += Math.min(popularityScore, 1) * weights.popularity;
    }

    return score;
  }

  // Calculate distance between two points
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Get current automated places
  async getAutomatedPlaces(): Promise<Trend[]> {
    if (!this.currentLocation) {
      await this.updateCurrentLocation();
    }
    
    return this.performAutomatedDiscovery();
  }

  // Force refresh automated places
  async refreshAutomatedPlaces(): Promise<Trend[]> {
    console.log("🔄 Force refreshing automated places...");
    clearPlacesCache();
    automatedCache.clear();
    return this.performAutomatedDiscovery();
  }

  // Get places by category
  async getPlacesByCategory(categoryType: string): Promise<Trend[]> {
    const allPlaces = await this.getAutomatedPlaces();
    return allPlaces.filter(place => 
      place.category.toLowerCase().includes(categoryType.toLowerCase())
    );
  }

  // Get top rated places
  async getTopRatedPlaces(limit: number = 10): Promise<Trend[]> {
    const allPlaces = await this.getAutomatedPlaces();
    return allPlaces
      .filter(place => place.rating && place.rating >= 4.0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit);
  }

  // Get currently open places
  async getOpenPlaces(): Promise<Trend[]> {
    const allPlaces = await this.getAutomatedPlaces();
    return allPlaces.filter(place => 
      place.opening_now === true || place.opening_now === undefined
    );
  }

  // Clear all automated caches
  clearAutomatedCache(): void {
    automatedCache.clear();
    clearPlacesCache();
    console.log("🧹 Cleared automated places cache");
  }

  // Get service status
  getStatus(): {
    isRunning: boolean;
    hasLocation: boolean;
    cacheSize: number;
    lastUpdate: number | null;
  } {
    return {
      isRunning: this.isRunning,
      hasLocation: this.currentLocation !== null,
      cacheSize: automatedCache.size,
      lastUpdate: Array.from(automatedCache.values()).reduce((latest, cached) => 
        Math.max(latest, cached.timestamp), 0
      ) || null
    };
  }
}

// Export singleton instance
export const automatedPlacesService = new AutomatedPlacesService();
