import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSession } from "@/lib/auth/use-session";
import { useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { ToastContainer } from "../components/Toast";
import { useDemoStore } from "@/lib/demoStore";
import { ActivityIndicator, NativeModules, Platform, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

function getDeviceLanguage(): string {
  if (Platform.OS === "ios") {
    const settings = NativeModules.SettingsManager?.settings;
    return settings?.AppleLocale ?? settings?.AppleLanguages?.[0] ?? "fr";
  }
  return NativeModules.I18nManager?.localeIdentifier ?? "fr";
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const LANG_AUTO_DETECT_KEY = "jobe-lang-auto-detected-v1";

function RootLayoutNav() {
  const { data: session, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const setLang = useLang((s) => s.setLang);
  const currentLang = useLang((s) => s.lang);
  const isDemoLoggedIn = useDemoStore((s) => s.isDemoLoggedIn);
  const demoAccountType = useDemoStore((s) => s.demoAccountType);
  const resetDemo = useDemoStore((s) => s.resetDemo);
  const dbLangApplied = useRef(false);
  const colors = useTheme((s) => s.colors);

  // Auto-detect language on first launch only
  useEffect(() => {
    AsyncStorage.getItem(LANG_AUTO_DETECT_KEY).then((detected) => {
      if (detected === null) {
        const rawLang = getDeviceLanguage().slice(0, 2).toLowerCase();
        const systemLang = rawLang;
        const supported = ["fr", "en", "zh"] as const;
        type SupportedLang = typeof supported[number];
        const lang: SupportedLang = supported.includes(systemLang as SupportedLang)
          ? (systemLang as SupportedLang)
          : "fr";
        setLang(lang);
        AsyncStorage.setItem(LANG_AUTO_DETECT_KEY, "1");
      }
    });
  }, []);

  useEffect(() => {
    if (!session?.user && !isDemoLoggedIn) {
      resetDemo();
    }
  }, [session?.user?.id, isDemoLoggedIn]);

  useEffect(() => {
    if (dbLangApplied.current) return;
    const dbLang = (session?.user as any)?.languagePreference;
    if ((dbLang === "fr" || dbLang === "en" || dbLang === "zh") && currentLang === "en") {
      dbLangApplied.current = true;
      setLang(dbLang);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (isLoading) return;

    const protectedScreens = new Set([
      "(app)", "onboarding", "company-profile", "job-detail",
      "connections", "post-detail", "settings-security", "verify-identity",
      "notifications",
    ]);
    const inAuthGroup = protectedScreens.has(segments[0] ?? "");
    const isAuthenticated = !!session?.user || isDemoLoggedIn;

    if (isAuthenticated && !inAuthGroup) {
      router.replace("/(app)/(tabs)" as never);
    } else if (!isAuthenticated && inAuthGroup) {
      router.replace("/welcome");
    }
  }, [session, isLoading, segments, isDemoLoggedIn]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View testID="loading-screen" style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator testID="loading-indicator" size="large" color="#1B2F6E" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="verify-otp" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="signup" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="job-detail" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="settings-security" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="company-profile" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="connections" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="post-detail" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen
        name="forgot-password"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          headerShown: false,
        }}
      />
      <Stack.Screen name="+not-found" options={{ headerShown: true, title: "Oops!" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const statusBarStyle = useTheme((s) => s.colors.statusBarStyle);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={statusBarStyle} />
        <RootLayoutNav />
        <ToastContainer />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
