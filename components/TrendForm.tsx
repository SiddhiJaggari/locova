// components/TrendForm.tsx
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  colors: any;
  title: string;
  category: string;
  location: string;
  onChangeTitle: (v: string) => void;
  onChangeCategory: (v: string) => void;
  onChangeLocation: (v: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  submitting: boolean;
};

export default function TrendForm({
  colors,
  title,
  category,
  location,
  onChangeTitle,
  onChangeCategory,
  onChangeLocation,
  onSubmit,
  canSubmit,
  submitting,
}: Props) {
  return (
    <View>
      <Text style={[styles.h2, { color: colors.text }]}>Submit a New Trend</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Title"
        placeholderTextColor={colors.sub}
        value={title}
        onChangeText={onChangeTitle}
        autoCapitalize="words"
      />
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Category (Food, Event, Place…)"
        placeholderTextColor={colors.sub}
        value={category}
        onChangeText={onChangeCategory}
        autoCapitalize="words"
      />
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Location (city, e.g., Boston)"
        placeholderTextColor={colors.sub}
        value={location}
        onChangeText={onChangeLocation}
        autoCapitalize="words"
      />
      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        style={[
          styles.button,
          { backgroundColor: colors.buttonBg, alignSelf: "flex-start", opacity: canSubmit ? 1 : 0.6 },
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.buttonText }]}>
          {submitting ? "Submitting…" : "Submit Trend"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  h2: { fontSize: 18, fontWeight: "700", marginVertical: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
  button: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  buttonText: { fontWeight: "700" },
});
