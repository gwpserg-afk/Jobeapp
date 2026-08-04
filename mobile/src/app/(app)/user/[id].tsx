import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { ArrowLeft, BadgeCheck, Grid3x3, MapPin, MessageCircle, Check, UserPlus } from "lucide-react-native";
import { api } from "@/lib/api";
import type { Post, FollowInfo } from "@/lib/types";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const { width } = Dimensions.get("window");
const GRID_GAP = 2;
const CELL = (width - GRID_GAP * 2) / 3;
const AV = 96;

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

type PublicUser = {
  id: string; name: string; username?: string | null; image?: string | null;
  bio?: string | null; location?: string | null; accountType?: string | null;
  isVerified?: boolean; isGoldVerified?: boolean;
};

export default function UserProfile() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const { t } = useI18n();
  const p = useLocalSearchParams<{
    id: string; name?: string; username?: string; image?: string;
    accountType?: string; isVerified?: string; isGoldVerified?: string;
  }>();
  const qc = useQueryClient();

  // Full public profile (bio/location). Falls back to nav params while loading.
  const userQuery = useQuery({
    queryKey: ["user-meta", p.id],
    queryFn: () => api.get<PublicUser>(`/api/users/${p.id}`),
    enabled: !!p.id,
  });
  const u: PublicUser = userQuery.data ?? {
    id: p.id, name: p.name ?? "—", username: p.username, image: p.image,
    accountType: p.accountType, isVerified: p.isVerified === "true", isGoldVerified: p.isGoldVerified === "true",
  };

  const postsQuery = useQuery({
    queryKey: ["user-posts", p.id],
    queryFn: () => api.get<Post[]>(`/api/posts/user/${p.id}`),
    enabled: !!p.id,
  });
  const posts = postsQuery.data ?? [];

  const followQuery = useQuery({
    queryKey: ["follow", p.id],
    queryFn: () => api.get<FollowInfo>(`/api/follow/${p.id}`),
    enabled: !!p.id,
  });
  const follow = followQuery.data;

  const followMutation = useMutation({
    mutationFn: () => api.post<{ following: boolean }>(`/api/follow/${p.id}`, {}),
    onMutate: async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await qc.cancelQueries({ queryKey: ["follow", p.id] });
      const prev = qc.getQueryData<FollowInfo>(["follow", p.id]);
      if (prev) qc.setQueryData<FollowInfo>(["follow", p.id], {
        ...prev, isFollowing: !prev.isFollowing, followers: prev.followers + (prev.isFollowing ? -1 : 1),
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["follow", p.id], ctx.prev); },
  });

  const isBusiness = (u.accountType ?? "").toLowerCase().includes("recruit") ||
    (u.accountType ?? "").toLowerCase().includes("business");

  const stats = [
    { label: t.p_posts, value: posts.length },
    { label: t.p_followers, value: follow?.followers ?? 0 },
    { label: t.p_following, value: follow?.following ?? 0 },
  ];

  const openPost = (id: string) => {
    Haptics.selectionAsync();
    router.push({ pathname: "/(app)/post/[id]", params: { id } });
  };

  const openChat = () => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/(app)/chat/[id]",
      params: { id: u.id, name: u.name, username: u.username ?? "", image: u.image ?? "" },
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Top bar: back left, logo right */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} testID="user-back">
            <ArrowLeft size={24} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.logo} allowFontScaling={false}>
            <Text style={{ color: colors.navy }}>Job</Text>
            <Text style={{ color: colors.primary }}>é</Text>
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} testID="user-screen">
          {/* Two-column header: left = name/handle/stats, right = big avatar */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{u.name}</Text>
                {u.isGoldVerified ? (
                  <BadgeCheck size={19} color={colors.warning} strokeWidth={2.5} fill={colors.warning} />
                ) : u.isVerified ? (
                  <BadgeCheck size={19} color={colors.blue} strokeWidth={2.5} fill={colors.blueDim} />
                ) : null}
              </View>
              {u.username ? <Text style={[styles.handle, { color: colors.textMuted }]}>@{u.username}</Text> : null}

              <View style={styles.statsRow}>
                {stats.map((s) => (
                  <View key={s.label} style={styles.stat}>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.avatarWrap}>
              {u.image ? (
                <Image source={{ uri: u.image }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={["#1DB954", "#1E2A5C"]} style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitials}>{initials(u.name)}</Text>
                </LinearGradient>
              )}
            </View>
          </View>

          {/* Action row: Follow pill + Message */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => followMutation.mutate()}
              style={({ pressed }) => [
                styles.followBtn,
                follow?.isFollowing
                  ? { backgroundColor: colors.bgElevated, borderColor: colors.border, borderWidth: 1 }
                  : { backgroundColor: colors.primary, shadowColor: colors.primary },
                pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
              ]}
              testID="follow-btn"
            >
              {follow?.isFollowing ? (
                <Check size={17} color={colors.textPrimary} strokeWidth={2.6} />
              ) : (
                <UserPlus size={17} color="#fff" strokeWidth={2.4} />
              )}
              <Text style={[styles.followText, { color: follow?.isFollowing ? colors.textPrimary : "#fff" }]}>
                {follow?.isFollowing ? t.f_following : t.f_follow}
              </Text>
            </Pressable>
            <Pressable onPress={openChat} style={[styles.iconBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]} testID="user-message">
              <MessageCircle size={19} color={colors.textPrimary} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Bio block */}
          <View style={styles.bioBlock}>
            <View style={[styles.typeChip, { backgroundColor: isBusiness ? colors.navyDim : colors.primaryDim }]}>
              <Text style={[styles.typeChipText, { color: isBusiness ? colors.navy : colors.primary }]}>
                {isBusiness ? t.business : t.member}
              </Text>
            </View>
            {u.bio ? <Text style={[styles.bio, { color: colors.textSecondary }]}>{u.bio}</Text> : null}
            {u.location ? (
              <View style={styles.metaLine}>
                <MapPin size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{u.location}</Text>
              </View>
            ) : null}
          </View>

          {/* Grid tab bar */}
          <View style={[styles.tabBar, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
            <Grid3x3 size={22} color={colors.textPrimary} strokeWidth={2} />
          </View>

          {/* Posts grid */}
          {postsQuery.isLoading ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
          ) : posts.length === 0 ? (
            <View style={styles.center}><Text style={[styles.emptyText, { color: colors.textMuted }]}>{t.p_no_posts}</Text></View>
          ) : (
            <View style={styles.grid}>
              {posts.map((post, i) => (
                <Pressable
                  key={post.id}
                  onPress={() => openPost(post.id)}
                  style={[styles.cell, { marginRight: (i % 3 === 2) ? 0 : GRID_GAP, marginBottom: GRID_GAP }]}
                  testID={`grid-post-${post.id}`}
                >
                  {post.imageUrl ? (
                    <Image source={{ uri: post.imageUrl }} style={styles.cellImg} />
                  ) : (
                    <LinearGradient colors={i % 2 === 0 ? ["#0E3D1F", "#0A1A2E"] : ["#1E2A5C", "#0E3D1F"]} style={styles.cellText}>
                      <Text style={styles.cellTextContent} numberOfLines={5}>{post.content}</Text>
                    </LinearGradient>
                  )}
                </Pressable>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  logo: { fontSize: 24, fontWeight: "900", fontStyle: "italic", letterSpacing: -1, includeFontPadding: false },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xl, marginTop: spacing.sm, gap: spacing.lg },
  headerLeft: { flex: 1, justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.heavy, letterSpacing: -0.8, flexShrink: 1 },
  handle: { fontSize: fonts.sizes.base, marginTop: 2 },
  statsRow: { flexDirection: "row", marginTop: spacing.lg, gap: spacing.xl },
  stat: { alignItems: "flex-start" },
  statValue: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.heavy },
  statLabel: { fontSize: fonts.sizes.xs, marginTop: 1 },

  avatarWrap: { width: AV, height: AV },
  avatar: { width: AV, height: AV, borderRadius: AV / 2 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#fff", fontSize: 36, fontWeight: "900", letterSpacing: -1 },

  actionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  followBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 48, borderRadius: radius.lg,
    shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  followText: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold, letterSpacing: 0.2 },
  iconBtn: { width: 48, height: 48, borderRadius: radius.lg, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  bioBlock: { paddingHorizontal: spacing.xl, marginTop: spacing.lg, gap: 6 },
  typeChip: { alignSelf: "flex-start", paddingHorizontal: 11, paddingVertical: 4, borderRadius: radius.full, marginBottom: 2 },
  typeChipText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold },
  bio: { fontSize: fonts.sizes.base, lineHeight: 21 },
  metaLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  metaText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium },

  tabBar: { flexDirection: "row", justifyContent: "center", paddingVertical: spacing.md, marginTop: spacing.xl, borderTopWidth: 1, borderBottomWidth: 1 },
  center: { paddingVertical: 50, alignItems: "center" },
  emptyText: { fontSize: fonts.sizes.base },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingTop: GRID_GAP },
  cell: { width: CELL, height: CELL },
  cellImg: { width: "100%", height: "100%" },
  cellText: { width: "100%", height: "100%", padding: 8, justifyContent: "center" },
  cellTextContent: { color: "#fff", fontSize: 11, fontWeight: fonts.weights.semibold, lineHeight: 15 },
});
