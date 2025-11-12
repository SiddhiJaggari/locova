// components/AuthBox.tsx
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  colors: any;
  user: any;
  email: string;
  password: string;
  points: number | null;
  authBusy: boolean;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  onSignUp: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

export default function AuthBox({
  colors,
  user,
  email,
  password,
  points,
  authBusy,
  onChangeEmail,
  onChangePassword,
  onSignUp,
  onLogin,
  onLogout,
}: Props) {
  return (
    <View style={[styles.authBox, { borderColor: colors.border }]}>
      {!user ? (
        <>
          <Text style={[styles.h2, { color: colors.text }]}>Login or Sign Up</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Email"
            placeholderTextColor={colors.sub}
            value={email}
            onChangeText={onChangeEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Password"
            placeholderTextColor={colors.sub}
            value={password}
            onChangeText={onChangePassword}
            secureTextEntry
          />
          <View style={styles.row}>
            <Pressable
              disabled={authBusy}
              onPress={onSignUp}
              style={[styles.button, { backgroundColor: colors.buttonBg, opacity: authBusy ? 0.7 : 1 }]}
            >
              <Text style={[styles.buttonText, { color: colors.buttonText }]}>{authBusy ? "…" : "Sign Up"}</Text>
            </Pressable>
            <Pressable
              disabled={authBusy}
              onPress={onLogin}
              style={[styles.button, { backgroundColor: colors.buttonBg, opacity: authBusy ? 0.7 : 1 }]}
            >
              <Text style={[styles.buttonText, { color: colors.buttonText }]}>{authBusy ? "…" : "Login"}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.rowBetween}>
          <View>
            <Text style={{ color: colors.text }}>Welcome, {user.email}</Text>
            {points !== null && <Text style={{ color: colors.text, marginTop: 4 }}>🏆 Your Points: {points}</Text>}
          </View>
          <Pressable
            disabled={authBusy}
            onPress={onLogout}
            style={[styles.button, { backgroundColor: "#ef4444", opacity: authBusy ? 0.7 : 1 }]}
          >
            <Text style={[styles.buttonText, { color: "#ffffff" }]}>Logout</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  h2: { fontSize: 18, fontWeight: "700", marginVertical: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
  button: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  buttonText: { fontWeight: "700" },
  row: { flexDirection: "row", gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  authBox: { padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 16 },
});
