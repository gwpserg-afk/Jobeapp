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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { AtSign, User } from "lucide-react-native";
import { authClient } from "@/lib/auth";
import { PhoneInput } from "@/components/PhoneInput";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

export default function CompleteProfile() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const t = useI18n((s) => s.t);
  const { data: session } = authClient.useSession();
  const u = (session?.user ?? {}) as { name?: string; username?: string | null; phone?: string | null };

  const [name, setName] = useState(u.name ?? "");
  const [username, setUsername] = useState((u.username ?? "").toLowerCase());
  const [phone, setPhone] = useState(u.phone ?? "");
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const un = username.trim().toLowerCase();
    if (!name.trim()) return setError(t.su_err_fields);
    if (!/^[a-z0-9_]{3,}$/.test(un)) return setError(t.su_err_username);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError("");
    try {
      await authClient.updateUser({
        name: name.trim(),
        username: un,
        phone: phone.trim(),
      } as Parameters<typeof authClient.updateUser>[0]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(app)/(tabs)/");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError((e as Error)?.message ?? t.cp_err);
      setLoading(false);
    }
  }

  const field = (key: string) => [
    styles.field,
    { backgroundColor: colors.bgCard, borderColor: focused === key ? colors.primary : colors.border },
    focused === key && { borderWidth: 1.5 },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.wordmark} allowFontScaling={false}>
              <Text style={{ color: colors.navy }}>Job</Text>
              <Text style={{ color: colors.primary }}>é</Text>
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t.cp_title}</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>{t.cp_sub}</Text>

            <View style={styles.form}>
              <View style={field("name")}>
                <User size={19} color={focused === "name" ? colors.primary : colors.textMuted} strokeWidth={2} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder={t.su_name_ph}
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                  testID="cp-name"
                />
              </View>

              <View style={field("username")}>
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
                  testID="cp-username"
                />
              </View>

              <PhoneInput
                value={phone}
                onChangeE164={(full) => setPhone(full)}
                focused={focused === "phone"}
                onFocus={() => setFocused("phone")}
                onBlur={() => setFocused(null)}
                placeholder={t.su_phone_ph}
              />

              {error ? <Text style={[styles.error, { color: colors.error }]} testID="cp-error">{error}</Text> : null}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={submit}
              disabled={loading}
              style={[styles.cta, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
              testID="cp-submit"
            >
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.ctaText}>{t.cp_cta}</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, gap: spacing.sm, flexGrow: 1 },
  wordmark: { fontSize: 30, fontWeight: "900", fontStyle: "italic", letterSpacing: -1.2, marginBottom: spacing.xl },
  title: { fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.heavy, letterSpacing: -0.5 },
  sub: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.medium, marginTop: 4, lineHeight: 21 },
  form: { marginTop: spacing.xl, gap: spacing.md },
  field: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.lg, height: 56 },
  input: { flex: 1, fontSize: fonts.sizes.base, fontWeight: fonts.weights.medium, height: "100%" },
  error: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, marginTop: spacing.xs },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md },
  cta: { height: 54, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold, letterSpacing: 0.2 },
});
