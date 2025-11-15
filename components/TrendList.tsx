// components/TrendList.tsx
import React from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { Trend } from "../type";

type Props = {
  colors: any;
  data: Trend[];
  query: string;
  onChangeQuery: (v: string) => void;
  category: string;
  onChangeCategory: (v: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
};

const CATS = ["Food", "Event", "Place"] as const;

export default function TrendList({
  colors,
  data,
  query,
  onChangeQuery,
  category,
  onChangeCategory,
  refreshing,
  onRefresh,
}: Props) {
  return (
    <View style={{ marginTop: 12 }}>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Search (title/category/location)…"
        placeholderTextColor={colors.sub}
        value={query}
        onChangeText={onChangeQuery}
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
              onPress={() => onChangeCategory(active ? "" : c)}
              style={[
                styles.chip,
                {
                  borderColor: active ? "#2563eb" : colors.border,
                  backgroundColor: active ? "#2563eb" : "transparent",
                },
              ]}
            >
              <Text style={{ color: active ? "#ffffff" : colors.text, fontWeight: "600" }}>{c}</Text>
            </Pressable>
          );
        })}
      </View>

      {data.length === 0 ? (
        <Text style={{ color: colors.sub, marginTop: 12 }}>No trends yet.</Text>
      ) : (
        <FlatList
          style={{ marginTop: 16 }}
          data={data}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: "transparent" }]}>
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
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  card: { padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
});
