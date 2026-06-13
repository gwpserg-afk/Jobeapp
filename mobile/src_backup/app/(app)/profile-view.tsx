import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  MapPin,
  GraduationCap,
  Building2,
  ExternalLink,
  Pin,
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  X,
  Trash2,
  FileText,
  Flag,
  Check,
  Crown,
  MoreHorizontal,
  Languages,
  UserPlus,
} from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import { DEMO_CANDIDATES } from "@/lib/demoData";
import { useDemoStore } from "@/lib/demoStore";

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";
const AMBER = "#F59E0B";

/** Convert a DEMO_CANDIDATE into the shape expected by CandidateProfile */
function demoToProfile(demo: typeof DEMO_CANDIDATES[0], lang: string) {
  const bio = lang === "en" ? demo.bioEn : lang === "zh" ? demo.bioZh : demo.bioFr;
  return {
    id: demo.id,
    userId: demo.userId,
    fullName: demo.fullName,
    headline: demo.headline,
    profilePhotoUrl: demo.avatarUri,
    city: demo.city,
    bio: bio ?? demo.bio,
    availabilityStatus: demo.availabilityStatus,
    isPremium: false,
    skills: demo.skills,
    experiences: [],
    education: [],
    user: { isVerified: demo.isVerified, createdAt: new Date().toISOString() },
  };
}

type ReportPayload = {
  contentType: "post" | "post_image" | "profile_photo";
  targetId: string;
};

function useReportContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReportPayload) => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      return fetch(`${baseUrl}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_: Response, variables: ReportPayload) => {
      if (variables.contentType === "post" || variables.contentType === "post_image") {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      }
      const tFn = useLang.getState().t;
      Alert.alert(tFn("reported_title"), tFn("reported_message"));
    },
    onError: () => {
      const tFn = useLang.getState().t;
      showToast(tFn("error_report_failed"));
    },
  });
}

type Post = {
  id: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  isLikedByMe: boolean;
  isRepostedByMe: boolean;
};

type Comment = {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    isVerified?: boolean;
    isGoldVerified?: boolean;
  };
};

function relativeTime(dateStr: string, lang: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return lang === "fr" ? "Aujourd'hui" : lang === "zh" ? "今天" : "Today";
  if (diffDays === 1) return lang === "fr" ? "Hier" : lang === "zh" ? "昨天" : "Yesterday";
  if (diffDays < 7) return lang === "fr" ? `Il y a ${diffDays} jours` : lang === "zh" ? `${diffDays}天前` : `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function VerifiedBadge({ type }: { type: "blue" | "gold" }) {
  return (
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: type === "gold" ? "#F5A623" : "#1D9BF0",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 4,
      }}
    >
      <Check size={11} color="#fff" strokeWidth={3} />
    </View>
  );
}

function CommentAvatar({ uri, name, size = 36 }: { uri: string | null; name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  const { colors: cColors } = useTheme();
  const [imgError, setImgError] = useState(false);
  if (uri && !imgError) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: cColors.toggleBg }} onError={() => setImgError(true)} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: cColors.toggleBg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.33, fontWeight: "700", color: cColors.primary }}>{initials}</Text>
    </View>
  );
}

