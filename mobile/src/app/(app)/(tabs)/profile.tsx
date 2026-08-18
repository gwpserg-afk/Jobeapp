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
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Settings, BadgeCheck, Camera, Grid3x3, Instagram, MapPin, Share2, Pencil } from "lucide-react-native";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { pickImageAsDataUri } from "@/lib/pick-image";
import type { Post, FollowInfo } from "@/lib/types";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const { width } = Dimensions.get("window");
const GRID_GAP = 2;
const CELL = (width - GRID_GAP * 2) / 3;

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

export default function Profile() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const { t } = useI18n();
  const qc = useQueryClient();

  const user = (session?.user ?? {}) as {
    id?: string; name?: string; username?: string; image?: string | null; bio?: string;
    location?: string; instagram?: string;
    accountType?: string; isVerified?: boolean; isGoldVerified?: boolean;
  };

  const postsQuery = useQuery({
    queryKey: ["my-posts"],
    queryFn: () => api.get<Post[]>("/api/posts"),
  });
  const myPosts = postsQuery.data ?? [];

  const followQuery = useQuery({
    queryKey: ["follow", user.id],
    queryFn: () => api.get<FollowInfo>(`/api/follow/${user.id}`),
    enabled: !!user.id,
  });
  const follow = followQuery.data;

  const isBusiness = (user.accountType ?? "").toLowerCase().includes("recruit") ||
    (user.accountType ?? "").toLowerCase().includes("business");

  const avatarMutation = useMutation({
    mutationFn: (dataUri: string) =>
      authClient.updateUser({ image: dataUri } as Parameters<typeof authClient.updateUser>[0]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-posts"] }),
  });
  async function changePhoto() {
    const uri = await pickImageAsDataUri([1, 1]);
    if (uri) avatarMutation.mutate(uri);
  }

  const stats = [
    { label: t.p_posts, value: myPosts.length },
    { label: t.p_followers, value: follow?.followers ?? 0 },
    { label: t.p_following, value: follow?.following ?? 0 },
  ];

  const openPost = (id: string) => {
    Haptics.selectionAsync();
    router.push({ pathname: "/(app)/post/[id]", params: { id } });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Floating top bar: logo left, settings right */}
        <View style={styles.topBar}>
          <Text style={styles.logo} allowFontScaling={false}>
            <Text style={{ color: colors.navy }}>Job</Text>
            <Text style={{ color: colors.primary }}>é</Text>
          </Text>
          <Pressable onPress={() => { Haptics.selectionAsync(); router.push("/(app)/settings"); }} hitSlop={8} testID="profile-settings">
            <Settings size={24} color={colors.textPrimary} strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} testID="profile-screen">
          {/* Two-column header: left = name/handle/stats, right = big avatar */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{user.name ?? "Jobé"}</Text>
                {user.isGoldVerified ? (
                  <BadgeCheck size={19} color={colors.warning} strokeWidth={2.5} fill={colors.warning} />
                ) : user.isVerified ? (
                  <BadgeCheck size={19} color={colors.blue} strokeWidth={2.5} fill={colors.blueDim} />
                ) : null}
              </View>
              {user.username ? <Text style={[styles.handle, { color: colors.textMuted }]}>@{user.username}</Text> : null}

              <View style={styles.statsRow}>
                {stats.map((s) => (
                  <View key={s.label} style={styles.stat}>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Pressable onPress={changePhoto} style={styles.avatarWrap} testID="profile-avatar">
              {user.image ? (
                <Image source={{ uri: user.image }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={["#1DB954", "#1E2A5C"]} style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitials}>{initials(user.name ?? "Jobé")}</Text>
                </LinearGradient>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.bg }]}>
                {avatarMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={13} color="#fff" strokeWidth={2.4} />}
              </View>
            </Pressable>
          </View>

          {/* Action row: wide Edit pill + share icon */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push("/(app)/edit-profile"); }}
              style={[styles.editBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              testID="profile-edit"
            >
              <Pencil size={17} color="#fff" strokeWidth={2.6} />
              <Text style={styles.editText} numberOfLines={1}>{t.p_edit}</Text>
            </Pressable>
            <Pressable style={[styles.iconBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]} testID="profile-share">
              <Share2 size={19} color={colors.textPrimary} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Bio block */}
          <View style={styles.bioBlock}>
            <View style={[styles.typeChip, { backgroundColor: isBusiness ? colors.navyDim : colors.primaryDim }]}>
              <Text style={[styles.typeChipText, { color: isBusiness ? colors.navy : colors.primary }]}>
                {isBusiness ? t.business : t.member}
              </Text>
            </View>
            {user.bio ? <Text style={[styles.bio, { color: colors.textSecondary }]}>{user.bio}</Text> : null}
            {user.instagram ? (
              <View style={styles.metaLine}>
                <Instagram size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {user.instagram.startsWith("@") ? user.instagram : `@${user.instagram}`}
                </Text>
              </View>
            ) : null}
            {user.location ? (
              <View style={styles.metaLine}>
                <MapPin size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{user.location}</Text>
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
          ) : myPosts.length === 0 ? (
            <View style={styles.center}><Text style={[styles.emptyText, { color: colors.textMuted }]}>{t.p_no_posts}</Text></View>
          ) : (
            <View style={styles.grid}>
              {myPosts.map((post, i) => (
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

const AV = 96;
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
  cameraBadge: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },

  actionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  editBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 48, borderRadius: radius.lg,
    shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  editText: { color: "#fff", fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold, letterSpacing: 0.2 },
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
