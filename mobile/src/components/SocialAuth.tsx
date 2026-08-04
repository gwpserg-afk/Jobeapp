import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import { Apple } from "lucide-react-native";
import { signInWithGoogle } from "@/lib/auth";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

// Multicolor Google "G" mark (no brand-icon dependency).
function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size, fontWeight: "800", color: "#4285F4", lineHeight: size + 2 }}>G</Text>
    </View>
  );
}

export function SocialAuth({ onMessage }: { onMessage?: (m: string) => void }) {
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  async function google() {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await signInWithGoogle();
      // On success the Expo client persists the session and the root layout redirects.
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
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: colors.bgCard, borderColor: colors.border },
          pressed && { opacity: 0.85 },
        ]}
        testID="google-signin"
      >
        {loading ? <ActivityIndicator size="small" color={colors.textPrimary} /> : <GoogleMark />}
        <Text style={[styles.btnText, { color: colors.textPrimary }]}>{t.su_google}</Text>
      </Pressable>

      <Pressable
        onPress={apple}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: isDark ? colors.bgCard : "#000", borderColor: isDark ? colors.border : "#000" },
          pressed && { opacity: 0.85 },
        ]}
        testID="apple-signin"
      >
        <Apple size={18} color="#fff" strokeWidth={2} fill="#fff" />
        <Text style={[styles.btnText, { color: "#fff" }]}>{t.su_apple}</Text>
        <View style={[styles.soon, { backgroundColor: "rgba(255,255,255,0.16)" }]}>
          <Text style={styles.soonText}>{t.d_soon}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    height: 52, borderRadius: radius.lg, borderWidth: 1,
  },
  btnText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold, letterSpacing: 0.2 },
  soon: { position: "absolute", right: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  soonText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
