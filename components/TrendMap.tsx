import { Ionicons } from '@expo/vector-icons';
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";

import { supabase } from "../lib/supabase";
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
  const mapRef = useRef<MapView | null>(null);

  const loadTrends = useCallback(async () => {
    try {
      setLoadingTrends(true);
      const { data, error } = await supabase
        .from("trends")
        .select("id,title,category,location,latitude,longitude,lat,lng,created_at");

      if (error) throw error;
      setTrends((data as Trend[]) ?? []);
    } catch (err: any) {
      console.error("Trend map fetch error:", err);
      Alert.alert("Error", err?.message ?? "Failed to load map data");
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  const resolveLocation = useCallback(async () => {
    if (focus) {
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
  }, []);

  useEffect(() => {
    resolveLocation();
    loadTrends();
  }, [resolveLocation, loadTrends]);

  const trendsWithCoords = useMemo(
    () => trends.filter((trend) => getTrendCoordinate(trend) != null),
    [trends]
  );

  const hasPolylineDirections = Boolean(GOOGLE_MAPS_API_KEY);

  const openExternalDirections = useCallback(async () => {
    if (!focus) return;

    const destination = `${focus.latitude},${focus.longitude}`;
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${destination}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    });

    try {
      if (url) {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.warn("Failed to open maps", err);
      Alert.alert("Directions", "Couldn't open your maps app.");
    }
  }, [focus]);

  const handleRefresh = useCallback(() => {
    resolveLocation();
    loadTrends();
  }, [resolveLocation, loadTrends]);

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
          {focus && focus.origin && hasPolylineDirections && (
            <MapViewDirections
              origin={focus.origin}
              destination={{ latitude: focus.latitude, longitude: focus.longitude }}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={5}
              strokeColor="#FF6B7A"
              onError={(errorMessage: string) => {
                console.warn("MapViewDirections error", errorMessage);
              }}
              onReady={(result: { coordinates: { latitude: number; longitude: number }[] }) => {
                try {
                  mapRef.current?.fitToCoordinates(result.coordinates, {
                    edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
                    animated: true,
                  });
                } catch (fitError) {
                  console.warn("fitToCoordinates failed", fitError);
                }
              }}
            />
          )}
          {trendsWithCoords.map((trend) => {
            const coordinate = getTrendCoordinate(trend);
            if (!coordinate) return null;
            return (
              <Marker
                key={trend.id}
                coordinate={coordinate}
                title={trend.title}
                description={`${trend.category} · ${trend.location}`}
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
        {(locationError || loadingTrends || focus) && (
          <View style={styles.statusChip}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {loadingTrends && <ActivityIndicator size="small" color="#6ECFD9" />}
              {locationError && <Ionicons name="warning-outline" size={16} color="#FF6B7A" />}
              {focus && (
                <Ionicons name="navigate" size={16} color="#6ECFD9" />
              )}
              <Text style={styles.statusText}>
                {focus
                  ? focus.origin && hasPolylineDirections
                    ? `Directions to ${focus.title ?? "trend"}${focus.location ? ` · ${focus.location}` : ""}`
                    : "Tap 'Open in Maps' for turn-by-turn directions"
                  : (locationError ?? "Loading trends…")}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.overlayButtons}>
          <Pressable style={styles.refreshButton} onPress={handleRefresh}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </View>
          </Pressable>
          {focus && !hasPolylineDirections && (
            <Pressable style={styles.externalDirectionsButton} onPress={openExternalDirections}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="open-outline" size={18} color="#1A3B3F" />
                <Text style={styles.externalDirectionsText}>Open in Maps</Text>
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
  externalDirectionsButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#1A3B3F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  externalDirectionsText: {
    color: "#1A3B3F",
    fontWeight: "700",
    fontSize: 14,
  },
});
