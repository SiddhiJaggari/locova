import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

const colors = {
  text: "#E7ECF5",
  galaxyGradient: ["#1ACFF8", "#975CFF", "#FF7A32"] as const,
  neonCyan: "#1ACFF8",
};

interface PointsBadgeProps {
  points: number;
  label?: string;
}

export function PointsBadge({ points, label = "Points" }: PointsBadgeProps) {
  return (
    <LinearGradient
      colors={colors.galaxyGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.badge}
    >
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text style={styles.points}>{points}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    shadowColor: colors.neonCyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  points: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
});
