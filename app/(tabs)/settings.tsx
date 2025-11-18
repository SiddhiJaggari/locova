import { Session } from "@supabase/supabase-js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const colors = {
  bg: "#050816",
  cardBg: "#0b1120",
  text: "#f9fafb",
  sub: "#9ca3af",
  border: "#1f2937",
  buttonBg: "#2563eb",
  danger: "#ef4444",
};

const PRIVACY_URL = "https://example.com/privacy";
const TERMS_URL = "https://example.com/terms";

export default function SettingsScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const userEmail = useMemo(() => session?.user?.email ?? "Not signed in", [session]);

  const handleLogout = useCallback(async () => {
    try {
      setLogoutLoading(true);
      await supabase.auth.signOut();
      Alert.alert("Signed out", "You have been logged out.");
    } catch (error: any) {
      console.error("logout error", error);
      Alert.alert("Error", error?.message ?? "Failed to log out");
    } finally {
      setLogoutLoading(false);
    }
  }, []);

  const invokeDeleteFunction = useCallback(async () => {
    try {
      setDeleteLoading(true);
      const { data, error } = await supabase.functions.invoke("delete_user", {
        body: {},
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error ?? "Unknown error deleting account");
      }

      Alert.alert("Account deleted", "Your profile and data have been removed.");
    } catch (error: any) {
      console.error("delete user error", error);
      Alert.alert(
        "Deletion failed",
        error?.message ??
          "We couldn't delete your account. Please ensure the delete_user Edge Function is deployed with a service role key."
      );
    } finally {
      setDeleteLoading(false);
    }
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete account?",
      "This removes your trend history, comments, and points permanently.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: deleteLoading ? "Deleting..." : "Delete",
          style: "destructive",
          onPress: () => {
            if (!deleteLoading) {
              invokeDeleteFunction();
            }
          },
        },
      ]
    );
  }, [deleteLoading, invokeDeleteFunction]);

  const openLink = useCallback(async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Unable to open", "Please visit: " + url);
    }
  }, []);

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.buttonBg} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.title, { color: colors.text }]}>⚙️ Settings</Text>
      <Text style={{ color: colors.sub, marginBottom: 20 }}>Manage your Locova account & preferences</Text>

      <View style={[styles.card, { borderColor: colors.border }]}> 
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={{ color: colors.sub, marginBottom: 16 }}>{userEmail}</Text>

        <View style={styles.rowBetween}> 
          <Text style={{ color: colors.text, fontWeight: "600" }}>Push Notifications</Text>
          <Switch
            value={notifEnabled}
            onValueChange={setNotifEnabled}
            thumbColor={notifEnabled ? colors.buttonBg : colors.border}
            trackColor={{ true: "#60a5fa", false: colors.border }}
          />
        </View>
        <Text style={{ color: colors.sub, fontSize: 12, marginBottom: 16 }}>
          Keep this on to receive featured trend alerts near you.
        </Text>

        <View style={styles.rowBetween}> 
          <Text style={{ color: colors.text, fontWeight: "600" }}>Marketing Emails</Text>
          <Switch
            value={marketingEnabled}
            onValueChange={setMarketingEnabled}
            thumbColor={marketingEnabled ? colors.buttonBg : colors.border}
            trackColor={{ true: "#60a5fa", false: colors.border }}
          />
        </View>
        <Text style={{ color: colors.sub, fontSize: 12 }}>
          Receive occasional roundups of top trends.
        </Text>
      </View>

      <View style={[styles.card, { borderColor: colors.border }]}> 
        <Text style={styles.sectionTitle}>Legal</Text>
        <Text style={{ color: colors.sub, marginBottom: 12 }}>
          Review how we collect data and keep you safe.
        </Text>
        <View style={styles.linkRow}> 
          <Text style={{ color: colors.buttonBg, fontWeight: "600" }} onPress={() => openLink(PRIVACY_URL)}>
            Privacy Policy ↗
          </Text>
        </View>
        <View style={styles.linkRow}> 
          <Text style={{ color: colors.buttonBg, fontWeight: "600" }} onPress={() => openLink(TERMS_URL)}>
            Terms of Use ↗
          </Text>
        </View>
      </View>

      <View style={[styles.card, { borderColor: colors.border }]}> 
        <Text style={[styles.sectionTitle, { color: colors.danger }]}>Danger zone</Text>
        <Text style={{ color: colors.sub, marginBottom: 16 }}>
          Logging out clears cached data. Deleting your account cannot be undone.
        </Text>

        <View style={styles.rowBetween}> 
          <Text style={{ color: colors.text, fontWeight: "600" }}>Log out</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {logoutLoading && <ActivityIndicator color={colors.buttonBg} size="small" />}
            <Text style={[styles.linkLike, { color: colors.buttonBg }]} onPress={handleLogout}>
              Sign out
            </Text>
          </View>
        </View>

        <View style={[styles.rowBetween, { marginTop: 18 }]}> 
          <Text style={{ color: colors.text, fontWeight: "600" }}>Delete account</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {deleteLoading && <ActivityIndicator color={colors.danger} size="small" />}
            <Text style={[styles.linkLike, { color: colors.danger }]} onPress={handleDeleteAccount}>
              Delete
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    backgroundColor: colors.cardBg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  linkLike: {
    fontWeight: "700",
  },
});
