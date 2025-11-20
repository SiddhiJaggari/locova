import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text } from 'react-native';

const colors = {
  bg: "#050813",
  cardBg: "#0B1020",
  neonCyan: "#1ACFF8",
  text: "#E7ECF5",
  galaxyGradient: ["#1ACFF8", "#975CFF", "#FF7A32"] as const,
};

interface LocovaButtonProps extends Omit<PressableProps, 'style'> {
  children: string;
  variant?: 'primary' | 'secondary' | 'gradient';
  loading?: boolean;
  style?: any;
}

export function LocovaButton({ 
  children, 
  variant = 'primary', 
  loading = false,
  disabled,
  style,
  ...props 
}: LocovaButtonProps) {
  if (variant === 'gradient') {
    return (
      <Pressable disabled={disabled || loading} style={style} {...props}>
        <LinearGradient
          colors={colors.galaxyGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, styles.gradientButton, (disabled || loading) && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.bg }]}>{children}</Text>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={disabled || loading}
      style={[
        styles.button,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.bg : colors.neonCyan} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            { color: variant === 'primary' ? colors.bg : colors.neonCyan },
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: colors.neonCyan,
    shadowColor: colors.neonCyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  secondaryButton: {
    backgroundColor: colors.cardBg,
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
  },
  gradientButton: {
    shadowColor: colors.neonCyan,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
