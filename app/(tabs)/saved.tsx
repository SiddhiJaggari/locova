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
  bg: "#050816",
  cardBg: "#0b1120",
  text: "#f9fafb",
  sub: "#9ca3af",
  border: "#1f2937",
  buttonBg: "#2563eb",
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
    return "No saved trends yet. Tap the 📍 Save button to store favorites.";
  }, [userId]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.buttonBg} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>📌 Saved Trends</Text>
        <Text style={{ color: colors.sub }}>
          {userId ? `${savedTrends.length} saved` : "Sign in to sync your saves"}
        </Text>
      </View>

      <FlatList
        data={savedTrends}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.buttonBg} />}
        contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ color: colors.sub, textAlign: "center" }}>{emptyState}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={{ color: colors.sub }}>{item.category} • {item.location}</Text>
            <Text style={{ color: colors.sub, fontSize: 12, marginTop: 4 }}>
              {new Date(item.created_at).toLocaleString()}
            </Text>

            <Pressable
              onPress={() => handleToggleSave(item.id)}
              style={[styles.saveButton, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text, fontWeight: "600" }}>Remove</Text>
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
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  saveButton: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
  },
});
