import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  Bell,
  Sparkles,
  ArrowRight,
  Heart,
  MessageCircle,
  Share2,
  BadgeCheck,
  Plus,
} from "lucide-react-native";
import { authClient } from "@/lib/auth";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const HIRING = [
  { id: "h1", name: "TechDakar", initials: "TD", c1: "#1DB954", c2: "#0E3D1F" },
  { id: "h2", name: "Sonatel", initials: "SN", c1: "#2D7DD2", c2: "#0E2A4A" },
  { id: "h3", name: "Wave", initials: "WV", c1: "#5B9FE8", c2: "#1DB954" },
  { id: "h4", name: "Orange", initials: "OR", c1: "#E09B3A", c2: "#E05252" },
  { id: "h5", name: "Expat.com", initials: "EX", c1: "#3DD670", c2: "#2D7DD2" },
];

const MOCK_POSTS = [
  {
    id: "1",
    author: "Fatou Diallo",
    initials: "FD",
    role: "Développeuse Web · Dakar",
    time: "2h",
    content: "Ravie d'annoncer que j'ai rejoint une startup tech à Dakar. Merci à toute la communauté Jobé 🙏",
    likes: 48,
    comments: 12,
    verified: true,
    hiring: false,
    ring: ["#1DB954", "#3DD670"] as const,
  },
  {
    id: "2",
    author: "Moussa Traoré",
    initials: "MT",
    role: "Recruteur RH · TechDakar",
    time: "4h",
    content: "Nous recrutons 3 développeurs React Native. CDD 6 mois renouvelable, full remote possible.",
    likes: 91,
    comments: 34,
    verified: true,
    hiring: true,
    ring: ["#2D7DD2", "#5B9FE8"] as const,
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
    verified: false,
    hiring: false,
    ring: ["#E09B3A", "#E05252"] as const,
  },
];

