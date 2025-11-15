// app/(tabs)/index.tsx
import { Session } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import ProfileEditor from "../../components/ProfileEditor";
import { supabase } from "../../lib/supabase";
import {
  getMyProfile,
  // savePushTokenToProfile, // Disabled for Expo Go
  uploadAvatarPublic,
  upsertMyProfile
} from "../../services/profile";
import {
  fetchCommentEngagement,
  fetchTrendComments,
  fetchTrendEngagement,
  submitTrendComment,
  toggleCommentLike,
  toggleTrendLike
} from "../../services/trends";
import { LeaderboardRow, Trend, TrendComment, UserProfile } from "../../type";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and get the Expo push token
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Constants.appOwnership === "expo") {
    console.warn("Push notifications aren't available in Expo Go. Skipping token registration.");
    return null;
  }

  if (!Device.isDevice) {
    console.warn("Push notifications only work on physical devices");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Notification permission denied");
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log("📱 Expo Push Token:", token);
    return token;
  } catch (error) {
    console.error("Failed to get push token:", error);
    return null;
  }
}

const colors = {
  bg: "#050816",
  cardBg: "#0b1120",
  text: "#f9fafb",
  sub: "#9ca3af",
  border: "#1f2937",
  buttonBg: "#2563eb",
  buttonText: "#f9fafb",
  danger: "#ef4444",
};

type SaveProfileParams = {
  displayName: string;
  avatarUrl: string | null; // URI from ProfileEditor
};

