// app/(tabs)/index.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RealtimePostgresChangesPayload, Session } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";
import { GooglePlaceResult, searchPlaces } from "../../services/places";
import {
    getMyProfile
} from "../../services/profile";
import { fetchRecommendedTrends } from "../../services/recommendations";
import {
    fetchCommentEngagement,
    fetchTrendComments,
    fetchTrendEngagement,
    hydrateTrendAuthors,
    submitTrendComment,
    toggleCommentLike,
    toggleTrendLike,
    toggleTrendSave
} from "../../services/trends";
import { LeaderboardRow, Trend, TrendComment, UserProfile } from "../../type";
import { getUserLevel } from "../../utils/level";

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

// Professional Light Theme - Cool Aqua & Rose Red
const colors = {
  // Backgrounds
  bg: "#F0F9FA",              // Light aqua/mint
  cardBg: "#FFFFFF",          // Pure white
  
  // Text
  text: "#1A3B3F",            // Deep teal
  sub: "#5A7B7E",             // Muted teal
  
  // Borders & Dividers
  border: "#D4E8EA",          // Soft aqua border
  cardBorder: "#D4E8EA",
  
  // Primary - Rose Red
  primary: "#FF6B7A",         // Rose red
  primaryLight: "#FFB3BC",    // Light rose
  
  // Secondary - Aqua
  secondary: "#6ECFD9",       // Bright aqua
  accent: "#6ECFD9",          // Aqua accent
  
  // Status
  success: "#5DD9A8",         // Mint green
  danger: "#FF6B7A",          // Rose red
  warning: "#FFB84A",         // Warm amber
  
  // Gradients
  gradientStart: "#FF6B7A",   // Rose
  gradientEnd: "#FFB3BC",     // Light rose
};

type SelectedPlace = {
  placeId: string;
  name: string;
  address?: string;
  lat: number | null;
  lng: number | null;
};

