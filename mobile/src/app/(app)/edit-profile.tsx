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
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { ArrowLeft, AtSign, User, FileText, MapPin } from "lucide-react-native";
import { authClient } from "@/lib/auth";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const BIO_MAX = 160;

export default function EditProfile() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const t = useI18n((s) => s.t);
  const qc = useQueryClient();
  const { data: session } = authClient.useSession();
  const u = (session?.user ?? {}) as { name?: string; username?: string; bio?: string; location?: string };

  const [name, setName] = useState(u.name ?? "");
  const [username, setUsername] = useState(u.username ?? "");
  const [bio, setBio] = useState(u.bio ?? "");
  const [location, setLocation] = useState(u.location ?? "");
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) return setError(t.su_err_fields);
    const un = username.trim().toLowerCase();
    if (un && !/^[a-z0-9_]{3,}$/.test(un)) return setError(t.su_err_username);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError("");
    try {
      await authClient.updateUser({ name: name.trim(), username: un, bio: bio.trim(), location: location.trim() } as Parameters<typeof authClient.updateUser>[0]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["my-posts"] });
      router.back();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError((e as Error)?.message ?? t.su_err_generic);
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
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => router.back()} hitSlop={10} testID="edit-back">
              <ArrowLeft size={24} color={colors.textPrimary} strokeWidth={2.2} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t.e_title}</Text>
            <Pressable onPress={save} disabled={loading} style={[styles.saveBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]} testID="edit-save">
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{t.e_save}</Text>}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={field("name")}>
              <User size={19} color={focused === "name" ? colors.primary : colors.textMuted} strokeWidth={2} />
              <TextInput style={[styles.input, { color: colors.textPrimary }]} placeholder={t.su_name_ph} placeholderTextColor={colors.textMuted}
                value={name} onChangeText={setName} onFocus={() => setFocused("name")} onBlur={() => setFocused(null)} testID="edit-name" />
            </View>

            <View style={field("username")}>
              <AtSign size={19} color={focused === "username" ? colors.primary : colors.textMuted} strokeWidth={2} />
              <TextInput style={[styles.input, { color: colors.textPrimary }]} placeholder={t.su_username_ph} placeholderTextColor={colors.textMuted}
                autoCapitalize="none" autoCorrect={false} value={username}
                onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                onFocus={() => setFocused("username")} onBlur={() => setFocused(null)} testID="edit-username" />
            </View>

            <View style={[field("bio"), styles.bioField]}>
              <FileText size={19} color={focused === "bio" ? colors.primary : colors.textMuted} strokeWidth={2} style={{ marginTop: 2 }} />
              <TextInput style={[styles.input, styles.bioInput, { color: colors.textPrimary }]} placeholder={t.e_bio_ph} placeholderTextColor={colors.textMuted}
                value={bio} onChangeText={(v) => v.length <= BIO_MAX && setBio(v)} multiline textAlignVertical="top"
                onFocus={() => setFocused("bio")} onBlur={() => setFocused(null)} testID="edit-bio" />
            </View>
            <Text style={[styles.count, { color: colors.textMuted }]}>{bio.length} / {BIO_MAX}</Text>

            <View style={field("location")}>
              <MapPin size={19} color={focused === "location" ? colors.primary : colors.textMuted} strokeWidth={2} />
              <TextInput style={[styles.input, { color: colors.textPrimary }]} placeholder={t.e_location_ph} placeholderTextColor={colors.textMuted}
                value={location} onChangeText={setLocation}
                onFocus={() => setFocused("location")} onBlur={() => setFocused(null)} testID="edit-location" />
            </View>

            {error ? <Text style={[styles.error, { color: colors.error }]} testID="edit-error">{error}</Text> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1 },
  title: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  saveBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, minWidth: 72, alignItems: "center" },
  saveText: { color: "#fff", fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.md },
  field: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.lg, height: 56 },
  bioField: { height: 110, alignItems: "flex-start", paddingVertical: spacing.md },
  input: { flex: 1, fontSize: fonts.sizes.base, fontWeight: fonts.weights.medium, height: "100%" },
  bioInput: { height: "100%", paddingTop: 0 },
  count: { fontSize: fonts.sizes.sm, textAlign: "right" },
  error: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium },
});
