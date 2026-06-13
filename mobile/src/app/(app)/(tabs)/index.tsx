import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { authClient } from "@/lib/auth";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const { width } = Dimensions.get("window");

const MOCK_POSTS = [
  {
    id: "1",
    author: "Fatou Diallo",
    initials: "FD",
    role: "Développeuse Web · Dakar",
    time: "2h",
    content: "Ravie d'annoncer que j'ai rejoint une startup tech à Dakar.",
    likes: 48,
    comments: 12,
  },
  {
    id: "2",
    author: "Moussa Traoré",
    initials: "MT",
    role: "Recruteur RH · TechDakar",
    time: "4h",
    content: "Nous recrutons 3 développeurs React Native. CDD 6 mois renouvelable.",
    likes: 91,
    comments: 34,
  },
  {
    id: "3",
    author: "Aminata Koné",
    initials: "AK",
    role: "Designer UX/UI · Abidjan",
    time: "1j",
    content: "Soignez votre profil Jobé comme votre CV — les recruteurs regardent la bio en premier.",
    likes: 120,
    comments: 28,
  },
];

export default function Feed() {
  const { data: session } = authClient.useSession();
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const { t } = useI18n();
  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* Sticky header */}
        <View style={[styles.header, { backgroundColor: colors.bg }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>{t.greeting}</Text>
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {firstName || "Jobé"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          >
            <View style={[styles.notifDot, { backgroundColor: colors.primary }]} />
            <Text style={{ fontSize: 18 }}>🔔</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.feed}>
          {/* AI Match — hero card */}
          <TouchableOpacity activeOpacity={0.9} style={styles.aiCardWrap}>
            <LinearGradient
              colors={isDark ? ["#0E3D1F", "#0D1F14"] : ["#DCFCE7", "#F0FDF4"]}
              style={styles.aiCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.aiTop}>
                <View style={[styles.aiPill, { backgroundColor: colors.primary }]}>
                  <Text style={styles.aiPillText}>IA</Text>
                </View>
                <Text style={[styles.aiTime, { color: colors.textMuted }]}>Mis à jour</Text>
              </View>
              <Text style={[styles.aiCount, { color: colors.textPrimary }]}>5</Text>
              <Text style={[styles.aiLabel, { color: colors.primary }]}>{t.aiMatch}</Text>
              <Text style={[styles.aiSub, { color: colors.textMuted }]}>{t.aiSub}</Text>
              <View style={styles.aiCta}>
                <Text style={[styles.aiCtaText, { color: colors.primary }]}>{t.see} les offres →</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Section label */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Fil · Sénégal</Text>
            <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Posts */}
          {MOCK_POSTS.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={[styles.post, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              activeOpacity={0.85}
            >
              <View style={styles.postHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.bgElevated }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{post.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.postAuthor, { color: colors.textPrimary }]}>{post.author}</Text>
                  <Text style={[styles.postRole, { color: colors.textMuted }]}>{post.role}</Text>
                </View>
                <Text style={[styles.postTime, { color: colors.textMuted }]}>{post.time}</Text>
              </View>

              <Text style={[styles.postContent, { color: colors.textSecondary }]}>
                {post.content}
              </Text>

              <View style={[styles.postFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={styles.postAction}>
                  <Text style={[styles.postActionText, { color: colors.textMuted }]}>
                    ↑  {post.likes}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.postAction}>
                  <Text style={[styles.postActionText, { color: colors.textMuted }]}>
                    ◯  {post.comments}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.postAction}>
                  <Text style={[styles.postActionText, { color: colors.textMuted }]}>
                    ↗
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

          <View style={{ height: spacing.xxl }} />
        </View>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  greeting: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  name: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.heavy,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: radius.full,
    zIndex: 1,
  },
  feed: { paddingHorizontal: spacing.xl, gap: spacing.md },
  aiCardWrap: { borderRadius: radius.xxl, overflow: "hidden" },
  aiCard: {
    padding: spacing.xl,
    borderRadius: radius.xxl,
    gap: spacing.xs,
  },
  aiTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  aiPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  aiPillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: fonts.weights.bold,
    letterSpacing: 0.5,
  },
  aiTime: { fontSize: fonts.sizes.xs },
  aiCount: {
    fontSize: 64,
    fontWeight: fonts.weights.heavy,
    lineHeight: 68,
    letterSpacing: -2,
  },
  aiLabel: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold,
    letterSpacing: 0.1,
  },
  aiSub: { fontSize: fonts.sizes.sm },
  aiCta: { marginTop: spacing.md },
  aiCtaText: {
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.semibold,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.semibold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionLine: { flex: 1, height: 1 },
  post: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
  },
  postHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold,
    letterSpacing: 0.5,
  },
  postAuthor: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
  postRole: { fontSize: fonts.sizes.xs, marginTop: 2 },
  postTime: { fontSize: fonts.sizes.xs },
  postContent: {
    fontSize: fonts.sizes.base,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  postFooter: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  postAction: { paddingVertical: 2 },
  postActionText: { fontSize: fonts.sizes.sm, letterSpacing: 0.3 },
});
