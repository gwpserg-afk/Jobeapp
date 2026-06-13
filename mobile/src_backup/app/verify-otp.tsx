import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions as RNDimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/auth-client";
import { useInvalidateSession } from "@/lib/auth/use-session";
import { ArrowLeft, ShieldCheck } from "lucide-react-native";
import { OtpInput } from "react-native-otp-entry";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

const SCREEN_WIDTH = RNDimensions.get("window").width;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { email, type } = useLocalSearchParams<{ email: string; type?: string }>();
  const invalidateSession = useInvalidateSession();
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const verifyOtp = useMutation({
    mutationFn: async (otp: string) => {
      setError(null);
      const result = await authClient.signIn.emailOtp({
        email: email ?? "",
        otp,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Code invalide");
      }
      return result;
    },
    onSuccess: (result) => {
      const isNewUser = !(result.data?.user as any)?.hasProfile;
      if (isNewUser && (type === "candidate" || type === "recruiter")) {
        invalidateSession();
        router.replace(`/onboarding?type=${type}` as never);
      } else {
        invalidateSession();
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const resendOtp = useMutation({
    mutationFn: async () => {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email ?? "",
        type: "sign-in",
        fetchOptions: { headers: { "x-lang": lang } },
      } as any);
      if (result.error) {
        throw new Error(result.error.message ?? "Erreur lors du renvoi");
      }
      return result;
    },
    onSuccess: () => {
      setCountdown(60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
  });

  const handleOtpFilled = useCallback(
    (otp: string) => {
      if (otp.length === 6 && !verifyOtp.isPending) {
        verifyOtp.mutate(otp);
      }
    },
    [verifyOtp.isPending]
  );

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(b.length) + c)
    : "";

  return (
    <View testID="verify-otp-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            {/* Header */}
            <Pressable
              testID="back-button"
              onPress={() => router.back()}
              style={{ marginTop: 8, height: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.toggleBg }}
            >
              <ArrowLeft size={20} color={colors.primary} strokeWidth={2.5} />
            </Pressable>

            {/* Icon */}
            <Animated.View entering={FadeInDown.duration(500).delay(100)} style={{ marginTop: 40, alignItems: "center" }}>
              <View
                style={{ height: 64, width: 64, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: isDark ? colors.toggleBg : "#EBF5EC" }}
              >
                <ShieldCheck size={32} color="#3BAD4E" strokeWidth={2} />
              </View>
            </Animated.View>

            {/* Title */}
            <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ marginTop: 24 }}>
              <Text style={{ textAlign: "center", fontSize: 24, fontWeight: "700", color: colors.primary }}>
                {t("verify_title")}
              </Text>
              <Text style={{ marginTop: 8, textAlign: "center", fontSize: 15, color: colors.textSecondary }}>
                {t("verify_subtitle")}
              </Text>
              <Text style={{ marginTop: 4, textAlign: "center", fontSize: 15, fontWeight: "600", color: colors.text }}>
                {maskedEmail}
              </Text>
            </Animated.View>

            {/* OTP Input */}
            <Animated.View entering={FadeInDown.duration(500).delay(300)} style={{ marginTop: 32 }}>
              <OtpInput
                numberOfDigits={6}
                onFilled={handleOtpFilled}
                focusColor="#3BAD4E"
                theme={{
                  containerStyle: {
                    gap: 8,
                  },
                  pinCodeContainerStyle: {
                    width: (SCREEN_WIDTH - 32 - 40) / 6,
                    height: 48,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: colors.border,
                    backgroundColor: colors.toggleBg,
                  },
                  pinCodeTextStyle: {
                    fontSize: 24,
                    fontWeight: "700",
                    color: colors.text,
                  },
                  focusedPinCodeContainerStyle: {
                    borderColor: "#3BAD4E",
                    borderWidth: 2,
                    backgroundColor: colors.card,
                  },
                  focusStickStyle: {
                    backgroundColor: "#3BAD4E",
                    width: 2,
                    height: 24,
                  },
                }}
              />

              {verifyOtp.isPending ? (
                <View style={{ marginTop: 24, alignItems: "center" }}>
                  <ActivityIndicator testID="verify-loading" color="#3BAD4E" size="small" />
                  <Text style={{ marginTop: 8, fontSize: 14, color: colors.textSecondary }}>{t("verify_pending")}</Text>
                </View>
              ) : null}

              {error ? (
                <Text testID="error-message" style={{ marginTop: 16, textAlign: "center", fontSize: 14, color: "#EF4444" }}>
                  {error}
                </Text>
              ) : null}
            </Animated.View>

            {/* Resend */}
            <Animated.View entering={FadeInDown.duration(500).delay(400)} style={{ marginTop: 32, alignItems: "center" }}>
              {countdown > 0 ? (
                <Text style={{ fontSize: 14, color: colors.textMuted }}>
                  {`${t("verify_resend_wait")} ${countdown}s`}
                </Text>
              ) : (
                <Pressable
                  testID="resend-button"
                  onPress={() => resendOtp.mutate()}
                  disabled={resendOtp.isPending}
                  style={{ paddingVertical: 8 }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#3BAD4E" }}>
                    {resendOtp.isPending ? t("verify_resending") : t("verify_resend")}
                  </Text>
                </Pressable>
              )}
            </Animated.View>

            <View style={{ flex: 1 }} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
