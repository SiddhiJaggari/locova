// app/(tabs)/index.tsx
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
};

const CATS = ["Food", "Event", "Place"] as const;

export default function HomeScreen() {
  // Theme tokens
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

  // ===== Auth state =====
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // ===== Points (Day 5) =====
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

  // ===== Form & list state =====
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [location, setLocation] = useState("");
  const [data, setData] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");

  // ===== Session boot + listener =====
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // whenever user changes, refresh their points
    loadPoints();
  }, [loadPoints]);

  // ===== Fetch trends =====
  const fetchTrends = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trends")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      Alert.alert("Read error", error.message);
    } else {
      setData(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrends();
    setRefreshing(false);
  }, [fetchTrends]);

  // ===== Realtime auto-refresh =====
  useEffect(() => {
    const channel = supabase
      .channel("trends-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "trends" }, fetchTrends)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTrends]);

  // ===== AUTH actions =====
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

    // Optional (safe) manual profile creation if you didn't add the DB trigger
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

  // ===== Submit trend (with points award via RPC) =====
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
    const { data: inserted, error: insertError } = await supabase
      .from("trends")
      .insert([{ title: t, category: c, location: l, user_id: user.id }])
      .select();

    if (insertError) {
      setSubmitting(false);
      Alert.alert("Submission failed", insertError.message);
      return;
    }

    // Award +10 points using RPC
    const { error: rpcErr } = await supabase.rpc("increment_points", {
      user_id_input: user.id,
      amount: 10, // optional; defaults to 10 if omitted
    });
    setSubmitting(false);

    if (rpcErr) {
      console.error("Error awarding points:", rpcErr.message);
      // We don't block success UI if points failed—just log it.
    }

    // Optimistic UI: prepend new item
    if (inserted?.length) setData((prev) => [inserted[0] as Trend, ...prev]);

    // Refresh points display
    loadPoints();

    setTitle("");
    setCategory("");
    setLocation("");
    Alert.alert("Success", "Trend submitted and points awarded!");
  }, [title, category, location, user, loadPoints]);

  // ===== Client-side search/filter =====
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
              {points !== null && (
                <Text style={{ color: colors.text, marginTop: 4 }}>🏆 Your Points: {points}</Text>
              )}
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

      {/* SEARCH */}
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Search (title/category/location)…"
        placeholderTextColor={colors.sub}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        returnKeyType="search"
      />

      {/* CATEGORY CHIPS */}
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
              <Text style={{ color: active ? colors.chipActiveText : colors.text, fontWeight: "600" }}>
                {c}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* SUBMIT FORM */}
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
        placeholder="Location (e.g., Boston)"
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
        <Text style={[styles.buttonText, { color: colors.buttonText }]}>
          {submitting ? "Submitting…" : "Submit Trend"}
        </Text>
      </Pressable>

      {/* LIST */}
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
                {new Date(item.created_at).toLocaleString()}
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
