import { Platform } from "react-native";

export const GameColors = {
  casinoGreen: "#0B5D1E",
  casinoGreenDark: "#073D14",
  richWood: "#3E2723",
  richWoodLight: "#5D4037",
  gold: "#D4AF37",
  goldLight: "#E8C54D",
  goldDark: "#B8972F",
  cardFace: "#FFFFFF",
  cardBack: "#8B0000",
  redSuit: "#C41E3A",
  blackSuit: "#1C1C1C",
  feltTexture: "#0A5A1C",
};

export const Colors = {
  light: {
    text: "#FFFFFF",
    textSecondary: "#B0B0B0",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: GameColors.gold,
    link: GameColors.gold,
    backgroundRoot: "#1A1A1A",
    backgroundDefault: "#2C2C2C",
    backgroundSecondary: "#353739",
    backgroundTertiary: "#404244",
    border: "rgba(212, 175, 55, 0.3)",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#B0B0B0",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: GameColors.gold,
    link: GameColors.gold,
    backgroundRoot: "#1A1A1A",
    backgroundDefault: "#2C2C2C",
    backgroundSecondary: "#353739",
    backgroundTertiary: "#404244",
    border: "rgba(212, 175, 55, 0.3)",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  hero: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "700" as const,
  },
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
  },
  button: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const CardDimensions = {
  width: 60,
  height: 84,
  borderRadius: 6,
  smallWidth: 45,
  smallHeight: 63,
};

export const PLAYER_COLORS = [
  "#4CAF50", // Green - Player 1 (you)
  "#2196F3", // Blue - Player 2
  "#FF9800", // Orange - Player 3
  "#E91E63", // Pink - Player 4
  "#9C27B0", // Purple - Player 5
  "#00BCD4", // Cyan - Player 6
];
