import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, ImageProps, StyleSheet } from 'react-native';

const colors = {
  galaxyGradient: ["#1ACFF8", "#975CFF", "#FF7A32"] as const,
};

interface AvatarRingProps extends Omit<ImageProps, 'style'> {
  size?: number;
  ringWidth?: number;
}

export function AvatarRing({ size = 80, ringWidth = 3, source, ...props }: AvatarRingProps) {
  return (
    <LinearGradient
      colors={colors.galaxyGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.ring,
        {
          width: size + ringWidth * 2,
          height: size + ringWidth * 2,
          borderRadius: (size + ringWidth * 2) / 2,
          padding: ringWidth,
        },
      ]}
    >
      <Image
        source={source}
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
        {...props}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  ring: {
    shadowColor: "#1ACFF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: {
    backgroundColor: '#0B1020',
  },
});