export default function HomeScreen() {
  // Auth
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Profile
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Trends
  const [trends, setTrends] = useState<Trend[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Food");
  const [newLocationText, setNewLocationText] = useState("");

  // Location & radius
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<string>("5"); // text input

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Global loading (initial)
  const [initialLoading, setInitialLoading] = useState(true);

  // Trend engagement
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [likedTrendIds, setLikedTrendIds] = useState<string[]>([]);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [activeCommentTrendId, setActiveCommentTrendId] = useState<string | null>(null);
  const [trendComments, setTrendComments] = useState<TrendComment[]>([]);
  const [trendCommentsLoading, setTrendCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentLikeCounts, setCommentLikeCounts] = useState<Record<string, number>>({});
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);

  const currentUserId = session?.user?.id ?? null;
  const activeTrend = useMemo(
    () => trends.find((t) => t.id === activeCommentTrendId) ?? null,
    [trends, activeCommentTrendId]
  );

  const fetchEngagementSnapshot = useCallback(
    async (trendIds: string[]) => {
      if (trendIds.length === 0) {
        return {
          likeCounts: {},
          commentCounts: {},
          likedTrendIds: [],
        };
      }

      return await fetchTrendEngagement(trendIds, currentUserId ?? null);
    },
    [currentUserId]
  );

  const applyEngagementSnapshot = useCallback(async () => {
    try {
      const snapshot = await fetchEngagementSnapshot(trends.map((t) => t.id));
      setLikeCounts(snapshot.likeCounts);
      setCommentCounts(snapshot.commentCounts);
      setLikedTrendIds(snapshot.likedTrendIds);
    } catch (error) {
      console.error("fetchTrendEngagement error:", error);
    }
  }, [fetchEngagementSnapshot, trends]);

  useEffect(() => {
    let mounted = true;
    const ids = trends.map((t) => t.id);

    (async () => {
      try {
        const snapshot = await fetchEngagementSnapshot(ids);
        if (!mounted) return;
        setLikeCounts(snapshot.likeCounts);
        setCommentCounts(snapshot.commentCounts);
        setLikedTrendIds(snapshot.likedTrendIds);
      } catch (error) {
        if (!mounted) return;
        console.error("fetchTrendEngagement error:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [trends, fetchEngagementSnapshot]);

  // -----------------------
  // Auth: Session listener
  // -----------------------
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("getSession error:", error.message);
      }
      if (!isMounted) return;
      setSession(data.session ?? null);
      setAuthLoading(false);

      if (data.session?.user) {
        await Promise.all([
          loadProfile(data.session.user.id),
          loadTrends(),
          loadLeaderboard(),
        ]);
      }
      setInitialLoading(false);
    })();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        loadTrends();
        loadLeaderboard();
      } else {
        setProfile(null);
        setTrends([]);
        setLeaderboard([]);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // -----------------------
  // Loaders
  // -----------------------
  const loadProfile = useCallback(async (userId: string) => {
    try {
      setProfileLoading(true);
      const data = await getMyProfile(userId);
      setProfile(data);
    } catch (e) {
      console.error("loadProfile error:", e);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const loadTrends = useCallback(async () => {
    try {
      setTrendsLoading(true);
      const { data, error } = await supabase
        .from("trends")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setTrends((data ?? []) as Trend[]);
    } catch (e) {
      console.error("loadTrends error:", e);
      Alert.alert("Error", "Failed to load trends");
    } finally {
      setTrendsLoading(false);
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLeaderboardLoading(true);
      const { data, error } = await supabase.rpc("top_leaderboard", {
        limit_count: 10,
      });

      if (error) throw error;
      setLeaderboard((data ?? []) as LeaderboardRow[]);
    } catch (e) {
      console.error("loadLeaderboard error:", e);
      Alert.alert("Error", "Failed to load leaderboard");
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  const loadNearbyTrends = useCallback(async () => {
    if (!currentLat || !currentLng) {
      Alert.alert("Location", "Please get your location first.");
      return;
    }

    const radius = parseFloat(radiusKm || "0");
    if (!radius || radius <= 0) {
      Alert.alert("Radius", "Please enter a valid radius in km.");
      return;
    }

    try {
      setTrendsLoading(true);
      const { data, error } = await supabase.rpc("trends_within_radius", {
        in_lat: currentLat,
        in_lng: currentLng,
        radius_km: radius,
      });

      if (error) throw error;
      setTrends((data ?? []) as Trend[]);
    } catch (e) {
      console.error("loadNearbyTrends error:", e);
      Alert.alert("Error", "Failed to load nearby trends");
    } finally {
      setTrendsLoading(false);
    }
  }, [currentLat, currentLng, radiusKm]);

  // -----------------------
  // Trend engagement actions
  // -----------------------
  const handleToggleLike = useCallback(
    async (trendId: string) => {
      if (!session?.user) {
        Alert.alert("Log in", "You need an account to like a trend.");
        return;
      }

      try {
        const result = await toggleTrendLike(trendId, session.user.id);
        if (result === "liked") {
          try {
            await supabase.rpc("increment_points", {
              user_id_input: session.user.id,
              amount: 2,
            });
            await loadProfile(session.user.id);
          } catch (rpcError) {
            console.warn("increment_points like bonus failed:", rpcError);
          }
        }
        await applyEngagementSnapshot();
      } catch (error: any) {
        console.error("toggleTrendLike error:", error);
        Alert.alert("Error", error?.message ?? "Failed to update like");
      }
    },
    [session, applyEngagementSnapshot, loadProfile]
  );

  const loadTrendComments = useCallback(async (trendId: string) => {
    try {
      setTrendCommentsLoading(true);
      const data = await fetchTrendComments(trendId);
      setTrendComments(data);

      const ids = data.map((comment) => comment.id);
      if (ids.length === 0) {
        setCommentLikeCounts({});
        setLikedCommentIds([]);
      } else {
        const engagement = await fetchCommentEngagement(ids, currentUserId ?? null);
        setCommentLikeCounts(engagement.likeCounts);
        setLikedCommentIds(engagement.likedCommentIds);
      }
    } catch (error) {
      console.error("fetchTrendComments error:", error);
      Alert.alert("Error", "Failed to load comments");
    } finally {
      setTrendCommentsLoading(false);
    }
  }, [currentUserId]);

  const handleOpenComments = useCallback(
    (trendId: string) => {
      setActiveCommentTrendId(trendId);
      setCommentsVisible(true);
      setTrendComments([]);
      setNewComment("");
      loadTrendComments(trendId);
    },
    [loadTrendComments]
  );

  const handleCloseComments = useCallback(() => {
    setCommentsVisible(false);
    setActiveCommentTrendId(null);
    setTrendComments([]);
    setNewComment("");
    setCommentLikeCounts({});
    setLikedCommentIds([]);
  }, []);

  const handleSubmitComment = useCallback(async () => {
    if (!session?.user) {
      Alert.alert("Log in", "You need an account to comment.");
      return;
    }

    if (!activeCommentTrendId) {
      return;
    }

    if (!newComment.trim()) {
      Alert.alert("Empty comment", "Please write something before posting.");
      return;
    }

    try {
      setPostingComment(true);
      await submitTrendComment(activeCommentTrendId, session.user.id, newComment.trim());
      try {
        await supabase.rpc("increment_points", {
          user_id_input: session.user.id,
          amount: 5,
        });
        await loadProfile(session.user.id);
      } catch (rpcError) {
        console.warn("increment_points comment bonus failed:", rpcError);
      }
      setNewComment("");
      await Promise.all([loadTrendComments(activeCommentTrendId), applyEngagementSnapshot()]);
    } catch (error: any) {
      console.error("submitTrendComment error:", error);
      Alert.alert("Error", error?.message ?? "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  }, [session, activeCommentTrendId, newComment, loadTrendComments, applyEngagementSnapshot, loadProfile]);

  const handleToggleCommentLike = useCallback(
    async (commentId: string) => {
      if (!session?.user) {
        Alert.alert("Log in", "You need an account to like a comment.");
        return;
      }

      try {
        const result = await toggleCommentLike(commentId, session.user.id);
        if (result === "liked") {
          try {
            await supabase.rpc("increment_points", {
              user_id_input: session.user.id,
              amount: 2,
            });
            await loadProfile(session.user.id);
          } catch (rpcError) {
            console.warn("increment_points comment-like bonus failed:", rpcError);
          }
        }
        if (activeCommentTrendId) {
          await loadTrendComments(activeCommentTrendId);
        }
      } catch (error: any) {
        console.error("toggleCommentLike error:", error);
        Alert.alert("Error", error?.message ?? "Failed to update comment like");
      }
    },
    [session, activeCommentTrendId, loadTrendComments, loadProfile]
  );

  // -----------------------
  // Auth handlers
  // -----------------------
  const handleSignUp = useCallback(async () => {
    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      Alert.alert("Success", "Check your email to confirm sign up.");
    } catch (e: any) {
      console.error("signUp error:", e);
      Alert.alert("Sign up failed", e?.message ?? "Unknown error");
    } finally {
      setAuthLoading(false);
    }
  }, [email, password]);

  const handleSignIn = useCallback(async () => {
    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (e: any) {
      console.error("signIn error:", e);
      Alert.alert("Sign in failed", e?.message ?? "Unknown error");
    } finally {
      setAuthLoading(false);
    }
  }, [email, password]);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("signOut error:", e);
    }
  }, []);

  // -----------------------
  // Location
  // -----------------------
  const handleGetLocation = useCallback(async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Location permission is required to use nearby trends."
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({});
      setCurrentLat(pos.coords.latitude);
      setCurrentLng(pos.coords.longitude);

      // Reverse geocode for city display
      const geocoded = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      if (geocoded && geocoded.length > 0) {
        const first = geocoded[0];
        const cityName =
          first.city || first.subregion || first.region || "Unknown area";
        setCurrentCity(cityName);
        // If no manual location text, use this as fallback
        if (!newLocationText) {
          setNewLocationText(cityName);
        }
      }
    } catch (e) {
      console.error("handleGetLocation error:", e);
      Alert.alert("Error", "Failed to get location");
    } finally {
      setLocationLoading(false);
    }
  }, [newLocationText]);

  // -----------------------
  // Trends: add
  // -----------------------
  const handleAddTrend = useCallback(async () => {
    if (!session?.user) {
      Alert.alert("Not logged in", "You need to log in to add a trend.");
      return;
    }

    if (!newTitle.trim()) {
      Alert.alert("Missing title", "Please enter a trend title.");
      return;
    }

    try {
      setTrendsLoading(true);

      const baseLocation = newLocationText.trim()
        ? newLocationText.trim()
        : currentCity || "Unknown";

      const insertPayload: any = {
        title: newTitle.trim(),
        category: newCategory.trim(),
        location: baseLocation,
        user_id: session.user.id,
      };

      if (currentLat && currentLng) {
        insertPayload.lat = currentLat;
        insertPayload.lng = currentLng;
      }

      const { error: insertError } = await supabase
        .from("trends")
        .insert([insertPayload]);

      if (insertError) throw insertError;

      // Increment points via RPC
      const { error: rpcError } = await supabase.rpc("increment_points", {
        user_id_input: session.user.id,
        amount: 10,
      });

      if (rpcError) {
        console.warn("increment_points RPC error:", rpcError.message);
      }

      // Refresh after insert
      await Promise.all([loadTrends(), loadProfile(session.user.id)]);

      setNewTitle("");
      // Keep category & location as is
    } catch (e: any) {
      console.error("handleAddTrend error:", e);
      Alert.alert("Error", e?.message ?? "Failed to add trend");
    } finally {
      setTrendsLoading(false);
    }
  }, [
    session,
    newTitle,
    newCategory,
    newLocationText,
    currentLat,
    currentLng,
    currentCity,
    loadTrends,
    loadProfile,
  ]);

  // -----------------------
  // Profile save (AVATAR!)
  // -----------------------
  const handleSaveProfile = useCallback(
    async ({ displayName, avatarUrl }: SaveProfileParams) => {
      if (!session?.user) return;
      const userId = session.user.id;

      try {
        let finalAvatarUrl: string | null = null;

        if (avatarUrl && avatarUrl.startsWith("file:")) {
          // Local URI → ArrayBuffer → Upload → public URL
          const response = await fetch(avatarUrl);
          const arrayBuffer = await response.arrayBuffer();
          finalAvatarUrl = await uploadAvatarPublic(userId, arrayBuffer as ArrayBuffer, "jpg");
        } else {
          // Already a remote URL (e.g. Supabase public URL)
          finalAvatarUrl = avatarUrl;
        }

        await upsertMyProfile(userId, {
          display_name: displayName,
          avatar_url: finalAvatarUrl,
        });

        await loadProfile(userId);
      } catch (e: any) {
        console.error("handleSaveProfile error:", e);
        Alert.alert("Update failed", e?.message ?? "Unknown error");
        throw e;
      }
    },
    [session, loadProfile]
  );

  // -----------------------
  // UI helpers
  // -----------------------
  const renderTrendItem = ({ item }: { item: Trend }) => {
    const liked = likedTrendIds.includes(item.id);
    const likeCount = likeCounts[item.id] ?? item.like_count ?? 0;
    const commentCount = commentCounts[item.id] ?? item.comment_count ?? 0;

    return (
      <View style={[styles.trendCard, { borderColor: colors.border }]}>
        <Text style={[styles.trendTitle, { color: colors.text }]}>
          {item.title}
        </Text>
        <Text style={{ color: colors.sub, marginBottom: 2 }}>
          {item.category} · {item.location}
        </Text>
        {typeof item.distance_km === "number" && (
          <Text style={{ color: colors.sub }}>
            ~{item.distance_km.toFixed(1)} km away
          </Text>
        )}
        <Text style={{ color: colors.sub, marginTop: 4, fontSize: 12 }}>
          {new Date(item.created_at).toLocaleString()}
        </Text>

        <View style={styles.trendActionsRow}>
          <Pressable
            onPress={() => handleToggleLike(item.id)}
            style={[
              styles.trendActionButton,
              {
                borderColor: liked ? "#2563eb" : colors.border,
                backgroundColor: liked ? "#2563eb22" : "transparent",
              },
            ]}
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>
              {liked ? "❤️ Liked" : "🤍 Like"}
            </Text>
            <Text style={{ color: colors.sub, fontSize: 12 }}>
              {likeCount} like{likeCount === 1 ? "" : "s"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleOpenComments(item.id)}
            style={[styles.trendActionButton, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>💬 Comment</Text>
            <Text style={{ color: colors.sub, fontSize: 12 }}>
              {commentCount} comment{commentCount === 1 ? "" : "s"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderCommentItem = ({ item }: { item: TrendComment }) => {
    const liked = likedCommentIds.includes(item.id);
    const likeCount = commentLikeCounts[item.id] ?? item.like_count ?? 0;

    return (
      <View style={[styles.commentBubble, { borderColor: colors.border }]}>
        <Text style={{ color: colors.text }}>{item.comment}</Text>
        <Text style={[styles.commentMeta, { color: colors.sub }]}>
          {(item.user_id ?? "user").slice(0, 6)} • {new Date(item.created_at).toLocaleString()}
        </Text>
        <Pressable
          onPress={() => handleToggleCommentLike(item.id)}
          style={[
            styles.commentLikeButton,
            {
              borderColor: liked ? "#f43f5e" : colors.border,
              backgroundColor: liked ? "#f43f5e22" : "transparent",
            },
          ]}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>{liked ? "❤️ Liked" : "🤍 Like"}</Text>
          <Text style={{ color: colors.sub, fontSize: 12 }}>
            {likeCount} like{likeCount === 1 ? "" : "s"}
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardRow; index: number }) => {
    const isYou = session?.user && session.user.id === item.id;
    const name = item.display_name || "Anonymous";
    const avatarUri = item.avatar_url ? item.avatar_url + "?v=" + Date.now() : null;

    return (
      <View
        style={[
          styles.lbRow,
          { borderColor: colors.border, backgroundColor: isYou ? "#0ea5e922" : "transparent" },
        ]}
      >
        <Text style={{ color: colors.text, fontWeight: "800", width: 28, textAlign: "right" }}>#{index + 1}</Text>
        
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.border,
              marginLeft: 8,
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
              marginLeft: 8,
            }}
          >
            <Text style={{ color: colors.sub, fontSize: 12 }}>👤</Text>
          </View>
        )}
        
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={{ color: colors.text, fontWeight: "600" }}>
            {name}{isYou ? " (You)" : ""}
          </Text>
        </View>
        <Text style={{ color: colors.text, fontWeight: "700" }}>
          {item.points} pts
        </Text>
      </View>
    );
  };

  if (initialLoading) {
    return (
      <View style={[styles.screen, { justifyContent: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  // -----------------------
  // Not logged in: show auth
  // -----------------------
  if (!session) {
    return (
      <View style={styles.screen}>
        <Text style={[styles.title, { color: colors.text }]}>
          Locova
        </Text>
        <Text style={[styles.subtitle, { color: colors.sub }]}>
          Discover & share local trends
        </Text>

        <View
          style={[styles.card, { borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isLoginMode ? "Log In" : "Sign Up"}
          </Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Email"
            placeholderTextColor={colors.sub}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Password"
            placeholderTextColor={colors.sub}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            onPress={isLoginMode ? handleSignIn : handleSignUp}
            style={[
              styles.button,
              { backgroundColor: colors.buttonBg, marginTop: 8 },
            ]}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  { color: colors.buttonText },
                ]}
              >
                {isLoginMode ? "Log In" : "Create Account"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setIsLoginMode((m) => !m)}
            style={{ marginTop: 12 }}
          >
            <Text style={{ color: colors.sub, fontSize: 13 }}>
              {isLoginMode
                ? "Need an account? Sign up"
                : "Already have an account? Log in"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // -----------------------
  // Logged in UI
  // -----------------------
  const userPoints = profile?.points ?? 0;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={styles.scrollContent}
      >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            Locova
          </Text>
          <Text style={[styles.subtitle, { color: colors.sub }]}>
            Hey {profile?.display_name || "Explorer"} 👋
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: colors.sub, fontSize: 12 }}>
            Points
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "700",
            }}
          >
            {userPoints}
          </Text>

          <Pressable
            onPress={handleSignOut}
            style={[
              styles.button,
              {
                backgroundColor: "#111827",
                paddingVertical: 6,
                paddingHorizontal: 10,
                marginTop: 6,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                { color: colors.sub, fontSize: 12 },
              ]}
            >
              Log out
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Profile */}
      <View
        style={[styles.card, { borderColor: colors.border }]}
      >
        <ProfileEditor
          colors={colors}
          userId={session.user.id}
          initialDisplayName={profile?.display_name ?? ""}
          initialAvatarUrl={profile?.avatar_url ?? null}
          onSave={handleSaveProfile}
        />

        {profileLoading && (
          <ActivityIndicator color={colors.sub} size="small" />
        )}

        {/* Notification Status & Test */}
        <View style={{ marginTop: 16, padding: 12, backgroundColor: colors.cardBg, borderRadius: 8 }}>
          <Text style={{ color: colors.text, fontWeight: "600", marginBottom: 8 }}>
            🔔 Push Notifications
          </Text>
          
          {profile?.expo_push_token ? (
            <>
              <View
                style={{
                  padding: 8,
                  backgroundColor: "#10b98122",
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: "#10b981",
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: "#10b981", fontSize: 12, fontWeight: "600" }}>
                  ✅ Enabled
                </Text>
              </View>
              
              <Text style={{ color: colors.sub, fontSize: 11, marginBottom: 8 }}>
                Token: {profile.expo_push_token.substring(0, 30)}...
              </Text>
              
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Test Notifications",
                    `Your push token:\n\n${profile.expo_push_token}\n\nTo test:\n1. Copy this token\n2. Go to expo.dev/notifications\n3. Paste token and send a test notification`,
                    [
                      { text: "Cancel" },
                      {
                        text: "Copy Token",
                        onPress: () => {
                          // In a real app, use Clipboard API
                          console.log("📱 Push Token:", profile.expo_push_token);
                          Alert.alert("Copied", "Check console for token");
                        },
                      },
                    ]
                  );
                }}
                style={[
                  styles.button,
                  { backgroundColor: colors.buttonBg, paddingVertical: 8 },
                ]}
              >
                <Text style={[styles.buttonText, { color: colors.buttonText, fontSize: 12 }]}>
                  Test Notifications
                </Text>
              </Pressable>
            </>
          ) : (
            <View
              style={{
                padding: 8,
                backgroundColor: "#ef444422",
                borderRadius: 6,
                borderWidth: 1,
                borderColor: "#ef4444",
              }}
            >
              <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "600" }}>
                ⚠️ Not Available in Expo Go
              </Text>
              <Text style={{ color: colors.sub, fontSize: 11, marginTop: 4 }}>
                Requires development build
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Location & radius */}
      <View
        style={[styles.card, { borderColor: colors.border }]}
      >
        <Text
          style={[styles.sectionTitle, { color: colors.text }]}
        >
          📍 Location & Radius
        </Text>
        <Text style={{ color: colors.sub, marginBottom: 8 }}>
          {currentCity
            ? `Using location: ${currentCity}`
            : "No location yet"}
        </Text>

        <View style={styles.row}>
          <Pressable
            onPress={handleGetLocation}
            disabled={locationLoading}
            style={[
              styles.button,
              {
                backgroundColor: colors.buttonBg,
                marginRight: 8,
                flex: 1,
              },
            ]}
          >
            {locationLoading ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  { color: colors.buttonText },
                ]}
              >
                Use my location
              </Text>
            )}
          </Pressable>

          <TextInput
            style={[
              styles.inputSmall,
              { borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Radius km"
            placeholderTextColor={colors.sub}
            keyboardType="numeric"
            value={radiusKm}
            onChangeText={setRadiusKm}
          />
        </View>

        <Pressable
          onPress={loadNearbyTrends}
          style={[
            styles.button,
            { backgroundColor: "#111827", marginTop: 8 },
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              { color: colors.buttonText },
            ]}
          >
            Load trends within radius
          </Text>
        </Pressable>
      </View>

      {/* Add Trend */}
      <View
        style={[styles.card, { borderColor: colors.border }]}
      >
        <Text
          style={[styles.sectionTitle, { color: colors.text }]}
        >
          ➕ Add a Trend
        </Text>

        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.text },
          ]}
          placeholder="What's trending? (e.g. New ramen spot)"
          placeholderTextColor={colors.sub}
          value={newTitle}
          onChangeText={setNewTitle}
        />

        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.text },
          ]}
          placeholder='Category (e.g. "Food", "Event")'
          placeholderTextColor={colors.sub}
          value={newCategory}
          onChangeText={setNewCategory}
        />

        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Location name (optional, e.g. Downtown)"
          placeholderTextColor={colors.sub}
          value={newLocationText}
          onChangeText={setNewLocationText}
        />

        <Pressable
          onPress={handleAddTrend}
          disabled={trendsLoading}
          style={[
            styles.button,
            {
              backgroundColor: colors.buttonBg,
              marginTop: 6,
            },
          ]}
        >
          {trendsLoading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text
              style={[
                styles.buttonText,
                { color: colors.buttonText },
              ]}
            >
              Post Trend & Earn Points
            </Text>
          )}
        </Pressable>
      </View>

      {/* Trends List */}
      <View
        style={[styles.card, { borderColor: colors.border }]}
      >
        <Text
          style={[styles.sectionTitle, { color: colors.text }]}
        >
          🔥 Trends
        </Text>
        {trendsLoading && (
          <ActivityIndicator color={colors.sub} size="small" />
        )}
        {trends.length === 0 && !trendsLoading ? (
          <Text style={{ color: colors.sub, marginTop: 8 }}>
            No trends yet. Be the first to add one!
          </Text>
        ) : (
          <FlatList
            data={trends}
            keyExtractor={(item) => item.id}
            renderItem={renderTrendItem}
            scrollEnabled={false}
            contentContainerStyle={{ paddingTop: 8 }}
          />
        )}
      </View>

      {/* Leaderboard */}
      <View
        style={[styles.card, { borderColor: colors.border }]}
      >
        <View style={styles.rowBetween}>
          <Text
            style={[styles.sectionTitle, { color: colors.text }]}
          >
            🏆 Leaderboard
          </Text>
          <Pressable
            onPress={loadLeaderboard}
            style={[
              styles.button,
              {
                backgroundColor: "#111827",
                paddingVertical: 4,
                paddingHorizontal: 10,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                { color: colors.sub, fontSize: 12 },
              ]}
            >
              Refresh
            </Text>
          </Pressable>
        </View>

        {leaderboardLoading && (
          <ActivityIndicator color={colors.sub} size="small" />
        )}

        {leaderboard.length === 0 && !leaderboardLoading ? (
          <Text style={{ color: colors.sub, marginTop: 8 }}>
            No one on the board yet. Start posting trends!
          </Text>
        ) : (
          <FlatList
            data={leaderboard}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => renderLeaderboardItem({ item, index })}
            scrollEnabled={false}
            contentContainerStyle={{ paddingTop: 8 }}
          />
        )}
        
        {/* Your Rank if not in top 10 */}
        {!leaderboardLoading &&
          leaderboard.length > 0 &&
          session?.user &&
          !leaderboard.some((item) => item.id === session.user.id) &&
          profile && (
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
                <Text style={{ color: colors.text, fontWeight: "800", width: 28, textAlign: "right" }}>#?</Text>
                
                {profile.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url + "?v=" + Date.now() }}
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
                    {profile.display_name || "You"}
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: "700" }}>{profile.points} pts</Text>
              </View>
            </View>
          )}
      </View>
      </ScrollView>

      <Modal
        visible={commentsVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseComments}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.commentSheet, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
            <View style={styles.commentModalHeader}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }} numberOfLines={2}>
                  {activeTrend?.title ?? "Comments"}
                </Text>
                {activeTrend && (
                  <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
                    {(commentCounts[activeTrend.id] ?? activeTrend.comment_count ?? trendComments.length)} comment
                    {(commentCounts[activeTrend.id] ?? activeTrend.comment_count ?? trendComments.length) === 1 ? "" : "s"}
                  </Text>
                )}
              </View>
              <Pressable onPress={handleCloseComments} style={styles.closeButton}>
                <Text style={{ color: colors.sub, fontWeight: "600" }}>Close</Text>
              </Pressable>
            </View>

            <View style={{ maxHeight: 320, width: "100%" }}>
              {trendCommentsLoading ? (
                <ActivityIndicator color={colors.sub} style={{ marginVertical: 20 }} />
              ) : (
                <FlatList
                  data={trendComments}
                  keyExtractor={(item) => item.id}
                  renderItem={renderCommentItem}
                  ListEmptyComponent={
                    <Text style={{ color: colors.sub, marginBottom: 12 }}>
                      No comments yet. Be the first to share a tip!
                    </Text>
                  }
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 8 }}
                  style={{ flexGrow: 0 }}
                />
              )}
            </View>

            <View style={styles.commentInputRow}>
              <TextInput
                style={[
                  styles.commentInput,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: colors.bg,
                  },
                ]}
                placeholder="Write a comment"
                placeholderTextColor={colors.sub}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                editable={!postingComment}
              />
              <Pressable
                onPress={handleSubmitComment}
                disabled={postingComment}
                style={[
                  styles.commentPostButton,
                  {
                    backgroundColor: colors.buttonBg,
                    opacity: postingComment ? 0.7 : 1,
                  },
                ]}
              >
                {postingComment ? (
                  <ActivityIndicator color={colors.buttonText} />
                ) : (
                  <Text style={{ color: colors.buttonText, fontWeight: "700" }}>Post</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    backgroundColor: colors.cardBg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  inputSmall: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 90,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trendCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  lbRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trendActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  trendActionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  commentBubble: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  commentMeta: {
    marginTop: 6,
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#000000aa",
    justifyContent: "flex-end",
    padding: 16,
  },
  commentSheet: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  commentModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 44,
    maxHeight: 120,
  },
  commentPostButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  commentLikeButton: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
});
