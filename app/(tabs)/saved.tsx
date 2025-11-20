import { Ionicons } from '@expo/vector-icons';
import { Session } from "@supabase/supabase-js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";
import { fetchSavedTrends, toggleTrendSave } from "../../services/trends";
import { Trend } from "../../type";

const colors = {
  bg: "#F0F9FA",           // Light aqua background
  cardBg: "#FFFFFF",       // White cards
  text: "#1A3B3F",         // Deep teal text
  sub: "#5A7B7E",          // Muted teal
  border: "#D4E8EA",       // Soft aqua border
  neonCyan: "#6ECFD9",     // Bright aqua
  primary: "#FF6B7A",      // Rose red
  violet: "#9B8FFF",       // Soft purple
};

export default function SavedTrendsScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedTrends, setSavedTrends] = useState<Trend[]>([]);

  const userId = session?.user?.id ?? null;

  const loadSavedTrends = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!userId) {
        setSavedTrends([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const silent = options?.silent ?? false;

      try {
        if (!silent) {
          setLoading(true);
        }
        const data = await fetchSavedTrends(userId);
        setSavedTrends(data);
      } catch (error) {
        console.error("fetchSavedTrends error:", error);
        Alert.alert("Error", "Failed to load saved trends");
      } finally {
        if (!silent) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session ?? null);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession ?? null);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadSavedTrends();
  }, [loadSavedTrends]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadSavedTrends({ silent: true });
  }, [loadSavedTrends]);

  const handleToggleSave = useCallback(
    async (trendId: string) => {
      if (!userId) {
        Alert.alert("Log in", "You need an account to manage saved trends.");
        return;
      }

      try {
        await toggleTrendSave(trendId, userId);
        await loadSavedTrends({ silent: true });
      } catch (error: any) {
        console.error("toggleTrendSave error:", error);
        Alert.alert("Error", error?.message ?? "Failed to update save");
      }
    },
    [userId, loadSavedTrends]
  );

  const emptyState = useMemo(() => {
    if (!userId) {
      return "Log in to start bookmarking your favorite trends.";
    }
    return "No saved trends yet. Tap the Save button on any trend to bookmark it.";
  }, [userId]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.neonCyan} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="bookmark" size={28} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Saved Trends</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          {userId && <Ionicons name="checkmark-circle" size={14} color={colors.neonCyan} />}
          <Text style={{ color: colors.sub, fontSize: 13 }}>
            {userId ? `${savedTrends.length} saved` : "Sign in to sync your saves"}
          </Text>
        </View>
      </View>

      <FlatList
        data={savedTrends}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.neonCyan} />}
        contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={64} color={colors.border} style={{ marginBottom: 16 }} />
            <Text style={{ color: colors.sub, textAlign: "center", fontSize: 15 }}>{emptyState}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primary + "15", borderRadius: 12, borderWidth: 0 }}>
                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }}>{item.category.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Ionicons name="location-sharp" size={14} color={colors.neonCyan} />
              <Text style={{ color: colors.sub, fontSize: 13 }}>{item.location}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Ionicons name="time-outline" size={14} color={colors.sub} />
              <Text style={{ color: colors.sub, fontSize: 12 }}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>

            <Pressable
              onPress={() => handleToggleSave(item.id)}
              style={[styles.saveButton, { borderColor: colors.primary, backgroundColor: colors.primary + "15" }]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="trash-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: "600" }}>Remove</Text>
              </View>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    borderWidth: 0,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#1A3B3F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  saveButton: {
    marginTop: 12,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
});
