// components/ProfileEditor.tsx
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  colors: any;
  userId: string; // not used directly here, but handy if you want future tweaks
  initialDisplayName?: string;
  initialAvatarUrl?: string | null;
  onSave: (params: {
    displayName: string;
    avatarUrl: string | null; // URI or existing URL
  }) => Promise<void>;
};

export default function ProfileEditor({
  colors,
  userId,
  initialDisplayName = "",
  initialAvatarUrl,
  onSave,
}: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [localImage, setLocalImage] = useState<{ uri: string } | null>(
    null
  );
  const [uploading, setUploading] = useState(false);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setLocalImage({ uri: result.assets[0].uri });
      }
    } catch (e) {
      console.error("Image Picker Error:", e);
      Alert.alert("Error", "Unable to open image library");
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please allow camera access to take a photo."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setLocalImage({ uri: result.assets[0].uri });
      }
    } catch (e) {
      console.error("Camera Error:", e);
      Alert.alert("Error", "Unable to open camera");
    }
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setUploading(true);

      await onSave({
        displayName,
        avatarUrl: localImage
          ? localImage.uri // local file URI → handled in index.tsx
          : initialAvatarUrl
          ? initialAvatarUrl
          : null,
      });

      Alert.alert("Success", "Profile updated!");
    } catch (e: any) {
      console.error("ProfileEditor handleSave error:", e);
      Alert.alert("Update failed", e?.message ?? "Unknown error");
    } finally {
      setUploading(false);
    }
  }, [displayName, localImage, initialAvatarUrl, onSave]);

  const previewUri = localImage?.uri || initialAvatarUrl || undefined;

  return (
    <View style={[styles.box, { borderColor: colors.border }]}>
      <Text style={[styles.h2, { color: colors.text }]}>
        👤 Your Profile
      </Text>

      <View style={styles.row}>
        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              marginRight: 12,
            }}
          />
        ) : (
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              marginRight: 12,
              backgroundColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.sub }}>No Photo</Text>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={pickImage}
            style={[
              styles.button,
              { backgroundColor: colors.buttonBg },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                { color: colors.buttonText },
              ]}
            >
              Pick Avatar
            </Text>
          </Pressable>

          <Pressable
            onPress={takePhoto}
            style={[
              styles.button,
              { backgroundColor: colors.buttonBg },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                { color: colors.buttonText },
              ]}
            >
              Take Photo
            </Text>
          </Pressable>
        </View>
      </View>

      <TextInput
        style={[
          styles.input,
          { borderColor: colors.border, color: colors.text },
        ]}
        placeholder="Display Name"
        placeholderTextColor={colors.sub}
        value={displayName}
        onChangeText={setDisplayName}
      />

      <Pressable
        onPress={handleSave}
        disabled={uploading}
        style={[
          styles.button,
          {
            backgroundColor: colors.buttonBg,
            opacity: uploading ? 0.7 : 1,
            marginTop: 4,
          },
        ]}
      >
        {uploading ? (
          <ActivityIndicator color={colors.buttonText} />
        ) : (
          <Text
            style={[
              styles.buttonText,
              { color: colors.buttonText },
            ]}
          >
            Save Profile
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  h2: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    marginBottom: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  buttonText: {
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
});
