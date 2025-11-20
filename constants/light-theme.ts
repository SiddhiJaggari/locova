// Light Theme with Cool Aqua & Rose Red Accents
export const LightLocovaColors = {
  // Base colors - Cool light theme
  bg: "#F0F9FA",              // Very light aqua/mint background
  cardBg: "#FFFFFF",          // Pure white cards
  cardOverlay: "rgba(255, 255, 255, 0.95)",
  cardBorder: "#D4E8EA",      // Soft aqua border
  
  // Text colors
  text: "#1A3B3F",            // Deep teal text
  sub: "#5A7B7E",             // Muted teal
  muted: "#8FA9AB",           // Light muted teal
  
  // Accent colors - Rose Red
  primary: "#FF6B7A",         // Light rose red
  primaryLight: "#FFB3BC",    // Lighter rose
  primaryDark: "#E85563",     // Deeper rose
  
  // Secondary accents - Cool tones
  secondary: "#6ECFD9",       // Bright aqua/cyan
  secondaryLight: "#A8E6ED",  // Light aqua
  tertiary: "#9B8FFF",        // Soft purple
  
  // Status colors
  success: "#5DD9A8",         // Mint green
  warning: "#FFB84A",         // Warm amber
  error: "#FF6B7A",           // Rose red
  info: "#6ECFD9",            // Aqua
  
  // Gradients
  roseGradient: ["#FF6B7A", "#FF8FA0", "#FFB3BC"],
  aquaGradient: ["#6ECFD9", "#8FE0E8", "#A8E6ED"],
  coolGradient: ["#A8E6ED", "#C5F0F5", "#E0F8FA"],
  
  // Special
  border: "#D4E8EA",
  shadow: "rgba(26, 59, 63, 0.08)",
  overlay: "rgba(240, 249, 250, 0.95)",
};

export const LightLocovaSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const LightLocovaRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const LightLocovaTypography = {
  h1: { fontSize: 32, fontWeight: "800" as const, letterSpacing: 0.5 },
  h2: { fontSize: 24, fontWeight: "700" as const, letterSpacing: 0.3 },
  h3: { fontSize: 20, fontWeight: "700" as const },
  h4: { fontSize: 18, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "500" as const },
  small: { fontSize: 11, fontWeight: "500" as const },
};

export const LightLocovaShadows = {
  sm: {
    shadowColor: "#1A3B3F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#1A3B3F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#FF6B7A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  rose: {
    shadowColor: "#FF6B7A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  aqua: {
    shadowColor: "#6ECFD9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
};
