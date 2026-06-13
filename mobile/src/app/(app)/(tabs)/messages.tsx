import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const MOCK_CONVOS = [
  { id: "1", name: "Moussa Diallo", role: "RH – TechDakar", last: "Votre profil nous intéresse.", time: "10h", unread: 2 },
  { id: "2", name: "Aminata Koné", role: "Designer", last: "Merci pour votre retour !", time: "Hier", unread: 0 },
  { id: "3", name: "Ibrahima Sarr", role: "CTO – Wave", last: "Quand êtes-vous disponible ?", time: "2j", unread: 1 },
];

export default function Messages() {
  const colors = useTheme((s) => s.colors);
  const { t } = useI18n();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t.messages}</Text>
        <TouchableOpacity style={[styles.newBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.newBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {MOCK_CONVOS.map((convo) => (
          <TouchableOpacity key={convo.id} style={[styles.row, { borderBottomColor: colors.border }]} activeOpacity={0.8}>
            <View style={[styles.avatar, { backgroundColor: colors.bgElevated }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{convo.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowTop}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{convo.name}</Text>
                <Text style={[styles.time, { color: colors.textMuted }]}>{convo.time}</Text>
              </View>
              <Text style={[styles.role, { color: colors.textMuted }]}>{convo.role}</Text>
              <Text style={[styles.last, { color: convo.unread > 0 ? colors.textSecondary : colors.textMuted }]} numberOfLines={1}>
                {convo.last}
              </Text>
            </View>
            {convo.unread > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{convo.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: { fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.bold },
  newBtn: { width: 36, height: 36, borderRadius: radius.full, justifyContent: "center", alignItems: "center" },
  newBtnText: { color: "#fff", fontSize: 22, fontWeight: fonts.weights.bold, lineHeight: 26 },
  list: { paddingHorizontal: spacing.xl, gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 50, height: 50, borderRadius: radius.full, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
  rowTop: { flexDirection: "row", justifyContent: "space-between" },
  name: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
  time: { fontSize: fonts.sizes.xs },
  role: { fontSize: fonts.sizes.xs, marginTop: 1 },
  last: { fontSize: fonts.sizes.sm, marginTop: 3 },
  badge: { width: 20, height: 20, borderRadius: radius.full, justifyContent: "center", alignItems: "center" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: fonts.weights.bold },
});
