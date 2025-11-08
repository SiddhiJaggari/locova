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

type Trend = { id: string; title: string; category: string; location: string; created_at: string };

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
    danger: "#ef4444",
  };

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [location, setLocation] = useState("");

  // List & UI state
  const [data, setData] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");

  // Fetch trends from Supabase
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

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrends();
    setRefreshing(false);
  }, [fetchTrends]);

  // Realtime subscription: auto refresh on any change
  useEffect(() => {
    const channel = supabase
      .channel("trends-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "trends" }, () => {
        // lightweight approach: re-fetch full list
        fetchTrends();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTrends]);

  // Submit handler with validation + optimistic update
  const handleSubmitTrend = useCallback(async () => {
    const t = title.trim();
    const c = category.trim();
    const l = location.trim();
    if (!t || !c || !l) {
      Alert.alert("Missing info", "Please fill title, category, and location.");
      return;
    }
    setSubmitting(true);
    const { data: inserted, error } = await supabase
      .from("trends")
      .insert([{ title: t, category: c, location: l }])
      .select();

    setSubmitting(false);

    if (error) {
      console.error("Insert error:", error);
      Alert.alert("Submission Failed", error.message);
      return;
    }

    // Optimistic UI: prepend the new row(s)
    if (inserted && inserted.length > 0) {
      setData((prev) => [...inserted, ...prev]);
    }
    setTitle("");
    setCategory("");
    setLocation("");
    Alert.alert("Success", "Trend submitted!");
  }, [title, category, location]);

  // Disable button until all fields present & not submitting
  const canSubmit = useMemo(() => {
    return !!title.trim() && !!category.trim() && !!location.trim() && !submitting;
  }, [title, category, location, submitting]);

  // Client-side search/filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data;
    const matchesQuery = (t: Trend) =>
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q);

    const matchesCategory = (t: Trend) => !category || t.category === category;

    // Note: here we use `category` state both for the form and as a filter if you tap a chip.
    // If you prefer separate filter vs form category, split them into two states.
    return list.filter((t) => matchesQuery(t) && matchesCategory(t));
  }, [data, query, category]);

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

      {/* Category chips (tap to set category quickly) */}
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
              <Text
                style={{
                  color: active ? colors.chipActiveText : colors.text,
                  fontWeight: "600",
                }}
              >
                {c}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Form */}
      <Text style={[styles.formLabel, { color: colors.text }]}>Submit a New Trend</Text>

      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Title"
        placeholderTextColor={colors.sub}
        value={title}
        onChangeText={setTitle}
        autoCapitalize="words"
        returnKeyType="next"
      />
      {/* You can keep the category chips or allow free text too */}
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Category (Food, Event, Place…)"
        placeholderTextColor={colors.sub}
        value={category}
        onChangeText={setCategory}
        autoCapitalize="words"
        returnKeyType="next"
      />
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Location (e.g., Boston)"
        placeholderTextColor={colors.sub}
        value={location}
        onChangeText={setLocation}
        autoCapitalize="words"
        returnKeyType="done"
      />

      <Pressable
        onPress={handleSubmitTrend}
        disabled={!canSubmit}
        style={[
          styles.button,
          { backgroundColor: colors.buttonBg, opacity: canSubmit ? 1 : 0.6 },
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.buttonText }]}>
          {submitting ? "Submitting…" : "Submit Trend"}
        </Text>
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
            <View style={[styles.card, { borderColor: colors.cardBorder }]}>
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
  formLabel: { fontSize: 18, fontWeight: "bold", marginBottom: 8, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
  button: { alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  buttonText: { fontWeight: "700" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  card: { padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
});
