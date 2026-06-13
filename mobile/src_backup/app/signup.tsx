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
import { ArrowLeft, Eye, EyeOff, User, Mail, Lock, Phone, Building2 } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/lib/theme";
import { authClient } from "@/lib/auth/auth-client";
import { useInvalidateSession } from "@/lib/auth/use-session";
import { useLang } from "@/lib/i18n";

const NAVY = "#1B2F6E";
const ACCENT = "#3BAD4E";

type Role = "candidate" | "recruiter";

export default function SignupScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const invalidateSession = useInvalidateSession();
  const lang = useLang((s) => s.lang);

  const [role, setRole] = useState<Role>("candidate");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;

  const handleSignup = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError(lang === "fr" ? "Veuillez remplir tous les champs obligatoires." : "Please fill all required fields.");
      return;
    }
    if (role === "recruiter" && !company.trim()) {
      setError(lang === "fr" ? "Le nom de l'entreprise est obligatoire." : "Company name is required.");
      return;
    }
    if (password.length < 8) {
      setError(lang === "fr" ? "Le mot de passe doit contenir au moins 8 caractères." : "Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const { error: signupError } = await authClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        data: {
          accountType: role,
          phone: phone.trim() || undefined,
          languagePreference: lang,
        },
      } as any);

      if (signupError) {
        const msg = (signupError as any)?.message ?? "";
        const isNetwork = !msg || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch");
        const isExists = msg.toLowerCase().includes("already");
        setError(
          isExists
            ? (lang === "fr" ? "Un compte existe déjà avec cet email." : "An account already exists with this email.")
            : isNetwork
            ? (lang === "fr" ? "Connexion impossible. Vérifiez votre connexion internet." : "Cannot connect. Check your internet connection.")
            : (lang === "fr" ? "Erreur lors de la création du compte. Réessayez." : "Failed to create account. Please try again.")
        );
        setLoading(false);
        return;
      }

      // Non-blocking onboarding call
      try {
        await fetch(`${baseUrl}/api/onboarding`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            role === "recruiter"
              ? { accountType: "recruiter", companyName: company.trim(), contactName: name.trim(), languagePreference: lang }
              : { accountType: "candidate", fullName: name.trim(), phone: phone.trim() || undefined, languagePreference: lang }
          ),
        });
      } catch {
        // Silent — user is authenticated, profile can be completed later
      }

      invalidateSession();
    } catch (err: any) {
      const isNetwork = !err?.message || err.message.toLowerCase().includes("network") || err.message.toLowerCase().includes("fetch");
      setError(isNetwork
        ? (lang === "fr" ? "Connexion impossible. Vérifiez votre connexion internet." : "Cannot connect. Check your internet.")
        : (lang === "fr" ? "Une erreur est survenue. Réessayez." : "An error occurred. Please try again.")
      );
      setLoading(false);
    }
  };

  const inputStyle = {
    flex: 1,
    fontSize: 15,
    color: isDark ? "#F9FAFB" : "#111827",
    paddingVertical: 0,
  };

  const inputRow = (icon: React.ReactNode, placeholder: string, value: string, onChange: (v: string) => void, opts?: {
    secure?: boolean;
    showToggle?: boolean;
    keyboardType?: "email-address" | "phone-pad" | "default";
    autoCapitalize?: "none" | "words" | "sentences";
  }) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: isDark ? "#1E2C50" : "#F8FAFC",
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: isDark ? "#2A3B6A" : "#E5E7EB",
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 10,
        marginBottom: 12,
      }}
    >
      {icon}
      <TextInput
        style={inputStyle}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
        value={value}
        onChangeText={onChange}
        secureTextEntry={opts?.secure && !showPassword}
        keyboardType={opts?.keyboardType ?? "default"}
        autoCapitalize={opts?.autoCapitalize ?? "sentences"}
        autoCorrect={false}
      />
      {opts?.showToggle && (
        <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
          {showPassword
            ? <EyeOff size={18} color={isDark ? "#6B7280" : "#9CA3AF"} />
            : <Eye size={18} color={isDark ? "#6B7280" : "#9CA3AF"} />
          }
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            <Pressable
              onPress={() => router.back()}
              style={{ marginTop: 8, marginBottom: 24, alignSelf: "flex-start", padding: 4 }}
              hitSlop={10}
            >
              <ArrowLeft size={24} color={isDark ? "#E0E7FF" : NAVY} strokeWidth={2.5} />
            </Pressable>

            {/* Title */}
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text style={{ fontSize: 28, fontWeight: "800", color: isDark ? "#F9FAFB" : NAVY, marginBottom: 6 }}>
                {lang === "fr" ? "Créer un compte" : "Create account"}
              </Text>
              <Text style={{ fontSize: 15, color: isDark ? "#9CA3AF" : "#6B7280", marginBottom: 28 }}>
                {lang === "fr" ? "Rejoignez le réseau professionnel d'Afrique de l'Ouest." : "Join West Africa's professional network."}
              </Text>
            </Animated.View>

            {/* Role toggle */}
            <Animated.View entering={FadeInDown.duration(400).delay(60)}>
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: isDark ? "#1E2C50" : "#F0F4FF",
                  borderRadius: 14,
                  padding: 4,
                  marginBottom: 24,
                }}
              >
                {([
                  { key: "candidate", label: lang === "fr" ? "Professionnel" : "Professional" },
                  { key: "recruiter", label: lang === "fr" ? "Recruteur" : "Recruiter" },
                ] as { key: Role; label: string }[]).map(({ key, label }) => (
                  <Pressable
                    key={key}
                    testID={`role-${key}`}
                    onPress={() => setRole(key)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 11,
                      alignItems: "center",
                      backgroundColor: role === key ? (isDark ? NAVY : "#FFFFFF") : "transparent",
                      shadowColor: role === key ? "#000" : "transparent",
                      shadowOpacity: role === key ? 0.1 : 0,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: role === key ? 3 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: role === key ? "700" : "500",
                        color: role === key
                          ? (isDark ? "#FFFFFF" : NAVY)
                          : (isDark ? "#6B7280" : "#9CA3AF"),
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>

            {/* Fields */}
            <Animated.View entering={FadeInDown.duration(400).delay(120)}>
              {inputRow(
                <User size={18} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />,
                lang === "fr" ? "Nom complet" : "Full name",
                name,
                setName,
                { autoCapitalize: "words" }
              )}

              {inputRow(
                <Mail size={18} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />,
                lang === "fr" ? "Adresse email" : "Email address",
                email,
                setEmail,
                { keyboardType: "email-address", autoCapitalize: "none" }
              )}

              {inputRow(
                <Lock size={18} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />,
                lang === "fr" ? "Mot de passe (8 caractères min)" : "Password (8 chars min)",
                password,
                setPassword,
                { secure: true, showToggle: true, autoCapitalize: "none" }
              )}

              {inputRow(
                <Phone size={18} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />,
                lang === "fr" ? "Téléphone (optionnel)" : "Phone (optional)",
                phone,
                setPhone,
                { keyboardType: "phone-pad", autoCapitalize: "none" }
              )}

              {role === "recruiter" && inputRow(
                <Building2 size={18} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />,
                lang === "fr" ? "Nom de l'entreprise" : "Company name",
                company,
                setCompany,
                { autoCapitalize: "words" }
              )}
            </Animated.View>

            {/* Error */}
            {error && (
              <Animated.View entering={FadeInDown.duration(300)}>
                <View
                  style={{
                    backgroundColor: isDark ? "#3B0D0D" : "#FEF2F2",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: isDark ? "#7F1D1D" : "#FECACA",
                  }}
                >
                  <Text style={{ fontSize: 13, color: isDark ? "#FCA5A5" : "#DC2626", textAlign: "center" }}>
                    {error}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* CTA */}
            <Animated.View entering={FadeInDown.duration(400).delay(180)}>
              <Pressable
                testID="signup-submit"
                onPress={handleSignup}
                disabled={loading}
                style={({ pressed }) => ({
                  backgroundColor: ACCENT,
                  borderRadius: 16,
                  height: 54,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 4,
                  opacity: pressed || loading ? 0.8 : 1,
                  shadowColor: ACCENT,
                  shadowOpacity: 0.4,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 6,
                })}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF" }}>
                    {lang === "fr" ? "Créer mon compte" : "Create my account"}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => router.push("/sign-in" as never)}
                style={{ marginTop: 20, alignItems: "center" }}
              >
                <Text style={{ fontSize: 14, color: isDark ? "#9CA3AF" : "#6B7280" }}>
                  {lang === "fr" ? "Déjà un compte ? " : "Already have an account? "}
                  <Text style={{ color: ACCENT, fontWeight: "700" }}>
                    {lang === "fr" ? "Se connecter" : "Sign in"}
                  </Text>
                </Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
