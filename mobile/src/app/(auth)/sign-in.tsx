import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth";
import { colors, fonts, radius, spacing } from "@/lib/theme";

export default function SignIn() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOTP() {
    if (!email.trim()) { setError("Entrez votre email"); return; }
    setLoading(true);
    setError("");
    try {
      await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
      router.push({ pathname: "/(auth)/verify-otp", params: { email: email.trim(), type: type ?? "candidate" } });
    } catch (e: any) {
      setError(e.message ?? "Erreur, réessayez");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Back */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>
              Entrez votre email pour recevoir un code de vérification
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={handleSendOTP}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
              onPress={handleSendOTP}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.btnText}>Envoyer le code</Text>
              }
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
            <Text style={styles.signupLink}>
              Pas de compte ? <Text style={{ color: colors.primary }}>S'inscrire</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  back: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  backText: { color: colors.textSecondary, fontSize: fonts.sizes.base },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, justifyContent: "space-between", paddingBottom: spacing.xl },
  header: { gap: spacing.sm },
  title: { color: colors.textPrimary, fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.bold },
  subtitle: { color: colors.textSecondary, fontSize: fonts.sizes.base, lineHeight: 22 },
  form: { gap: spacing.md },
  label: { color: colors.textSecondary, fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: fonts.sizes.base,
  },
  error: { color: colors.error, fontSize: fonts.sizes.sm },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  btnText: { color: "#000", fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  signupLink: { color: colors.textSecondary, fontSize: fonts.sizes.base, textAlign: "center" },
});
