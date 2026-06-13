import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth";
import { colors, fonts, radius, spacing } from "@/lib/theme";

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"candidate" | "recruiter">("candidate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignUp() {
    if (!name.trim() || !email.trim() || !password) {
      setError("Remplissez tous les champs");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authClient.signUp.email({ name: name.trim(), email: email.trim(), password });
      router.replace("/(app)/(tabs)/");
    } catch (e: any) {
      setError(e.message ?? "Erreur, réessayez");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Créer un compte</Text>
              <Text style={styles.subtitle}>Rejoignez la plateforme</Text>
            </View>

            {/* Account type toggle */}
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, accountType === "candidate" && styles.toggleBtnActive]}
                onPress={() => setAccountType("candidate")}
              >
                <Text style={[styles.toggleText, accountType === "candidate" && styles.toggleTextActive]}>
                  Candidat
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, accountType === "recruiter" && styles.toggleBtnActiveBlue]}
                onPress={() => setAccountType("recruiter")}
              >
                <Text style={[styles.toggleText, accountType === "recruiter" && styles.toggleTextActive]}>
                  Recruteur
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Nom complet</Text>
                <TextInput style={styles.input} placeholder="Amadou Diallo" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput style={styles.input} placeholder="votre@email.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Mot de passe</Text>
                <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor={colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: accountType === "recruiter" ? colors.blue : colors.primary }, loading && { opacity: 0.6 }]}
                onPress={handleSignUp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#000" />
                  : <Text style={styles.btnText}>Créer mon compte</Text>
                }
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}>
              <Text style={styles.signinLink}>
                Déjà un compte ? <Text style={{ color: colors.primary }}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  back: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  backText: { color: colors.textSecondary, fontSize: fonts.sizes.base },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },
  header: { gap: spacing.xs },
  title: { color: colors.textPrimary, fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.bold },
  subtitle: { color: colors.textSecondary, fontSize: fonts.sizes.base },
  toggle: { flexDirection: "row", backgroundColor: colors.bgCard, borderRadius: radius.full, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radius.full },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleBtnActiveBlue: { backgroundColor: colors.blue },
  toggleText: { color: colors.textMuted, fontSize: fonts.sizes.base, fontWeight: fonts.weights.medium },
  toggleTextActive: { color: "#000", fontWeight: fonts.weights.bold },
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
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
  btnPrimary: { borderRadius: radius.full, paddingVertical: 16, alignItems: "center" },
  btnText: { color: "#000", fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  signinLink: { color: colors.textSecondary, fontSize: fonts.sizes.base, textAlign: "center" },
});
