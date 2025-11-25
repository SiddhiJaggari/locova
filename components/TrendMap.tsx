import { Ionicons } from '@expo/vector-icons';
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";

import { supabase } from "../lib/supabase";
import { automatedPlacesService } from "../services/automatedPlaces";
import { Trend } from "../type";

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "";

const DEFAULT_REGION: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

function getTrendCoordinate(trend: Trend) {
  const latitude = trend.latitude ?? trend.lat;
  const longitude = trend.longitude ?? trend.lng;
  if (typeof latitude === "number" && typeof longitude === "number") {
    return { latitude, longitude };
  }
  return null;
}

type TrendMapProps = {
  focus?: {
    latitude: number;
    longitude: number;
    title?: string;
    location?: string;
    origin?: { latitude: number; longitude: number } | null;
  } | null;
};

export default function TrendMap({ focus }: TrendMapProps) {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [showDirectionsInfo, setShowDirectionsInfo] = useState(false);
  const [distance, setDistance] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [destinationAddress, setDestinationAddress] = useState<string | null>(null);
  const [travelMethod, setTravelMethod] = useState<'driving' | 'walking' | 'transit'>('driving');
  const mapRef = useRef<MapView | null>(null);

  const loadTrends = useCallback(async () => {
    try {
      setLoadingTrends(true);
      
      // Start automated discovery if not running
      if (!automatedPlacesService.getStatus().isRunning) {
        await automatedPlacesService.startAutomatedDiscovery();
      }
      
      // Load local trends
      const { data: localTrends, error: localError } = await supabase
        .from("trends")
        .select("id,title,category,location,latitude,longitude,lat,lng,created_at");

      if (localError) throw localError;
      
      let allTrends = (localTrends as Trend[]) ?? [];
      
      // Get automated Google Places
      try {
        console.log("🤖 Fetching automated Google Places...");
        const automatedPlaces = await automatedPlacesService.getAutomatedPlaces();
        
        // Combine local trends with automated Google Places
        allTrends = [...automatedPlaces, ...allTrends];
        console.log(`🎯 Loaded ${automatedPlaces.length} automated places + ${allTrends.length - automatedPlaces.length} local trends`);
        
        // Debug: Check for duplicate IDs
        const idCounts = allTrends.reduce((acc, trend) => {
          acc[trend.id] = (acc[trend.id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const duplicates = Object.entries(idCounts).filter(([_, count]) => count > 1);
        if (duplicates.length > 0) {
          console.warn("⚠️ Found duplicate trend IDs:", duplicates);
        }
        
        // Remove duplicates by keeping the first occurrence of each ID
        const uniqueTrends = allTrends.filter((trend, index, self) => 
          index === self.findIndex((t) => t.id === trend.id)
        );
        
        if (uniqueTrends.length !== allTrends.length) {
          console.log(`🧹 Removed ${allTrends.length - uniqueTrends.length} duplicate trends`);
          allTrends = uniqueTrends;
        }
      } catch (automatedError) {
        console.warn("Failed to load automated places:", automatedError);
        // Continue with local trends if automated fails
      }
      
      setTrends(allTrends);
    } catch (err: any) {
      console.error("Trend map fetch error:", err);
      Alert.alert("Error", err?.message ?? "Failed to load map data");
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  const resolveLocation = useCallback(async () => {
    if (focus) {
      // When we have focus coordinates, use them as the center
      // but also ensure we have the origin for directions
      setInitialRegion({
        latitude: focus.latitude,
        longitude: focus.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setLoadingLocation(false);
      setLocationError(null);
      return;
    }

    try {
      setLoadingLocation(true);
      setLocationError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission denied. Showing default map view.");
        setInitialRegion(DEFAULT_REGION);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setInitialRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    } catch (err: any) {
      console.error("Trend map location error:", err);
      setLocationError("Could not determine location. Showing default map view.");
      setInitialRegion(DEFAULT_REGION);
    } finally {
      setLoadingLocation(false);
    }
  }, [focus]);

  const calculateDistanceInfo = useCallback(() => {
    if (!focus || !focus.origin) return;
    
    // Simple distance calculation using Haversine formula
    const R = 3959; // Earth's radius in miles
    const dLat = (focus.latitude - focus.origin.latitude) * Math.PI / 180;
    const dLon = (focus.longitude - focus.origin.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(focus.origin.latitude * Math.PI / 180) * Math.cos(focus.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceMiles = R * c;
    
    // Calculate time based on travel method
    let speed = 30; // Default driving speed in mph
    let timeMultiplier = 1;
    
    if (travelMethod === 'walking') {
      speed = 3; // Average walking speed in mph
      timeMultiplier = 1.2; // Add buffer for walking
    } else if (travelMethod === 'transit') {
      speed = 25; // Average transit speed in mph
      timeMultiplier = 1.5; // Add buffer for transit stops
    }
    
    const estimatedMinutes = Math.round((distanceMiles / speed) * 60 * timeMultiplier);
    
    // Format distance based on travel method
    let distanceText: string;
    if (travelMethod === 'walking') {
      const distanceKm = (distanceMiles * 1.60934).toFixed(1);
      distanceText = `${distanceMiles.toFixed(1)} mi (${distanceKm} km)`;
    } else {
      distanceText = `${distanceMiles.toFixed(1)} miles`;
    }
    
    setDistance(distanceText);
    setEstimatedTime(`${estimatedMinutes} mins`);
    
    // Set addresses
    setDestinationAddress(focus.location || "Destination location");
    setCurrentAddress("Your current location");
  }, [focus, travelMethod]);

  useEffect(() => {
    console.log("TrendMap focus:", focus);
    console.log("Google Maps API Key available:", !!GOOGLE_MAPS_API_KEY);
    if (focus) {
      setShowDirectionsInfo(true);
      calculateDistanceInfo();
    } else {
      setShowDirectionsInfo(false);
      setDistance(null);
      setEstimatedTime(null);
      setCurrentAddress(null);
      setDestinationAddress(null);
      setTravelMethod('driving');
    }
    resolveLocation();
    loadTrends();
  }, [resolveLocation, loadTrends, focus, calculateDistanceInfo]);

  // Recalculate when travel method changes
  useEffect(() => {
    if (focus && showDirectionsInfo) {
      calculateDistanceInfo();
    }
  }, [travelMethod, focus, showDirectionsInfo, calculateDistanceInfo]);

  // Cleanup automated service on unmount
  useEffect(() => {
    return () => {
      automatedPlacesService.stopAutomatedDiscovery();
    };
  }, []);

  const trendsWithCoords = useMemo(
    () => trends.filter((trend) => getTrendCoordinate(trend) != null),
    [trends]
  );

  const openExternalDirections = useCallback(async () => {
    if (!focus) return;

    let url: string;
    let travelMode = 'driving';
    
    if (travelMethod === 'walking') {
      travelMode = 'walking';
    } else if (travelMethod === 'transit') {
      travelMode = 'transit';
    }
    
    if (focus.origin) {
      // If we have origin, create a directions URL with both origin and destination
      const origin = `${focus.origin.latitude},${focus.origin.longitude}`;
      const destination = `${focus.latitude},${focus.longitude}`;
      
      url = Platform.select({
        ios: `http://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=${travelMode === 'walking' ? 'w' : travelMode === 'transit' ? 'r' : 'd'}`,
        android: `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${travelMode}`,
        default: `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${travelMode}`,
      }) || `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${travelMode}`;
    } else {
      // Fallback to destination only
      const destination = `${focus.latitude},${focus.longitude}`;
      url = Platform.select({
        ios: `http://maps.apple.com/?daddr=${destination}&dirflg=${travelMode === 'walking' ? 'w' : travelMode === 'transit' ? 'r' : 'd'}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${travelMode}`,
      }) || `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${travelMode}`;
    }

    try {
      console.log("Opening directions URL:", url);
      await Linking.openURL(url);
    } catch (err) {
      console.warn("Failed to open maps", err);
      Alert.alert("Directions", "Couldn't open your maps app.");
    }
  }, [focus, travelMethod]);

  const hasPolylineDirections = Boolean(GOOGLE_MAPS_API_KEY && focus && focus.origin);

  const handleRefresh = useCallback(async () => {
    console.log("🔄 Refreshing trends with automated service...");
    
    // Force refresh automated places
    try {
      await automatedPlacesService.refreshAutomatedPlaces();
    } catch (error) {
      console.warn("Failed to refresh automated places:", error);
    }
    
    // Reload trends
    await loadTrends();
    
    // Update location if needed
    resolveLocation();
  }, [loadTrends, resolveLocation]);

  return (
    <View style={styles.container}>
      {initialRegion ? (
        <MapView
          ref={(ref) => {
            mapRef.current = ref;
          }}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
        >
          {focus && focus.origin && GOOGLE_MAPS_API_KEY && (
            <MapViewDirections
              origin={focus.origin}
              destination={{ latitude: focus.latitude, longitude: focus.longitude }}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={5}
              strokeColor="#FF6B7A"
              mode="DRIVING"
              optimizeWaypoints={true}
              splitWaypoints={true}
              precision="high"
              language="en"
              region="us"
              onError={(errorMessage: string) => {
                console.warn("MapViewDirections error:", errorMessage);
                console.warn("This error is expected if Directions API is not enabled.");
                // Don't show alert for API errors - just fallback to external maps
              }}
              onReady={(result: { coordinates: { latitude: number; longitude: number }[] }) => {
                console.log("Directions loaded successfully with", result.coordinates.length, "points");
                try {
                  mapRef.current?.fitToCoordinates(result.coordinates, {
                    edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
                    animated: true,
                  });
                } catch (fitError) {
                  console.warn("fitToCoordinates failed:", fitError);
                }
              }}
            />
          )}
          {trendsWithCoords.map((trend: Trend, index: number) => {
            const coordinate = getTrendCoordinate(trend);
            if (!coordinate) return null;
            
            const isGooglePlace = trend.is_google_place;
            const pinColor = isGooglePlace ? '#FF6B7A' : '#6ECFD9';
            
            let description = `${trend.category} · ${trend.location}`;
            if (isGooglePlace && trend.rating) {
              description = `⭐ ${trend.rating} (${trend.total_ratings || 0}) · ${trend.category} · ${trend.location}`;
            }
            
            // Create unique key using multiple properties to ensure no duplicates
            const uniqueKey = `${trend.id}-${index}-${trend.is_google_place ? 'google' : 'local'}-${coordinate.latitude}-${coordinate.longitude}`;
            
            return (
              <Marker
                key={uniqueKey}
                coordinate={coordinate}
                title={trend.title}
                description={description}
                pinColor={pinColor}
              />
            );
          })}
        </MapView>
      ) : (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Fetching your location…</Text>
        </View>
      )}

      <View style={styles.overlay} pointerEvents="box-none">
        {/* Enhanced Directions Information Panel */}
        {showDirectionsInfo && focus && (
          <View style={styles.directionsInfoPanel}>
            {/* Close Button - Top Right Corner */}
            <Pressable style={styles.topCloseButton} onPress={() => setShowDirectionsInfo(false)}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
            
            <View style={styles.directionsHeader}>
              <View style={styles.destinationInfo}>
                <View style={styles.locationIcon}>
                  <Ionicons name="location" size={24} color="#FF6B7A" />
                </View>
                <View style={styles.locationDetails}>
                  <Text style={styles.destinationTitle}>{focus.title || "Destination"}</Text>
                  <Text style={styles.destinationAddress}>{focus.location || "Location"}</Text>
                </View>
              </View>
            </View>
            
            {/* Travel Method Selector */}
            <View style={styles.travelMethodContainer}>
              <Text style={styles.travelMethodLabel}>Travel Method:</Text>
              <View style={styles.travelMethodButtons}>
                <Pressable 
                  style={[styles.travelMethodButton, travelMethod === 'driving' && styles.travelMethodButtonActive]}
                  onPress={() => setTravelMethod('driving')}
                >
                  <Ionicons name="car" size={16} color={travelMethod === 'driving' ? '#FFFFFF' : '#5A7B7E'} />
                  <Text style={[styles.travelMethodText, travelMethod === 'driving' && styles.travelMethodTextActive]}>Drive</Text>
                </Pressable>
                <Pressable 
                  style={[styles.travelMethodButton, travelMethod === 'walking' && styles.travelMethodButtonActive]}
                  onPress={() => setTravelMethod('walking')}
                >
                  <Ionicons name="walk" size={16} color={travelMethod === 'walking' ? '#FFFFFF' : '#5A7B7E'} />
                  <Text style={[styles.travelMethodText, travelMethod === 'walking' && styles.travelMethodTextActive]}>Walk</Text>
                </Pressable>
                <Pressable 
                  style={[styles.travelMethodButton, travelMethod === 'transit' && styles.travelMethodButtonActive]}
                  onPress={() => setTravelMethod('transit')}
                >
                  <Ionicons name="bus" size={16} color={travelMethod === 'transit' ? '#FFFFFF' : '#5A7B7E'} />
                  <Text style={[styles.travelMethodText, travelMethod === 'transit' && styles.travelMethodTextActive]}>Transit</Text>
                </Pressable>
              </View>
            </View>
            
            {/* Distance and Time Information */}
            {distance && estimatedTime && (
              <View style={styles.directionsStats}>
                <View style={styles.statItem}>
                  <Ionicons name={travelMethod === 'walking' ? 'walk' : travelMethod === 'transit' ? 'bus' : 'car'} size={16} color="#6ECFD9" />
                  <Text style={styles.statText}>{distance}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="time" size={16} color="#6ECFD9" />
                  <Text style={styles.statText}>{estimatedTime}</Text>
                </View>
              </View>
            )}
            
            {/* Map Legend */}
            {!showDirectionsInfo && (
              <View style={styles.mapLegend}>
                <Text style={styles.legendTitle}>🤖 Smart Discovery</Text>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF6B7A' }]} />
                  <Text style={styles.legendText}>Google Places</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#6ECFD9' }]} />
                  <Text style={styles.legendText}>Local Trends</Text>
                </View>
                <Text style={styles.legendSubtitle}>Auto-updating every 5 min</Text>
              </View>
            )}
            
            {/* Route Information */}
            <View style={styles.routeInfoContainer}>
              <View style={styles.routeItem}>
                <Ionicons name="locate" size={16} color="#FF6B7A" />
                <Text style={styles.routeLabel}>From:</Text>
                <Text style={styles.routeValue}>{currentAddress || "Your current location"}</Text>
              </View>
              <View style={styles.routeItem}>
                <Ionicons name="flag" size={16} color="#FF6B7A" />
                <Text style={styles.routeLabel}>To:</Text>
                <Text style={styles.routeValue}>{destinationAddress || focus.location || "Destination"}</Text>
              </View>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.directionsActions}>
              <Pressable style={styles.primaryDirectionsButton} onPress={openExternalDirections}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="navigate" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryDirectionsText}>Start Navigation</Text>
                </View>
              </Pressable>
            </View>
            
            {/* Helpful Tips */}
            <View style={styles.directionsTips}>
              <View style={styles.tipItem}>
                <Ionicons name="information-circle-outline" size={16} color="#5A7B7E" />
                <Text style={styles.tipText}>
                  This will open your preferred maps app for turn-by-{travelMethod === 'walking' ? 'walking' : 'driving'} directions with real-time updates.
                </Text>
              </View>
              {travelMethod === 'driving' && (
                <View style={styles.tipItem}>
                  <Ionicons name="warning-outline" size={16} color="#FFA500" />
                  <Text style={styles.tipText}>
                    Consider traffic conditions and plan your departure time accordingly.
                  </Text>
                </View>
              )}
              {travelMethod === 'walking' && (
                <View style={styles.tipItem}>
                  <Ionicons name="umbrella-outline" size={16} color="#6ECFD9" />
                  <Text style={styles.tipText}>
                    Check weather conditions and wear comfortable shoes for walking.
                  </Text>
                </View>
              )}
              {travelMethod === 'transit' && (
                <View style={styles.tipItem}>
                  <Ionicons name="time-outline" size={16} color="#6ECFD9" />
                  <Text style={styles.tipText}>
                    Check transit schedules and potential delays before departure.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Original Status Chip (simplified) */}
        {!showDirectionsInfo && (locationError || loadingTrends) && (
          <View style={styles.statusChip}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {loadingTrends && <ActivityIndicator size="small" color="#6ECFD9" />}
              {locationError && <Ionicons name="warning-outline" size={16} color="#FF6B7A" />}
              <Text style={styles.statusText}>
                {locationError ?? "Loading trends…"}
              </Text>
            </View>
          </View>
        )}
        
        {/* Control Buttons */}
        <View style={styles.overlayButtons}>
          <Pressable style={styles.refreshButton} onPress={handleRefresh}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </View>
          </Pressable>
          {focus && !showDirectionsInfo && (
            <Pressable style={styles.infoButton} onPress={() => setShowDirectionsInfo(true)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="information" size={18} color="#FFFFFF" />
                <Text style={styles.infoButtonText}>Route Info</Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F9FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#5A7B7E",
  },
  overlay: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
  },
  // Enhanced Directions Panel Styles
  directionsInfoPanel: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 20,
    padding: 20,
    paddingTop: 50, // Extra padding for top close button
    shadowColor: "#1A3B3F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    maxWidth: 400,
    alignSelf: "center",
  },
  topCloseButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B7A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B7A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  directionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  destinationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FF6B7A15",
    alignItems: "center",
    justifyContent: "center",
  },
  locationDetails: {
    flex: 1,
  },
  destinationTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A3B3F",
    marginBottom: 2,
  },
  destinationAddress: {
    fontSize: 14,
    color: "#5A7B7E",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F9FA",
    alignItems: "center",
    justifyContent: "center",
  },
  // Travel Method Styles
  travelMethodContainer: {
    marginBottom: 16,
  },
  travelMethodLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A3B3F",
    marginBottom: 8,
  },
  travelMethodButtons: {
    flexDirection: "row",
    gap: 8,
  },
  travelMethodButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F0F9FA",
    borderWidth: 1,
    borderColor: "#D4E8EA",
  },
  travelMethodButtonActive: {
    backgroundColor: "#6ECFD9",
    borderColor: "#6ECFD9",
  },
  travelMethodText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5A7B7E",
  },
  travelMethodTextActive: {
    color: "#FFFFFF",
  },
  // Stats and Route Info
  directionsStats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F9FA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A3B3F",
  },
  routeInfoContainer: {
    marginBottom: 16,
    gap: 8,
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFA",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  routeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5A7B7E",
    width: 40,
  },
  routeValue: {
    flex: 1,
    fontSize: 13,
    color: "#1A3B3F",
  },
  // Action Buttons
  directionsActions: {
    marginBottom: 16,
  },
  primaryDirectionsButton: {
    backgroundColor: "#FF6B7A",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#FF6B7A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryDirectionsText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  // Tips Section
  directionsTips: {
    gap: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F0F9FA",
    padding: 12,
    borderRadius: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#5A7B7E",
    lineHeight: 18,
  },
  // Original styles (kept for compatibility)
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 0,
    shadowColor: "#1A3B3F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statusText: {
    color: "#1A3B3F",
    fontWeight: "600",
    fontSize: 13,
  },
  refreshButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#FF6B7A",
    shadowColor: "#FF6B7A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  overlayButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#6ECFD9",
    shadowColor: "#6ECFD9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  infoButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  // Map Legend Styles
  mapLegend: {
    position: "absolute",
    bottom: 80,
    left: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#1A3B3F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A3B3F",
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#5A7B7E",
    fontWeight: "500",
  },
  legendSubtitle: {
    fontSize: 10,
    color: "#5A7B7E",
    fontWeight: "400",
    fontStyle: "italic",
    marginTop: 4,
  },
});
