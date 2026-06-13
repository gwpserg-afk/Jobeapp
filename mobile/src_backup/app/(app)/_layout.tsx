import { Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import type { UserMe } from "@/types";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useDemoStore } from "@/lib/demoStore";
import { useTheme } from "@/lib/theme";

export default function AppLayout() {
  const router = useRouter();
  const isDemoLoggedIn = useDemoStore((s) => s.isDemoLoggedIn);
  const colors = useTheme((s) => s.colors);

  const { data: user, isLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn: () => api.get<UserMe>("/api/me"),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  useEffect(() => {
    // Skip onboarding - users go straight to home page
    // Profile can be completed from the profile settings page
  }, [user, isLoading, isDemoLoggedIn]);

  // Don't block demo users with a loading spinner waiting for the real API
  if (isLoading && !isDemoLoggedIn) {
    return (
      <View testID="app-loading" style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator testID="loading-indicator" size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="settings-premium" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="settings-help" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="privacy-policy" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="candidate-detail" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="profile-view" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="create-job" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="create-post" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="premium" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="buy-credits" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="create-promotion" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="verify-identity" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="verify-phone" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="complete-profile" options={{ headerShown: false }} />
      <Stack.Screen name="all-activities" options={{ animation: "slide_from_right", headerShown: false }} />
      <Stack.Screen name="skills" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="chat" options={{ headerShown: false, animation: "slide_from_right" }} />
    </Stack>
  );
}