// Animated Button Component
const AnimatedPressable = ({ children, onPress, style, disabled }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function HomeScreen() {
  const router = useRouter();
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
  const [leaderboardScope, setLeaderboardScope] = useState<"global" | "nearby">("global");
  const [trendsScope, setTrendsScope] = useState<"global" | "nearby">("global");
  const [trendSubmitting, setTrendSubmitting] = useState(false);
  const [likeBusyMap, setLikeBusyMap] = useState<Record<string, boolean>>({});
  const [saveBusyMap, setSaveBusyMap] = useState<Record<string, boolean>>({});
  const [commentLikeBusyMap, setCommentLikeBusyMap] = useState<Record<string, boolean>>({});
  const [placeResults, setPlaceResults] = useState<GooglePlaceResult[]>([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [recommendedTrends, setRecommendedTrends] = useState<Trend[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  // Global loading (initial)
  const [initialLoading, setInitialLoading] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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
  const [saveCounts, setSaveCounts] = useState<Record<string, number>>({});
  const [savedTrendIds, setSavedTrendIds] = useState<string[]>([]);

  // Refs for realtime handlers
  const engagementRefreshRef = useRef<(() => Promise<void>) | null>(null);
  const loadTrendCommentsRef = useRef<typeof loadTrendComments | null>(null);
  const activeCommentTrendIdRef = useRef<string | null>(null);
  const commentsVisibleRef = useRef<boolean>(false);
  const placeSearchAbortRef = useRef<AbortController | null>(null);
  const placeSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeCommentTrendIdRef.current = activeCommentTrendId;
  }, [activeCommentTrendId]);

  useEffect(() => {
    if (selectedPlace && newLocationText.trim() !== selectedPlace.name) {
      setSelectedPlace(null);
    }
  }, [newLocationText, selectedPlace]);

  useEffect(() => {
    const query = newLocationText.trim();
    if (query.length < 3) {
      placeSearchAbortRef.current?.abort();
      if (placeSearchDebounceRef.current) {
        clearTimeout(placeSearchDebounceRef.current);
        placeSearchDebounceRef.current = null;
      }
      setPlaceResults([]);
      setPlaceSearchLoading(false);
      return;
    }

    if (placeSearchDebounceRef.current) {
      clearTimeout(placeSearchDebounceRef.current);
    }

    const controller = new AbortController();
    placeSearchAbortRef.current?.abort();
    placeSearchAbortRef.current = controller;

    placeSearchDebounceRef.current = setTimeout(async () => {
      try {
        setPlaceSearchLoading(true);
        const results = await searchPlaces(query, controller.signal);
        setPlaceResults(results.slice(0, 5));
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.error("searchPlaces error:", error);
        }
      } finally {
        setPlaceSearchLoading(false);
        placeSearchDebounceRef.current = null;
      }
    }, 400);

    return () => {
      controller.abort();
      if (placeSearchDebounceRef.current) {
        clearTimeout(placeSearchDebounceRef.current);
        placeSearchDebounceRef.current = null;
      }
    };
  }, [newLocationText]);

  const handleSelectPlace = useCallback((place: GooglePlaceResult) => {
    const lat = place.geometry?.location?.lat ?? null;
    const lng = place.geometry?.location?.lng ?? null;
    setSelectedPlace({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      lat,
      lng,
    });
    setNewLocationText(place.name);
    setPlaceResults([]);
  }, []);

  const loadRecommended = useCallback(async () => {
    if (!session?.user) {
      setRecommendedTrends([]);
      return;
    }

    try {
      setRecommendedLoading(true);
      const data = await fetchRecommendedTrends();
      const hydrated = await hydrateTrendAuthors(data ?? []);
      setRecommendedTrends(hydrated);
    } catch (error: any) {
      console.error("fetchRecommendedTrends error:", error);
      Alert.alert("Error", error?.message ?? "Failed to load recommendations");
    } finally {
      setRecommendedLoading(false);
    }
  }, [session?.user?.id]);

  const handleClearSelectedPlace = useCallback(() => {
    setSelectedPlace(null);
  }, []);

  const currentUserId = session?.user?.id ?? null;
  const activeTrend = useMemo(
    () => trends.find((t) => t.id === activeCommentTrendId) ?? null,
    [trends, activeCommentTrendId]
  );
  const userPoints = profile?.points ?? 0;
  const userLevel = useMemo(() => getUserLevel(userPoints), [userPoints]);

  const combinedTrendIds = useMemo(() => {
    const ids = new Set<string>();
    trends.forEach((t) => ids.add(t.id));
    recommendedTrends.forEach((t) => ids.add(t.id));
    return Array.from(ids);
  }, [trends, recommendedTrends]);

  const fetchEngagementSnapshot = useCallback(
    async (trendIds: string[]) => {
      if (trendIds.length === 0) {
        return {
          likeCounts: {},
          commentCounts: {},
          likedTrendIds: [],
          saveCounts: {},
          savedTrendIds: [],
        };
      }

      return await fetchTrendEngagement(trendIds, currentUserId ?? null);
    },
    [currentUserId]
  );

  const applyEngagementSnapshot = useCallback(async () => {
    try {
      const snapshot = await fetchEngagementSnapshot(combinedTrendIds);
      setLikeCounts(snapshot.likeCounts);
      setCommentCounts(snapshot.commentCounts);
      setLikedTrendIds(snapshot.likedTrendIds);
      setSaveCounts(snapshot.saveCounts);
      setSavedTrendIds(snapshot.savedTrendIds);
    } catch (error) {
      console.error("fetchTrendEngagement error:", error);
    }
  }, [fetchEngagementSnapshot, combinedTrendIds]);

  useEffect(() => {
    engagementRefreshRef.current = applyEngagementSnapshot;
  }, [applyEngagementSnapshot]);

  useEffect(() => {
    let mounted = true;
    const ids = combinedTrendIds;

    (async () => {
      try {
        const snapshot = await fetchEngagementSnapshot(ids);
        if (!mounted) return;
        setLikeCounts(snapshot.likeCounts);
        setCommentCounts(snapshot.commentCounts);
        setLikedTrendIds(snapshot.likedTrendIds);
        setSaveCounts(snapshot.saveCounts);
        setSavedTrendIds(snapshot.savedTrendIds);
      } catch (error) {
        if (!mounted) return;
        console.error("fetchTrendEngagement error:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [combinedTrendIds, fetchEngagementSnapshot]);

  useEffect(() => {
    const likeChannel = (supabase
      .channel("realtime:trend_likes") as any)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trend_likes",
        },
        () => {
          engagementRefreshRef.current?.();
        }
      )
      .subscribe();

    const commentChannel = (supabase
      .channel("realtime:trend_comments") as any)
      .on(
        "postgres_changes",
        {
          event: "insert",
          schema: "public",
          table: "trend_comments",
        },
        (payload: RealtimePostgresChangesPayload<{ trend_id?: string }>) => {
          engagementRefreshRef.current?.();

          const trendId = (payload.new as { trend_id?: string } | null)?.trend_id;
          if (
            trendId &&
            commentsVisibleRef.current &&
            activeCommentTrendIdRef.current === trendId
          ) {
            loadTrendCommentsRef.current?.(trendId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likeChannel);
      supabase.removeChannel(commentChannel);
    };
  }, []);

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
          loadRecommended(),
        ]);
      }
      setInitialLoading(false);
      
      // Trigger entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    })();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        loadTrends();
        loadLeaderboard();
        loadRecommended();
      } else {
        setProfile(null);
        setTrends([]);
        setLeaderboard([]);
        setRecommendedTrends([]);
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
  const getTrendCoordinate = useCallback((trend: Trend) => {
    const latitude = trend.latitude ?? trend.lat;
    const longitude = trend.longitude ?? trend.lng;
    if (typeof latitude === "number" && typeof longitude === "number") {
      return { latitude, longitude };
    }
    return null;
  }, []);

  const ensureCurrentCoords = useCallback(async () => {
    if (typeof currentLat === "number" && typeof currentLng === "number") {
      return { latitude: currentLat, longitude: currentLng };
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Allow location access so we can guide you to the trend."
        );
        return null;
      }

      const position = await Location.getCurrentPositionAsync({});
      setCurrentLat(position.coords.latitude);
      setCurrentLng(position.coords.longitude);
      return { latitude: position.coords.latitude, longitude: position.coords.longitude };
    } catch (error) {
      console.error("ensureCurrentCoords error:", error);
      Alert.alert("Location error", "Couldn't fetch your current location.");
      return null;
    }
  }, [currentLat, currentLng]);

  const handleGetDirections = useCallback(
    async (trend: Trend) => {
      const coords = getTrendCoordinate(trend);
      if (!coords) {
        Alert.alert("Location unavailable", "This trend doesn't have coordinates yet.");
        return;
      }

      const origin = await ensureCurrentCoords();
      if (!origin) return;

      router.push({
        pathname: "/(tabs)/map",
        params: {
          lat: coords.latitude.toString(),
          lng: coords.longitude.toString(),
          title: trend.title,
          location: trend.location ?? "",
          originLat: origin.latitude.toString(),
          originLng: origin.longitude.toString(),
        },
      });
    },
    [ensureCurrentCoords, getTrendCoordinate, router]
  );

  const loadProfile = useCallback(async (userId: string) => {
    try {
      setProfileLoading(true);
      const data = await getMyProfile(userId);
      setProfile(data);
    } catch (e: any) {
      console.error("loadProfile error:", e);
      Alert.alert("Error", e?.message ?? "Failed to load profile");
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
      const hydrated = await hydrateTrendAuthors(((data ?? []) as Trend[]));
      setTrends(hydrated);
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
      const hydrated = await hydrateTrendAuthors(((data ?? []) as Trend[]));
      setTrends(hydrated);
    } catch (e) {
      console.error("loadNearbyTrends error:", e);
      Alert.alert("Error", "Failed to load nearby trends");
    } finally {
      setTrendsLoading(false);
    }
  }, [currentLat, currentLng, radiusKm]);

  const loadLeaderboardNearby = useCallback(async () => {
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
      setLeaderboardLoading(true);
      const { data: nearbyTrends, error } = await supabase.rpc("trends_within_radius", {
        in_lat: currentLat,
        in_lng: currentLng,
        radius_km: radius,
      });
      if (error) throw error;

      const nearby = (nearbyTrends as Trend[] | null) ?? [];
      const uniqueUserIds = Array.from(
        new Set(
          nearby
            .map((trend) => trend.user_id)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        )
      );

      if (uniqueUserIds.length === 0) {
        setLeaderboard([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("id, points, display_name, avatar_url")
        .in("id", uniqueUserIds)
        .order("points", { ascending: false })
        .limit(10);

      if (profilesError) throw profilesError;
      setLeaderboard((profiles ?? []) as LeaderboardRow[]);
    } catch (e) {
      console.error("loadLeaderboardNearby error:", e);
      Alert.alert("Error", "Failed to load nearby leaderboard");
    } finally {
      setLeaderboardLoading(false);
    }
  }, [currentLat, currentLng, radiusKm]);

  const refreshTrends = useCallback(
    async (scopeOverride?: "global" | "nearby") => {
      const scope = scopeOverride ?? trendsScope;
      if (scope === "nearby") {
        await loadNearbyTrends();
      } else {
        await loadTrends();
      }
    },
    [trendsScope, loadTrends, loadNearbyTrends]
  );

  const refreshLeaderboard = useCallback(
    async (scopeOverride?: "global" | "nearby") => {
      const scope = scopeOverride ?? leaderboardScope;
      if (scope === "nearby") {
        await loadLeaderboardNearby();
      } else {
        await loadLeaderboard();
      }
    },
    [leaderboardScope, loadLeaderboard, loadLeaderboardNearby]
  );

  const handleChangeTrendsScope = useCallback(
    async (scope: "global" | "nearby") => {
      setTrendsScope(scope);
      await refreshTrends(scope);
    },
    [refreshTrends]
  );

  const handleChangeLeaderboardScope = useCallback(
    async (scope: "global" | "nearby") => {
      setLeaderboardScope(scope);
      await refreshLeaderboard(scope);
    },
    [refreshLeaderboard]
  );

  const handleToggleLike = useCallback(
    async (trendId: string) => {
      if (!session?.user) {
        Alert.alert("Log in", "You need an account to like a trend.");
        return;
      }

      if (likeBusyMap[trendId]) {
        return;
      }

      setLikeBusyMap((prev) => ({ ...prev, [trendId]: true }));

      try {
        const result = await toggleTrendLike(trendId, session.user.id);
        if (result === "liked") {
          try {
            const { data: rewardExists, error: rewardCheckError } = await supabase
              .from("trend_like_rewards")
              .select("id")
              .eq("trend_id", trendId)
              .eq("user_id", session.user.id)
              .maybeSingle();

            if (rewardCheckError) {
              throw rewardCheckError;
            }

            if (!rewardExists) {
              const { error: rewardInsertError } = await supabase
                .from("trend_like_rewards")
                .insert({ trend_id: trendId, user_id: session.user.id });

              if (rewardInsertError && rewardInsertError.code !== "23505") {
                throw rewardInsertError;
              }

              if (!rewardInsertError || rewardInsertError.code === "23505") {
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
            }
          } catch (rewardError) {
            console.warn("trend like reward tracking failed:", rewardError);
          }
        }
        await applyEngagementSnapshot();
      } catch (error: any) {
        console.error("toggleTrendLike error:", error);
        Alert.alert("Error", error?.message ?? "Failed to update like");
      } finally {
        setLikeBusyMap((prev) => {
          const next = { ...prev };
          delete next[trendId];
          return next;
        });
      }
    },
    [session, applyEngagementSnapshot, loadProfile, likeBusyMap]
  );

  const handleToggleSave = useCallback(
    async (trendId: string) => {
      if (!session?.user) {
        Alert.alert("Log in", "You need an account to save a trend.");
        return;
      }

      if (saveBusyMap[trendId]) {
        return;
      }

      setSaveBusyMap((prev) => ({ ...prev, [trendId]: true }));

      try {
        await toggleTrendSave(trendId, session.user.id);
        await applyEngagementSnapshot();
      } catch (error: any) {
        console.error("toggleTrendSave error:", error);
        Alert.alert("Error", error?.message ?? "Failed to update save");
      } finally {
        setSaveBusyMap((prev) => {
          const next = { ...prev };
          delete next[trendId];
          return next;
        });
      }
    },
    [session, applyEngagementSnapshot, saveBusyMap]
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

  useEffect(() => {
    loadTrendCommentsRef.current = loadTrendComments;
  }, [loadTrendComments]);

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

      if (commentLikeBusyMap[commentId]) {
        return;
      }

      setCommentLikeBusyMap((prev) => ({ ...prev, [commentId]: true }));

      try {
        const result = await toggleCommentLike(commentId, session.user.id);
        if (result === "liked") {
          try {
            const { data: rewardExists, error: rewardCheckError } = await supabase
              .from("trend_comment_like_rewards")
              .select("id")
              .eq("comment_id", commentId)
              .eq("user_id", session.user.id)
              .maybeSingle();

            if (rewardCheckError) {
              throw rewardCheckError;
            }

            if (!rewardExists) {
              const { error: rewardInsertError } = await supabase
                .from("trend_comment_like_rewards")
                .insert({ comment_id: commentId, user_id: session.user.id });

              if (rewardInsertError && rewardInsertError.code !== "23505") {
                throw rewardInsertError;
              }

              if (!rewardInsertError || rewardInsertError.code === "23505") {
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
            }
          } catch (rewardError) {
            console.warn("comment like reward tracking failed:", rewardError);
          }
        }
        if (activeCommentTrendId) {
          await loadTrendComments(activeCommentTrendId);
        }
      } catch (error: any) {
        console.error("toggleCommentLike error:", error);
        Alert.alert("Error", error?.message ?? "Failed to update comment like");
      } finally {
        setCommentLikeBusyMap((prev) => {
          const next = { ...prev };
          delete next[commentId];
          return next;
        });
      }
    },
    [session, activeCommentTrendId, loadTrendComments, loadProfile, commentLikeBusyMap]
  );

  // -----------------------
  // Auth handlers
  // -----------------------
  const handleSignUp = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Enter both email and password");
      return;
    }

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
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Enter both email and password");
      return;
    }

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

    const trimmedTitle = newTitle.trim();
    const trimmedCategory = newCategory.trim();
    const trimmedLocation = newLocationText.trim();

    if (!trimmedTitle || !trimmedCategory) {
      Alert.alert("Missing info", "Please provide a title and category.");
      return;
    }

    try {
      setTrendSubmitting(true);

      const baseLocation = trimmedLocation ? trimmedLocation : currentCity || "Unknown";
      const locationLabel = selectedPlace
        ? selectedPlace.address
          ? `${selectedPlace.name} • ${selectedPlace.address}`
          : selectedPlace.name
        : baseLocation;

      const insertPayload: any = {
        title: trimmedTitle,
        category: trimmedCategory,
        location: locationLabel,
        user_id: session.user.id,
      };

      let resolvedLat = selectedPlace?.lat ?? currentLat;
      let resolvedLng = selectedPlace?.lng ?? currentLng;

      if (!selectedPlace && (resolvedLat == null || resolvedLng == null)) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const position = await Location.getCurrentPositionAsync({});
            resolvedLat = position.coords.latitude;
            resolvedLng = position.coords.longitude;
            setCurrentLat(resolvedLat);
            setCurrentLng(resolvedLng);
          } else {
            console.warn("Location permission denied while creating trend; saving without coordinates.");
          }
        } catch (locError) {
          console.warn("Failed to capture GPS coordinates for trend:", locError);
        }
      }

      if (resolvedLat != null && resolvedLng != null) {
        insertPayload.latitude = resolvedLat;
        insertPayload.longitude = resolvedLng;
        insertPayload.lat = resolvedLat;
        insertPayload.lng = resolvedLng;
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
      setSelectedPlace(null);
      setPlaceResults([]);
      Alert.alert("Trend posted", "Thanks for sharing a trend!");
    } catch (e: any) {
      console.error("handleAddTrend error:", e);
      Alert.alert("Error", e?.message ?? "Failed to add trend");
    } finally {
      setTrendSubmitting(false);
    }
  }, [
    session,
    newTitle,
    newCategory,
    newLocationText,
    currentLat,
    currentLng,
    currentCity,
    selectedPlace,
    loadTrends,
    loadProfile,
  ]);


  // -----------------------
  // UI helpers
  // -----------------------
  const renderTrendItem = ({ item }: { item: Trend }) => {
    const liked = likedTrendIds.includes(item.id);
    const likeCount = likeCounts[item.id] ?? item.like_count ?? 0;
    const commentCount = commentCounts[item.id] ?? item.comment_count ?? 0;
    const saved = savedTrendIds.includes(item.id);
    const saveCount = saveCounts[item.id] ?? item.save_count ?? 0;
    const likeBusy = !!likeBusyMap[item.id];
    const saveBusy = !!saveBusyMap[item.id];
    const author = item.author_profile;
    const directionsDisabled = !getTrendCoordinate(item);

    return (
      <View style={styles.trendCard}>
        {author && (
          <View style={styles.authorRow}>
            {author.avatar_url ? (
              <Image source={{ uri: author.avatar_url }} style={styles.authorAvatar} />
            ) : (
              <View style={styles.authorAvatarFallback}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {(author.display_name ?? "?").slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.authorName}>{author.display_name ?? "Locova explorer"}</Text>
              <Text style={styles.authorMeta}>Shared this trend</Text>
            </View>
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primary + "15", borderRadius: 12, borderWidth: 0 }}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }}>{item.category.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={[styles.trendTitle, { color: colors.text, fontSize: 18, marginBottom: 6 }]}>
          {item.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <Ionicons name="location-sharp" size={14} color={colors.secondary} />
          <Text style={{ color: colors.sub, fontSize: 13 }}>{item.location}</Text>
        </View>
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
            disabled={likeBusy}
            style={[
              styles.trendActionButton,
              {
                borderColor: liked ? colors.primary : colors.border,
                backgroundColor: liked ? colors.primary + "15" : colors.cardBg,
                opacity: likeBusy ? 0.65 : 1,
              },
            ]}
          >
            <Ionicons 
              name={liked ? "heart" : "heart-outline"} 
              size={18} 
              color={liked ? colors.primary : colors.text} 
            />
            <Text style={{ color: liked ? colors.primary : colors.text, fontWeight: "600", fontSize: 13 }}>
              {likeCount}
            </Text>
            {likeBusy && <ActivityIndicator color={colors.primary} size="small" />}
          </Pressable>

          <Pressable
            onPress={() => handleOpenComments(item.id)}
            style={[
              styles.trendActionButton, 
              { 
                borderColor: colors.border, 
                backgroundColor: colors.cardBg 
              }
            ]}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
            <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>
              {commentCount}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleToggleSave(item.id)}
            disabled={saveBusy}
            style={[
              styles.trendActionButton,
              {
                borderColor: saved ? colors.primary : colors.border,
                backgroundColor: saved ? colors.primary + "15" : colors.cardBg,
                opacity: saveBusy ? 0.65 : 1,
              },
            ]}
          >
            <Ionicons 
              name={saved ? "bookmark" : "bookmark-outline"} 
              size={18} 
              color={saved ? colors.primary : colors.text} 
            />
            <Text style={{ color: saved ? colors.primary : colors.text, fontWeight: "600", fontSize: 13 }}>
              {saveCount}
            </Text>
            {saveBusy && <ActivityIndicator color={colors.primary} size="small" />}
          </Pressable>

          <Pressable
            accessibilityLabel={`Get directions to ${item.title}`}
            onPress={() => {
              void handleGetDirections(item);
            }}
            disabled={directionsDisabled}
            style={[
              styles.trendActionButton,
              styles.directionIconButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.cardBg,
                opacity: directionsDisabled ? 0.45 : 1,
              },
            ]}
          >
            <Ionicons name="navigate-outline" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderCommentItem = ({ item }: { item: TrendComment }) => {
    const liked = likedCommentIds.includes(item.id);
    const likeCount = commentLikeCounts[item.id] ?? item.like_count ?? 0;
    const commentBusy = !!commentLikeBusyMap[item.id];

    return (
      <View style={styles.commentBubble}>
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{item.comment}</Text>
        <Text style={[styles.commentMeta, { color: colors.sub }]}>
          {(item.user_id ?? "user").slice(0, 6)} • {new Date(item.created_at).toLocaleString()}
        </Text>
        <Pressable
          onPress={() => handleToggleCommentLike(item.id)}
          disabled={commentBusy}
          style={[
            styles.commentLikeButton,
            {
              borderColor: liked ? colors.primary : colors.border,
              backgroundColor: liked ? colors.primary + "15" : colors.cardBg,
              opacity: commentBusy ? 0.7 : 1,
            },
          ]}
        >
          {commentBusy ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons 
                name={liked ? "heart" : "heart-outline"} 
                size={14} 
                color={liked ? colors.primary : colors.text} 
              />
              <Text style={{ color: liked ? colors.primary : colors.text, fontWeight: "600", fontSize: 12 }}>
                {likeCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    );
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardRow; index: number }) => {
    const isYou = session?.user && session.user.id === item.id;
    const name = item.display_name || "Anonymous";
    const avatarUri = item.avatar_url ? item.avatar_url + "?v=" + Date.now() : null;
    const level = getUserLevel(item.points);

    return (
      <View
        style={[
          styles.lbRow,
          { 
            backgroundColor: isYou ? colors.secondary + "15" : colors.cardBg,
            shadowColor: isYou ? colors.secondary : "#1A3B3F",
            shadowOpacity: isYou ? 0.15 : 0.04,
          },
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
            <Ionicons name="person" size={16} color={colors.sub} />
          </View>
        )}
        
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={{ color: colors.text, fontWeight: "600" }}>
            {name}
            {isYou ? " (You)" : ""}
          </Text>
          <View style={styles.levelBadge}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={{ color: colors.sub, fontWeight: "600", fontSize: 12 }}>{level.name}</Text>
          </View>
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
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <MaterialCommunityIcons name="star-four-points" size={32} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text, fontSize: 32, letterSpacing: 0.5 }]}>
              Locova
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.sub, fontSize: 15 }]}>
            Discover & share local trends
          </Text>
          <View style={{ height: 3, width: 60, backgroundColor: colors.primary, borderRadius: 2, marginTop: 12, opacity: 0.8 }} />
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isLoginMode ? "Log In" : "Sign Up"}
          </Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.text },
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
              { color: colors.text },
            ]}
            placeholder="Password"
            placeholderTextColor={colors.sub}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            onPress={isLoginMode ? handleSignIn : handleSignUp}
            disabled={authLoading}
            style={{ marginTop: 12 }}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.button, { opacity: authLoading ? 0.7 : 1 }]}
            >
              {authLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text
                  style={[
                    styles.buttonText,
                    { color: colors.text, fontSize: 16 },
                  ]}
                >
                  {isLoginMode ? "Log In" : "Create Account"}
                </Text>
              )}
            </LinearGradient>
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

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={styles.scrollContent}
      >
      <Animated.View 
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <MaterialCommunityIcons name="star-four-points" size={28} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text, fontSize: 28, letterSpacing: 0.5 }]}>
              Locova
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.sub, fontSize: 13 }]}>
            Hey {profile?.display_name || "Explorer"}
          </Text>
        </View>

        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderRadius: 20,
            alignItems: "center",
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "600" }}>
            POINTS
          </Text>
          <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginTop: 2 }}>
            {userPoints}
          </Text>
        </LinearGradient>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <View style={{ 
          flexDirection: "row", 
          alignItems: "center", 
          gap: 6, 
          paddingHorizontal: 16, 
          paddingVertical: 10, 
          borderRadius: 999, 
          backgroundColor: colors.cardBg,
          shadowColor: "#1A3B3F",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2,
        }}>
          <Ionicons name="location" size={14} color={colors.secondary} />
          <Text style={{ color: colors.secondary, fontWeight: "600", fontSize: 12 }}>
            {currentCity || "Unknown"}
          </Text>
        </View>
        <Pressable 
          onPress={handleSignOut}
          style={{ 
            paddingHorizontal: 16, 
            paddingVertical: 10, 
            borderRadius: 999, 
            backgroundColor: colors.cardBg,
            shadowColor: "#1A3B3F",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Text style={{ color: colors.sub, fontSize: 12, fontWeight: "600" }}>Log out</Text>
        </Pressable>
      </View>

      <View style={{ 
        flexDirection: "row", 
        alignItems: "center", 
        gap: 8, 
        alignSelf: "flex-start",
        paddingHorizontal: 16, 
        paddingVertical: 10, 
        borderRadius: 999, 
        backgroundColor: colors.success + "15",
        borderWidth: 0,
        marginBottom: 20,
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
      }}> 
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
        <Text style={{ color: colors.success, fontSize: 12, fontWeight: "600" }}>
          Live updates enabled
        </Text>
      </View>


      {/* Location & radius */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Ionicons name="location" size={22} color={colors.secondary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Location & Radius</Text>
        </View>
        <Text style={{ color: colors.sub, marginBottom: 8 }}>
          {currentCity
            ? `Using location: ${currentCity}`
            : "No location yet"}
        </Text>

        <View style={styles.row}>
          <AnimatedPressable
            onPress={handleGetLocation}
            disabled={locationLoading}
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                marginRight: 8,
                flex: 1,
              },
            ]}
          >
            {locationLoading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  { color: colors.text },
                ]}
              >
                Use my location
              </Text>
            )}
          </AnimatedPressable>

          <TextInput
            style={[
              styles.inputSmall,
              { color: colors.text },
            ]}
            placeholder="Radius km"
            placeholderTextColor={colors.sub}
            keyboardType="numeric"
            value={radiusKm}
            onChangeText={setRadiusKm}
          />
        </View>

        <AnimatedPressable
          onPress={() => handleChangeTrendsScope("nearby")}
          style={{
            backgroundColor: colors.text,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 12,
            flexDirection: "row",
            gap: 8,
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <Ionicons name="search" size={18} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
            Search Nearby Trends
          </Text>
        </AnimatedPressable>
      </View>

      {/* Add Trend */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Ionicons name="add-circle" size={22} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Add a Trend</Text>
        </View>

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

        {placeSearchLoading && (
          <View style={styles.inlineStatusRow}>
            <ActivityIndicator color={colors.sub} size="small" />
            <Text style={{ color: colors.sub, marginLeft: 6, fontSize: 12 }}>Searching places…</Text>
          </View>
        )}

        {selectedPlace && (
          <View style={styles.selectedPlaceCard}> 
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="location-sharp" size={16} color={colors.secondary} />
              <Text style={{ color: colors.text, fontWeight: "600" }}>{selectedPlace.name}</Text>
              {selectedPlace.address && (
                <Text style={{ color: colors.sub, fontSize: 12 }}>{selectedPlace.address}</Text>
              )}
            </View>
            <Pressable onPress={handleClearSelectedPlace}>
              <Text style={{ color: colors.danger, fontWeight: "600" }}>Clear</Text>
            </Pressable>
          </View>
        )}

        {placeResults.length > 0 && (
          <View style={[styles.placeResultsContainer, { backgroundColor: colors.cardBg }]}> 
            {placeResults.map((place) => (
              <Pressable
                key={place.place_id}
                onPress={() => handleSelectPlace(place)}
                style={styles.placeResultRow}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>{place.name}</Text>
                {place.formatted_address && (
                  <Text style={{ color: colors.sub, fontSize: 12 }}>{place.formatted_address}</Text>
                )}
              </Pressable>
            ))}
            <Text style={{ color: colors.sub, fontSize: 11, marginTop: 4, textAlign: "right" }}>
              Places data by Google
            </Text>
          </View>
        )}

        <AnimatedPressable
          onPress={handleAddTrend}
          disabled={trendSubmitting}
          style={{ marginTop: 12 }}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.button, { opacity: trendSubmitting ? 0.7 : 1 }]}
          >
            {trendSubmitting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="rocket" size={20} color="#FFFFFF" />
                <Text
                  style={[
                    styles.buttonText,
                    { color: "#FFFFFF", fontSize: 16 },
                  ]}
                >
                  Post Trend & Earn Points
                </Text>
              </View>
            )}
          </LinearGradient>
        </AnimatedPressable>
      </View>

      {session?.user && (
        <View style={styles.card}> 
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialCommunityIcons name="robot-outline" size={22} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended for you</Text>
            </View>
            <Pressable
              onPress={loadRecommended}
              disabled={recommendedLoading}
              style={[
                styles.button,
                {
                  backgroundColor: colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  opacity: recommendedLoading ? 0.7 : 1,
                },
              ]}
            >
              {recommendedLoading ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <Text style={[styles.buttonText, { color: colors.text, fontSize: 12 }]}>Refresh</Text>
              )}
            </Pressable>
          </View>

          {recommendedLoading && recommendedTrends.length === 0 ? (
            <ActivityIndicator color={colors.sub} style={{ marginTop: 12 }} />
          ) : recommendedTrends.length === 0 ? (
            <Text style={{ color: colors.sub, marginTop: 8 }}>
              Like more trends to train your recommendations.
            </Text>
          ) : (
            <FlatList
              data={recommendedTrends}
              keyExtractor={(item) => item.id}
              renderItem={renderTrendItem}
              scrollEnabled={false}
              contentContainerStyle={{ paddingTop: 8 }}
            />
          )}
        </View>
      )}

      {/* Trends List */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="flame" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Trends</Text>
          </View>
          <View style={styles.scopeToggle}>
            <Pressable
              onPress={() => handleChangeTrendsScope("global")}
              style={[
                styles.scopeToggleButton,
                trendsScope === "global" && styles.scopeToggleButtonActive,
              ]}
            >
              <Text
                style={{
                  color: trendsScope === "global" ? colors.text : colors.sub,
                  fontWeight: "600",
                }}
              >
                Global
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleChangeTrendsScope("nearby")}
              style={[
                styles.scopeToggleButton,
                trendsScope === "nearby" && styles.scopeToggleButtonActive,
              ]}
            >
              <Text
                style={{
                  color: trendsScope === "nearby" ? colors.text : colors.sub,
                  fontWeight: "600",
                }}
              >
                Nearby
              </Text>
            </Pressable>
          </View>
        </View>
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
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="trophy" size={22} color={colors.warning} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Leaderboard</Text>
          </View>
          <Pressable
            onPress={() => refreshLeaderboard(leaderboardScope)}
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
        <View style={[styles.scopeToggle, { marginTop: 8 }]}> 
          <Pressable
            onPress={() => handleChangeLeaderboardScope("global")}
            style={[
              styles.scopeToggleButton,
              leaderboardScope === "global" && styles.scopeToggleButtonActive,
            ]}
          >
            <Text
              style={{
                color: leaderboardScope === "global" ? colors.text : colors.sub,
                fontWeight: "600",
              }}
            >
              Global
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleChangeLeaderboardScope("nearby")}
            style={[
              styles.scopeToggleButton,
              leaderboardScope === "nearby" && styles.scopeToggleButtonActive,
            ]}
          >
            <Text
              style={{
                color: leaderboardScope === "nearby" ? colors.text : colors.sub,
                fontWeight: "600",
              }}
            >
              Nearby
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
                padding: 14,
                borderWidth: 0,
                borderRadius: 16,
                backgroundColor: colors.secondary + "15",
                shadowColor: "#1A3B3F",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
                elevation: 2,
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
                    <Ionicons name="person" size={16} color={colors.sub} />
                  </View>
                )}
                
                <View style={styles.profileLevelRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
                      {profile.display_name || "You"}
                    </Text>
                    <View style={styles.levelBadge}>
                      <Ionicons name="star" size={16} color={colors.warning} />
                      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>{userLevel.name}</Text>
                      <Text style={{ color: colors.sub, marginLeft: 8, fontSize: 13 }}>{userPoints} pts</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
      </View>
      </Animated.View>
      </ScrollView>

      <Modal
        visible={commentsVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseComments}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.commentSheet, { backgroundColor: colors.cardBg }]}>
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
                    color: colors.text,
                    backgroundColor: "#F5FAFB",
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
                    backgroundColor: colors.primary,
                    opacity: postingComment ? 0.7 : 1,
                  },
                ]}
              >
                {postingComment ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={{ color: colors.text, fontWeight: "700" }}>Post</Text>
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
    borderWidth: 0,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    backgroundColor: colors.cardBg,
    shadowColor: "#1A3B3F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 8,
    backgroundColor: "#F5FAFB",
    color: colors.text,
    fontSize: 15,
    shadowColor: "#1A3B3F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  inputSmall: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 90,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonText: {
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  inlineStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scopeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5FAFB",
    borderRadius: 16,
    padding: 4,
  },
  scopeToggleButton: {
    borderWidth: 0,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  scopeToggleButtonActive: {
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  liveBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  trendCard: {
    borderWidth: 0,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    backgroundColor: colors.cardBg,
    shadowColor: "#1A3B3F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  trendTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    color: colors.text,
  },
  lbRow: {
    borderWidth: 0,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.cardBg,
    shadowColor: "#1A3B3F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  trendActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF6B7A",
    alignItems: "center",
    justifyContent: "center",
  },
  authorName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  authorMeta: {
    fontSize: 12,
    color: colors.sub,
  },
  trendActionButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  directionIconButton: {
    flexBasis: 48,
    maxWidth: 48,
    paddingHorizontal: 0,
  },
  commentBubble: {
    borderWidth: 0,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.cardBg,
    shadowColor: "#1A3B3F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  commentMeta: {
    marginTop: 6,
    fontSize: 11,
  },
  commentLikeButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
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
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  commentPostButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedPlaceCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  placeResultsContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  placeResultRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profileLevelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
