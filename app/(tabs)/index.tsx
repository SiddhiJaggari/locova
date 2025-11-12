// app/(tabs)/index.tsx
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from "react-native";
import AuthBox from "../../components/AuthBox";
import Leaderboard from "../../components/Leaderboard";
import TrendForm from "../../components/TrendForm";
import TrendList from "../../components/TrendList";
import { useLocation } from "../../hooks/useLocation";
import { supabase } from "../../lib/supabase";
import { loadLeaderboard } from "../../services/leaderboard";
import { awardPoints } from "../../services/points";
import { fetchTrendsUnified, subscribeTrends } from "../../services/trends";
import { LeaderRow, Trend } from "../../types";

export default function HomeScreen() {
  // ===== Theme =====
  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#000000" : "#ffffff",
    text: isDark ? "#ffffff" : "#111827",
    sub: isDark ? "#cbd5e1" : "#6b7280",
    border: isDark ? "#1f2937" : "#e5e7eb",
    buttonBg: "#2563eb",
    buttonText: "#ffffff",
  };

  // ===== Auth =====
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // ===== Points & Leaderboard =====
  const [points, setPoints] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  const loadPoints = useCallback(async () => {
    if (!user) {
      setPoints(null);
      return;
    }
    const { data, error } = await supabase.from("user_profiles").select("points").eq("id", user.id).single();
    if (!error && data) setPoints(data.points);
  }, [user]);

  const refreshLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const rows = await loadLeaderboard(10);
      setLeaderboard(rows);
    } catch (e: any) {
      console.error("Leaderboard error:", e?.message ?? e);
    } finally {
      setLbLoading(false);
    }
  }, []);

  // ===== Location / Radius & Trends =====
  const { locating, coords, city, setCity, refreshLocation } = useLocation();
  const [radiusKm, setRadiusKm] = useState<number>(20);
  const [data, setData] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");

  const fetchUnified = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchTrendsUnified(coords, radiusKm, city);
      setData(rows);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Read error", e?.message ?? "Failed to load trends");
    } finally {
      setLoading(false);
    }
  }, [coords, radiusKm, city]);

  useEffect(() => {
    // Session boot + listener
    (async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard, user]);

  useEffect(() => {
    fetchUnified();
  }, [fetchUnified]);

  useEffect(() => {
    const unsub = subscribeTrends(fetchUnified);
    return unsub;
  }, [fetchUnified]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUnified();
    setRefreshing(false);
  }, [fetchUnified]);

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

  // ===== Submit trend =====
  const [title, setTitle] = useState("");
  const [trendCategory, setTrendCategory] = useState<string>("");
  const [trendLocation, setTrendLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => !!title.trim() && !!trendCategory.trim() && !!trendLocation.trim() && !submitting,
    [title, trendCategory, trendLocation, submitting]
  );

  const handleSubmitTrend = useCallback(async () => {
    if (!user) {
      Alert.alert("Login required", "Please log in to submit a trend.");
      return;
    }

    const t = title.trim();
    const c = trendCategory.trim();
    const l = trendLocation.trim();

    setSubmitting(true);

    // Capture GPS, then geocode fallback
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      try {
        const matches = await Location.geocodeAsync(l);
        if (matches.length > 0) {
          lat = matches[0].latitude;
          lng = matches[0].longitude;
        }
      } catch {}
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

    // Points
    try {
      const newTotal = await awardPoints(user.id, 10);
      if (typeof newTotal === "number") setPoints(newTotal);
      else await loadPoints();
    } catch (e: any) {
      console.warn("Points RPC error:", e?.message ?? e);
      await loadPoints();
    }

    await refreshLeaderboard();

    if (inserted?.length) setData((prev) => [inserted[0] as Trend, ...prev]);
    setTitle("");
    setTrendCategory("");
    setTrendLocation("");
    setSubmitting(false);
    Alert.alert("Success", "Trend submitted and points awarded!");
    fetchUnified();
  }, [user, title, trendCategory, trendLocation, loadPoints, refreshLeaderboard, fetchUnified]);

  // ===== Client-side filter =====
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

      {/* Location banner & controls */}
      {locating ? (
        <Text style={{ color: colors.sub, marginBottom: 8 }}>📍 Detecting your location…</Text>
      ) : city ? (
        <View style={{ gap: 8, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: colors.text }}>
              📍 Showing trends near <Text style={{ fontWeight: "700" }}>{city}</Text>
            </Text>
            <Pressable
              onPress={refreshLocation}
              style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ color: colors.text }}>Use GPS again</Text>
            </Pressable>
          </View>

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

      {/* Auth */}
      <AuthBox
        colors={colors}
        user={user}
        email={email}
        password={password}
        points={points}
        authBusy={authBusy}
        onChangeEmail={setEmail}
        onChangePassword={setPassword}
        onSignUp={handleSignUp}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Submit form */}
      <TrendForm
        colors={colors}
        title={title}
        category={trendCategory}
        location={trendLocation}
        onChangeTitle={setTitle}
        onChangeCategory={setTrendCategory}
        onChangeLocation={setTrendLocation}
        onSubmit={handleSubmitTrend}
        canSubmit={canSubmit}
        submitting={submitting}
      />

      {/* Trends list (search, chips, list) */}
      <TrendList
        colors={colors}
        data={filtered}
        query={query}
        onChangeQuery={setQuery}
        category={category}
        onChangeCategory={setCategory}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* Leaderboard */}
      <Leaderboard colors={colors} userId={user?.id ?? null} data={leaderboard} loading={lbLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
});
