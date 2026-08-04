import { View, Text, Pressable, StyleSheet, Image, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { ArrowLeft, ShieldOff } from "lucide-react-native";
import { api } from "@/lib/api";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

type BlockedUser = { id: string; name?: string; username?: string; image?: string };

export default function BlockedScreen() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const t = useI18n((s) => s.t);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["blocked-list"],
    queryFn: () => api.get<{ users: BlockedUser[] }>("/api/block/list"),
  });

  const unblock = useMutation({
    mutationFn: (userId: string) => api.post(`/api/block/${userId}`, {}),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["blocked-list"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const users = data?.users ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10} testID="blocked-back">
            <ArrowLeft size={24} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t.blk_title}</Text>
          <View style={{ width: 24 }} />
        </View>

        {isLoading ? (
          <View style={styles.center} testID="blocked-loading">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : users.length === 0 ? (
          <View style={styles.center} testID="blocked-empty">
            <ShieldOff size={40} color={colors.textMuted} strokeWidth={1.6} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t.blk_empty}</Text>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(u) => u.id}
            contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
            renderItem={({ item }) => (
              <View style={[styles.row, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primaryDim }]}>
                    <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                      {(item.name ?? "?").slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{item.name ?? "—"}</Text>
                  {item.username ? (
                    <Text style={[styles.handle, { color: colors.textMuted }]} numberOfLines={1}>@{item.username}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => unblock.mutate(item.id)}
                  disabled={unblock.isPending}
                  style={[styles.unblockBtn, { borderColor: colors.border }]}
                  testID={`unblock-${item.id}`}
                >
                  <Text style={[styles.unblockText, { color: colors.primary }]}>{t.blk_unblock}</Text>
                </Pressable>
              </View>
            )}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  emptyText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.medium, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  avatar: { width: 46, height: 46, borderRadius: radius.full },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  name: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  handle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, marginTop: 1 },
  unblockBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5 },
  unblockText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold },
});
