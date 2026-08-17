import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import { Apple } from "lucide-react-native";
import { signInWithGoogle } from "@/lib/auth";
import { GoogleLogo } from "@/components/GoogleLogo";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

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
          styles.googleBtn,
          { backgroundColor: "#FFFFFF", borderColor: "#DADCE0" },
          pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        ]}
        testID="google-signin"
      >
        <View style={styles.iconSlot}>
          {loading ? <ActivityIndicator size="small" color="#4285F4" /> : <GoogleLogo size={20} />}
        </View>
        <Text style={[styles.btnText, { color: "#1F1F1F" }]}>{t.su_google}</Text>
      </Pressable>

      <Pressable
        onPress={apple}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: "#000000", borderColor: "#000000" },
          pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        ]}
        testID="apple-signin"
      >
        <View style={styles.iconSlot}>
          <Apple size={20} color="#fff" strokeWidth={0} fill="#fff" />
        </View>
        <Text style={[styles.btnText, { color: "#fff" }]}>{t.su_apple}</Text>
        <View style={styles.soon}>
          <Text style={styles.soonText}>{t.d_soon}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 52, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.lg,
  },
  googleBtn: {
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  iconSlot: { width: 24, alignItems: "center", justifyContent: "center", marginRight: spacing.sm },
  btnText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold, letterSpacing: 0.2 },
  soon: {
    position: "absolute", right: 14, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.full, backgroundColor: "rgba(255,255,255,0.18)",
  },
  soonText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
