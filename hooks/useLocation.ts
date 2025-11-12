// hooks/useLocation.ts
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

type Coords = { lat: number; lng: number } | null;

export function useLocation() {
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<Coords>(null);
  const [city, setCity] = useState<string | null>(null);

  const resolveCityFromCoords = useCallback(async (latitude: number, longitude: number) => {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const best =
      places[0]?.city || places[0]?.subregion || places[0]?.region || places[0]?.district || null;
    setCity(best);
  }, []);

  const refreshLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      setCoords({ lat: latitude, lng: longitude });
      await resolveCityFromCoords(latitude, longitude);
    } finally {
      setLocating(false);
    }
  }, [resolveCityFromCoords]);

  useEffect(() => {
    // run once on mount
    refreshLocation();
  }, [refreshLocation]);

  return { locating, coords, city, setCity, refreshLocation };
}
