import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Image, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Heart, UserPlus, MessageCircle, Sparkles, Bell, CheckCheck } from "lucide-react-native";
import { api } from "@/lib/api";
import type { AppNotification, NotificationsResponse } from "@/lib/types";
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

type Actor = { actorId?: string; actorName?: string; actorUsername?: string; actorImage?: string };
function parseActor(dataJson: string | null): Actor {
  if (!dataJson) return {};
  try { return JSON.parse(dataJson) as Actor; } catch { return {}; }
}

export default function Notifications() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const { t } = useI18n();
  const qc = useQueryClient();

  const notifQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationsResponse>("/api/notifications"),
  });

  // First visit with an empty list → seed a few realistic demo notifications.
  const seedMutation = useMutation({
    mutationFn: () => api.post<{ seeded: boolean }>("/api/notifications/seed-demo", {}),
    onSuccess: (r) => { if (r?.seeded) qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });
  useEffect(() => {
    if (notifQuery.isSuccess && (notifQuery.data?.notifications.length ?? 0) === 0 && !seedMutation.isPending && !seedMutation.data) {
      seedMutation.mutate();
    }
  }, [notifQuery.isSuccess, notifQuery.data, seedMutation]);

  const markAll = useMutation({
    mutationFn: () => api.put("/api/notifications/read-all", {}),
    onMutate: () => {
      Haptics.selectionAsync();
      qc.setQueryData<NotificationsResponse>(["notifications"], (old) =>
        old ? { notifications: old.notifications.map((n) => ({ ...n, isRead: true })), unreadCount: 0 } : old
      );
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["me"] }); },
  });

  const notifs = notifQuery.data?.notifications ?? [];
  const unread = notifQuery.data?.unreadCount ?? 0;

  const labelFor = (type: string) => {
    switch (type) {
      case "follow": return t.notif_follow;
      case "like": return t.notif_like;
      case "comment": return t.notif_comment;
      case "message": return t.notif_message;
      default: return "";
    }
  };
  const iconFor = (type: string) => {
    switch (type) {
      case "follow": return { Icon: UserPlus, color: colors.blue };
      case "like": return { Icon: Heart, color: colors.error };
      case "comment": return { Icon: MessageCircle, color: colors.primary };
      case "message": return { Icon: MessageCircle, color: colors.primary };
      default: return { Icon: Sparkles, color: colors.warning };
    }
  };

  const openActor = (a: Actor) => {
    if (!a.actorId) return;
    Haptics.selectionAsync();
    router.push({
      pathname: "/(app)/user/[id]",
      params: { id: a.actorId, name: a.actorName ?? "", username: a.actorUsername ?? "", image: a.actorImage ?? "" },
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10} testID="notif-back">
            <ArrowLeft size={24} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t.notif_title}</Text>
          {unread > 0 ? (
            <Pressable onPress={() => markAll.mutate()} hitSlop={8} testID="notif-mark-all">
              <CheckCheck size={22} color={colors.primary} strokeWidth={2.2} />
            </Pressable>
          ) : <View style={{ width: 22 }} />}
        </View>

        {notifQuery.isLoading ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        ) : notifs.length === 0 ? (
          <View style={styles.center} testID="notif-empty">
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryDim }]}>
              <Bell size={30} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t.notif_empty_title}</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>{t.notif_empty_sub}</Text>
          </View>
        ) : (
          <FlatList
            data={notifs}
            keyExtractor={(n) => n.id}
            contentContainerStyle={{ paddingVertical: spacing.sm }}
            refreshControl={<RefreshControl refreshing={notifQuery.isRefetching} onRefresh={() => notifQuery.refetch()} tintColor={colors.primary} />}
            renderItem={({ item }) => {
              const actor = parseActor(item.dataJson);
              const { Icon, color } = iconFor(item.type);
              const isWelcome = item.type === "welcome";
              return (
                <Pressable
                  onPress={() => openActor(actor)}
                  style={[styles.row, { backgroundColor: item.isRead ? "transparent" : colors.primaryDim + "55" }]}
                  testID={`notif-${item.id}`}
                >
                  {/* Avatar (or brand icon for welcome) */}
                  <View>
                    {actor.actorImage ? (
                      <Image source={{ uri: actor.actorImage }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: isWelcome ? colors.primary : colors.bgElevated }]}>
                        {isWelcome ? (
                          <Sparkles size={20} color="#fff" strokeWidth={2.2} />
                        ) : (
                          <Text style={[styles.avatarText, { color: colors.textPrimary }]}>{initials(actor.actorName ?? "J")}</Text>
                        )}
                      </View>
                    )}
                    <View style={[styles.badge, { backgroundColor: color, borderColor: colors.bg }]}>
                      <Icon size={11} color="#fff" strokeWidth={2.6} fill={item.type === "like" ? "#fff" : "transparent"} />
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.text, { color: colors.textPrimary }]}>
                      {isWelcome ? (
                        <Text style={{ fontWeight: fonts.weights.bold }}>{t.notif_welcome}</Text>
                      ) : (
                        <>
                          <Text style={{ fontWeight: fonts.weights.bold }}>{actor.actorName ?? ""}</Text>
                          <Text> {labelFor(item.type)}</Text>
                        </>
                      )}
                    </Text>
                    {isWelcome ? <Text style={[styles.sub, { color: colors.textMuted }]}>{t.notif_welcome_sub}</Text> : null}
                    <Text style={[styles.time, { color: colors.textMuted }]}>{timeAgo(item.createdAt)}</Text>
                  </View>

                  {!item.isRead ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1 },
  title: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xxl },
  emptyIcon: { width: 68, height: 68, borderRadius: radius.full, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  emptyTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  emptySub: { fontSize: fonts.sizes.base, textAlign: "center", lineHeight: 21, maxWidth: 280 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  avatar: { width: 50, height: 50, borderRadius: radius.full },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  badge: { position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  text: { fontSize: fonts.sizes.base, lineHeight: 20 },
  sub: { fontSize: fonts.sizes.sm, marginTop: 2 },
  time: { fontSize: fonts.sizes.xs, marginTop: 3 },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
