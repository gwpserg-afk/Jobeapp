import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { ArrowLeft, BadgeCheck, Heart, MessageCircle, Send } from "lucide-react-native";
import { api } from "@/lib/api";
import type { PostDetail, Comment } from "@/lib/types";
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
const RING = ["#1DB954", "#0E3D1F"] as const;

function Avatar({ name, image, size, colors }: { name: string; image?: string | null; size: number; colors: any }) {
  return image ? (
    <Image source={{ uri: image }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <LinearGradient colors={RING} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.4 }}>{initials(name)}</Text>
    </LinearGradient>
  );
}

export default function PostDetailScreen() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  const q = useQuery({
    queryKey: ["post", id],
    queryFn: () => api.get<PostDetail>(`/api/posts/${id}`),
    enabled: !!id,
  });
  const post = q.data;

  const addComment = useMutation({
    mutationFn: (content: string) => api.post<Comment>(`/api/posts/${id}/comments`, { content }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setText("");
      qc.invalidateQueries({ queryKey: ["post", id] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const send = () => {
    const c = text.trim();
    if (c) addComment.mutate(c);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10} testID="post-back">
            <ArrowLeft size={24} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t.c_title}</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
          {q.isLoading || !post ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.xl }}>
              {/* Post */}
              <View style={[styles.post, { borderBottomColor: colors.border }]}>
                <View style={styles.postHead}>
                  <Avatar name={post.user.name} image={post.user.image} size={44} colors={colors} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.author, { color: colors.textPrimary }]} numberOfLines={1}>{post.user.name}</Text>
                      {post.user.isGoldVerified ? <BadgeCheck size={15} color={colors.warning} strokeWidth={2.5} fill={colors.warning} />
                        : post.user.isVerified ? <BadgeCheck size={15} color={colors.blue} strokeWidth={2.5} fill={colors.blueDim} /> : null}
                    </View>
                    {post.user.username ? <Text style={[styles.handle, { color: colors.textMuted }]}>@{post.user.username}</Text> : null}
                  </View>
                  <Text style={[styles.time, { color: colors.textMuted }]}>{timeAgo(post.createdAt)}</Text>
                </View>
                <Text style={[styles.content, { color: colors.textPrimary }]}>{post.content}</Text>
                {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" /> : null}
                <View style={styles.metaRow}>
                  <View style={styles.meta}><Heart size={16} color={colors.textMuted} strokeWidth={2} /><Text style={[styles.metaText, { color: colors.textMuted }]}>{post.likeCount}</Text></View>
                  <View style={styles.meta}><MessageCircle size={16} color={colors.textMuted} strokeWidth={2} /><Text style={[styles.metaText, { color: colors.textMuted }]}>{post.commentCount}</Text></View>
                </View>
              </View>

              {/* Comments */}
              {post.comments.length === 0 ? (
                <View style={styles.center}><Text style={[styles.emptyText, { color: colors.textMuted }]}>{t.c_empty}</Text></View>
              ) : (
                post.comments.map((cm) => (
                  <View key={cm.id} style={[styles.comment, { borderBottomColor: colors.border }]} testID={`comment-${cm.id}`}>
                    <Avatar name={cm.author.name} image={cm.author.image} size={36} colors={colors} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.cAuthor, { color: colors.textPrimary }]} numberOfLines={1}>{cm.author.name}</Text>
                        {cm.author.isGoldVerified ? <BadgeCheck size={13} color={colors.warning} strokeWidth={2.5} fill={colors.warning} />
                          : cm.author.isVerified ? <BadgeCheck size={13} color={colors.blue} strokeWidth={2.5} fill={colors.blueDim} /> : null}
                        <Text style={[styles.cTime, { color: colors.textMuted }]}>· {timeAgo(cm.createdAt)}</Text>
                      </View>
                      <Text style={[styles.cText, { color: colors.textSecondary }]}>{cm.content}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* Add comment bar */}
          <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
            <View style={[styles.inputWrap, { backgroundColor: colors.bgCard, borderColor: focused ? colors.primary : colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder={t.c_add_ph}
                placeholderTextColor={colors.textMuted}
                value={text}
                onChangeText={setText}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                multiline
                testID="comment-input"
              />
            </View>
            <Pressable
              onPress={send}
              disabled={!text.trim() || addComment.isPending}
              style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.bgElevated }]}
              testID="comment-send"
            >
              {addComment.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color={text.trim() ? "#fff" : colors.textMuted} strokeWidth={2.2} />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1 },
  headerTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  center: { paddingVertical: 40, alignItems: "center" },
  emptyText: { fontSize: fonts.sizes.base },

  post: { padding: spacing.xl, borderBottomWidth: 8 },
  postHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  author: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold, flexShrink: 1 },
  handle: { fontSize: fonts.sizes.sm, marginTop: 1 },
  time: { fontSize: fonts.sizes.sm },
  content: { fontSize: fonts.sizes.md, lineHeight: 24, marginTop: spacing.md },
  postImage: { width: "100%", height: 200, borderRadius: radius.md, marginTop: spacing.md },
  metaRow: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.lg },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },

  comment: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: 1 },
  cAuthor: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold, flexShrink: 1 },
  cTime: { fontSize: fonts.sizes.sm },
  cText: { fontSize: fonts.sizes.base, lineHeight: 21, marginTop: 3 },

  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1 },
  inputWrap: { flex: 1, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: 10, maxHeight: 110 },
  input: { fontSize: fonts.sizes.base, maxHeight: 90 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
