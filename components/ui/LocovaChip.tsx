import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';

const colors = {
  cardBg: "#0B1020",
  cardBorder: "#1C2337",
  neonCyan: "#1ACFF8",
  violet: "#975CFF",
  text: "#E7ECF5",
};

interface LocovaChipProps extends ViewProps {
  children: string;
  variant?: 'cyan' | 'violet' | 'glass';
  icon?: string;
}

export function LocovaChip({ children, variant = 'glass', icon, style, ...props }: LocovaChipProps) {
  const getColors = () => {
    switch (variant) {
      case 'cyan':
        return { bg: colors.neonCyan + '20', border: colors.neonCyan + '50', text: colors.neonCyan };
      case 'violet':
        return { bg: colors.violet + '30', border: colors.violet + '50', text: colors.violet };
      default:
        return { bg: 'rgba(15, 23, 42, 0.5)', border: colors.cardBorder, text: colors.text };
    }
  };

  const chipColors = getColors();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: chipColors.bg,
          borderColor: chipColors.border,
        },
        style,
      ]}
      {...props}
    >
      <Text style={[styles.chipText, { color: chipColors.text }]}>
        {icon && `${icon} `}{children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
