import { useLocalSearchParams } from "expo-router";
import React from "react";

import TrendMap from "../../components/TrendMap";

export default function MapScreen() {
  const params = useLocalSearchParams<{ lat?: string; lng?: string; title?: string; location?: string; originLat?: string; originLng?: string }>();

  const lat = params.lat ? Number(params.lat) : undefined;
  const lng = params.lng ? Number(params.lng) : undefined;
  const originLat = params.originLat ? Number(params.originLat) : undefined;
  const originLng = params.originLng ? Number(params.originLng) : undefined;

  const focus = typeof lat === "number" && !Number.isNaN(lat) && typeof lng === "number" && !Number.isNaN(lng)
    ? {
        latitude: lat,
        longitude: lng,
        title: params.title,
        location: params.location,
        origin:
          typeof originLat === "number" && !Number.isNaN(originLat) && typeof originLng === "number" && !Number.isNaN(originLng)
            ? { latitude: originLat, longitude: originLng }
            : null,
      }
    : null;

  return <TrendMap focus={focus} />;
}
