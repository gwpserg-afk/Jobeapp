import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const MOCK_JOBS = [
  { id: "1", title: "Développeur React Native", company: "TechDakar", location: "Dakar, SN", type: "CDI", salary: "800K – 1.2M FCFA", match: 92, posted: "Aujourd'hui" },
  { id: "2", title: "Designer UX/UI", company: "Orange Sénégal", location: "Dakar, SN", type: "CDI", salary: "600K – 900K FCFA", match: 87, posted: "Hier" },
  { id: "3", title: "Chef de Projet Digital", company: "Wave Africa", location: "Abidjan, CI", type: "CDD", salary: "1M FCFA", match: 78, posted: "2j" },
  { id: "4", title: "Data Analyst", company: "MTN Mobile", location: "Douala, CM", type: "CDI", salary: "750K FCFA", match: 71, posted: "3j" },
];

const FILTERS = ["Tous", "CDI", "CDD", "Stage", "Télétravail"];

export default function Jobs() {
  const colors = useTheme((s) => s.colors);
  const { t } = useI18n();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t.jobs}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{MOCK_JOBS.length} {t.available}</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t.search}
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
        {FILTERS.map((f, i) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              { backgroundColor: i === 0 ? colors.primary : colors.bgCard, borderColor: i === 0 ? colors.primary : colors.border },
            ]}
          >
            <Text style={[styles.filterText, { color: i === 0 ? "#fff" : colors.textSecondary }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {MOCK_JOBS.map((job) => (
          <TouchableOpacity key={job.id} style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]} activeOpacity={0.85}>
            <View style={styles.cardTop}>
              <View style={[styles.companyLogo, { backgroundColor: colors.bgElevated }]}>
                <Text style={{ fontSize: 20 }}>🏢</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.jobTitle, { color: colors.textPrimary }]}>{job.title}</Text>
                <Text style={[styles.companyName, { color: colors.textMuted }]}>{job.company}</Text>
              </View>
              <View style={[styles.matchBadge, { backgroundColor: job.match >= 85 ? colors.primary : colors.primaryDim }]}>
                <Text style={[styles.matchText, { color: job.match >= 85 ? "#fff" : colors.primary }]}>{job.match}%</Text>
              </View>
            </View>
            <View style={styles.cardMeta}>
              <Text style={[styles.metaText, { color: colors.textMuted }]}>📍 {job.location}  ·  💰 {job.salary}</Text>
            </View>
            <View style={styles.cardFooter}>
              <View style={[styles.typeBadge, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
                <Text style={[styles.typeText, { color: colors.textSecondary }]}>{job.type}</Text>
              </View>
              <Text style={[styles.postedText, { color: colors.textMuted }]}>{job.posted}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.bold },
  subtitle: { fontSize: fonts.sizes.sm, marginTop: 2 },
  searchWrap: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: fonts.sizes.base },
  filters: { marginBottom: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  filterText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  companyLogo: { width: 48, height: 48, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  jobTitle: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
  companyName: { fontSize: fonts.sizes.sm, marginTop: 2 },
  matchBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  matchText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold },
  cardMeta: {},
  metaText: { fontSize: fonts.sizes.sm },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typeBadge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  typeText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.medium },
  postedText: { fontSize: fonts.sizes.xs },
});
