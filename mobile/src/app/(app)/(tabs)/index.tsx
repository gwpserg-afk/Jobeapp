import { Fragment, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Heart,
  MessageCircle,
  Repeat2,
  BadgeCheck,
  Plus,
  Check,
  Sparkles,
  MoreHorizontal,
  Flag,
  Ban,
} from "lucide-react-native";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Post, FeedResponse, NotificationsResponse } from "@/lib/types";
import { PostText } from "@/components/PostText";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const RINGS = [
  ["#1DB954", "#0E3D1F"],
  ["#2D7DD2", "#0E2A4A"],
  ["#5B9FE8", "#1DB954"],
  ["#E09B3A", "#E05252"],
  ["#3DD670", "#2D7DD2"],
] as const;

function ringFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return RINGS[Math.abs(h) % RINGS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}j`;
  return `${Math.floor(d / 7)}sem`;
}

function roleLabel(p: Post, t: { business: string; member: string }) {
  const at = (p.user.accountType ?? "").toLowerCase();
  if (at.includes("recruit") || at.includes("business") || at.includes("company") || at.includes("entreprise"))
    return t.business;
  return t.member;
}

export default function Feed() {
  const { data: session } = authClient.useSession();
  const colors = useTheme((s) => s.colors);
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  const feedQuery = useQuery({
    queryKey: ["feed"],
    queryFn: () => api.get<FeedResponse>("/api/posts/feed").then((r) => r.posts),
  });

  const notifQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationsResponse>("/api/notifications"),
    refetchInterval: 30000,
  });
  const unreadNotifs = notifQuery.data?.unreadCount ?? 0;

  const likeMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/api/posts/${postId}/like`, {}),
    onMutate: async (postId: string) => {
      await qc.cancelQueries({ queryKey: ["feed"] });
      const prev = qc.getQueryData<Post[]>(["feed"]);
      qc.setQueryData<Post[]>(["feed"], (old) =>
        (old ?? []).map((p) =>
          p.id === postId
            ? { ...p, isLikedByMe: !p.isLikedByMe, likeCount: p.likeCount + (p.isLikedByMe ? -1 : 1) }
            : p
        )
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["feed"], ctx.prev);
    },
  });

  const onLike = useCallback(
    (postId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      likeMutation.mutate(postId);
    },
    [likeMutation]
  );

  const repostMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/api/posts/${postId}/repost`, {}),
    onMutate: async (postId: string) => {
      await qc.cancelQueries({ queryKey: ["feed"] });
      const prev = qc.getQueryData<Post[]>(["feed"]);
      qc.setQueryData<Post[]>(["feed"], (old) =>
        (old ?? []).map((p) =>
          p.id === postId
            ? { ...p, isRepostedByMe: !p.isRepostedByMe, repostCount: p.repostCount + (p.isRepostedByMe ? -1 : 1) }
            : p
        )
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["feed"], ctx.prev);
    },
  });

  const onRepost = useCallback(
    (postId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      repostMutation.mutate(postId);
    },
    [repostMutation]
  );

  // Distinct people from the feed (real data) → "discover" row
  const people = (() => {
    const seen = new Map<string, Post["user"]>();
    (feedQuery.data ?? []).forEach((p) => {
      if (p.user.id !== session?.user?.id && !seen.has(p.user.id)) seen.set(p.user.id, p.user);
    });
    return Array.from(seen.values()).slice(0, 12);
  })();

  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const followMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/api/follow/${userId}`, {}),
  });
  const onFollow = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowed((p) => ({ ...p, [userId]: !p[userId] }));
    followMutation.mutate(userId);
  };

  // Post "..." menu → report / block
  const [menuPost, setMenuPost] = useState<Post | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const reportMutation = useMutation({
    mutationFn: (postId: string) => api.post("/api/reports", { type: "post", targetId: postId, reason: "Inappropriate content" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feed"] }); showToast(t.mod_reported); },
  });
  const blockMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/api/block/${userId}`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feed"] }); showToast(t.mod_blocked); },
  });

  const goCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(app)/(tabs)/create");
  };

  const openUser = (u: Post["user"]) => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/(app)/user/[id]",
      params: {
        id: u.id, name: u.name, username: u.username ?? "", image: u.image ?? "",
        accountType: u.accountType ?? "", isVerified: String(u.isVerified), isGoldVerified: String(u.isGoldVerified),
      },
    });
  };

  const openPost = (postId: string) => {
    Haptics.selectionAsync();
    router.push({ pathname: "/(app)/post/[id]", params: { id: postId } });
  };

  const posts = feedQuery.data ?? [];

  // "Entrepreneurs to discover" — networking cards (deliberately NOT IG-stories
  // circles). Rendered as a filler BELOW the first couple of posts so the feed
  // itself is the main thing at the top.
  const discoverBlock = people.length > 0 ? (
    <View style={styles.discoverWrap}>
      <View style={styles.discoverHead}>
        <Sparkles size={16} color={colors.primary} strokeWidth={2.4} />
        <Text style={[styles.discoverTitle, { color: colors.textPrimary }]}>{t.feedDiscoverRow}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.discoverRow}
      >
        {people.map((u) => {
          const isFollowed = !!followed[u.id];
          return (
            <View key={u.id} style={[styles.dCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]} testID={`discover-${u.id}`}>
              <Pressable onPress={() => openUser(u)} style={styles.dCardTop}>
                <LinearGradient colors={ringFor(u.id)} style={styles.dAvatar}>
                  {u.image ? (
                    <Image source={{ uri: u.image }} style={styles.dAvatarImg} />
                  ) : (
                    <View style={[styles.dAvatarInner, { backgroundColor: colors.bgElevated }]}>
                      <Text style={[styles.dInitials, { color: colors.textPrimary }]}>{initials(u.name)}</Text>
                    </View>
                  )}
                </LinearGradient>
                <View style={styles.dNameRow}>
                  <Text style={[styles.dName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {u.name.split(" ")[0]}
                  </Text>
                  {u.isGoldVerified ? (
                    <BadgeCheck size={12} color={colors.warning} strokeWidth={2.5} fill={colors.warning} />
                  ) : u.isVerified ? (
                    <BadgeCheck size={12} color={colors.blue} strokeWidth={2.5} fill={colors.blueDim} />
                  ) : null}
                </View>
                <Text style={[styles.dRole, { color: colors.textMuted }]} numberOfLines={1}>{roleLabel({ user: u } as Post, t)}</Text>
              </Pressable>
              <Pressable
                onPress={() => onFollow(u.id)}
                style={[styles.dFollow, isFollowed ? { backgroundColor: colors.bgElevated, borderColor: colors.border } : { backgroundColor: colors.primary, borderColor: colors.primary }]}
                testID={`discover-follow-${u.id}`}
              >
                {isFollowed ? (
                  <>
                    <Check size={13} color={colors.textPrimary} strokeWidth={2.6} />
                    <Text style={[styles.dFollowText, { color: colors.textPrimary }]}>{t.f_following}</Text>
                  </>
                ) : (
                  <>
                    <Plus size={13} color="#fff" strokeWidth={2.8} />
                    <Text style={[styles.dFollowText, { color: "#fff" }]}>{t.f_follow}</Text>
                  </>
                )}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  ) : null;

  // Insert the discover filler after the 2nd post (or after the last one if fewer).
  const discoverAfter = Math.min(posts.length - 1, 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]} testID="feed-screen">
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isRefetching}
            onRefresh={() => feedQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Sticky header */}
        <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
          <View>
            <View style={styles.brandRow}>
              <Image
                source={require("../../../../assets/jobe-icon.png")}
                style={styles.brandIcon}
                resizeMode="contain"
                testID="feed-brand-logo"
              />
              <Text style={styles.wordmark} allowFontScaling={false}>
                <Text style={{ color: colors.navy }}>Job</Text>
                <Text style={{ color: colors.primary }}>é</Text>
              </Text>
            </View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>
              {t.greeting}{firstName ? `, ${firstName}` : ""}
            </Text>
          </View>
          <Pressable
            style={[styles.notifBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            hitSlop={8}
            onPress={() => { Haptics.selectionAsync(); router.push("/(app)/notifications"); }}
            testID="feed-notifications"
          >
            {unreadNotifs > 0 ? (
              <View style={[styles.notifBadge, { backgroundColor: colors.error, borderColor: colors.bgCard }]}>
                <Text style={styles.notifBadgeText}>{unreadNotifs > 9 ? "9+" : unreadNotifs}</Text>
              </View>
            ) : null}
            <Bell size={19} color={colors.textPrimary} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={styles.feed}>
          {/* Composer prompt */}
          <Pressable
            testID="composer-prompt"
            onPress={goCreate}
            style={[styles.composer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          >
            <LinearGradient colors={ringFor(firstName || "Jobé")} style={styles.composerAvatar}>
              <View style={[styles.composerAvatarInner, { backgroundColor: colors.bgElevated }]}>
                <Text style={[styles.composerInitials, { color: colors.textPrimary }]}>
                  {initials(session?.user?.name ?? "Jobé")}
                </Text>
              </View>
            </LinearGradient>
            <Text style={[styles.composerHint, { color: colors.textMuted }]} numberOfLines={1}>
              {t.composerHint}
            </Text>
            <View style={[styles.composerBtn, { backgroundColor: colors.primary }]}>
              <Plus size={18} color="#fff" strokeWidth={2.6} />
            </View>
          </Pressable>

          {/* Section label */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t.feedSocialSection}</Text>
            <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Loading */}
          {feedQuery.isLoading && (
            <View style={styles.center} testID="feed-loading">
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.centerSub, { color: colors.textMuted }]}>{t.loadingFeed}</Text>
            </View>
          )}

          {/* Error */}
          {feedQuery.isError && !feedQuery.isLoading && (
            <View style={styles.center} testID="feed-error">
              <Text style={[styles.centerTitle, { color: colors.textPrimary }]}>{t.errorTitle}</Text>
              <Text style={[styles.centerSub, { color: colors.error }]} selectable testID="feed-error-detail">
                {(feedQuery.error as Error)?.message ?? "unknown"}
              </Text>
              <Text style={[styles.centerSub, { color: colors.textMuted, fontSize: 11 }]} selectable>
                {process.env.EXPO_PUBLIC_BACKEND_URL ?? "no url"}
              </Text>
              <Pressable
                onPress={() => feedQuery.refetch()}
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.retryText}>{t.retry}</Text>
              </Pressable>
            </View>
          )}

          {/* Empty */}
          {!feedQuery.isLoading && !feedQuery.isError && posts.length === 0 && (
            <View style={styles.center} testID="feed-empty">
              <Text style={[styles.centerTitle, { color: colors.textPrimary }]}>{t.emptyFeedTitle}</Text>
              <Text style={[styles.centerSub, { color: colors.textMuted }]}>{t.emptyFeedSub}</Text>
              <Pressable onPress={goCreate} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.retryText}>{t.publish}</Text>
              </Pressable>
            </View>
          )}

          {/* Posts */}
          {posts.map((post, i) => (
            <Fragment key={post.id}>
            <View
              testID={`post-${post.id}`}
              style={[styles.post, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            >
                <Pressable style={styles.postHeader} onPress={() => openUser(post.user)} testID={`open-user-${post.user.id}`}>
                  <LinearGradient colors={ringFor(post.user.id)} style={styles.avatarRing}>
                    {post.user.image ? (
                      <Image source={{ uri: post.user.image }} style={styles.avatarImg} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: colors.bgElevated }]}>
                        <Text style={[styles.avatarText, { color: colors.textPrimary }]}>
                          {initials(post.user.name)}
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <View style={styles.authorRow}>
                      <Text style={[styles.postAuthor, { color: colors.textPrimary }]} numberOfLines={1}>
                        {post.user.name}
                      </Text>
                      {post.user.isGoldVerified ? (
                        <BadgeCheck size={15} color={colors.warning} strokeWidth={2.5} fill={colors.warning} />
                      ) : post.user.isVerified ? (
                        <BadgeCheck size={15} color={colors.blue} strokeWidth={2.5} fill={colors.blueDim} />
                      ) : null}
                    </View>
                    <Text style={[styles.postRole, { color: colors.textMuted }]} numberOfLines={1}>
                      {post.user.username ? `@${post.user.username} · ` : ""}{roleLabel(post, t)}
                    </Text>
                  </View>
                  <Text style={[styles.postTime, { color: colors.textMuted }]}>{timeAgo(post.createdAt)}</Text>
                  <Pressable onPress={(e) => { e.stopPropagation?.(); Haptics.selectionAsync(); setMenuPost(post); }} hitSlop={10} style={{ paddingLeft: 8 }} testID={`post-menu-${post.id}`}>
                    <MoreHorizontal size={20} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                </Pressable>

                <Pressable onPress={() => openPost(post.id)}>
                  <PostText id={post.id} text={post.content} style={[styles.postContent, { color: colors.textSecondary }]} />
                </Pressable>

                {post.imageUrl ? (
                  <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
                ) : null}

                <View style={[styles.postFooter, { borderTopColor: colors.border }]}>
                  <Pressable
                    style={styles.postAction}
                    onPress={() => onLike(post.id)}
                    hitSlop={6}
                    testID={`like-${post.id}`}
                  >
                    <Heart
                      size={18}
                      color={post.isLikedByMe ? colors.error : colors.textMuted}
                      fill={post.isLikedByMe ? colors.error : "transparent"}
                      strokeWidth={2}
                    />
                    <Text style={[styles.postActionText, { color: post.isLikedByMe ? colors.error : colors.textMuted }]}>
                      {post.likeCount}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.postAction} hitSlop={6} onPress={() => openPost(post.id)} testID={`open-post-${post.id}`}>
                    <MessageCircle size={18} color={colors.textMuted} strokeWidth={2} />
                    <Text style={[styles.postActionText, { color: colors.textMuted }]}>{post.commentCount}</Text>
                  </Pressable>
                  <Pressable style={styles.postAction} hitSlop={6} onPress={() => onRepost(post.id)} testID={`repost-${post.id}`}>
                    <Repeat2 size={19} color={post.isRepostedByMe ? colors.primary : colors.textMuted} strokeWidth={2} />
                    <Text
                      style={[styles.postActionText, { color: post.isRepostedByMe ? colors.primary : colors.textMuted }]}
                    >
                      {post.repostCount}
                    </Text>
                  </Pressable>
                </View>
            </View>
            {i === discoverAfter ? discoverBlock : null}
            </Fragment>
          ))}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Post options: report / block */}
      <Modal visible={!!menuPost} transparent animationType="fade" onRequestClose={() => setMenuPost(null)}>
        <Pressable style={styles.sheetScrim} onPress={() => setMenuPost(null)}>
          <View style={[styles.sheet, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Pressable
              style={styles.sheetRow}
              onPress={() => { const p = menuPost; setMenuPost(null); if (p) reportMutation.mutate(p.id); }}
              testID="menu-report"
            >
              <Flag size={20} color={colors.error} strokeWidth={2} />
              <Text style={[styles.sheetText, { color: colors.error }]}>{t.mod_report}</Text>
            </Pressable>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Pressable
              style={styles.sheetRow}
              onPress={() => { const p = menuPost; setMenuPost(null); if (p) blockMutation.mutate(p.user.id); }}
              testID="menu-block"
            >
              <Ban size={20} color={colors.textPrimary} strokeWidth={2} />
              <Text style={[styles.sheetText, { color: colors.textPrimary }]}>{t.mod_block}</Text>
            </Pressable>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Pressable style={styles.sheetRow} onPress={() => setMenuPost(null)} testID="menu-cancel">
              <Text style={[styles.sheetText, { color: colors.textMuted, marginLeft: 30 }]}>{t.mod_cancel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Toast */}
      {toast ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={[styles.toast, { backgroundColor: colors.textPrimary }]}>
            <Text style={[styles.toastText, { color: colors.bg }]}>{toast}</Text>
          </View>
        </View>
      ) : null}
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
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandIcon: { width: 32, height: 32 },
  wordmark: { fontSize: 28, fontWeight: "900", fontStyle: "italic", letterSpacing: -1.2 },
  greeting: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, letterSpacing: 0.3, marginTop: 1 },
  notifBtn: {
    width: 44, height: 44, borderRadius: radius.full, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  notifBadge: { position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center", zIndex: 2 },
  notifBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  feed: { paddingHorizontal: spacing.xl },

  composer: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.xl,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  composerAvatar: { width: 42, height: 42, borderRadius: radius.full, alignItems: "center", justifyContent: "center", padding: 2 },
  composerAvatarInner: { flex: 1, width: "100%", borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  composerInitials: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold },
  composerHint: { flex: 1, fontSize: fonts.sizes.base },
  composerBtn: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },

  sectionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  sectionLabel: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold, letterSpacing: 1, textTransform: "uppercase" },

  sheetScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end", padding: spacing.lg },
  sheet: { borderRadius: radius.xl, borderWidth: 1, overflow: "hidden", marginBottom: spacing.xl },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: 17 },
  sheetText: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  toastWrap: { position: "absolute", bottom: 100, left: 0, right: 0, alignItems: "center" },
  toast: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.full, maxWidth: "88%" },
  toastText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, textAlign: "center" },

  discoverWrap: { marginBottom: spacing.xl },
  discoverHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.md },
  discoverTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.heavy, letterSpacing: -0.3 },
  discoverRow: { gap: spacing.md, paddingRight: spacing.xl, paddingVertical: 2 },
  dCard: {
    width: 124, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  dCardTop: { alignItems: "center", width: "100%" },
  dAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", padding: 2.5 },
  dAvatarImg: { width: "100%", height: "100%", borderRadius: 13 },
  dAvatarInner: { flex: 1, width: "100%", borderRadius: 13, alignItems: "center", justifyContent: "center" },
  dInitials: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  dNameRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: spacing.sm },
  dName: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold, maxWidth: 78 },
  dRole: { fontSize: 11, marginTop: 1 },
  dFollow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    borderWidth: 1, borderRadius: radius.full, paddingVertical: 7, width: "100%", marginTop: spacing.md,
  },
  dFollowText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold },
  sectionLine: { flex: 1, height: 1 },

  center: { alignItems: "center", justifyContent: "center", paddingVertical: 56, gap: spacing.sm },
  centerTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  centerSub: { fontSize: fonts.sizes.base, textAlign: "center", paddingHorizontal: spacing.xl },
  retryBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full },
  retryText: { color: "#fff", fontWeight: fonts.weights.bold, fontSize: fonts.sizes.base },

  post: {
    borderWidth: 1, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 1,
  },
  postHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  avatarRing: { width: 46, height: 46, borderRadius: radius.full, alignItems: "center", justifyContent: "center", padding: 2 },
  avatar: { flex: 1, width: "100%", borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  avatarImg: { flex: 1, width: "100%", borderRadius: radius.full },
  avatarText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  postAuthor: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold, flexShrink: 1 },
  postRole: { fontSize: fonts.sizes.sm, marginTop: 1 },
  postTime: { fontSize: fonts.sizes.sm },
  postContent: { fontSize: fonts.sizes.base, lineHeight: 22 },
  postImage: { width: "100%", height: 200, borderRadius: radius.md, marginTop: spacing.md },
  postFooter: { flexDirection: "row", gap: spacing.xxl, borderTopWidth: 1, marginTop: spacing.lg, paddingTop: spacing.md },
  postAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  postActionText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
});
