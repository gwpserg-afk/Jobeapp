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
import { ArrowLeft, User, KeyRound, CheckCircle2, Lock } from "lucide-react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

type Step = "identifier" | "code" | "success";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const t = useLang((s) => s.t);
  const colors = useTheme((s) => s.colors);

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;

  const handleRequestCode = async () => {
    if (!identifier.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await fetch(`${baseUrl}/api/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      setStep("code");
    } catch {
      setError(t("forgot_password_error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (code.trim().length !== 6) { setError(t("forgot_password_invalid_code")); return; }
    if (newPassword.length < 8) { setError(t("forgot_password_password_too_short")); return; }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/password-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), code: code.trim(), newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message === "INVALID_CODE" || json.error?.code === "INVALID_CODE"
          ? t("forgot_password_invalid_code")
          : t("forgot_password_error"));
        return;
      }
      setStep("success");
    } catch {
      setError(t("forgot_password_error"));
    } finally {
      setIsLoading(false);
    }
  };

  const inputContainerStyle = (active: boolean) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: active ? colors.accent : colors.border,
    backgroundColor: colors.toggleBg,
    paddingHorizontal: 14,
  });

  return (
    <View testID="forgot-password-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back button */}
            <Pressable
              testID="back-button"
              onPress={() => step === "code" ? setStep("identifier") : router.back()}
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

            {/* Header */}
            <Animated.View entering={FadeInDown.duration(400).delay(100)} style={{ marginTop: 32, marginBottom: 32 }}>
              <Text style={{ fontSize: 28, fontWeight: "800", color: colors.primary, letterSpacing: -0.5 }}>
                {t("forgot_password_title")}
              </Text>
              {step !== "success" && (
                <Text style={{ marginTop: 8, fontSize: 15, color: colors.textSecondary, lineHeight: 22 }}>
                  {step === "identifier" ? t("forgot_password_subtitle") : t("forgot_password_code_sent")}
                </Text>
              )}
            </Animated.View>

            {step === "identifier" && (
              <Animated.View entering={FadeInDown.duration(400).delay(200)} key="step-identifier">
                <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "600", color: colors.text }}>
                  {t("forgot_password_identifier_label")}
                </Text>
                <View style={inputContainerStyle(identifier.length > 0)}>
                  <User size={18} color={colors.textMuted} strokeWidth={2} />
                  <TextInput
                    testID="identifier-input"
                    value={identifier}
                    onChangeText={(v) => { setIdentifier(v); setError(null); }}
                    placeholder={t("forgot_password_identifier_placeholder")}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="username"
                    selectionColor={colors.accent}
                    cursorColor={colors.accent}
                    style={{ flex: 1, marginLeft: 10, paddingVertical: 14, fontSize: 16, color: colors.text }}
                  />
                </View>

                {error ? (
                  <View style={{ marginTop: 12, borderRadius: 12, backgroundColor: colors.urgentBg, paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Text style={{ textAlign: "center", fontSize: 13, color: colors.urgentText, fontWeight: "500" }}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  testID="send-code-button"
                  onPress={handleRequestCode}
                  disabled={!identifier.trim() || isLoading}
                  style={{
                    marginTop: 24,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                    backgroundColor: identifier.trim() ? colors.accent : colors.border,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>{t("forgot_password_send_code")}</Text>
                  )}
                </Pressable>
              </Animated.View>
            )}

            {step === "code" && (
              <Animated.View entering={FadeInDown.duration(400).delay(200)} key="step-code">
                {/* Code input */}
                <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "600", color: colors.text }}>
                  {t("forgot_password_code_label")}
                </Text>
                <View style={inputContainerStyle(code.length > 0)}>
                  <KeyRound size={18} color={colors.textMuted} strokeWidth={2} />
                  <TextInput
                    testID="code-input"
                    value={code}
                    onChangeText={(v) => { setCode(v.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                    placeholder={t("forgot_password_code_placeholder")}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    selectionColor={colors.accent}
                    cursorColor={colors.accent}
                    style={{ flex: 1, marginLeft: 10, paddingVertical: 14, fontSize: 20, fontWeight: "700", letterSpacing: 4, color: colors.text }}
                  />
                </View>

                {/* New password input */}
                <Text style={{ marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: "600", color: colors.text }}>
                  {t("forgot_password_new_password_label")}
                </Text>
                <View style={inputContainerStyle(newPassword.length > 0)}>
                  <Lock size={18} color={colors.textMuted} strokeWidth={2} />
                  <TextInput
                    testID="new-password-input"
                    value={newPassword}
                    onChangeText={(v) => { setNewPassword(v); setError(null); }}
                    placeholder={t("forgot_password_new_password_placeholder")}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    autoComplete="new-password"
                    textContentType="newPassword"
                    selectionColor={colors.accent}
                    cursorColor={colors.accent}
                    style={{ flex: 1, marginLeft: 10, paddingVertical: 14, fontSize: 16, color: colors.text }}
                  />
                </View>

                {error ? (
                  <View style={{ marginTop: 12, borderRadius: 12, backgroundColor: colors.urgentBg, paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Text style={{ textAlign: "center", fontSize: 13, color: colors.urgentText, fontWeight: "500" }}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  testID="confirm-reset-button"
                  onPress={handleConfirmReset}
                  disabled={code.length !== 6 || newPassword.length < 8 || isLoading}
                  style={{
                    marginTop: 24,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                    backgroundColor: code.length === 6 && newPassword.length >= 8 ? colors.accent : colors.border,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>{t("forgot_password_confirm_btn")}</Text>
                  )}
                </Pressable>

                <Pressable onPress={() => setStep("identifier")} style={{ marginTop: 16, alignItems: "center", paddingVertical: 8 }}>
                  <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                    {t("forgot_password_back_to_login").replace("connexion", "étape précédente")}
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {step === "success" && (
              <Animated.View entering={FadeIn.duration(500)} key="step-success" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 }}>
                <View style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.accent + "20",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                }}>
                  <CheckCircle2 size={44} color={colors.accent} strokeWidth={2} />
                </View>
                <Text style={{ fontSize: 24, fontWeight: "800", color: colors.primary, textAlign: "center", letterSpacing: -0.5 }}>
                  {t("forgot_password_success_title")}
                </Text>
                <Text style={{ marginTop: 12, fontSize: 15, color: colors.textSecondary, textAlign: "center", lineHeight: 22, paddingHorizontal: 16 }}>
                  {t("forgot_password_success_subtitle")}
                </Text>
                <Pressable
                  testID="back-to-login-button"
                  onPress={() => router.replace("/sign-in" as never)}
                  style={{
                    marginTop: 40,
                    borderRadius: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 32,
                    backgroundColor: colors.accent,
                    alignSelf: "stretch",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>{t("forgot_password_back_to_login")}</Text>
                </Pressable>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
