import { useEffect, useRef, useState } from "react";
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
import { ArrowLeft, MessageSquareText } from "lucide-react-native";
import { authClient } from "@/lib/auth";
import { usePendingSignup, deriveEmailFromPhone } from "@/lib/pending-signup";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const LEN = 6;
const RESEND_SECONDS = 30;
// Dev bypass until the real SMS sender is wired (provider + API key).
const DEV_CODE = "111111";

export default function VerifyOtp() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const t = useI18n((s) => s.t);
  const pending = usePendingSignup((s) => s.data);
  const clearPending = usePendingSignup((s) => s.clear);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);

  // Resend countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const digits = Array.from({ length: LEN }, (_, i) => code[i] ?? "");

  async function submit(value: string) {
    if (value.length !== LEN || loading) return;
    if (value !== DEV_CODE) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(t.vo_err);
      setCode("");
      return;
    }
    if (!pending) {
      setError(t.vo_err);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    setError("");
    try {
      const email = pending.email.trim() || deriveEmailFromPhone(pending.phone);
      await authClient.signUp.email({
        name: pending.name,
        email,
        password: pending.password,
        username: pending.username,
        phone: pending.phone,
        accountType: pending.accountType,
      } as Parameters<typeof authClient.signUp.email>[0]);
      clearPending();
      router.replace("/(app)/(tabs)/");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError((e as Error)?.message ?? t.vo_err);
      setLoading(false);
    }
  }

  function onChange(v: string) {
    const clean = v.replace(/\D/g, "").slice(0, LEN);
    setCode(clean);
    if (error) setError("");
    if (clean.length === LEN) submit(clean);
  }

  function resend() {
    if (secondsLeft > 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCode("");
    setError("");
    setSecondsLeft(RESEND_SECONDS);
    inputRef.current?.focus();
  }

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
            style={[
              styles.back,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
            hitSlop={8}
            testID="verify-back"
          >
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>

          <View style={styles.body}>
            {/* Icon badge */}
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              style={[styles.badge, { shadowColor: colors.primary }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MessageSquareText size={34} color="#fff" strokeWidth={2.2} />
            </LinearGradient>

            <Text style={[styles.title, { color: colors.textPrimary }]}>{t.vo_title}</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>{t.vo_sub}</Text>
            {pending?.phone ? (
              <Text style={[styles.phone, { color: colors.textPrimary }]}>{pending.phone}</Text>
            ) : null}

            {/* OTP boxes (single hidden input drives them) */}
            <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
              {digits.map((d, i) => {
                const active = i === code.length;
                return (
                  <View
                    key={i}
                    style={[
                      styles.box,
                      { backgroundColor: colors.bgCard, borderColor: d || active ? colors.primary : colors.border },
                      (d || active) && { borderWidth: 2 },
                    ]}
                  >
                    <Text style={[styles.boxText, { color: colors.textPrimary }]}>{d}</Text>
                    {active && !d ? <View style={[styles.caret, { backgroundColor: colors.primary }]} /> : null}
                  </View>
                );
              })}
            </Pressable>

            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={onChange}
              keyboardType="number-pad"
              maxLength={LEN}
              autoFocus
              style={styles.hiddenInput}
              testID="verify-input"
            />

            {error ? (
              <Text style={[styles.error, { color: colors.error }]} testID="verify-error">{error}</Text>
            ) : (
              <View style={[styles.devPill, { backgroundColor: colors.bgElevated }]}>
                <Text style={[styles.dev, { color: colors.textSecondary }]}>{t.vo_dev}</Text>
              </View>
            )}

            <Pressable
              onPress={() => submit(code)}
              disabled={loading || code.length !== LEN}
              style={[{ width: "100%", marginTop: spacing.xl }]}
              testID="verify-submit"
            >
              <LinearGradient
                colors={[colors.primaryLight, colors.primary]}
                style={[styles.cta, { shadowColor: colors.primary }, (loading || code.length !== LEN) && { opacity: 0.5 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>{t.vo_verify}</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable style={styles.resend} onPress={resend} disabled={secondsLeft > 0} hitSlop={8}>
              <Text style={[styles.resendText, { color: secondsLeft > 0 ? colors.textMuted : colors.primary }]}>
                {secondsLeft > 0 ? `${t.vo_resend} · ${secondsLeft}s` : t.vo_resend}
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
  body: { flex: 1, paddingHorizontal: spacing.xl, alignItems: "center", justifyContent: "center", paddingBottom: 60 },
  badge: {
    width: 76, height: 76, borderRadius: radius.full, alignItems: "center", justifyContent: "center",
    marginBottom: spacing.xl,
    shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  title: { fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.heavy, letterSpacing: -0.6, textAlign: "center" },
  sub: { fontSize: fonts.sizes.base, marginTop: 8, textAlign: "center" },
  phone: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold, marginTop: 2, marginBottom: spacing.xxl, letterSpacing: 0.3 },
  boxes: { flexDirection: "row", gap: 10, marginTop: spacing.md },
  box: {
    width: 50, height: 60, borderRadius: radius.md, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  boxText: { fontSize: 26, fontWeight: fonts.weights.heavy },
  caret: { position: "absolute", width: 2, height: 26, borderRadius: 1, opacity: 0.9 },
  hiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
  error: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, marginTop: spacing.xl },
  devPill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, marginTop: spacing.xl },
  dev: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: radius.lg, paddingVertical: 18,
    shadowOpacity: 0.32, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  ctaText: { color: "#fff", fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold, letterSpacing: 0.2 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  resend: { marginTop: spacing.lg, padding: spacing.sm },
  resendText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
});
