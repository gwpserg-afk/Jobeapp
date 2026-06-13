import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth";
import { useRouter } from "expo-router";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

export default function Profile() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { colors, isDark, toggle } = useTheme();
  const { t, lang, setLang } = useI18n();
  const user = session?.user;

  const STATS = [
    { label: t.views, value: "248" },
    { label: t.applications, value: "12" },
    { label: t.connections, value: "89" },
  ];

  const MENU = [
    { emoji: "✏️", label: t.editProfile },
    { emoji: "🎓", label: t.experience },
    { emoji: "🛡️", label: t.identity },
    { emoji: "💎", label: t.premium },
    { emoji: "🔔", label: t.notifications },
    { emoji: "🔒", label: t.security },
  ];

  async function handleLogout() {
    await authClient.signOut();
    router.replace("/(auth)/welcome");
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarLarge, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{(user?.name ?? "U")[0]}</Text>
          </View>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.name ?? t.yourName}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email ?? ""}</Text>

          {/* Stats */}
          <View style={[styles.stats, { borderBottomColor: colors.border }]}>
            {STATS.map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Profile completion */}
          <View style={[styles.completionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.completionTop}>
              <Text style={[styles.completionLabel, { color: colors.textSecondary }]}>{t.profileComplete} 45%</Text>
              <Text style={[styles.completionPct, { color: colors.primary }]}>45%</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.bgElevated }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: "45%" }]} />
            </View>
            <Text style={[styles.completionHint, { color: colors.textMuted }]}>{t.cvHint}</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={[styles.menu, { borderTopColor: colors.border }]}>
          {/* Dark/Light toggle */}
          <View style={[styles.menuRow, { borderBottomColor: colors.border }]}>
            <Text style={styles.menuEmoji}>{isDark ? "🌙" : "☀️"}</Text>
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{isDark ? t.darkMode : t.lightMode}</Text>
            <Switch
              value={isDark}
              onValueChange={toggle}
              trackColor={{ false: colors.border, true: colors.primaryDim }}
              thumbColor={isDark ? colors.primary : "#fff"}
            />
          </View>

          {/* Language selector */}
          <View style={[styles.menuRow, { borderBottomColor: colors.border }]}>
            <Text style={styles.menuEmoji}>🌐</Text>
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{t.language}</Text>
            <View style={styles.langPicker}>
              {(["fr", "en", "zh"] as const).map((l) => (
                <TouchableOpacity
                  key={l}
                  onPress={() => setLang(l)}
                  style={[styles.langChip, lang === l && { backgroundColor: colors.primaryDim }]}
                >
                  <Text style={[styles.langChipText, { color: lang === l ? colors.primary : colors.textMuted }]}>
                    {l === "fr" ? "FR" : l === "en" ? "EN" : "中文"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {MENU.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuRow, { borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <Text style={[styles.menuArrow, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.error, marginHorizontal: spacing.xl }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={[styles.logoutText, { color: colors.error }]}>{t.logout}</Text>
        </TouchableOpacity>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: spacing.sm },
  avatarLarge: { width: 88, height: 88, borderRadius: radius.full, justifyContent: "center", alignItems: "center", borderWidth: 3 },
  avatarText: { fontSize: 36, fontWeight: fonts.weights.bold },
  name: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold, marginTop: spacing.sm },
  email: { fontSize: fonts.sizes.sm },
  stats: { flexDirection: "row", gap: spacing.xxl, marginTop: spacing.lg, paddingBottom: spacing.lg, borderBottomWidth: 1, width: "100%", justifyContent: "center" },
  stat: { alignItems: "center" },
  statValue: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold },
  statLabel: { fontSize: fonts.sizes.xs, marginTop: 2 },
  completionCard: { width: "100%", borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm, borderWidth: 1 },
  completionTop: { flexDirection: "row", justifyContent: "space-between" },
  completionLabel: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium },
  completionPct: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold },
  progressBar: { height: 6, borderRadius: radius.full },
  progressFill: { height: 6, borderRadius: radius.full },
  completionHint: { fontSize: fonts.sizes.xs },
  menu: { paddingHorizontal: spacing.xl, marginTop: spacing.lg, borderTopWidth: 1 },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, gap: spacing.md, borderBottomWidth: 1 },
  menuEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  menuLabel: { flex: 1, fontSize: fonts.sizes.base },
  menuArrow: { fontSize: 20 },
  langPicker: { flexDirection: "row", gap: 4 },
  langChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  langChipText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold },
  logoutBtn: { marginTop: spacing.xl, marginBottom: spacing.xxl, borderRadius: radius.full, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
  logoutText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
});
