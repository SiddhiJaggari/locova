// components/Leaderboard.tsx
import React from "react";
import { FlatList, Image, Text, View } from "react-native";
import { LeaderboardRow } from "../type";

type Props = {
  colors: any;
  userId?: string | null;
  data: LeaderboardRow[];
  loading: boolean;
  userProfile?: { points: number; display_name?: string | null; avatar_url?: string | null } | null;
};

export default function Leaderboard({ colors, userId, data, loading, userProfile }: Props) {
  // Check if user is in top 10
  const userInTop10 = userId && data.some((item) => item.id === userId);
  
  // Calculate user's rank if not in top 10
  let userRank: number | null = null;
  if (userId && !userInTop10 && userProfile) {
    // Count how many users have more points
    // Note: This is approximate; for exact rank, you'd need a separate RPC
    userRank = data.filter((item) => item.points > userProfile.points).length + 1;
  }

  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 8 }}>🏆 Leaderboard</Text>
      {loading ? (
        <Text style={{ color: colors.sub, marginBottom: 8 }}>Loading leaderboard…</Text>
      ) : data.length === 0 ? (
        <Text style={{ color: colors.sub, marginBottom: 8 }}>No rankings yet.</Text>
      ) : (
        <>
          <FlatList
            style={{ marginTop: 8 }}
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const isYou = userId && userId === item.id;
              const name = item.display_name ?? "Anonymous";
              const avatarUri = item.avatar_url ? item.avatar_url + "?v=" + Date.now() : null;
              
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
                  
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.border,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: colors.sub, fontSize: 12 }}>👤</Text>
                    </View>
                  )}
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "600" }}>
                      {name}{isYou ? " (You)" : ""}
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>{item.points} pts</Text>
                </View>
              );
            }}
          />
          
          {/* Your Rank section if not in top 10 */}
          {!userInTop10 && userId && userProfile && (
            <View
              style={{
                marginTop: 16,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                backgroundColor: "#0ea5e922",
              }}
            >
              <Text style={{ color: colors.sub, fontSize: 12, marginBottom: 4 }}>Your Rank</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ color: colors.text, fontWeight: "800", width: 28, textAlign: "right" }}>#{userRank || "?"}</Text>
                
                {userProfile.avatar_url ? (
                  <Image
                    source={{ uri: userProfile.avatar_url + "?v=" + Date.now() }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.border,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: colors.sub, fontSize: 12 }}>👤</Text>
                  </View>
                )}
                
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    {userProfile.display_name || "You"}
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: "700" }}>{userProfile.points} pts</Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}