export default function Feed() {
  const { data: session } = authClient.useSession();
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const { t } = useI18n();
  const firstName = session?.user?.name?.split(" ")[0] ?? "";
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const toggleLike = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((p) => ({ ...p, [id]: !p[id] }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* Sticky header */}
        <View style={[styles.header, { backgroundColor: colors.bg }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>{t.greeting}</Text>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{firstName || "Jobé"}</Text>
          </View>
          <Pressable
            style={[styles.notifBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            hitSlop={8}
          >
            <View style={[styles.notifDot, { backgroundColor: colors.primary, borderColor: colors.bgCard }]} />
            <Bell size={19} color={colors.textPrimary} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={styles.feed}>
          {/* Hiring-now stories row */}
          <Animated.View entering={FadeIn.duration(400)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.storiesScroll}
              contentContainerStyle={styles.stories}
            >
              {HIRING.map((co) => (
                <Pressable key={co.id} style={styles.story}>
                  <LinearGradient colors={[co.c1, co.c2]} style={styles.storyRing}>
                    <View style={[styles.storyInner, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.storyInitials, { color: colors.textPrimary }]}>
                        {co.initials}
                      </Text>
                    </View>
                  </LinearGradient>
                  <Text style={[styles.storyName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {co.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>

          {/* AI Match — hero card */}
          <Animated.View entering={FadeInDown.duration(500).springify()}>
            <Pressable
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
              style={styles.aiCardWrap}
            >
              <LinearGradient
                colors={isDark ? ["#0E3D1F", "#0D1F14"] : ["#DCFCE7", "#F0FDF4"]}
                style={styles.aiCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* glow orb */}
                <View style={[styles.aiGlow, { backgroundColor: colors.primary }]} />

                <View style={styles.aiTop}>
                  <View style={[styles.aiPill, { backgroundColor: colors.primary }]}>
                    <Sparkles size={12} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.aiPillText}>IA</Text>
                  </View>
                  <Text style={[styles.aiTime, { color: colors.textMuted }]}>{t.updated}</Text>
                </View>

                <View style={styles.aiRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.aiCount, { color: colors.textPrimary }]}>5</Text>
                    <Text style={[styles.aiLabel, { color: colors.primary }]}>{t.aiMatch}</Text>
                    <Text style={[styles.aiSub, { color: colors.textMuted }]}>{t.aiSub}</Text>
                  </View>

                  {/* avatar stack of matches */}
                  <View style={styles.stack}>
                    {HIRING.slice(0, 3).map((co, i) => (
                      <LinearGradient
                        key={co.id}
                        colors={[co.c1, co.c2]}
                        style={[styles.stackAvatar, { borderColor: isDark ? "#0D1F14" : "#F0FDF4", marginTop: i * 22 }]}
                      >
                        <Text style={styles.stackText}>{co.initials}</Text>
                      </LinearGradient>
                    ))}
                  </View>
                </View>

                <View style={[styles.aiCta, { backgroundColor: colors.primary }]}>
                  <Text style={styles.aiCtaText}>{t.viewOffers}</Text>
                  <ArrowRight size={17} color="#fff" strokeWidth={2.5} />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Section label */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t.feedSection}</Text>
            <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Posts */}
          {MOCK_POSTS.map((post, i) => {
            const isLiked = !!liked[post.id];
            return (
              <Animated.View key={post.id} entering={FadeInDown.delay(i * 70).duration(450).springify()}>
                <Pressable
                  style={[styles.post, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                >
                  <View style={styles.postHeader}>
                    <LinearGradient colors={post.ring} style={styles.avatarRing}>
                      <View style={[styles.avatar, { backgroundColor: colors.bgElevated }]}>
                        <Text style={[styles.avatarText, { color: colors.textPrimary }]}>{post.initials}</Text>
                      </View>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <View style={styles.authorRow}>
                        <Text style={[styles.postAuthor, { color: colors.textPrimary }]}>{post.author}</Text>
                        {post.verified && <BadgeCheck size={15} color={colors.blue} strokeWidth={2.5} fill={colors.blueDim} />}
                      </View>
                      <Text style={[styles.postRole, { color: colors.textMuted }]}>{post.role}</Text>
                    </View>
                    <Text style={[styles.postTime, { color: colors.textMuted }]}>{post.time}</Text>
                  </View>

                  {post.hiring && (
                    <View style={[styles.hiringTag, { backgroundColor: colors.primaryDim }]}>
                      <View style={[styles.hiringDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.hiringText, { color: colors.primary }]}>{t.recruiting}</Text>
                    </View>
                  )}

                  <Text style={[styles.postContent, { color: colors.textSecondary }]}>{post.content}</Text>

                  <View style={[styles.postFooter, { borderTopColor: colors.border }]}>
                    <Pressable style={styles.postAction} onPress={() => toggleLike(post.id)} hitSlop={6}>
                      <Heart
                        size={18}
                        color={isLiked ? colors.error : colors.textMuted}
                        fill={isLiked ? colors.error : "transparent"}
                        strokeWidth={2}
                      />
                      <Text style={[styles.postActionText, { color: isLiked ? colors.error : colors.textMuted }]}>
                        {post.likes + (isLiked ? 1 : 0)}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.postAction} hitSlop={6}>
                      <MessageCircle size={18} color={colors.textMuted} strokeWidth={2} />
                      <Text style={[styles.postActionText, { color: colors.textMuted }]}>{post.comments}</Text>
                    </Pressable>
                    <Pressable style={styles.postAction} hitSlop={6}>
                      <Share2 size={17} color={colors.textMuted} strokeWidth={2} />
                    </Pressable>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}

          <View style={{ height: 96 }} />
        </View>
      </ScrollView>

      {/* Floating compose button */}
      <Pressable
        style={styles.fabWrap}
        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
      >
        <LinearGradient
          colors={[colors.primaryLight, colors.primary]}
          style={styles.fab}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Plus size={22} color="#fff" strokeWidth={2.6} />
          <Text style={styles.fabText}>{t.compose}</Text>
        </LinearGradient>
      </Pressable>
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
  name: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.heavy, letterSpacing: -0.5, marginTop: 2 },
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
    top: 7,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: radius.full,
    borderWidth: 2,
    zIndex: 1,
  },
  feed: { paddingHorizontal: spacing.xl, gap: spacing.md },

  /* stories */
  storiesScroll: { marginHorizontal: -spacing.xl },
  stories: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingVertical: spacing.xs },
  story: { alignItems: "center", width: 64, gap: 6 },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    padding: 2.5,
    justifyContent: "center",
    alignItems: "center",
  },
  storyInner: {
    flex: 1,
    width: "100%",
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  storyInitials: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.heavy, letterSpacing: 0.3 },
  storyName: { fontSize: 11, fontWeight: fonts.weights.medium, maxWidth: 64, textAlign: "center" },

  /* AI card */
  aiCardWrap: { borderRadius: radius.xxl, overflow: "hidden" },
  aiCard: { padding: spacing.xl, borderRadius: radius.xxl, overflow: "hidden" },
  aiGlow: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 999,
    opacity: 0.18,
  },
  aiTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  aiPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  aiPillText: { color: "#fff", fontSize: 11, fontWeight: fonts.weights.bold, letterSpacing: 0.5 },
  aiTime: { fontSize: fonts.sizes.xs },
  aiRow: { flexDirection: "row", alignItems: "flex-start" },
  aiCount: { fontSize: 64, fontWeight: fonts.weights.heavy, lineHeight: 68, letterSpacing: -2 },
  aiLabel: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold, letterSpacing: 0.1 },
  aiSub: { fontSize: fonts.sizes.sm, marginTop: 2 },
  stack: { width: 52, height: 96 },
  stackAvatar: {
    position: "absolute",
    right: 0,
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
  },
  stackText: { color: "#fff", fontSize: 13, fontWeight: fonts.weights.heavy },
  aiCta: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: radius.full,
  },
  aiCtaText: { color: "#fff", fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },

  /* section */
  sectionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  sectionLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.semibold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionLine: { flex: 1, height: 1 },

  /* posts */
  post: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md, borderWidth: 1 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatarRing: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    flex: 1,
    width: "100%",
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold, letterSpacing: 0.5 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  postAuthor: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
  postRole: { fontSize: fonts.sizes.xs, marginTop: 2 },
  postTime: { fontSize: fonts.sizes.xs },
  hiringTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  hiringDot: { width: 6, height: 6, borderRadius: radius.full },
  hiringText: { fontSize: 11, fontWeight: fonts.weights.bold, letterSpacing: 0.3 },
  postContent: { fontSize: fonts.sizes.base, lineHeight: 22, letterSpacing: 0.1 },
  postFooter: {
    flexDirection: "row",
    gap: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  postAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  postActionText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },

  /* fab */
  fabWrap: {
    position: "absolute",
    right: spacing.xl,
    bottom: spacing.xl,
    borderRadius: radius.full,
    shadowColor: "#1DB954",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: radius.full,
  },
  fabText: { color: "#fff", fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
});
