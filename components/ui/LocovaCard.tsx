import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

const colors = {
  cardBg: "#0B1020",
  cardBorder: "#1C2337",
  violet: "#975CFF",
};

interface LocovaCardProps extends ViewProps {
  children: React.ReactNode;
  glow?: boolean;
}

export function LocovaCard({ children, glow = false, style, ...props }: LocovaCardProps) {
  return (
    <View
      style={[
        styles.card,
        glow && styles.cardGlow,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardGlow: {
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
});
