import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Apple } from "lucide-react-native";
import { authClient, signInWithGoogle } from "@/lib/auth";
import { GoogleLogo } from "@/components/GoogleLogo";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

export function SocialAuth({ onMessage }: { onMessage?: (m: string) => void }) {
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function google() {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result?.type !== "success") return; // user closed the browser
      // Cookie is stored — confirm the session then route.
      const session = await authClient.getSession();
      const user = session?.data?.user as { username?: string | null; phone?: string | null } | undefined;
      if (!user) {
        onMessage?.(t.su_google_err);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!user.username) {
        // New Google account with no username yet — let them pick username + phone.
        router.replace("/(auth)/complete-profile");
      } else {
        router.replace("/(app)/(tabs)/");
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onMessage?.((e as Error)?.message ?? t.su_google_err);
    } finally {
      setLoading(false);
    }
  }

  function apple() {
    Haptics.selectionAsync();
    onMessage?.(t.su_apple_soon);
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={google}
        disabled={loading}
        style={[
          styles.btn,
          { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: isDark ? "#000" : "#3C4043" },
        ]}
        testID="google-signin"
      >
        <View style={styles.iconSlot}>
          {loading ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <GoogleLogo size={20} />}
        </View>
        <Text style={[styles.btnText, { color: colors.textPrimary }]}>{t.su_google}</Text>
      </Pressable>

      <Pressable
        onPress={apple}
        style={[
          styles.btn,
          { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: isDark ? "#000" : "#3C4043" },
        ]}
        testID="apple-signin"
      >
        <View style={styles.iconSlot}>
          <Apple size={20} color={colors.textPrimary} strokeWidth={0} fill={colors.textPrimary} />
        </View>
        <Text style={[styles.btnText, { color: colors.textPrimary }]}>{t.su_apple}</Text>
        <View style={[styles.soon, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
          <Text style={[styles.soonText, { color: colors.textMuted }]}>{t.d_soon}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 52, borderRadius: radius.lg, borderWidth: 1.5, paddingHorizontal: spacing.lg,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
  },
  iconSlot: { width: 24, alignItems: "center", justifyContent: "center", marginRight: spacing.sm },
  btnText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold, letterSpacing: 0.2 },
  soon: {
    position: "absolute", right: 14, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1,
  },
  soonText: { fontSize: 10, fontWeight: "700" },
});
