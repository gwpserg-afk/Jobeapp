import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ArrowLeft, AtSign, User, Lock, Eye, EyeOff } from "lucide-react-native";
import { usePendingSignup } from "@/lib/pending-signup";
import { SocialAuth } from "@/components/SocialAuth";
import { PhoneInput } from "@/components/PhoneInput";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

type AccountType = "personal" | "business";

export default function SignUp() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const t = useI18n((s) => s.t);

  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [error, setError] = useState("");
  const setPending = usePendingSignup((s) => s.set);

  function handleContinue() {
    const u = username.trim().toLowerCase();
    const ph = phone.trim();
    if (!u || !name.trim() || !ph || !password) return setError(t.su_err_fields);
    if (!/^[a-z0-9_]{3,}$/.test(u)) return setError(t.su_err_username);
    if (ph.replace(/\D/g, "").length < 8) return setError(t.su_err_phone);
    if (password.length < 8) return setError(t.su_err_password);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError("");
    setPending({
      username: u,
      name: name.trim(),
      phone: ph,
      email: "",
      password,
      accountType: accountType === "business" ? "recruiter" : "candidate",
    });
    router.push("/(auth)/verify-otp");
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
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            <Pressable
              onPress={() => router.back()}
              style={[
                styles.back,
                { backgroundColor: colors.bgCard, borderColor: colors.border },
              ]}
              hitSlop={8}
              testID="signup-back"
            >
              <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
            </Pressable>

            {/* Wordmark + heading */}
            <Text style={styles.wordmark} allowFontScaling={false}>
              <Text style={{ color: colors.navy }}>Job</Text>
              <Text style={{ color: colors.primary }}>é</Text>
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t.su_title}</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>{t.su_sub}</Text>

            {/* Account type segmented toggle */}
            <View style={[styles.segment, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {(["personal", "business"] as AccountType[]).map((type) => {
                const on = accountType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAccountType(type);
                    }}
                    style={[styles.segBtn, on && { backgroundColor: type === "business" ? colors.navy : colors.primary }]}
                    testID={`segment-${type}`}
                  >
                    <Text style={[styles.segText, { color: on ? "#fff" : colors.textMuted }]}>
                      {type === "personal" ? t.su_personal : t.su_business}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Social sign-in (fast path) */}
            <SocialAuth onMessage={setError} />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>{t.su_or}</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Fields */}
            <View style={styles.form}>
              {/* Username */}
              <View style={fieldStyle("username")}>
                <AtSign size={19} color={focused === "username" ? colors.primary : colors.textMuted} strokeWidth={2} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder={t.su_username_ph}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                  onFocus={() => setFocused("username")}
                  onBlur={() => setFocused(null)}
                  testID="signup-username"
                />
              </View>

              {/* Name */}
              <View style={fieldStyle("name")}>
                <User size={19} color={focused === "name" ? colors.primary : colors.textMuted} strokeWidth={2} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder={t.su_name_ph}
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                  testID="signup-name"
                />
              </View>

              {/* Phone (required — primary identifier, SMS verification next) */}
              <PhoneInput
                value={phone}
                onChangeE164={(full) => setPhone(full)}
                focused={focused === "phone"}
                onFocus={() => setFocused("phone")}
                onBlur={() => setFocused(null)}
              />

              {/* Password */}
              <View style={fieldStyle("password")}>
                <Lock size={19} color={focused === "password" ? colors.primary : colors.textMuted} strokeWidth={2} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder={t.su_password_ph}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  testID="signup-password"
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
                <Text style={[styles.error, { color: colors.error }]} testID="signup-error">
                  {error}
                </Text>
              ) : null}

              {/* CTA */}
              <Pressable
                onPress={handleContinue}
                style={[{ marginTop: spacing.sm }]}
                testID="signup-submit"
              >
                <LinearGradient
                  colors={[colors.primaryLight, colors.primary]}
                  style={[styles.cta, { shadowColor: colors.primary }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.ctaText}>{t.su_continue}</Text>
                </LinearGradient>
              </Pressable>

              <Text style={[styles.terms, { color: colors.textMuted }]}>{t.su_terms}</Text>
            </View>

            {/* Sign in link */}
            <Pressable style={styles.signinRow} onPress={() => router.push("/(auth)/sign-in")} testID="signup-signin">
              <Text style={[styles.signinText, { color: colors.textMuted }]}>
                {t.login}{" "}
                <Text style={{ color: colors.primary, fontWeight: fonts.weights.bold }}>{t.signin}</Text>
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  wordmark: { fontSize: 34, fontWeight: "900", fontStyle: "italic", letterSpacing: -1.4, marginBottom: spacing.lg },
  title: { fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.heavy, letterSpacing: -0.6 },
  sub: { fontSize: fonts.sizes.base, marginTop: 6, marginBottom: spacing.xl },
  segment: {
    flexDirection: "row",
    borderRadius: radius.full,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginBottom: spacing.lg,
  },
  segBtn: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: radius.full },
  segText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold, letterSpacing: 0.2 },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, textTransform: "uppercase", letterSpacing: 1 },
  form: { gap: spacing.md },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    height: 56,
  },
  input: { flex: 1, fontSize: fonts.sizes.base, fontWeight: fonts.weights.medium, height: "100%" },
  error: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, marginTop: 2 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    paddingVertical: 18,
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ctaText: { color: "#fff", fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold, letterSpacing: 0.2 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  terms: { fontSize: fonts.sizes.xs, lineHeight: 17, textAlign: "center", marginTop: spacing.sm, paddingHorizontal: spacing.md },
  signinRow: { alignItems: "center", paddingVertical: spacing.lg, marginTop: spacing.sm },
  signinText: { fontSize: fonts.sizes.base },
});
