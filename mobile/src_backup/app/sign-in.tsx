import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Eye, EyeOff, User, Lock } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { authClient } from "@/lib/auth/auth-client";

export default function SignInScreen() {
  const router = useRouter();
  const t = useLang((s) => s.t);
  const colors = useTheme((s) => s.colors);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = identifier.trim().length > 0 && password.length >= 1;

  const resolveEmail = async (id: string): Promise<string | null> => {
    if (id.includes("@")) return id;
    const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
    try {
      const res = await fetch(`${baseUrl}/api/auth/resolve-identifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: id }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data?.email ?? null;
    } catch {
      return null;
    }
  };

  const handleLogin = async () => {
    if (!isFormValid) return;
    setIsLoading(true);
    setError(null);

    const id = identifier.trim();
    const email = await resolveEmail(id);

    if (!email) {
      setIsLoading(false);
      setError(t("login_email_invalid"));
      return;
    }

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    setIsLoading(false);
    if (signInError) {
      setError(t("login_error"));
    }
  };

  return (
    <View testID="sign-in-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back button */}
            <Pressable
              testID="back-button"
              onPress={() => router.back()}
              style={{
                marginTop: 8,
                height: 44,
                width: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 22,
                backgroundColor: colors.toggleBg,
              }}
            >
              <ArrowLeft size={20} color={colors.primary} strokeWidth={2.5} />
            </Pressable>

            {/* Logo */}
            <Animated.View
              entering={FadeInDown.duration(500).delay(100)}
              style={{ marginTop: 32, alignItems: "center" }}
            >
              <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <Text
                  style={{
                    fontSize: 40,
                    fontWeight: "800",
                    fontStyle: "italic",
                    color: colors.primary,
                    letterSpacing: -1,
                  }}
                >
                  Job
                </Text>
                <Text
                  style={{
                    fontSize: 40,
                    fontWeight: "800",
                    fontStyle: "italic",
                    color: colors.accent,
                    letterSpacing: -1,
                  }}
                >
                  é
                </Text>
              </View>
            </Animated.View>

            {/* Title */}
            <Animated.View
              entering={FadeInDown.duration(500).delay(200)}
              style={{ marginTop: 28 }}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 24,
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                {t("login_title")}
              </Text>
              <Text
                style={{
                  marginTop: 6,
                  textAlign: "center",
                  fontSize: 14,
                  color: colors.textSecondary,
                }}
              >
                {t("login_subtitle")}
              </Text>
            </Animated.View>

            {/* Identifier input */}
            <Animated.View
              entering={FadeInDown.duration(500).delay(300)}
              style={{ marginTop: 32 }}
            >
              <Text
                style={{
                  marginBottom: 8,
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                {t("login_email_label")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: identifier.length > 0 ? colors.accent : colors.border,
                  backgroundColor: colors.toggleBg,
                  paddingHorizontal: 14,
                }}
              >
                <User size={18} color={colors.textMuted} strokeWidth={2} />
                <TextInput
                  testID="email-input"
                  value={identifier}
                  onChangeText={(v) => { setIdentifier(v); setError(null); }}
                  placeholder={t("login_email_placeholder")}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  selectionColor={colors.accent}
                  cursorColor={colors.accent}
                  style={{ flex: 1, marginLeft: 10, paddingVertical: 14, fontSize: 16, color: colors.text }}
                />
              </View>
            </Animated.View>

            {/* Password input */}
            <Animated.View
              entering={FadeInDown.duration(500).delay(370)}
              style={{ marginTop: 16 }}
            >
              <Text
                style={{
                  marginBottom: 8,
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                {t("login_password_label")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: password.length > 0 ? colors.accent : colors.border,
                  backgroundColor: colors.toggleBg,
                  paddingHorizontal: 14,
                }}
              >
                <Lock size={18} color={colors.textMuted} strokeWidth={2} />
                <TextInput
                  testID="password-input"
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(null); }}
                  placeholder={t("login_password_placeholder")}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  selectionColor={colors.accent}
                  cursorColor={colors.accent}
                  style={{ flex: 1, marginLeft: 10, paddingVertical: 14, fontSize: 16, color: colors.text }}
                />
                <Pressable
                  testID="toggle-password"
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4, minHeight: 44, justifyContent: "center" }}
                >
                  {showPassword
                    ? <EyeOff size={20} color={colors.textMuted} strokeWidth={2} />
                    : <Eye size={20} color={colors.textMuted} strokeWidth={2} />}
                </Pressable>
              </View>
            </Animated.View>

            {/* Forgot password */}
            <View style={{ alignItems: "flex-end", marginTop: 8 }}>
              <Pressable
                testID="forgot-password-link"
                onPress={() => router.push("/forgot-password" as never)}
                style={{ paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 13, color: colors.accent, fontWeight: "600" }}>
                  {t("forgot_password_link")}
                </Text>
              </Pressable>
            </View>

            {/* Error */}
            {error ? (
              <View
                testID="error-message"
                style={{
                  marginTop: 12,
                  borderRadius: 12,
                  backgroundColor: colors.urgentBg,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ textAlign: "center", fontSize: 13, color: colors.urgentText, fontWeight: "500" }}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Login button */}
            <Animated.View
              entering={FadeInDown.duration(500).delay(430)}
              style={{ marginTop: 24 }}
            >
              <Pressable
                testID="login-button"
                onPress={handleLogin}
                disabled={!isFormValid || isLoading}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  paddingVertical: 14,
                  backgroundColor: isFormValid ? colors.accent : colors.border,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                    {t("login_btn")}
                  </Text>
                )}
              </Pressable>
            </Animated.View>

            {/* Footer */}
            <View style={{ alignItems: "center", paddingTop: 32 }}>
              <Pressable
                testID="signup-link"
                onPress={() => router.push("/welcome" as never)}
                style={{ paddingVertical: 10 }}
              >
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                  {t("login_no_account")}{" "}
                  <Text style={{ fontWeight: "700", color: colors.accent }}>
                    {t("login_signup")}
                  </Text>
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
