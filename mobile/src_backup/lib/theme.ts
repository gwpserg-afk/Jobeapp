import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Theme = "light" | "dark";
export type StatusBarStyle = "light" | "dark";

// Base color interface to ensure type consistency
export interface ThemeColors {
  background: string;
  backgroundAlt: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnBg: string;
  primary: string;
  accent: string;
  border: string;
  toggleBg: string;
  toggleActiveBg: string;
  toggleActiveText: string;
  toggleInactiveText: string;
  statusBarStyle: StatusBarStyle;
  placeholder: string;
  urgentBg: string;
  urgentText: string;
}

// Color constants for light mode
export const lightColors: ThemeColors = {
  background: "#F5F7FA",
  backgroundAlt: "#FFFFFF",
  card: "#FFFFFF",
  text: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textOnBg: "#111827",
  primary: "#1B2F6E",
  accent: "#3BAD4E",
  border: "#E5E7EB",
  toggleBg: "#F0F0F0",
  toggleActiveBg: "#1B2F6E",
  toggleActiveText: "#FFFFFF",
  toggleInactiveText: "#9CA3AF",
  statusBarStyle: "dark",
  placeholder: "#F4F6FB",
  urgentBg: "#FFF0F0",
  urgentText: "#E74C3C",
};

// Color constants for dark mode — dark navy blue theme
export const darkColors: ThemeColors = {
  background: "#0F1B3D",
  backgroundAlt: "#1E2C50",
  card: "#1E2C50",
  text: "#FFFFFF",
  textSecondary: "#9BA5BF",
  textMuted: "#6B7A99",
  textOnBg: "#FFFFFF",
  primary: "#FFFFFF",
  accent: "#4CC563",
  border: "#2A3B6A",
  toggleBg: "#243260",
  toggleActiveBg: "#4CC563",
  toggleActiveText: "#FFFFFF",
  toggleInactiveText: "#6B7A99",
  statusBarStyle: "light",
  placeholder: "#1E2C50",
  urgentBg: "#2A1A1A",
  urgentText: "#FF8080",
};

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  colors: ThemeColors;
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "light",
      isDark: false,
      colors: lightColors,
      setTheme: (theme) =>
        set({
          theme,
          isDark: theme === "dark",
          colors: theme === "dark" ? darkColors : lightColors,
        }),
      toggleTheme: () => {
        const newTheme = get().theme === "dark" ? "light" : "dark";
        set({
          theme: newTheme,
          isDark: newTheme === "dark",
          colors: newTheme === "dark" ? darkColors : lightColors,
        });
      },
    }),
    {
      name: "theme-storage-v2",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        // Restore the saved theme properly
        if (state) {
          state.isDark = state.theme === "dark";
          state.colors = state.theme === "dark" ? darkColors : lightColors;
        }
      },
    }
  )
);
