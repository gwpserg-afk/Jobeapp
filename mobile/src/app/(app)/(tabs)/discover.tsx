import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { BadgeCheck, Search, UserPlus } from "lucide-react-native";
import { api } from "@/lib/api";
import type { Post, PostUser, FeedResponse } from "@/lib/types";
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

export default function Discover() {
  const router = useRouter();
  const openUser = (u: PostUser) => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/(app)/user/[id]",
      params: {
        id: u.id, name: u.name, username: u.username ?? "", image: u.image ?? "",
        accountType: u.accountType ?? "", isVerified: String(u.isVerified), isGoldVerified: String(u.isGoldVerified),
      },
    });
  };
  const colors = useTheme((s) => s.colors);
  const { t } = useI18n();

  // Reuse the same feed cache, then derive the distinct people behind the posts.
  const feedQuery = useQuery({
    queryKey: ["feed"],
    queryFn: () => api.get<FeedResponse>("/api/posts/feed").then((r) => r.posts),
  });

  const [query, setQuery] = useState("");
  const allPeople: PostUser[] = (() => {
    const seen = new Map<string, PostUser>();
    (feedQuery.data ?? []).forEach((p: Post) => {
      if (!seen.has(p.user.id)) seen.set(p.user.id, p.user);
    });
    return Array.from(seen.values());
  })();
  const q = query.trim().toLowerCase();
  const people = q
    ? allPeople.filter((u) => u.name.toLowerCase().includes(q) || (u.username ?? "").toLowerCase().includes(q))
    : allPeople;

  const roleFor = (u: PostUser) => {
    const at = (u.accountType ?? "").toLowerCase();
    return at.includes("recruit") || at.includes("business") || at.includes("company")
      ? t.business
      : t.member;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]} testID="discover-screen">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isRefetching}
            onRefresh={() => feedQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t.discoverTitle}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{t.discoverSub}</Text>

        {/* Search + sync contacts */}
        <View style={[styles.searchBar, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t.mod_search}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            testID="discover-search"
          />
        </View>
        <Pressable
          style={[styles.syncBtn, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
          onPress={() => { Haptics.selectionAsync(); }}
          testID="discover-sync"
        >
          <UserPlus size={17} color={colors.primary} strokeWidth={2.2} />
          <Text style={[styles.syncText, { color: colors.primary }]}>{t.d_sync_contacts}</Text>
          <View style={[styles.soonPill, { backgroundColor: colors.primaryDim }]}>
            <Text style={[styles.soonText, { color: colors.primary }]}>{t.d_soon}</Text>
          </View>
        </Pressable>

        {feedQuery.isLoading && (
          <View style={styles.center} testID="discover-loading">
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {!feedQuery.isLoading && people.length === 0 && (
          <View style={styles.center} testID="discover-empty">
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t.discoverEmpty}</Text>
          </View>
        )}

        <View style={styles.grid}>
          {people.map((u) => (
            <Pressable
              key={u.id}
              testID={`person-${u.id}`}
              onPress={() => openUser(u)}
              style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            >
              <LinearGradient colors={ringFor(u.id)} style={styles.ring}>
                {u.image ? (
                  <Image source={{ uri: u.image }} style={styles.avatarImg} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.bgElevated }]}>
                    <Text style={[styles.avatarText, { color: colors.textPrimary }]}>{initials(u.name)}</Text>
                  </View>
                )}
              </LinearGradient>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                  {u.name}
                </Text>
                {u.isGoldVerified ? (
                  <BadgeCheck size={14} color={colors.warning} strokeWidth={2.5} fill={colors.warning} />
                ) : u.isVerified ? (
                  <BadgeCheck size={14} color={colors.blue} strokeWidth={2.5} fill={colors.blueDim} />
                ) : null}
              </View>
              <Text style={[styles.role, { color: colors.textMuted }]} numberOfLines={1}>
                {roleFor(u)}
              </Text>
              <View style={[styles.viewBtn, { borderColor: colors.border }]}>
                <Text style={[styles.viewText, { color: colors.primary }]}>{t.see}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: 40 },
  title: { fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.heavy, letterSpacing: -0.5 },
  sub: { fontSize: fonts.sizes.base, marginTop: 4, marginBottom: spacing.lg },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.lg, height: 48, marginBottom: spacing.md },
  searchInput: { flex: 1, fontSize: fonts.sizes.base, height: "100%" },
  syncBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.xl },
  syncText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  soonPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  soonText: { fontSize: 10, fontWeight: fonts.weights.bold, textTransform: "uppercase", letterSpacing: 0.4 },
  center: { paddingVertical: 56, alignItems: "center" },
  emptyText: { fontSize: fonts.sizes.base, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.md },
  card: {
    width: "47.5%",
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  ring: { width: 64, height: 64, borderRadius: radius.full, alignItems: "center", justifyContent: "center", padding: 2.5 },
  avatar: { flex: 1, width: "100%", borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  avatarImg: { flex: 1, width: "100%", borderRadius: radius.full },
  avatarText: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.md },
  name: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold, flexShrink: 1 },
  role: { fontSize: fonts.sizes.sm, marginTop: 2 },
  viewBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1 },
  viewText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold },
});
