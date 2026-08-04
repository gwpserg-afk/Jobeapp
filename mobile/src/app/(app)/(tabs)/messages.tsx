import { View, Text, Pressable, StyleSheet, Image, ActivityIndicator, RefreshControl, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { MessageSquarePlus } from "lucide-react-native";
import { api } from "@/lib/api";
import type { Conversation } from "@/lib/types";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}j` : `${Math.floor(d / 7)}sem`;
}

export default function Messages() {
  const colors = useTheme((s) => s.colors);
  const { t } = useI18n();
  const router = useRouter();

  const convosQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<Conversation[]>("/api/messages"),
    refetchInterval: 15000,
  });
  const convos = convosQuery.data ?? [];

  const openChat = (c: Conversation) => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/(app)/chat/[id]",
      params: { id: c.userId, name: c.userName, image: c.userImage ?? "" },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]} testID="messages-screen">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t.messages}</Text>
        <Pressable
          style={[styles.newBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          onPress={() => { Haptics.selectionAsync(); router.push("/(app)/(tabs)/discover"); }}
          hitSlop={8}
          testID="messages-new"
        >
          <MessageSquarePlus size={20} color={colors.textPrimary} strokeWidth={2} />
        </Pressable>
      </View>

      {convosQuery.isLoading ? (
        <View style={styles.center} testID="messages-loading"><ActivityIndicator color={colors.primary} /></View>
      ) : convos.length === 0 ? (
        <View style={styles.center} testID="messages-empty">
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryDim }]}>
            <MessageSquarePlus size={30} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t.msg_empty_title}</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>{t.msg_empty_sub}</Text>
        </View>
      ) : (
        <FlatList
          data={convos}
          keyExtractor={(c) => c.userId}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={convosQuery.isRefetching} onRefresh={() => convosQuery.refetch()} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => openChat(item)} testID={`convo-${item.userId}`}>
              {item.userImage ? (
                <Image source={{ uri: item.userImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primaryDim }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initials(item.userName)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{item.userName}</Text>
                  <Text style={[styles.time, { color: colors.textMuted }]}>{timeAgo(item.lastMessageAt)}</Text>
                </View>
                <Text
                  style={[styles.last, { color: item.unreadCount > 0 ? colors.textPrimary : colors.textMuted, fontWeight: item.unreadCount > 0 ? fonts.weights.semibold : fonts.weights.regular }]}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  title: { fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.heavy, letterSpacing: -0.5 },
  newBtn: { width: 44, height: 44, borderRadius: radius.full, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xxl },
  emptyIcon: { width: 68, height: 68, borderRadius: radius.full, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  emptyTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  emptySub: { fontSize: fonts.sizes.base, textAlign: "center", lineHeight: 21, maxWidth: 300 },
  list: { paddingHorizontal: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 54, height: 54, borderRadius: radius.full },
  avatarFallback: { justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  name: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold, flex: 1 },
  time: { fontSize: fonts.sizes.xs },
  last: { fontSize: fonts.sizes.sm, marginTop: 3 },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: radius.full, justifyContent: "center", alignItems: "center" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: fonts.weights.bold },
});
