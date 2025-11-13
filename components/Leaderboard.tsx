// components/Leaderboard.tsx
import React from "react";
import { FlatList, Text, View } from "react-native";
import { LeaderboardRow } from "../type";

type Props = {
  colors: any;
  userId?: string | null;
  data: LeaderboardRow[];
  loading: boolean;
};

export default function Leaderboard({ colors, userId, data, loading }: Props) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 8 }}>🏆 Leaderboard</Text>
      {loading ? (
        <Text style={{ color: colors.sub, marginBottom: 8 }}>Loading leaderboard…</Text>
      ) : data.length === 0 ? (
        <Text style={{ color: colors.sub, marginBottom: 8 }}>No rankings yet.</Text>
      ) : (
        <FlatList
          style={{ marginTop: 8 }}
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const isYou = userId && userId === item.id;
            const name = item.display_name ?? "Anonymous";
            return (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  backgroundColor: isYou ? "#0ea5e922" : "transparent",
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "800", width: 28, textAlign: "right" }}>
                  #{index + 1}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>{name}</Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: "700" }}>{item.points} pts</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
