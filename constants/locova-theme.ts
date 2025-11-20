/**
 * Locova Futuristic Theme
 * Dark mode core theme + Neon gradient accents + Minimalistic cards
 */

export const LocovaColors = {
  // Base
  bg: "#050813",         // Deep cosmic navy-black
  cardBg: "#0B1020",     // Dark slate-blue for contrast
  cardBorder: "#1C2337", // Dim bluish-gray border
  
  // Text
  text: "#E7ECF5",       // Soft white with slight blue tint
  subtext: "#94A2C2",    // Muted gray-blue for labels
  muted: "#5C6785",      // Tertiary labels
  
  // Neon Accents
  neonCyan: "#1ACFF8",   // Primary accent (buttons, highlights)
  violet: "#975CFF",     // Secondary accent (gradients, emphasis)
  neonOrange: "#FF7A32", // Alerts, rewards, "hot" trends
  
  // States
  success: "#3ED689",
  warning: "#FFB84A",
  error: "#FF5C5C",
  
  // Gradients
  galaxyGradient: ["#1ACFF8", "#975CFF", "#FF7A32"] as const,
  cyanPulse: ["#0A2A45", "#1ACFF8"] as const,
};

export const LocovaSpacing = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
};

export const LocovaRadius = {
  small: 10,
  medium: 14,
  card: 16,
  large: 20,
  pill: 999,
};

export const LocovaTypography = {
  display: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 11,
    fontWeight: '400' as const,
  },
};

export const LocovaShadows = {
  card: {
    shadowColor: LocovaColors.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  button: {
    shadowColor: LocovaColors.neonCyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: {
    shadowColor: LocovaColors.neonCyan,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
};
