import { create } from "zustand";

export const darkColors = {
  bg: "#0D0D0F",
  bgCard: "#141418",
  bgElevated: "#1E1E24",
  green: "#1DB954",
  greenLight: "#3DD670",
  greenDim: "#0E3D1F",
  blue: "#2D7DD2",
  blueLight: "#5B9FE8",
  blueDim: "#0E2A4A",
  primary: "#1DB954",
  primaryLight: "#3DD670",
  primaryDim: "#0E3D1F",
  textPrimary: "#F5F5F7",
  textSecondary: "#9A9AA8",
  textMuted: "#5A5A68",
  border: "#232328",
  borderLight: "#30303A",
  success: "#1DB954",
  error: "#E05252",
  warning: "#E09B3A",
};

export const lightColors = {
  bg: "#F7F7FA",
  bgCard: "#FFFFFF",
  bgElevated: "#EFEFF4",
  green: "#16A34A",
  greenLight: "#22C55E",
  greenDim: "#DCFCE7",
  blue: "#2563EB",
  blueLight: "#3B82F6",
  blueDim: "#DBEAFE",
  primary: "#16A34A",
  primaryLight: "#22C55E",
  primaryDim: "#DCFCE7",
  textPrimary: "#0D0D0F",
  textSecondary: "#4A4A58",
  textMuted: "#9A9AA8",
  border: "#E4E4EC",
  borderLight: "#EDEDF5",
  success: "#16A34A",
  error: "#DC2626",
  warning: "#D97706",
};

interface ThemeStore {
  isDark: boolean;
  toggle: () => void;
  colors: typeof darkColors;
}

export const useTheme = create<ThemeStore>((set) => ({
  isDark: true,
  colors: darkColors,
  toggle: () =>
    set((s) => ({
      isDark: !s.isDark,
      colors: s.isDark ? lightColors : darkColors,
    })),
}));

export const fonts = {
  sizes: {
    xs: 11, sm: 13, base: 15, md: 17, lg: 20, xl: 24, xxl: 30, xxxl: 38,
  },
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    heavy: "800" as const,
  },
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, full: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// Default export for screens that haven't migrated to useTheme yet
export const colors = lightColors;
