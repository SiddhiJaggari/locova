// app/(tabs)/index.tsx
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Trend = {
  id: string;
  title: string;
  category: string;
  location: string;
  created_at: string;
  user_id: string | null;
  lat?: number | null;
  lng?: number | null;
  // When fetched via RPC:
  distance_km?: number | null;
};

const CATS = ["Food", "Event", "Place"] as const;

export default function HomeScreen() {
  // ===== Theme =====
  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#000000" : "#ffffff",
    text: isDark ? "#ffffff" : "#111827",
    sub: isDark ? "#cbd5e1" : "#6b7280",
    border: isDark ? "#1f2937" : "#e5e7eb",
    chipBorder: isDark ? "#334155" : "#e5e7eb",
    chipActiveBg: "#2563eb",
    chipActiveText: "#ffffff",
    buttonBg: "#2563eb",
    buttonText: "#ffffff",
    cardBorder: isDark ? "#1f2937" : "#e5e7eb",
    cardBg: isDark ? "#0b0f14" : "#ffffff",
    danger: "#ef4444",
  };

  // ===== Auth =====
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // ===== Points =====
  const [points, setPoints] = useState<number | null>(null);
  const loadPoints = useCallback(async () => {
    if (!user) {
      setPoints(null);
      return;
    }
    const { data, error } = await supabase
      .from("user_profiles")
      .select("points")
      .eq("id", user.id)
      .single();
    if (!error && data) setPoints(data.points);
  }, [user]);

  // ===== Location (city + precise coords) =====
  const [userLocation, setUserLocation] = useState<string | null>(null); // e.g., "Boston"
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLocating(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocating(false);
          Alert.alert("Permission Denied", "Location access is needed to show nearby trends.");
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });

        const places = await Location.reverseGeocodeAsync(pos.coords);
        const best =
          places[0]?.city ||
          places[0]?.subregion ||
          places[0]?.region ||
          places[0]?.district ||
          null;
        setUserLocation(best);
      } catch (e: any) {
        console.warn("Location error:", e?.message ?? e);
      } finally {
        setLocating(false);
      }
    })();
  }, []);

  // ===== Form & list =====
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [location, setLocation] = useState("");
  const [data, setData] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState<number>(20); // default radius for nearby search

  // ===== Session boot + listener =====
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  // ===== Fetch trends (unified: prefer radius RPC if coords exist; else city filter) =====
  const fetchUnifiedTrends = useCallback(async () => {
    setLoading(true);

    try {
      if (coords) {
        // Use radius-based RPC
        const { data, error } = await supabase.rpc("trends_within_radius", {
          in_lat: coords.lat,
          in_lng: coords.lng,
          radius_km: radiusKm,
        });
        if (error) {
          console.error("RPC read error:", error);
          // Fall back to city search if RPC fails
          throw error;
        }
        setData((data as Trend[]) ?? []);
      } else {
        // Fallback: city-based filter
        const qb = supabase
          .from("trends")
          .select("*")
          .order("created_at", { ascending: false });

        if (userLocation && userLocation.trim()) {
          qb.ilike("location", `%${userLocation}%`);
        }

        const { data, error } = await qb;
        if (error) throw error;
        setData((data as Trend[]) ?? []);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Read error", err?.message ?? "Failed to load trends");
    } finally {
      setLoading(false);
    }
  }, [coords, radiusKm, userLocation]);

  useEffect(() => {
    // initial + any time dependencies change
    fetchUnifiedTrends();
  }, [fetchUnifiedTrends]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUnifiedTrends();
    setRefreshing(false);
  }, [fetchUnifiedTrends]);

  // ===== Realtime refresh =====
  useEffect(() => {
    const channel = supabase
      .channel("trends-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "trends" }, fetchUnifiedTrends)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUnifiedTrends]);

  // ===== Auth actions =====
  const handleSignUp = useCallback(async () => {
    if (!email || !password) {
      Alert.alert("Missing info", "Enter email and password.");
      return;
    }
    setAuthBusy(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setAuthBusy(false);

    if (error) {
      Alert.alert("Signup Error", error.message);
      return;
    }

    // Optional manual profile creation (safe if DB trigger not added)
    const newUserId = data?.user?.id;
    if (newUserId) {
      await supabase.from("user_profiles").insert({ id: newUserId }).select();
    }

    Alert.alert("Success", "Check your email to confirm your account (unless confirmations are disabled).");
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      Alert.alert("Missing info", "Enter email and password.");
      return;
    }
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthBusy(false);

    if (error) {
      Alert.alert("Login failed", error.message);
      return;
    }
    Alert.alert("Welcome back!");
  }, [email, password]);

  const handleLogout = useCallback(async () => {
    setAuthBusy(true);
    await supabase.auth.signOut();
    setAuthBusy(false);
    setUser(null);
    setPoints(null);
  }, []);

  // ===== Submit trend (with lat/lng + points) =====
  const canSubmit = useMemo(
    () => !!title.trim() && !!category.trim() && !!location.trim() && !submitting,
    [title, category, location, submitting]
  );

  const handleSubmitTrend = useCallback(async () => {
    if (!user) {
      Alert.alert("Login required", "Please log in to submit a trend.");
      return;
    }
    const t = title.trim();
    const c = category.trim();
    const l = location.trim();

    setSubmitting(true);

    // Capture GPS, then geocode fallback
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch (e) {
      console.warn("Could not read GPS, falling back to geocode:", e);
      try {
        const matches = await Location.geocodeAsync(l);
        if (matches.length > 0) {
          lat = matches[0].latitude;
          lng = matches[0].longitude;
        }
      } catch (ge) {
        console.warn("Geocoding failed:", ge);
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("trends")
      .insert([{ title: t, category: c, location: l, user_id: user.id, lat, lng }])
      .select();

    if (insertError) {
      setSubmitting(false);
      Alert.alert("Submission failed", insertError.message);
      return;
    }

    // Points RPC
    const { data: newPoints, error: rpcErr } = await supabase.rpc("increment_points", {
      user_id_input: user.id,
      amount: 10,
    });
    if (rpcErr) {
      console.warn("Points RPC error:", rpcErr.message);
      // Fallback refresh if RPC returns void:
      await loadPoints();
    } else if (typeof newPoints === "number") {
      setPoints(newPoints);
    } else {
      await loadPoints();
    }

    // Optimistic prepend
    if (inserted?.length) setData((prev) => [inserted[0] as Trend, ...prev]);

    setTitle("");
    setCategory("");
    setLocation("");
    setSubmitting(false);
    Alert.alert("Success", "Trend submitted and points awarded!");

    // Re-fetch using current mode (radius or city)
    fetchUnifiedTrends();
  }, [title, category, location, user, loadPoints, fetchUnifiedTrends]);

  // ===== Client-side search & category filter =====
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchQ = (t: Trend) =>
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q);
    const matchCat = (t: Trend) => !category || t.category === category;
    return data.filter((t) => matchQ(t) && matchCat(t));
  }, [data, query, category]);

  // ===== UI =====
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator />
        <Text style={{ color: colors.text, marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Text style={[styles.h1, { color: colors.text }]}>Locova Trends 🌍</Text>

      {/* Location banner + radius control */}
      {locating ? (
        <Text style={{ color: colors.sub, marginBottom: 8 }}>📍 Detecting your location…</Text>
      ) : userLocation ? (
        <View style={{ gap: 8, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: colors.text }}>
              📍 Showing trends near <Text style={{ fontWeight: "700" }}>{userLocation}</Text>
            </Text>
            <Pressable
              onPress={async () => {
                try {
                  setLocating(true);
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== "granted") return;
                  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                  setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  const places = await Location.reverseGeocodeAsync(pos.coords);
                  const best =
                    places[0]?.city ||
                    places[0]?.subregion ||
                    places[0]?.region ||
                    places[0]?.district ||
                    null;
                  setUserLocation(best);
                } finally {
                  setLocating(false);
                }
              }}
              style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ color: colors.text }}>Use GPS again</Text>
            </Pressable>
          </View>

          {/* Radius input (only useful when coords exist) */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: colors.sub }}>Radius (km):</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, width: 140, marginBottom: 0 }]}
              keyboardType="numeric"
              placeholder="e.g., 20"
              placeholderTextColor={colors.sub}
              value={String(radiusKm)}
              onChangeText={(v) => {
                const n = Number(v);
                if (!isNaN(n)) setRadiusKm(n);
              }}
            />
          </View>
        </View>
      ) : (
        <Text style={{ color: colors.sub, marginBottom: 8 }}>
          📍 Location off. Turn it on to see nearby trends (or type a city in the filter/search).
        </Text>
      )}

      {/* AUTH BOX */}
      <View style={[styles.authBox, { borderColor: colors.border }]}>
        {!user ? (
          <>
            <Text style={[styles.h2, { color: colors.text }]}>Login or Sign Up</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Email"
              placeholderTextColor={colors.sub}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Password"
              placeholderTextColor={colors.sub}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <View style={styles.row}>
              <Pressable
                disabled={authBusy}
                onPress={handleSignUp}
                style={[styles.button, { backgroundColor: colors.buttonBg, opacity: authBusy ? 0.7 : 1 }]}
              >
                <Text style={[styles.buttonText, { color: colors.buttonText }]}>{authBusy ? "…" : "Sign Up"}</Text>
              </Pressable>
              <Pressable
                disabled={authBusy}
                onPress={handleLogin}
                style={[styles.button, { backgroundColor: colors.buttonBg, opacity: authBusy ? 0.7 : 1 }]}
              >
                <Text style={[styles.buttonText, { color: colors.buttonText }]}>{authBusy ? "…" : "Login"}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.rowBetween}>
            <View>
              <Text style={{ color: colors.text }}>Welcome, {user.email}</Text>
              {points !== null && <Text style={{ color: colors.text, marginTop: 4 }}>🏆 Your Points: {points}</Text>}
            </View>
            <Pressable
              disabled={authBusy}
              onPress={handleLogout}
              style={[styles.button, { backgroundColor: colors.danger, opacity: authBusy ? 0.7 : 1 }]}
            >
              <Text style={[styles.buttonText, { color: "#ffffff" }]}>Logout</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Search */}
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Search (title/category/location)…"
        placeholderTextColor={colors.sub}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        returnKeyType="search"
      />

      {/* Category chips */}
      <View style={styles.chipsRow}>
        {CATS.map((c) => {
          const active = category === c;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(active ? "" : c)}
              style={[
                styles.chip,
                {
                  borderColor: active ? colors.chipActiveBg : colors.chipBorder,
                  backgroundColor: active ? colors.chipActiveBg : "transparent",
                },
              ]}
            >
              <Text style={{ color: active ? colors.chipActiveText : colors.text, fontWeight: "600" }}>{c}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Submit form */}
      <Text style={[styles.h2, { color: colors.text }]}>Submit a New Trend</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Title"
        placeholderTextColor={colors.sub}
        value={title}
        onChangeText={setTitle}
        autoCapitalize="words"
      />
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Category (Food, Event, Place…)"
        placeholderTextColor={colors.sub}
        value={category}
        onChangeText={setCategory}
        autoCapitalize="words"
      />
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Location (city, e.g., Boston)"
        placeholderTextColor={colors.sub}
        value={location}
        onChangeText={setLocation}
        autoCapitalize="words"
      />
      <Pressable
        onPress={handleSubmitTrend}
        disabled={!canSubmit}
        style={[
          styles.button,
          { backgroundColor: colors.buttonBg, alignSelf: "flex-start", opacity: canSubmit ? 1 : 0.6 },
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.buttonText }]}>{submitting ? "Submitting…" : "Submit Trend"}</Text>
      </Pressable>

      {/* List */}
      {filtered.length === 0 ? (
        <Text style={{ color: colors.sub, marginTop: 12 }}>No trends yet.</Text>
      ) : (
        <FlatList
          style={{ marginTop: 16 }}
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={{ color: colors.sub }}>
                {item.category} • {item.location}
              </Text>
              <Text style={{ color: colors.sub, marginTop: 4, fontSize: 12 }}>
                {typeof item.distance_km === "number"
                  ? `${item.distance_km.toFixed(1)} km away`
                  : new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  h2: { fontSize: 18, fontWeight: "700", marginVertical: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
  button: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  buttonText: { fontWeight: "700" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  card: { padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  authBox: { padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 16 },
  row: { flexDirection: "row", gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
