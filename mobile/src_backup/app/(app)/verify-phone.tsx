import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Phone, CheckCircle } from "lucide-react-native";
import { useState } from "react";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import { USER_ME_QUERY_KEY } from "@/lib/hooks/useUser";

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme((s) => s);
  const lang = useLang((s) => s.lang);
  const t = useLang((s) => s.t);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"phone" | "otp" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const sendOtpMutation = useMutation({
    mutationFn: (phoneNumber: string) =>
      api.post<{ success: boolean }>("/api/phone-verify/send", { phone: phoneNumber, language: lang }),
    onSuccess: () => setStep("otp"),
    onError: (error: unknown) => {
      const code = (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      if (code === "PHONE_EXISTS") {
        Alert.alert(
          lang === "fr" ? "Numéro déjà utilisé" : lang === "zh" ? "号码已被使用" : "Number already used",
          lang === "fr" ? "Ce numéro est déjà associé à un compte" : lang === "zh" ? "该号码已关联其他账户" : "This number is already linked to an account"
        );
      } else {
        Alert.alert(lang === "fr" ? "Erreur" : lang === "zh" ? "错误" : "Error", lang === "fr" ? "Impossible d'envoyer le code" : lang === "zh" ? "无法发送验证码" : "Could not send code");
      }
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (otpCode: string) => {
      // Step 1: Verify the OTP code
      await api.post<{ success: boolean }>("/api/phone-verify/verify", { phone, otp: otpCode });
      // Step 2: Set phone as verified on the account
      await api.post<{ isVerified: boolean }>("/api/verification/phone", { phone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["identity-verify"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setStep("done");
    },
    onError: (error: unknown) => {
      const code = (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      if (code === "INVALID_OTP" || code === "OTP_EXPIRED") {
        Alert.alert(lang === "fr" ? "Code incorrect" : lang === "zh" ? "验证码错误" : "Invalid code");
      } else {
        Alert.alert(lang === "fr" ? "Erreur" : lang === "zh" ? "错误" : "Error");
      }
    },
  });

  const handleSendOtp = () => {
    const cleaned = phone.trim().replace(/\s+/g, "");
    if (cleaned.length < 7) {
      Alert.alert(lang === "fr" ? "Numéro invalide" : lang === "zh" ? "号码无效" : "Invalid number");
      return;
    }
    setPhone(cleaned);
    sendOtpMutation.mutate(cleaned);
  };

  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      Alert.alert(lang === "fr" ? "Code invalide" : lang === "zh" ? "验证码无效" : "Invalid code");
      return;
    }
    verifyOtpMutation.mutate(otp);
  };

  // Icon bg adapts to theme
  const iconBg = isDark ? "rgba(255,255,255,0.12)" : "#EEF4FF";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.card }}>
          <View style={{
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: 16, paddingVertical: 12,
            borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12,
          }}>
            <Pressable
              testID="back-button"
              onPress={() => router.back()}
              style={{
                width: 44, height: 44, borderRadius: 22,
                alignItems: "center", justifyContent: "center",
                backgroundColor: colors.toggleBg,
              }}
            >
              <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
            </Pressable>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>
              {t("settings_verify_phone")}
            </Text>
          </View>
        </SafeAreaView>

        <View style={{ flex: 1, padding: 24, gap: 24 }}>
          {step === "done" ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
              <View style={{
                width: 96, height: 96, borderRadius: 48,
                backgroundColor: isDark ? "rgba(74,222,128,0.15)" : "#DCFCE7",
                alignItems: "center", justifyContent: "center",
                marginBottom: 8,
              }}>
                <CheckCircle size={52} color="#22C55E" strokeWidth={1.5} />
              </View>
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text, textAlign: "center" }}>
                {t("settings_phone_verified")}
              </Text>
              <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: "center", lineHeight: 22 }}>
                {lang === "fr" ? "Votre compte a reçu le badge de vérification ✓" : lang === "zh" ? "您的账户已获得验证徽章 ✓" : "Your account received the verified badge ✓"}
              </Text>
              <Pressable
                testID="done-button"
                onPress={() => router.back()}
                style={({ pressed }) => ({
                  backgroundColor: colors.accent,
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 40,
                  marginTop: 8,
                  opacity: pressed ? 0.85 : 1,
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 3,
                })}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                  {lang === "fr" ? "Terminé" : lang === "zh" ? "完成" : "Done"}
                </Text>
              </Pressable>
            </View>
          ) : step === "phone" ? (
            <>
              <View style={{ gap: 8 }}>
                <View style={{
                  width: 60, height: 60, borderRadius: 30,
                  backgroundColor: iconBg,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Phone size={28} color={colors.primary} strokeWidth={1.8} />
                </View>
                <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 10 }}>
                  {lang === "fr" ? "Entrez votre numéro" : lang === "zh" ? "输入您的电话号码" : "Enter your phone number"}
                </Text>
                <Text style={{ fontSize: 15, color: colors.textMuted, lineHeight: 22 }}>
                  {lang === "fr" ? "Nous vous enverrons un code de vérification par SMS." : lang === "zh" ? "我们将通过短信向您发送验证码。" : "We'll send you a verification code via SMS."}
                </Text>
              </View>
              <View style={{ gap: 12 }}>
                <TextInput
                  testID="phone-input"
                  style={{
                    backgroundColor: colors.card, borderRadius: 12,
                    paddingHorizontal: 16, paddingVertical: 14,
                    fontSize: 18, color: colors.text,
                    borderWidth: 1, borderColor: colors.border,
                    letterSpacing: 1,
                  }}
                  placeholder="+221 XX XXX XXXX"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.accent}
                  cursorColor={colors.accent}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoFocus
                />
                <Pressable
                  testID="send-otp-button"
                  onPress={handleSendOtp}
                  disabled={sendOtpMutation.isPending}
                  style={({ pressed }) => ({
                    backgroundColor: colors.accent,
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: "center" as const,
                    opacity: pressed || sendOtpMutation.isPending ? 0.8 : 1,
                    shadowColor: colors.accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 3,
                  })}
                >
                  {sendOtpMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                      {lang === "fr" ? "Envoyer le code" : lang === "zh" ? "发送验证码" : "Send Code"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 8 }}>
                  {lang === "fr" ? "Entrez le code" : lang === "zh" ? "输入验证码" : "Enter the code"}
                </Text>
                <Text style={{ fontSize: 15, color: colors.textMuted, lineHeight: 22 }}>
                  {lang === "fr" ? `Code envoyé au ${phone}` : lang === "zh" ? `验证码已发送至 ${phone}` : `Code sent to ${phone}`}
                </Text>
              </View>
              <View style={{ gap: 12 }}>
                <TextInput
                  testID="otp-input"
                  style={{
                    backgroundColor: colors.card, borderRadius: 12,
                    paddingHorizontal: 16, paddingVertical: 18,
                    fontSize: 28, color: colors.text, textAlign: "center",
                    borderWidth: 1, borderColor: colors.border,
                    letterSpacing: 12, fontWeight: "700",
                  }}
                  placeholder="------"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.accent}
                  cursorColor={colors.accent}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="numeric"
                  maxLength={6}
                  autoFocus
                />
                <Pressable
                  testID="verify-otp-button"
                  onPress={handleVerifyOtp}
                  disabled={verifyOtpMutation.isPending || otp.length < 6}
                  style={({ pressed }) => ({
                    backgroundColor: colors.accent,
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: "center" as const,
                    opacity: pressed || verifyOtpMutation.isPending || otp.length < 6 ? 0.5 : 1,
                    shadowColor: colors.accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 3,
                  })}
                >
                  {verifyOtpMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                      {t("settings_verify_btn")}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  testID="resend-code-button"
                  onPress={() => { setStep("phone"); setOtp(""); }}
                  style={{ alignItems: "center", paddingVertical: 12, minHeight: 44, justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 14, color: colors.accent, fontWeight: "500" }}>
                    {lang === "fr" ? "Renvoyer le code" : lang === "zh" ? "重新发送" : "Resend code"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
