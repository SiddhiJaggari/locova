// app/(tabs)/index.tsx
import { Buffer } from "buffer";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import ProfileEditor from "../../components/ProfileEditor";
import { supabase } from "../../lib/supabase";
import {
  getMyProfile,
  uploadAvatarPublic,
  upsertMyProfile,
} from "../../services/profile";
import { Trend, UserProfile } from "../../types";

globalThis.Buffer = globalThis.Buffer || Buffer;

type LeaderboardRow = {
  id: string;
  points: number;
  display_name?: string | null;
  avatar_url?: string | null;
};

export default function HomeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const colors = useMemo(
    () => ({
      bg: isDark ? "#000" : "#f9fafb",
      text: isDark ? "#f9fafb" : "#111827",
      sub: isDark ? "#9ca3af" : "#6b7280",
      cardBg: isDark ? "#111827" : "#ffffff",
      cardBorder: isDark ? "#1f2937" : "#e5e7eb",
      border: isDark ? "#374151" : "#e5e7eb",
      buttonBg: "#2563eb",
      buttonText: "#ffffff",
      danger: "#dc2626",
    }),
    [isDark]
  );

  // ---------- AUTH ----------
  const [user, setUser] = useState<any | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ---------- PROFILE ----------
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // ---------- TRENDS ----------
  const [data, setData] = useState<Trend[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ---------- LOCATION / RADIUS ----------
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [radiusKm, setRadiusKm] = useState<number>(20);

  // ---------- POINTS ----------
  const [points, setPoints] = useState<number | null>(null);

  // ---------- LEADERBOARD ----------
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  // ---------- SESSION BOOTSTRAP ----------
  useEffect(() => {
    let sub: any;

    (async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user ?? null);
        }
      );

      sub = listener;
    })();

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // ---------- GEOLOCATION (city + coords) ----------
  useEffect(() => {
    (async () => {
      try {
        setLocating(true);
        const { status } =
          await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocating(false);
          Alert.alert(
            "Permission Denied",
            "Location access is needed to show nearby trends."
          );
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });

        const places = await Location.reverseGeocodeAsync(pos.coords);
        const best =
          places[0]?.city ||
          places[0]?.subregion ||
          places[0]?.region ||
          places[0]?.district ||
          null;
        setUserLocation(best);
      } catch (e: any) {
        console.warn("Location error:", e?.message ?? e);
      } finally {
        setLocating(false);
      }
    })();
  }, []);

  // ---------- LOAD PROFILE + POINTS + LEADERBOARD WHEN USER CHANGES ----------
  useEffect(() => {
    (async () => {
      if (!user) {
        setProfile(null);
        setPoints(null);
        setLeaderboard([]);
        return;
      }

      const p = await getMyProfile(user.id);
      setProfile(p);

      await loadPoints(user.id);
      await loadLeaderboard();
    })();
  }, [user]);

  // ---------- LOAD TRENDS WHEN LOCATION / RADIUS CHANGES ----------
  useEffect(() => {
    fetchTrends();
  }, [coords, userLocation, radiusKm]);

  // ---------- HELPERS ----------

  const loadPoints = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("points")
      .eq("id", userId)
      .single();

    if (!error && data?.points !== undefined) {
      setPoints(data.points);
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true);

    // Privacy-first RPC (top_leaderboard)
    const { data, error } = await supabase.rpc("top_leaderboard", {
      limit_count: 10,
    });

    setLbLoading(false);

    if (error) {
      console.error("Error loading leaderboard:", error);
      return;
    }

    setLeaderboard((data as LeaderboardRow[]) ?? []);
  }, []);

  const fetchTrends = useCallback(async () => {
    setLoading(true);

    try {
      // If we have precise coords, prefer RPC radius search
      if (coords) {
        const { data, error } = await supabase.rpc(
          "trends_within_radius",
          {
            in_lat: coords.lat,
            in_lng: coords.lng,
            radius_km: radiusKm,
          }
        );

        if (error) {
          console.error("Radius RPC error:", error);
          Alert.alert("Read error", error.message);
        } else {
          setData((data as Trend[]) ?? []);
        }
        return;
      }

      // Fallback: filter by city text
      let query = supabase
        .from("trends")
        .select("*")
        .order("created_at", { ascending: false });

      if (userLocation && userLocation.trim()) {
        query = query.ilike("location", `%${userLocation}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Fetch trends error:", error);
        Alert.alert("Read error", error.message);
      } else {
        setData((data as Trend[]) ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [coords, radiusKm, userLocation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrends();
    setRefreshing(false);
  }, [fetchTrends]);

  // ---------- AUTH HANDLERS ----------
  const handleSignUp = useCallback(async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert("Signup Error", error.message);
      return;
    }

    const newUserId = data?.user?.id;
    if (newUserId) {
      // If trigger exists, this will be ignored; otherwise we seed profile
      await supabase
        .from("user_profiles")
        .insert({ id: newUserId })
        .select();
    }

    Alert.alert(
      "Success",
      "Check your email to confirm your account!"
    );
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert("Login Failed", error.message);
      return;
    }

    Alert.alert("Welcome back!");
  }, [email, password]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setPoints(null);
  }, []);

  // ---------- SUBMIT TREND ----------
  const handleSubmitTrend = useCallback(async () => {
    if (!user) {
      Alert.alert("Login Required", "Please log in to submit a trend.");
      return;
    }

    if (!title || !category || !locationInput) {
      Alert.alert("Missing info", "Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      let lat: number | null = coords?.lat ?? null;
      let lng: number | null = coords?.lng ?? null;

      const { data: inserted, error: insertError } = await supabase
        .from("trends")
        .insert([
          {
            title,
            category,
            location: locationInput,
            user_id: user.id,
            lat,
            lng,
          },
        ])
        .select();

      if (insertError) {
        Alert.alert("Error", insertError.message);
        return;
      }

      // Award points via RPC (+10)
      const { error: rpcErr } = await supabase.rpc(
        "increment_points",
        {
          user_id_input: user.id,
          amount: 10,
        }
      );
      if (rpcErr) {
        console.error("Error awarding points:", rpcErr.message);
      }

      setTitle("");
      setCategory("");
      setLocationInput("");

      await loadPoints(user.id);
      await loadLeaderboard();
      await fetchTrends();

      Alert.alert(
        "Success",
        "Trend submitted and points awarded!"
      );
    } finally {
      setLoading(false);
    }
  }, [
    user,
    title,
    category,
    locationInput,
    coords,
    loadPoints,
    loadLeaderboard,
    fetchTrends,
  ]);

  // ---------- SAVE PROFILE (NAME + AVATAR) ----------
  const handleSaveProfile = useCallback(
    async (params: {
      displayName: string;
      avatarUrl: string | null;
    }) => {
      if (!user) throw new Error("Not logged in");

      let finalAvatarUrl: string | null =
        profile?.avatar_url ?? null;

      // If avatarUrl is a local file, convert and upload
      if (params.avatarUrl && params.avatarUrl.startsWith("file")) {
        try {
          // 1) Re-encode to JPEG
          const manipulated = await ImageManipulator.manipulateAsync(
            params.avatarUrl,
            [],
            {
              compress: 0.8,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );

          // 2) Read JPEG file
          const file = await File.fromUriAsync(manipulated.uri);
          const base64 = await file.readAsStringAsync({
            encoding: "base64",
          });

          // 3) Base64 → bytes → Blob
          const bytes = Buffer.from(base64, "base64");
          const blob = new Blob([bytes], { type: "image/jpeg" });

          // 4) Upload as jpg and get public URL
          finalAvatarUrl = await uploadAvatarPublic(
            user.id,
            blob,
            "jpg"
          );

          console.log("Uploaded avatar URL:", finalAvatarUrl);
          Alert.alert(
            "Debug",
            `Uploaded avatar:\n${finalAvatarUrl}`
          );
        } catch (error: any) {
          console.error("Upload failed", error);
          Alert.alert(
            "Upload failed",
            error.message ?? "Unknown error"
          );
        }
      }

      await upsertMyProfile(user.id, {
        display_name: params.displayName || null,
        avatar_url: finalAvatarUrl,
      });

      const fresh = await getMyProfile(user.id);
      setProfile(fresh);
    },
    [user, profile]
  );

  // ---------- RENDER ----------

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingHorizontal: 16,
        paddingTop: 16,
      }}
    >
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={
          <View>
            <Text
              style={{
                color: colors.text,
                fontSize: 24,
                fontWeight: "800",
                marginBottom: 8,
              }}
            >
              Locova Trends 🌍
            </Text>

            {/* Greeting with avatar */}
            {user && (
              <View style={styles.row}>
                {profile?.avatar_url ? (
                  <Image
                    source={{
                      uri: `${profile.avatar_url}?v=${Date.now()}`,
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      marginRight: 8,
                    }}
                  />
                ) : null}
                <View>
                  <Text
                    style={{ color: colors.text, fontSize: 16 }}
                  >
                    Welcome,{" "}
                    <Text style={{ fontWeight: "700" }}>
                      {profile?.display_name || user.email}
                    </Text>
                  </Text>
                  {points !== null && (
                    <Text
                      style={{
                        color: colors.sub,
                        fontSize: 14,
                        marginTop: 2,
                      }}
                    >
                      🏆 Your Points: {points}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Location info */}
            {locating ? (
              <Text
                style={{
                  color: colors.sub,
                  marginTop: 8,
                  marginBottom: 4,
                }}
              >
                📍 Detecting your location…
              </Text>
            ) : userLocation ? (
              <View style={styles.row}>
                <Text style={{ color: colors.text }}>
                  📍 Showing trends near{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {userLocation}
                  </Text>
                </Text>
                <Pressable
                  onPress={async () => {
                    try {
                      setLocating(true);
                      const { status } =
                        await Location.requestForegroundPermissionsAsync();
                      if (status !== "granted") return;
                      const pos =
                        await Location.getCurrentPositionAsync({
                          accuracy:
                            Location.Accuracy.Balanced,
                        });
                      setCoords({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                      });
                      const places =
                        await Location.reverseGeocodeAsync(
                          pos.coords
                        );
                      const best =
                        places[0]?.city ||
                        places[0]?.subregion ||
                        places[0]?.region ||
                        places[0]?.district ||
                        null;
                      setUserLocation(best);
                    } finally {
                      setLocating(false);
                    }
                  }}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                  ]}
                >
                  <Text style={{ color: colors.text }}>
                    Use GPS again
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Text
                style={{
                  color: colors.sub,
                  marginTop: 8,
                  marginBottom: 4,
                }}
              >
                📍 Location off. Turn it on to see nearby trends
                (or type a city in “Location” when submitting).
              </Text>
            )}

            {/* Radius input */}
            <View style={[styles.row, { marginTop: 8 }]}>
              <Text style={{ color: colors.text, marginRight: 8 }}>
                Radius (km):
              </Text>
              <TextInput
                style={[
                  styles.input,
                ]}
                keyboardType="numeric"
                placeholder="20"
                placeholderTextColor={colors.sub}
                value={String(radiusKm)}
                onChangeText={(v) => {
                  const n = Number(v);
                  if (!isNaN(n)) setRadiusKm(n);
                }}
              />
            </View>

            {/* AUTH BOX */}
            <View
              style={[
                styles.card,
                { borderColor: colors.cardBorder },
              ]}
            >
              {!user ? (
                <>
                  <Text
                    style={[
                      styles.h2,
                      { color: colors.text, marginBottom: 8 },
                    ]}
                  >
                    Login or Sign Up
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Email"
                    keyboardType="email-address"
                    placeholderTextColor={colors.sub}
                    value={email}
                    onChangeText={setEmail}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Password"
                    secureTextEntry
                    placeholderTextColor={colors.sub}
                    value={password}
                    onChangeText={setPassword}
                  />

                  <Pressable
                    onPress={handleSignUp}
                    style={[
                      styles.button,
                      { backgroundColor: colors.buttonBg },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.buttonText,
                        fontWeight: "600",
                      }}
                    >
                      Sign Up
                    </Text>
                  </Pressable>
                  <View style={{ height: 8 }} />
                  <Pressable
                    onPress={handleLogin}
                    style={[
                      styles.button,
                      { backgroundColor: colors.buttonBg },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.buttonText,
                        fontWeight: "600",
                      }}
                    >
                      Login
                    </Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.row}>
                  <View>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "600",
                      }}
                    >
                      Welcome, {user.email}
                    </Text>
                    {points !== null && (
                      <Text
                        style={{
                          color: colors.sub,
                          marginTop: 2,
                        }}
                      >
                        🏆 Your Points: {points}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={handleLogout}
                    style={[
                      styles.button,
                      {
                        backgroundColor: colors.danger,
                        marginLeft: "auto",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "600",
                      }}
                    >
                      Logout
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* PROFILE EDITOR */}
            {user && (
              <ProfileEditor
                colors={colors}
                userId={user.id}
                initialDisplayName={profile?.display_name || ""}
                initialAvatarUrl={profile?.avatar_url || null}
                onSave={handleSaveProfile}
              />
            )}

            {/* TREND FORM */}
            <View
              style={[
                styles.card,
                { borderColor: colors.cardBorder },
              ]}
            >
              <Text
                style={[
                  styles.h2,
                  { color: colors.text, marginBottom: 8 },
                ]}
              >
                Submit a New Trend
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Title"
                placeholderTextColor={colors.sub}
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Category (Food, Event, Place…)"
                placeholderTextColor={colors.sub}
                value={category}
                onChangeText={setCategory}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Location (city, e.g., Boston)"
                placeholderTextColor={colors.sub}
                value={locationInput}
                onChangeText={setLocationInput}
              />

              <Pressable
                onPress={handleSubmitTrend}
                style={[
                  styles.button,
                  { backgroundColor: colors.buttonBg },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.buttonText} />
                ) : (
                  <Text
                    style={{
                      color: colors.buttonText,
                      fontWeight: "600",
                    }}
                  >
                    Submit Trend
                  </Text>
                )}
              </Pressable>
            </View>

            {/* LEADERBOARD HEADER */}
            <Text
              style={[
                styles.h2,
                {
                  color: colors.text,
                  marginTop: 16,
                  marginBottom: 4,
                },
              ]}
            >
              🏆 Leaderboard
            </Text>
            {lbLoading ? (
              <Text style={{ color: colors.sub }}>
                Loading leaderboard…
              </Text>
            ) : leaderboard.length === 0 ? (
              <Text style={{ color: colors.sub }}>
                No rankings yet.
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          // Trend card
          return (
            <View
              style={[
                styles.card,
                {
                  borderColor: colors.cardBorder,
                  marginTop: 8,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "600",
                  marginBottom: 2,
                }}
              >
                {item.title}
              </Text>
              <Text style={{ color: colors.sub }}>
                {item.category} • {item.location}
              </Text>
              <Text
                style={{
                  color: colors.sub,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {new Date(
                  item.created_at
                ).toLocaleString()}
              </Text>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={{ marginTop: 16, marginBottom: 32 }}>
            {leaderboard.length > 0 && (
              <FlatList
                data={leaderboard}
                keyExtractor={(row) => row.id}
                scrollEnabled={false}
                renderItem={({ item, index }) => {
                  const isYou = user?.id === item.id;
                  const name =
                    item.display_name ??
                    (isYou ? "You" : item.id.slice(0, 6) + "…");
                  return (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        borderRadius: 12,
                        backgroundColor: isYou
                          ? "#0ea5e922"
                          : colors.cardBg,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "800",
                          width: 28,
                          textAlign: "right",
                        }}
                      >
                        #{index + 1}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.text,
                            fontWeight: "600",
                          }}
                        >
                          {name}
                        </Text>
                        <Text
                          style={{
                            color: colors.sub,
                            fontSize: 12,
                          }}
                        >
                          {item.id.slice(0, 8)}…
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "700",
                        }}
                      >
                        {item.points} pts
                      </Text>
                    </View>
                  );
                }}
              />
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 8,
  },
  card: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: "transparent",
  },
  h2: {
    fontSize: 18,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    flex: 1,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
