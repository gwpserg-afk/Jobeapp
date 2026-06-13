import { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth";
import { colors, fonts, radius, spacing } from "@/lib/theme";

export default function VerifyOTP() {
  const router = useRouter();
  const { email, type } = useLocalSearchParams<{ email: string; type: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify() {
    if (otp.length < 6) { setError("Entrez le code à 6 chiffres"); return; }
    setLoading(true);
    setError("");
    try {
      await authClient.signIn.emailOtp({ email, otp });
      router.replace("/(app)/(tabs)/");
    } catch (e: any) {
      setError("Code incorrect. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    } catch {}
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>✉️</Text>
          </View>
          <Text style={styles.title}>Vérifiez votre email</Text>
          <Text style={styles.subtitle}>
            Code envoyé à{"\n"}<Text style={{ color: colors.primary }}>{email}</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.otpInput}
            placeholder="000000"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            textAlign="center"
            autoFocus
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btnPrimary, (loading || otp.length < 6) && { opacity: 0.5 }]}
            onPress={handleVerify}
            disabled={loading || otp.length < 6}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.btnText}>Vérifier</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResend} style={{ alignItems: "center" }}>
            <Text style={styles.resendText}>
              Pas reçu ? <Text style={{ color: colors.primary }}>Renvoyer</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  back: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  backText: { color: colors.textSecondary, fontSize: fonts.sizes.base },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, gap: spacing.xxl },
  header: { alignItems: "center", gap: spacing.md },
  iconWrap: { width: 72, height: 72, borderRadius: radius.xxl, backgroundColor: colors.bgCard, justifyContent: "center", alignItems: "center" },
  icon: { fontSize: 32 },
  title: { color: colors.textPrimary, fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.bold, textAlign: "center" },
  subtitle: { color: colors.textSecondary, fontSize: fonts.sizes.base, textAlign: "center", lineHeight: 22 },
  form: { gap: spacing.lg },
  otpInput: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 20,
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: fonts.weights.bold,
    letterSpacing: 12,
  },
  error: { color: colors.error, fontSize: fonts.sizes.sm, textAlign: "center" },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnText: { color: "#000", fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  resendText: { color: colors.textSecondary, fontSize: fonts.sizes.base },
});