function CommentsModal({
  visible,
  postId,
  myUserId,
  onClose,
  onLike,
  onRepost,
  post,
  queryKeyToInvalidate,
}: {
  visible: boolean;
  postId: string;
  myUserId: string | undefined;
  onClose: () => void;
  onLike: () => void;
  onRepost: () => void;
  post: Post;
  queryKeyToInvalidate: string[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors: modalColors } = useTheme();
  const lang = useLang((s) => s.lang);
  const t = useLang((s) => s.t);
  const [commentText, setCommentText] = useState("");

  const { data: comments = [], isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: ["post-comments", postId],
    queryFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/posts/${postId}/comments`, { credentials: "include" });
      const json = await res.json();
      return (json.data ?? []) as Comment[];
    },
    enabled: visible && !!postId,
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      const json = await res.json();
      return json.data as Comment;
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
      queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
    },
    onError: () => {
      showToast(t("comment_failed"));
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/posts/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete comment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
      queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
    },
    onError: () => {
      showToast(t("comment_delete_failed"));
    },
  });

  const handleSend = () => {
    if (!commentText.trim() || createCommentMutation.isPending) return;
    createCommentMutation.mutate(commentText.trim());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
        </Pressable>
        <View
          style={{
            backgroundColor: modalColors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "80%",
            minHeight: 320,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: modalColors.border,
            }}
          >
            <Text style={{ flex: 1, fontSize: 17, fontWeight: "700", color: modalColors.text }}>
              {t("comments_title")}
            </Text>
            <Pressable onPress={onClose} style={{ padding: 4 }} hitSlop={8}>
              <X size={22} color={modalColors.textSecondary} />
            </Pressable>
          </View>

          {/* Interaction bar inside modal */}
          <View
            style={{
              flexDirection: "row",
              gap: 20,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: modalColors.border,
            }}
          >
            <Pressable
              testID={`like-button-modal-${post.id}`}
              onPress={onLike}
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <Heart
                size={20}
                color={post.isLikedByMe ? "#EF4444" : modalColors.textMuted}
                fill={post.isLikedByMe ? "#EF4444" : "none"}
              />
              <Text style={{ fontSize: 13, color: modalColors.textSecondary }}>{post.likeCount ?? 0}</Text>
            </Pressable>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <MessageCircle size={20} color={modalColors.textMuted} />
              <Text style={{ fontSize: 13, color: modalColors.textSecondary }}>{post.commentCount ?? 0}</Text>
            </View>
            <Pressable
              testID={`repost-button-modal-${post.id}`}
              onPress={onRepost}
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <Repeat2
                size={20}
                color={post.isRepostedByMe ? GREEN : modalColors.textMuted}
              />
              <Text style={{ fontSize: 13, color: modalColors.textSecondary }}>{post.repostCount ?? 0}</Text>
            </Pressable>
          </View>

          {/* Comment list */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {commentsLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <ActivityIndicator size="small" color={modalColors.primary} />
              </View>
            ) : comments.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ fontSize: 14, color: modalColors.textMuted }}>{t("no_comments_yet")}</Text>
              </View>
            ) : comments.map((comment) => {
                const isOwn = comment.author.id === myUserId;
                return (
                  <View
                    key={comment.id}
                    style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}
                  >
                    <Pressable
                      onPress={() => {
                        onClose();
                        router.push({ pathname: "/(app)/profile-view", params: { userId: comment.author.id, type: "candidate" } } as never);
                      }}
                    >
                      <CommentAvatar uri={comment.author.image} name={comment.author.name} size={36} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Pressable
                        onPress={() => {
                          onClose();
                          router.push({ pathname: "/(app)/profile-view", params: { userId: comment.author.id, type: "candidate" } } as never);
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: modalColors.text }}>
                            {comment.author.name}
                          </Text>
                          {comment.author.isVerified ? <VerifiedBadge type="blue" /> : null}
                          {comment.author.isGoldVerified ? <VerifiedBadge type="gold" /> : null}
                        </View>
                      </Pressable>
                      <Text style={{ fontSize: 13, color: modalColors.textSecondary, lineHeight: 20, marginTop: 2 }}>
                        {comment.content}
                      </Text>
                      <Text style={{ fontSize: 11, color: modalColors.textMuted, marginTop: 4 }}>
                        {relativeTime(comment.createdAt, lang)}
                      </Text>
                    </View>
                    {isOwn ? (
                      <Pressable
                        onPress={() => deleteCommentMutation.mutate(comment.id)}
                        style={{ padding: 4 }}
                        hitSlop={8}
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
          </ScrollView>

          {/* Input row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: modalColors.border,
              gap: 10,
            }}
          >
            <TextInput
              testID="comment-input"
              value={commentText}
              onChangeText={setCommentText}
              placeholder={t("comment_write_placeholder")}
              placeholderTextColor={modalColors.textMuted}
              style={{
                flex: 1,
                fontSize: 14,
                color: modalColors.text,
                backgroundColor: modalColors.toggleBg,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: modalColors.border,
              }}
              multiline
            />
            <Pressable
              testID="send-comment-button"
              onPress={handleSend}
              disabled={!commentText.trim() || createCommentMutation.isPending}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: commentText.trim() ? modalColors.primary : modalColors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {createCommentMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={18} color={commentText.trim() ? "#FFFFFF" : modalColors.textMuted} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PostInteractionBar({
  post,
  onLike,
  onRepost,
  onOpenComments,
}: {
  post: Post;
  onLike: () => void;
  onRepost: () => void;
  onOpenComments: () => void;
}) {
  const { colors: barColors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 20,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: barColors.border,
      }}
    >
      <Pressable
        testID={`like-button-${post.id}`}
        onPress={onLike}
        style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
      >
        <Heart
          size={20}
          color={post.isLikedByMe ? "#EF4444" : barColors.textMuted}
          fill={post.isLikedByMe ? "#EF4444" : "none"}
        />
        <Text style={{ fontSize: 13, color: barColors.textSecondary }}>{post.likeCount ?? 0}</Text>
      </Pressable>
      <Pressable
        testID={`comment-button-${post.id}`}
        onPress={onOpenComments}
        style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
      >
        <MessageCircle size={20} color={barColors.textMuted} />
        <Text style={{ fontSize: 13, color: barColors.textSecondary }}>{post.commentCount ?? 0}</Text>
      </Pressable>
      <Pressable
        testID={`repost-button-${post.id}`}
        onPress={onRepost}
        style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
      >
        <Repeat2
          size={20}
          color={post.isRepostedByMe ? GREEN : barColors.textMuted}
        />
        <Text style={{ fontSize: 13, color: barColors.textSecondary }}>{post.repostCount ?? 0}</Text>
      </Pressable>
    </View>
  );
}

function InteractivePostCard({
  post,
  colors,
  onLike,
  onRepost,
  onOpenComments,
}: {
  post: Post;
  colors: any;
  onLike: (post: Post) => void;
  onRepost: (post: Post) => void;
  onOpenComments: (post: Post) => void;
}) {
  const reportContent = useReportContent();
  const lang = useLang((s) => s.lang);
  const t = useLang((s) => s.t);
  return (
    <View
      testID={`post-card-view-${post.id}`}
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        marginBottom: 10,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      {post.isPinned ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: "#FEF3C7",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 20,
            alignSelf: "flex-start",
            marginBottom: 8,
          }}
        >
          <Pin size={11} color={AMBER} />
          <Text style={{ fontSize: 11, fontWeight: "700", color: AMBER }}>{t("profile_pinned")}</Text>
        </View>
      ) : null}

      <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }}>
        {post.content}
      </Text>

      {post.imageUrl ? (
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: post.imageUrl }}
            style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 10, marginTop: 12 }}
            resizeMode="cover"
          />
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                t("report_image_title"),
                t("report_image_question"),
                [
                  { text: t("cancel"), style: "cancel" },
                  { text: t("report_action"), style: "destructive", onPress: () => reportContent.mutate({ contentType: "post_image", targetId: post.id }) }
                ]
              );
            }}
            style={{ position: "absolute", top: 20, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 16, padding: 6 }}
          >
            <Flag size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 10 }}>
        {relativeTime(post.createdAt, lang)}
      </Text>

      <PostInteractionBar
        post={post}
        onLike={() => onLike(post)}
        onRepost={() => onRepost(post)}
        onOpenComments={() => onOpenComments(post)}
      />
    </View>
  );
}

function Avatar({
  uri,
  name,
  size,
  type,
}: {
  uri: string | null;
  name: string;
  size: number;
  type: "candidate" | "company";
}) {
  const { colors: avatarColors, isDark: avatarIsDark } = useTheme();
  const bg = type === "candidate" ? avatarColors.toggleBg : (avatarIsDark ? avatarColors.toggleBg : avatarColors.toggleBg);
  const color = type === "candidate" ? avatarColors.primary : GREEN;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.35, fontWeight: "700", color }}>
        {initials}
      </Text>
    </View>
  );
}

export default function ProfileViewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useLang();
  const lang = useLang((s) => s.lang);
  const isFr = lang === "fr";

  const { userId, type } = useLocalSearchParams<{
    userId: string;
    type: "candidate" | "company";
  }>();

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const base = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${base}/api/me`, { credentials: "include" });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as { id: string; name: string } | null;
    },
  });
  const myUserId = meData?.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["search-profile", userId, type],
    queryFn: async () => {
      // Demo candidate shortcut — no backend round-trip
      if (type === "candidate" && userId) {
        const demo = DEMO_CANDIDATES.find((c) => c.userId === userId || c.id === userId);
        if (demo) {
          return { type: "candidate" as const, profile: demoToProfile(demo, lang) };
        }
      }
      const base = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(
        `${base}/api/search/profile?userId=${encodeURIComponent(userId ?? "")}&type=${type}`,
        { credentials: "include" }
      );
      const json = (await res.json()) as any;
      if (!res.ok) throw new Error(json?.error?.message ?? "Error");
      return json.data as {
        type: "candidate" | "company";
        profile: any;
      };
    },
    enabled: !!userId && !!type,
  });

  const { data: viewedPosts = [] } = useQuery<Post[]>({
    queryKey: ["user-posts", userId],
    queryFn: async () => {
      const base = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${base}/api/posts/user/${userId}`, {
        credentials: "include",
      });
      const json = await res.json();
      return (json.data ?? []) as Post[];
    },
    enabled: !!userId && type === "candidate",
  });

  const isCandidate = type === "candidate";

  // Record this profile view
  useEffect(() => {
    if (userId) {
      const base = process.env.EXPO_PUBLIC_BACKEND_URL!;
      fetch(`${base}/api/profile-views/${userId}`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    }
  }, [userId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header bar */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: NAVY,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 12,
          }}
        >
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
          <Text
            style={{ fontSize: 17, fontWeight: "700", color: "#FFFFFF", flex: 1 }}
            numberOfLines={1}
          >
            {isLoading
              ? t("loading_text")
              : data?.profile?.fullName ?? data?.profile?.companyName ?? ""}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError || !data ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            paddingHorizontal: 40,
          }}
        >
          <Text style={{ fontSize: 32 }}>😔</Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              textAlign: "center",
            }}
          >
            {isFr ? "Profil introuvable" : lang === "zh" ? "未找到该用户" : "Profile not found"}
          </Text>
        </View>
      ) : isCandidate ? (
        <CandidateProfile
          profile={data.profile}
          colors={colors}
          isDark={isDark}
          isFr={isFr}
          lang={lang}
          posts={viewedPosts}
          myUserId={myUserId}
          userId={userId ?? ""}
        />
      ) : (
        <CompanyProfile profile={data.profile} colors={colors} isFr={isFr} lang={lang} isDark={isDark} />
      )}
    </View>
  );
}

function CandidateProfile({
  profile,
  colors,
  isDark,
  isFr,
  lang,
  posts,
  myUserId,
  userId,
}: {
  profile: any;
  colors: any;
  isDark: boolean;
  isFr: boolean;
  lang: string;
  posts: Post[];
  myUserId: string | undefined;
  userId: string;
}) {
  const router = useRouter();
  const segments = useSegments();
  const isRecruiter = segments.some((s) => s === "(recruiter)");
  const queryClient = useQueryClient();
  const reportContent = useReportContent();
  const t = useLang((s) => s.t);
  const connections = useDemoStore((s) => s.connections);
  const addConnection = useDemoStore((s) => s.addConnection);
  const hasSentConnection = connections.some(c =>
    (c.candidate as any)?.userId === userId ||
    (c.candidate as any)?.id === userId ||
    c.candidate.id === userId
  );
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<string | null>(null);
  const [reportCustomText, setReportCustomText] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "comments" | "images">("posts");
  const [bioExpanded, setBioExpanded] = useState(false);
  const [translatedBio, setTranslatedBio] = useState<string | null>(null);
  const [skillsTranslated, setSkillsTranslated] = useState(false);

  const SKILL_TRANSLATIONS: Record<string, { en: string; zh: string }> = {
    "Comptabilité": { en: "Accounting", zh: "会计" },
    "Excel": { en: "Excel", zh: "Excel" },
    "Sage": { en: "Sage (Software)", zh: "Sage软件" },
    "Fiscalité": { en: "Taxation", zh: "税务" },
    "React": { en: "React", zh: "React" },
    "Node.js": { en: "Node.js", zh: "Node.js" },
    "PostgreSQL": { en: "PostgreSQL", zh: "PostgreSQL" },
    "JavaScript": { en: "JavaScript", zh: "JavaScript" },
    "Soins infirmiers": { en: "Nursing", zh: "护理" },
    "Pédiatrie": { en: "Pediatrics", zh: "儿科" },
    "Premiers secours": { en: "First Aid", zh: "急救" },
    "Conduite": { en: "Driving", zh: "驾驶" },
    "Logistique": { en: "Logistics", zh: "物流" },
    "Permis B et C": { en: "B & C License", zh: "B和C驾照" },
    "Coiffure": { en: "Hairdressing", zh: "美发" },
    "Tressage": { en: "Braiding", zh: "编发" },
    "Coloration": { en: "Hair Coloring", zh: "染发" },
    "Cuisine": { en: "Cooking", zh: "烹饪" },
    "Pâtisserie": { en: "Pastry", zh: "糕点" },
    "Gestion cuisine": { en: "Kitchen Management", zh: "厨房管理" },
    "Maçonnerie": { en: "Masonry", zh: "砌筑" },
    "Plomberie": { en: "Plumbing", zh: "管道" },
    "Carrelage": { en: "Tiling", zh: "瓷砖" },
    "Vente": { en: "Sales", zh: "销售" },
    "CRM": { en: "CRM", zh: "客户关系管理" },
    "Négociation": { en: "Negotiation", zh: "谈判" },
    "Marketing Digital": { en: "Digital Marketing", zh: "数字营销" },
    "Python": { en: "Python", zh: "Python" },
    "Machine Learning": { en: "Machine Learning", zh: "机器学习" },
  };

  const getSkillName = (skillName: string) => {
    if (!skillsTranslated || lang === "fr") return skillName;
    const t2 = SKILL_TRANSLATIONS[skillName];
    if (!t2) return skillName;
    return lang === "zh" ? t2.zh : t2.en;
  };

  const translateBio = () => {
    if (translatedBio) {
      setTranslatedBio(null);
      return;
    }
    const demo = DEMO_CANDIDATES.find((c) => c.userId === userId || c.id === userId);
    if (!demo) return;
    const translated =
      lang === "fr" ? (demo.bioEn ?? demo.bioFr ?? null) :
      lang === "en" ? (demo.bioFr ?? demo.bioEn ?? null) :
      lang === "zh" ? (demo.bioFr ?? demo.bioEn ?? null) :
      (demo.bioEn ?? null);
    setTranslatedBio(translated ?? null);
  };

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/posts/${postId}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-posts", userId] }),
  });

  const repostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/posts/${postId}/repost`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-posts", userId] }),
  });

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const activePost = activePostId ? sortedPosts.find((p) => p.id === activePostId) ?? null : null;

  // Multilingual labels
  const labelAbout = lang === "fr" ? "À propos" : lang === "zh" ? "关于" : "About";
  const labelActivity = lang === "fr" ? "Activité" : lang === "zh" ? "动态" : "Activity";
  const labelPosts = lang === "fr" ? "Publications" : lang === "zh" ? "帖子" : "Posts";
  const labelComments = lang === "fr" ? "Commentaires" : lang === "zh" ? "评论" : "Comments";
  const labelImages = lang === "fr" ? "Images" : lang === "zh" ? "图片" : "Images";
  const labelExperience = lang === "fr" ? "Expérience" : lang === "zh" ? "经验" : "Experience";
  const labelEducation = lang === "fr" ? "Formation" : lang === "zh" ? "教育" : "Education";
  const labelSkills = lang === "fr" ? "Compétences" : lang === "zh" ? "技能" : "Skills";
  const labelSeeMore = lang === "fr" ? "Voir plus" : lang === "zh" ? "查看更多" : "See more";
  const labelSeeLess = lang === "fr" ? "Voir moins" : lang === "zh" ? "收起" : "See less";
  const labelConnections = lang === "fr" ? "connexions" : lang === "zh" ? "联系人" : "connections";
  const labelMessage = lang === "fr" ? "Envoyer un message" : lang === "zh" ? "发消息" : "Message";
  const labelAvailable = isFr ? "Disponible" : lang === "zh" ? "可用" : "Available";

  const presentLabel = t("profile_present");

  const sectionHeaderStyle = {
    fontSize: 16 as const,
    fontWeight: "600" as const,
    color: isDark ? "#3BAD4E" : NAVY,
    marginBottom: 14,
  };

  const cardStyle = {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  };

  const imagePosts = sortedPosts.filter((p) => p.imageUrl);

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Banner + Avatar header */}
        <View style={{ position: "relative", marginBottom: 60 }}>
          {/* Banner */}
          <LinearGradient
            colors={["#1B2F6E", "#2A4A9E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: 140, width: "100%" }}
          />

          {/* Profile photo overlapping banner */}
          <View
            style={{
              position: "absolute",
              bottom: -45,
              left: 16,
              width: 90,
              height: 90,
              borderRadius: 45,
              borderWidth: 3,
              borderColor: "#FFFFFF",
              backgroundColor: colors.card,
              overflow: "hidden",
            }}
          >
            <Avatar
              uri={profile.profilePhotoUrl}
              name={profile.fullName || "?"}
              size={90}
              type="candidate"
            />
          </View>

          {/* Report photo button */}
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                t("report_photo_title"),
                t("report_photo_question"),
                [
                  { text: t("cancel"), style: "cancel" },
                  { text: t("report_action"), style: "destructive", onPress: () => reportContent.mutate({ contentType: "profile_photo", targetId: userId }) }
                ]
              );
            }}
            style={{ position: "absolute", bottom: -38, left: 80, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 10, padding: 4 }}
          >
            <Flag size={11} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Name / headline / location block */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: isDark ? "#F5F5F5" : "#1B1B1B" }}>
              {profile.fullName || t("profile_no_name")}
            </Text>
            {profile.user?.isVerified ? <VerifiedBadge type="blue" /> : null}
            {profile.isGoldVerified ? <VerifiedBadge type="gold" /> : null}
            {profile.isPremium ? (
              <View style={{ marginLeft: 6 }}>
                <Crown size={18} color="#F5A623" strokeWidth={2} />
              </View>
            ) : null}
          </View>

          {profile.headline ? (
            <Text style={{ fontSize: 15, color: isDark ? "#AAAAAA" : "#666666", marginTop: 4, fontWeight: "500" }}>
              {profile.headline}
            </Text>
          ) : null}

          {profile.city ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
              <MapPin size={13} color={colors.textMuted} />
              <Text style={{ fontSize: 13, color: colors.textMuted }}>
                {profile.city}
                {profile.neighborhood ? `, ${profile.neighborhood}` : ""}
              </Text>
            </View>
          ) : null}

          <Text style={{ fontSize: 13, color: isDark ? "#3BAD4E" : NAVY, fontWeight: "600", marginTop: 6 }}>
            {posts.length} {labelConnections}
          </Text>

          {/* Availability badge */}
          {profile.availabilityStatus === "available" ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
                backgroundColor: "#E8F5EC",
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
              }}
            >
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN }} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: GREEN }}>
                {labelAvailable}
              </Text>
            </View>
          ) : null}

          {/* Action buttons */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Pressable
              testID="message-button"
              onPress={() => {
                router.push({
                  pathname: isRecruiter ? "/(app)/(recruiter)/messages" : "/(app)/(candidate)/messages",
                  params: { openUserId: userId, openUserName: profile.fullName ?? "" },
                } as never);
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                height: 44,
                borderRadius: 24,
                backgroundColor: GREEN,
              }}
            >
              <Send size={16} color="#FFFFFF" />
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>{labelMessage}</Text>
            </Pressable>
            <Pressable
              testID="connect-button"
              onPress={() => {
                if (!hasSentConnection) {
                  const demo = DEMO_CANDIDATES.find((c) => c.userId === userId || c.id === userId);
                  if (demo) {
                    addConnection(demo);
                    showToast(lang === "fr" ? "Demande de connexion envoyée" : lang === "zh" ? "连接请求已发送" : "Connection request sent");
                  }
                }
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                height: 44,
                borderRadius: 24,
                backgroundColor: hasSentConnection ? colors.toggleBg : NAVY,
                borderWidth: hasSentConnection ? 1.5 : 0,
                borderColor: hasSentConnection ? colors.border : undefined,
              }}
            >
              <UserPlus size={16} color={hasSentConnection ? colors.textMuted : "#FFFFFF"} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: hasSentConnection ? colors.textMuted : "#FFFFFF" }}>
                {hasSentConnection
                  ? (lang === "fr" ? "Envoyée" : lang === "zh" ? "已发送" : "Sent")
                  : (lang === "fr" ? "Connecter" : lang === "zh" ? "连接" : "Connect")}
              </Text>
            </Pressable>
            <Pressable
              testID="more-options-button"
              onPress={() => setShowReportModal(true)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.card,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1.5,
                borderColor: colors.border,
              }}
            >
              <MoreHorizontal size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* About section */}
        {profile.bio ? (
          <View style={cardStyle}>
            <Text style={sectionHeaderStyle}>{labelAbout}</Text>
            <Text
              style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}
              numberOfLines={bioExpanded ? undefined : 3}
            >
              {translatedBio ?? profile.bio}
            </Text>
            <Pressable onPress={() => setBioExpanded((v) => !v)} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? GREEN : NAVY }}>
                {bioExpanded ? labelSeeLess : labelSeeMore}
              </Text>
            </Pressable>

            {/* Translate bio button */}
            <Pressable
              onPress={() => {
                if (translatedBio) {
                  setTranslatedBio(null);
                  return;
                }
                const demo = DEMO_CANDIDATES.find(c => c.userId === userId || c.id === userId);
                if (demo) {
                  const translated = lang === "fr" ? demo.bioFr : lang === "en" ? demo.bioEn : demo.bioZh;
                  if (translated && translated !== profile.bio) {
                    setTranslatedBio(translated);
                  }
                }
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, alignSelf: "flex-start" }}
            >
              <Languages size={13} color={isDark ? GREEN : NAVY} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? GREEN : NAVY }}>
                {translatedBio ? (isFr ? "Texte original" : lang === "zh" ? "原文" : "Original") : (isFr ? "Traduire" : lang === "zh" ? "翻译" : "Translate")}
              </Text>
            </Pressable>
          </View>
        ) : (
          // Skills without bio
          profile.skills?.length > 0 ? (
            <View style={cardStyle}>
              <Text style={sectionHeaderStyle}>{labelSkills}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {profile.skills.map((s: any) => (
                  <View
                    key={s.id ?? s.skillName}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: isDark ? "#2A3A60" : NAVY,
                      borderRadius: 20,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#FFFFFF", fontWeight: "600" }}>
                      {s.skillName ?? s}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null
        )}

        {/* Activity section */}
        <View style={cardStyle}>
          <Text style={sectionHeaderStyle}>{labelActivity}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 14 }}>
            {posts.length} {labelConnections}
          </Text>

          {/* Tab row */}
          <View
            style={{
              flexDirection: "row",
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              marginBottom: 16,
            }}
          >
            {(["posts", "comments", "images"] as const).map((tab) => {
              const label = tab === "posts" ? labelPosts : tab === "comments" ? labelComments : labelImages;
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  testID={`activity-tab-${tab}`}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    alignItems: "center",
                    borderBottomWidth: isActive ? 2 : 0,
                    borderBottomColor: GREEN,
                    marginBottom: -1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? "700" : "500",
                      color: isActive ? GREEN : colors.textMuted,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Posts tab */}
          {activeTab === "posts" ? (
            sortedPosts.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center" }}>
                  {t("no_posts_yet")}
                </Text>
              </View>
            ) : (
              sortedPosts.map((post) => (
                <InteractivePostCard
                  key={post.id}
                  post={post}
                  colors={colors}
                  onLike={(p) => likePostMutation.mutate(p.id)}
                  onRepost={(p) => repostMutation.mutate(p.id)}
                  onOpenComments={(p) => {
                    setActivePostId(p.id);
                    setShowCommentsModal(true);
                  }}
                />
              ))
            )
          ) : null}

          {/* Comments tab */}
          {activeTab === "comments" ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center" }}>
                {t("coming_soon")}
              </Text>
            </View>
          ) : null}

          {/* Images tab */}
          {activeTab === "images" ? (
            imagePosts.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center" }}>
                  {t("no_images_shared")}
                </Text>
              </View>
            ) : (
              imagePosts.map((post) => (
                <InteractivePostCard
                  key={post.id}
                  post={post}
                  colors={colors}
                  onLike={(p) => likePostMutation.mutate(p.id)}
                  onRepost={(p) => repostMutation.mutate(p.id)}
                  onOpenComments={(p) => {
                    setActivePostId(p.id);
                    setShowCommentsModal(true);
                  }}
                />
              ))
            )
          ) : null}
        </View>

        {/* Experiences */}
        {profile.experiences?.length > 0 ? (
          <View style={cardStyle}>
            <Text style={sectionHeaderStyle}>{labelExperience}</Text>
            {profile.experiences.map((exp: any, i: number) => (
              <View
                key={exp.id}
                style={{
                  paddingVertical: 14,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                  flexDirection: "row",
                  gap: 12,
                }}
              >
                {/* Left accent line */}
                <View
                  style={{
                    width: 2,
                    backgroundColor: isDark ? GREEN : NAVY,
                    borderRadius: 2,
                    alignSelf: "stretch",
                    minHeight: 40,
                    flexShrink: 0,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                    {exp.companyName}
                  </Text>
                  <Text style={{ fontSize: 13, color: isDark ? GREEN : NAVY, fontWeight: "600", marginTop: 2 }}>
                    {exp.roleTitle}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {exp.startDate}
                    {exp.isCurrent
                      ? ` – ${presentLabel}`
                      : exp.endDate
                      ? ` – ${exp.endDate}`
                      : ""}
                  </Text>
                  {exp.description ? (
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 19 }} numberOfLines={3}>
                      {exp.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Education */}
        {profile.education?.length > 0 ? (
          <View style={cardStyle}>
            <Text style={sectionHeaderStyle}>{labelEducation}</Text>
            {profile.education.map((edu: any, i: number) => (
              <View
                key={edu.id}
                style={{
                  flexDirection: "row",
                  gap: 12,
                  paddingVertical: 12,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: "#E8F5EC",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 2,
                    flexShrink: 0,
                  }}
                >
                  <GraduationCap size={16} color={GREEN} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                    {edu.institutionName}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    {edu.degreeLevel}
                    {edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ""}
                  </Text>
                  {edu.startYear ? (
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {edu.startYear}
                      {edu.endYear ? ` – ${edu.endYear}` : ""}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Skills (separate section if bio exists) */}
        {profile.bio && profile.skills?.length > 0 ? (
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Text style={{ ...sectionHeaderStyle, marginBottom: 0 }}>{labelSkills}</Text>
              {lang !== "fr" ? (
                <Pressable
                  onPress={() => setSkillsTranslated(v => !v)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Languages size={13} color={isDark ? GREEN : NAVY} />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? GREEN : NAVY }}>
                    {skillsTranslated ? (lang === "zh" ? "法语" : "French") : (lang === "zh" ? "翻译" : "Translate")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {profile.skills.map((s: any) => (
                <View
                  key={s.id ?? s.skillName}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: GREEN,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#FFFFFF", fontWeight: "600" }}>
                    {getSkillName(s.skillName ?? s)}
                  </Text>
                  {s.endorsementCount > 0 ? (
                    <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                      +{s.endorsementCount}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* CV Section */}
        {profile.cvUrl ? (
          <View style={cardStyle}>
            <Text style={sectionHeaderStyle}>CV</Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? "#2A3A60" : "#F0F4FF",
                borderRadius: 12,
                padding: 14,
                gap: 12,
              }}
            >
              <FileText size={22} color={isDark ? GREEN : NAVY} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: isDark ? GREEN : NAVY }}>{t("resume_cv")}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {t("cv_tap_to_view")}
                </Text>
              </View>
              <Pressable
                testID="view-cv-button"
                onPress={() => {
                  import("expo-linking").then(({ default: Linking }) => {
                    Linking.openURL(profile.cvUrl);
                  });
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isDark ? GREEN : NAVY,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>
                  {t("cv_view_btn")}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {activePost ? (
        <CommentsModal
          visible={showCommentsModal}
          postId={activePost.id}
          myUserId={myUserId}
          onClose={() => {
            setShowCommentsModal(false);
            setActivePostId(null);
          }}
          onLike={() => likePostMutation.mutate(activePost.id)}
          onRepost={() => repostMutation.mutate(activePost.id)}
          post={activePost}
          queryKeyToInvalidate={["user-posts", userId]}
        />
      ) : null}

      {/* Report profile modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
          onPress={() => {
            if (!reportSubmitted) {
              setShowReportModal(false);
              setSelectedReportReason(null);
              setReportCustomText("");
            }
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: 36,
              }}
            >
              {reportSubmitted ? (
                <View style={{ alignItems: "center", paddingVertical: 16 }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: "#E8F5EC",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Check size={28} color={GREEN} strokeWidth={3} />
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center" }}>
                    {lang === "fr" ? "Signalement envoyé" : lang === "zh" ? "举报已提交" : "Report submitted"}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: 8 }}>
                    {lang === "fr" ? "Merci pour votre signalement. Nous allons examiner ce profil." : lang === "zh" ? "感谢您的举报，我们将审查此资料。" : "Thank you. We'll review this profile."}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setShowReportModal(false);
                      setReportSubmitted(false);
                      setSelectedReportReason(null);
                      setReportCustomText("");
                    }}
                    style={{
                      marginTop: 20,
                      paddingHorizontal: 28,
                      paddingVertical: 12,
                      borderRadius: 24,
                      backgroundColor: NAVY,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
                      {lang === "fr" ? "Fermer" : lang === "zh" ? "关闭" : "Close"}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
                    <Text style={{ flex: 1, fontSize: 17, fontWeight: "700", color: colors.text }}>
                      {lang === "fr" ? "Signaler ce profil" : lang === "zh" ? "举报此资料" : "Report this profile"}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setShowReportModal(false);
                        setSelectedReportReason(null);
                        setReportCustomText("");
                      }}
                      hitSlop={8}
                    >
                      <X size={22} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  {[
                    lang === "fr" ? "Contenu inapproprié" : lang === "zh" ? "不当内容" : "Inappropriate content",
                    lang === "fr" ? "Faux profil" : lang === "zh" ? "虚假资料" : "Fake profile",
                    lang === "fr" ? "Harcèlement" : lang === "zh" ? "骚扰" : "Harassment",
                    lang === "fr" ? "Spam" : lang === "zh" ? "垃圾信息" : "Spam",
                    lang === "fr" ? "Autre" : lang === "zh" ? "其他" : "Other",
                  ].map((reason) => (
                    <Pressable
                      key={reason}
                      onPress={() => setSelectedReportReason(reason)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: selectedReportReason === reason ? NAVY : colors.border,
                          backgroundColor: selectedReportReason === reason ? NAVY : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {selectedReportReason === reason ? (
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" }} />
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 15, color: colors.text }}>{reason}</Text>
                    </Pressable>
                  ))}

                  {selectedReportReason === (lang === "fr" ? "Autre" : lang === "zh" ? "其他" : "Other") ? (
                    <TextInput
                      value={reportCustomText}
                      onChangeText={setReportCustomText}
                      placeholder={lang === "fr" ? "Décrivez le problème…" : lang === "zh" ? "描述问题…" : "Describe the issue…"}
                      placeholderTextColor={colors.textMuted}
                      style={{
                        marginTop: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 14,
                        color: colors.text,
                        minHeight: 80,
                        textAlignVertical: "top",
                      }}
                      multiline
                    />
                  ) : null}

                  <Pressable
                    onPress={() => {
                      if (!selectedReportReason) return;
                      reportContent.mutate({ contentType: "profile_photo", targetId: userId });
                      setReportSubmitted(true);
                    }}
                    style={{
                      marginTop: 20,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: selectedReportReason ? "#EF4444" : colors.toggleBg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: selectedReportReason ? "#FFFFFF" : colors.textMuted,
                      }}
                    >
                      {lang === "fr" ? "Envoyer le signalement" : lang === "zh" ? "提交举报" : "Submit report"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function CompanyProfile({
  profile,
  colors,
  isFr,
  lang,
  isDark,
}: {
  profile: any;
  colors: any;
  isFr: boolean;
  lang: string;
  isDark: boolean;
}) {
  const t = useLang((s) => s.t);
  const router = useRouter();

  const { data: companyPosts = [] } = useQuery({
    queryKey: ["company-posts", profile.id],
    queryFn: async () => {
      const base = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${base}/api/company/${profile.id}/posts`, { credentials: "include" });
      const json = await res.json();
      return (json.data ?? []) as Array<{
        id: string; content: string; imageUrl: string | null; isPinned: boolean;
        createdAt: string; likeCount: number; commentCount: number; repostCount: number;
        isLikedByMe: boolean; isRepostedByMe: boolean;
      }>;
    },
    enabled: !!profile.id,
  });

  const sectionHeaderStyle = {
    fontSize: 16 as const,
    fontWeight: "600" as const,
    color: isDark ? "#3BAD4E" : NAVY,
    marginBottom: 14,
  };

  const cardStyle = {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  };

  // Sort team members: pinned first, then by order
  const sortedTeamMembers = profile.teamMembers
    ? [...profile.teamMembers].sort((a: any, b: any) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (a.order ?? 999) - (b.order ?? 999);
      })
    : [];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {/* Hero card */}
      <View
        style={{
          backgroundColor: colors.card,
          marginHorizontal: 16,
          marginTop: 16,
          borderRadius: 20,
          padding: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Avatar
            uri={profile.logoUrl}
            name={profile.companyName || "?"}
            size={72}
            type="company"
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                style={{ fontSize: 18, fontWeight: "800", color: colors.text }}
                numberOfLines={1}
              >
                {profile.companyName}
              </Text>
              {profile.isVerified ? (
                <VerifiedBadge type="gold" />
              ) : null}
            </View>
            {profile.sector ? (
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
              >
                {profile.sector}
              </Text>
            ) : null}
            {profile.location ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                <MapPin size={12} color={colors.textMuted} />
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {profile.location}
                </Text>
              </View>
            ) : null}
            {profile.sizeRange ? (
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                {t("company_size_label")} {profile.sizeRange}{" "}
                {t("company_size_employees")}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Active jobs count */}
        {(profile._count?.jobListings ?? 0) > 0 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 14,
              backgroundColor: colors.toggleBg,
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 20,
            }}
          >
            <Building2 size={12} color={colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>
              {profile._count.jobListings}{" "}
              {profile._count.jobListings !== 1
                ? t("active_jobs_plural")
                : t("active_job_singular")}
            </Text>
          </View>
        ) : null}

        {/* Description */}
        {profile.description ? (
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              lineHeight: 20,
              marginTop: 14,
            }}
          >
            {profile.description}
          </Text>
        ) : null}

        {/* Website */}
        {profile.website ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 12,
            }}
          >
            <ExternalLink size={13} color={GREEN} />
            <Text style={{ fontSize: 13, color: GREEN, fontWeight: "500" }}>
              {profile.website}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Team Members */}
      {sortedTeamMembers.length > 0 ? (
        <View style={cardStyle}>
          <Text style={sectionHeaderStyle}>
            {t("team_our_team")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 12 }}
          >
            {sortedTeamMembers.map((member: any) => {
              const initials = member.name
                .split(" ")
                .map((w: string) => w[0] ?? "")
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const cardContent = (
                <View
                  key={member.id}
                  style={{
                    width: 120,
                    backgroundColor: colors.background,
                    borderRadius: 14,
                    padding: 12,
                    alignItems: "center",
                    gap: 6,
                    borderWidth: 1,
                    borderColor: member.isPinned ? AMBER : colors.border,
                  }}
                >
                  {member.isPinned ? (
                    <View
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        backgroundColor: "#FEF3C7",
                        borderRadius: 8,
                        paddingHorizontal: 5,
                        paddingVertical: 2,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Pin size={9} color={AMBER} />
                      <Text style={{ fontSize: 9, fontWeight: "700", color: AMBER }}>
                        {t("team_pinned")}
                      </Text>
                    </View>
                  ) : null}
                  {member.photoUrl ? (
                    <Image
                      source={{ uri: member.photoUrl }}
                      style={{ width: 52, height: 52, borderRadius: 26 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: colors.toggleBg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.primary }}>
                        {initials}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: colors.text,
                      textAlign: "center",
                    }}
                    numberOfLines={1}
                  >
                    {member.name}
                  </Text>
                  {member.role ? (
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.textSecondary,
                        textAlign: "center",
                      }}
                      numberOfLines={1}
                    >
                      {member.role}
                    </Text>
                  ) : null}
                </View>
              );
              if (member.linkedUserId) {
                return (
                  <Pressable
                    key={member.id}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/profile-view",
                        params: { userId: member.linkedUserId, type: "candidate" },
                      } as never)
                    }
                  >
                    {cardContent}
                  </Pressable>
                );
              }
              return cardContent;
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Company Posts */}
      <View style={cardStyle}>
        <Text style={sectionHeaderStyle}>
          {t("company_posts_title")}
        </Text>
        {companyPosts.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: "center" }}>
              {t("company_no_posts")}
            </Text>
          </View>
        ) : (
          companyPosts.slice(0, 5).map((post) => (
            <View
              key={post.id}
              style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              {post.isPinned ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "#FEF3C7",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 20,
                    alignSelf: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <Pin size={10} color={AMBER} />
                  <Text style={{ fontSize: 10, fontWeight: "700", color: AMBER }}>
                    {t("profile_pinned")}
                  </Text>
                </View>
              ) : null}
              {/* Author row */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Avatar
                  uri={profile.logoUrl}
                  name={profile.companyName || "?"}
                  size={32}
                  type="company"
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
                    {profile.companyName}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    {relativeTime(post.createdAt, lang)}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
                {post.content}
              </Text>
              {/* Stats row */}
              <View style={{ flexDirection: "row", gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Heart size={14} color={post.isLikedByMe ? "#EF4444" : colors.textMuted} fill={post.isLikedByMe ? "#EF4444" : "none"} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{post.likeCount ?? 0}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <MessageCircle size={14} color={colors.textMuted} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{post.commentCount ?? 0}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Active listings */}
      {profile.jobListings?.length > 0 ? (
        <View
          style={{
            backgroundColor: colors.card,
            marginHorizontal: 16,
            marginTop: 12,
            borderRadius: 20,
            padding: 18,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: NAVY,
              marginBottom: 14,
            }}
          >
            {t("recruiter_active_jobs_label")}
          </Text>
          {profile.jobListings.map((job: any) => (
            <View
              key={job.id}
              style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                {job.title}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: colors.toggleBg,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: colors.primary,
                      textTransform: "uppercase",
                    }}
                  >
                    {job.contractType}
                  </Text>
                </View>
                <MapPin size={11} color={colors.textMuted} />
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {job.locationCity}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
