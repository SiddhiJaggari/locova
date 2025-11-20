import { Ionicons } from '@expo/vector-icons';
import { Session } from "@supabase/supabase-js";
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View
} from "react-native";

import { supabase } from "../../lib/supabase";

const colors = {
  bg: "#F0F9FA",
  cardBg: "#FFFFFF",
  text: "#1A3B3F",
  sub: "#5A7B7E",
  border: "#D4E8EA",
  primary: "#FF6B7A",
  secondary: "#6ECFD9",
  success: "#5DD9A8",
  danger: "#FF6B7A",
  darkBg: "#1A2332",
  darkCard: "#242D3F",
};

const PRIVACY_URL = "https://example.com/privacy";
const TERMS_URL = "https://example.com/terms";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function SettingsScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      
      if (data.session?.user) {
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", data.session.user.id)
          .single();
        
        if (profileData && mounted) {
          setProfile(profileData);
          setDisplayName(profileData.display_name || "");
          setAvatarUrl(profileData.avatar_url);
        }
      }
      
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

  const handlePickAvatar = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Failed to pick image");
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Camera access is required to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Failed to take photo");
    }
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setSaveLoading(true);
      let finalAvatarUrl = avatarUrl;

      // If avatar is a local file, upload it first
      if (avatarUrl && (avatarUrl.startsWith('file://') || avatarUrl.startsWith('content://'))) {
        try {
          // Create unique filename
          const fileExt = avatarUrl.split('.').pop() || 'jpg';
          const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;

          // Read file as base64 using FileSystem
          const base64 = await FileSystem.readAsStringAsync(avatarUrl, {
            encoding: 'base64',
          });

          // Convert base64 to binary
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, bytes.buffer, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

          finalAvatarUrl = urlData.publicUrl;
        } catch (uploadErr: any) {
          console.error('Avatar upload failed:', uploadErr);
          Alert.alert('Upload Failed', uploadErr?.message || 'Could not upload avatar');
          finalAvatarUrl = profile?.avatar_url || null;
        }
      }

      // Update profile in database
      console.log('Updating profile for user:', session.user.id);
      console.log('Display name:', displayName);
      console.log('Avatar URL:', finalAvatarUrl);
      
      const { data: updateData, error } = await supabase
        .from("user_profiles")
        .update({
          display_name: displayName || null,
          avatar_url: finalAvatarUrl,
        })
        .eq("id", session.user.id)
        .select();

      console.log('Update result:', updateData);
      console.log('Update error:', error);

      if (error) {
        console.error('Profile update error:', error);
        Alert.alert("Error", `Failed to update: ${error.message}`);
        throw error;
      }

      if (!updateData || updateData.length === 0) {
        console.warn('No rows updated - profile might not exist');
        Alert.alert("Warning", "Profile not found. Creating new profile...");
        
        // Try to insert instead
        const { error: insertError } = await supabase
          .from("user_profiles")
          .insert({
            id: session.user.id,
            display_name: displayName || null,
            avatar_url: finalAvatarUrl,
            points: 0,
          });
        
        if (insertError) {
          console.error('Profile insert error:', insertError);
          throw insertError;
        }
      }

      Alert.alert("Success", "Profile updated successfully!");
      
      // Refresh profile
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.display_name || "");
        setAvatarUrl(profileData.avatar_url);
      }
    } catch (error: any) {
      console.error('Save profile error:', error);
      Alert.alert("Error", error?.message ?? "Failed to save profile");
    } finally {
      setSaveLoading(false);
    }
  }, [session, displayName, avatarUrl, profile]);

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
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="settings" size={32} color={colors.text} />
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </View>
        <Text style={{ color: colors.sub, marginTop: 4 }}>Manage your Locova account & preferences</Text>
      </View>

      {session?.user && (
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Ionicons name="person" size={22} color={colors.text} />
            <Text style={styles.sectionTitle}>Your Profile</Text>
          </View>

          <View style={{ alignItems: "center", marginBottom: 20 }}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl + "?v=" + Date.now() }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.border, alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="person" size={48} color={colors.sub} />
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            <Pressable
              onPress={handlePickAvatar}
              style={[styles.profileButton, { flex: 1, backgroundColor: colors.cardBg, borderWidth: 1.5, borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>Pick Avatar</Text>
            </Pressable>
            <Pressable
              onPress={handleTakePhoto}
              style={[styles.profileButton, { flex: 1, backgroundColor: colors.cardBg, borderWidth: 1.5, borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>Take Photo</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Display Name"
            placeholderTextColor={colors.sub}
            value={displayName}
            onChangeText={setDisplayName}
          />

          <Pressable
            onPress={handleSaveProfile}
            disabled={saveLoading}
            style={[styles.saveButton, { opacity: saveLoading ? 0.7 : 1 }]}
          >
            {saveLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>Save Profile</Text>
            )}
          </Pressable>
        </View>
      )}

      <View style={styles.card}> 
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={{ color: colors.sub, marginBottom: 16 }}>{userEmail}</Text>

        <View style={styles.rowBetween}> 
          <Text style={{ color: colors.text, fontWeight: "600" }}>Push Notifications</Text>
          <Switch
            value={notifEnabled}
            onValueChange={setNotifEnabled}
            thumbColor={notifEnabled ? colors.secondary : colors.border}
            trackColor={{ true: colors.secondary, false: colors.border }}
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
            thumbColor={marketingEnabled ? colors.secondary : colors.border}
            trackColor={{ true: colors.secondary, false: colors.border }}
          />
        </View>
        <Text style={{ color: colors.sub, fontSize: 12 }}>
          Receive occasional roundups of top trends.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <Text style={{ color: colors.sub, marginBottom: 12 }}>
          Review how we collect data and keep you safe.
        </Text>
        <Pressable onPress={() => openLink(PRIVACY_URL)} style={{ paddingVertical: 12 }}>
          <Text style={{ color: colors.secondary, fontWeight: "600" }}>
            Privacy Policy ↗
          </Text>
        </Pressable>
        <Pressable onPress={() => openLink(TERMS_URL)} style={{ paddingVertical: 12 }}>
          <Text style={{ color: colors.secondary, fontWeight: "600" }}>
            Terms of Use ↗
          </Text>
        </Pressable>
      </View>

      <View style={[styles.dangerCard, { backgroundColor: colors.darkCard }]}>
        <Text style={[styles.sectionTitle, { color: colors.danger }]}>Danger zone</Text>
        <Text style={{ color: "#9CA3AF", marginBottom: 16 }}>
          Logging out clears cached data. Deleting your account cannot be undone.
        </Text>

        <View style={styles.rowBetween}> 
          <Text style={{ color: "#F9FAFB", fontWeight: "600" }}>Log out</Text>
          <Pressable onPress={handleLogout} disabled={logoutLoading}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {logoutLoading && <ActivityIndicator color={colors.secondary} size="small" />}
              <Text style={{ color: colors.secondary, fontWeight: "700" }}>
                Sign out
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={[styles.rowBetween, { marginTop: 18 }]}> 
          <Text style={{ color: "#F9FAFB", fontWeight: "600" }}>Delete account</Text>
          <Pressable onPress={handleDeleteAccount} disabled={deleteLoading}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {deleteLoading && <ActivityIndicator color={colors.danger} size="small" />}
              <Text style={{ color: colors.danger, fontWeight: "700" }}>
                Delete
              </Text>
            </View>
          </Pressable>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  card: {
    borderWidth: 0,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    backgroundColor: colors.cardBg,
    shadowColor: "#1A3B3F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  dangerCard: {
    borderWidth: 0,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: "#F5FAFB",
    color: colors.text,
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
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
