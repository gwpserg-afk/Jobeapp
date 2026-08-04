import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ArrowLeft, User, Lock, Eye, EyeOff } from "lucide-react-native";
import { authClient } from "@/lib/auth";
import { deriveEmailFromPhone } from "@/lib/pending-signup";
import { SocialAuth } from "@/components/SocialAuth";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

export default function SignIn() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const t = useI18n((s) => s.t);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    const id = identifier.trim();
    if (!id || !password) return setError(t.su_err_fields);

    // Phone-first: if the identifier looks like a phone number, resolve to the
    // derived email used at sign-up; otherwise treat it as an email.
    const looksLikePhone = /^[+\d][\d\s().-]{6,}$/.test(id);
    const email = looksLikePhone ? deriveEmailFromPhone(id) : id;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError("");
    try {
      await authClient.signIn.email({ email, password });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(app)/(tabs)/");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(t.si_err);
      setLoading(false);
    }
  }

  const fieldStyle = (key: string) => [
    styles.field,
    { backgroundColor: colors.bgCard, borderColor: focused === key ? colors.primary : colors.border },
    focused === key && { borderWidth: 1.5 },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={isDark ? ["#0C0C0E", "#0B0B0D", "#0A120E"] : ["#FFFFFF", "#FFFFFF", "#F4FBF6"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.back,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
            testID="signin-back"
          >
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>

          <View style={styles.body}>
            <Text style={styles.wordmark} allowFontScaling={false}>
              <Text style={{ color: colors.navy }}>Job</Text>
              <Text style={{ color: colors.primary }}>é</Text>
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t.si_title}</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>{t.si_sub}</Text>

            {/* Social sign-in */}
            <SocialAuth onMessage={setError} />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>{t.su_or}</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.form}>
              <View style={fieldStyle("id")}>
                <User size={19} color={focused === "id" ? colors.primary : colors.textMuted} strokeWidth={2} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder={t.si_id_ph}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={identifier}
                  onChangeText={setIdentifier}
                  onFocus={() => setFocused("id")}
                  onBlur={() => setFocused(null)}
                  testID="signin-id"
                />
              </View>

              <View style={fieldStyle("password")}>
                <Lock size={19} color={focused === "password" ? colors.primary : colors.textMuted} strokeWidth={2} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder={t.si_pass_ph}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  testID="signin-password"
                />
                <Pressable onPress={() => setShowPass((s) => !s)} hitSlop={8}>
                  {showPass ? (
                    <EyeOff size={19} color={colors.textMuted} strokeWidth={2} />
                  ) : (
                    <Eye size={19} color={colors.textMuted} strokeWidth={2} />
                  )}
                </Pressable>
              </View>

              {error ? (
                <Text style={[styles.error, { color: colors.error }]} testID="signin-error">{error}</Text>
              ) : null}

              <Pressable
                onPress={handleSignIn}
                disabled={loading}
                style={({ pressed }) => [pressed && styles.pressed, { marginTop: spacing.sm }]}
                testID="signin-submit"
              >
                <LinearGradient
                  colors={[colors.primaryLight, colors.primary]}
                  style={[styles.cta, { shadowColor: colors.primary }, loading && { opacity: 0.7 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{t.signin}</Text>}
                </LinearGradient>
              </Pressable>
            </View>

            <Pressable style={styles.bottom} onPress={() => router.push("/(auth)/sign-up")} testID="signin-join">
              <Text style={[styles.bottomText, { color: colors.textMuted }]}>
                {t.si_no}{" "}
                <Text style={{ color: colors.primary, fontWeight: fonts.weights.bold }}>{t.si_join}</Text>
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  back: {
    width: 44, height: 44, borderRadius: radius.md, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
    marginLeft: spacing.xl, marginTop: spacing.sm,
  },
  body: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  wordmark: { fontSize: 34, fontWeight: "900", fontStyle: "italic", letterSpacing: -1.4, marginBottom: spacing.lg },
  title: { fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.heavy, letterSpacing: -0.6 },
  sub: { fontSize: fonts.sizes.base, marginTop: 6, marginBottom: spacing.xl },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, textTransform: "uppercase", letterSpacing: 1 },
  form: { gap: spacing.md },
  field: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.lg, height: 56,
  },
  input: { flex: 1, fontSize: fonts.sizes.base, fontWeight: fonts.weights.medium, height: "100%" },
  error: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, marginTop: 2 },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: radius.lg, paddingVertical: 18,
    shadowOpacity: 0.32, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  ctaText: { color: "#fff", fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold, letterSpacing: 0.2 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  bottom: { alignItems: "center", paddingVertical: spacing.xl, marginTop: spacing.sm },
  bottomText: { fontSize: fonts.sizes.base },
});
