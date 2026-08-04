import { useMemo, useRef, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, Image, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Send } from "lucide-react-native";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Message } from "@/lib/types";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}
function clockTime(iso: string) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Chat() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: session } = authClient.useSession();
  const myId = session?.user?.id;

  const p = useLocalSearchParams<{ id: string; name?: string; username?: string; image?: string }>();
  const partnerName = p.name ?? "—";

  const [text, setText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const messagesQuery = useQuery({
    queryKey: ["messages", p.id],
    queryFn: () => api.get<Message[]>(`/api/messages/${p.id}`),
    enabled: !!p.id,
    refetchInterval: 6000,
  });

  // Backend returns oldest→newest; invert for a bottom-anchored chat list.
  const inverted = useMemo(() => [...(messagesQuery.data ?? [])].reverse(), [messagesQuery.data]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => api.post<Message>("/api/messages", { receiverId: p.id, content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", p.id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast((e as Error)?.message ?? t.msg_blocked_send);
    },
  });

  const send = () => {
    const content = text.trim();
    if (!content || sendMutation.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setText("");
    sendMutation.mutate(content);
  };

  const openProfile = () => {
    Haptics.selectionAsync();
    router.push({ pathname: "/(app)/user/[id]", params: { id: p.id, name: partnerName, username: p.username ?? "", image: p.image ?? "" } });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10} testID="chat-back">
            <ArrowLeft size={24} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
          <Pressable style={styles.headerUser} onPress={openProfile} testID="chat-open-profile">
            {p.image ? (
              <Image source={{ uri: p.image }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.avatarFallback, { backgroundColor: colors.primaryDim }]}>
                <Text style={[styles.avatarText, { color: colors.primary, fontSize: fonts.sizes.sm }]}>{initials(partnerName)}</Text>
              </View>
            )}
            <Text style={[styles.headerName, { color: colors.textPrimary }]} numberOfLines={1}>{partnerName}</Text>
          </Pressable>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
          {messagesQuery.isLoading ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
          ) : inverted.length === 0 ? (
            <View style={styles.center}>
              <Text style={[styles.startText, { color: colors.textMuted }]}>{t.chat_start}</Text>
            </View>
          ) : (
            <FlatList
              data={inverted}
              inverted
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.listContent}
              keyboardDismissMode="interactive"
              renderItem={({ item }) => {
                const mine = item.senderId === myId;
                return (
                  <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                    <View
                      style={[
                        styles.bubble,
                        mine
                          ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                          : { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 },
                      ]}
                    >
                      <Text style={[styles.bubbleText, { color: mine ? "#fff" : colors.textPrimary }]}>{item.content}</Text>
                      <Text style={[styles.bubbleTime, { color: mine ? "rgba(255,255,255,0.7)" : colors.textMuted }]}>{clockTime(item.sentAt)}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Input bar */}
          <View style={[styles.inputBar, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
            <View style={[styles.inputWrap, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder={t.msg_input_ph}
                placeholderTextColor={colors.textMuted}
                value={text}
                onChangeText={setText}
                multiline
                testID="chat-input"
              />
            </View>
            <Pressable
              onPress={send}
              disabled={!text.trim() || sendMutation.isPending}
              style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.bgElevated }]}
              testID="chat-send"
            >
              {sendMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={19} color={text.trim() ? "#fff" : colors.textMuted} strokeWidth={2.2} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {toast ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={[styles.toast, { backgroundColor: colors.error }]}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1 },
  headerUser: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerAvatar: { width: 34, height: 34, borderRadius: radius.full },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: fonts.weights.bold },
  headerName: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold, flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  startText: { fontSize: fonts.sizes.base },
  listContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 8 },
  bubbleRow: { flexDirection: "row", marginVertical: 2 },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleText: { fontSize: fonts.sizes.base, lineHeight: 21 },
  bubbleTime: { fontSize: 10, alignSelf: "flex-end", marginTop: 3 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, borderTopWidth: 1 },
  inputWrap: { flex: 1, borderWidth: 1, borderRadius: radius.xl, paddingHorizontal: spacing.lg, paddingVertical: Platform.OS === "ios" ? 10 : 4, maxHeight: 120, justifyContent: "center" },
  input: { fontSize: fonts.sizes.base, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  toastWrap: { position: "absolute", bottom: 90, left: 0, right: 0, alignItems: "center" },
  toast: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.full, maxWidth: "88%" },
  toastText: { color: "#fff", fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, textAlign: "center" },
});
