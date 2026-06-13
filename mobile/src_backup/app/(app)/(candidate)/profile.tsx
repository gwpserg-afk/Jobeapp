import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { authClient } from "@/lib/auth/auth-client";
import { useInvalidateSession } from "@/lib/auth/use-session";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import {
  Settings,
  ChevronRight,
  Clock,
  Shield,
  HelpCircle,
  Trash2,
  X,
  Plus,
  MapPin,
  MoreHorizontal,
  Pin,
  Edit3,
  PlusSquare,
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  FileText,
  Upload,
  Check,
  CheckCircle2,
  Phone,
  Crown,
  Zap,
  AlertTriangle,
  PlusCircle,
  Briefcase,
  Sparkles,
  ImageIcon,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { uploadFile } from "@/lib/upload";
import { useLang } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import { useDemoStore } from "@/lib/demoStore";
import { DEMO_JOBS } from "@/lib/demoData";
import { UserAvatar } from "@/components/UserAvatar";
import { useUserWithProfile, USER_ME_QUERY_KEY } from "@/lib/hooks/useUser";
import { useTheme } from "@/lib/theme";
import { useVerificationStore } from "@/lib/verificationStore";
import { api } from "@/lib/api/api";

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";
const AMBER = "#F59E0B";

const BLOCKED_WORDS = ["fuck","shit","asshole","bitch","cunt","dick","pussy","cock","bastard","motherfucker","faggot","nigger","nigga","retard","whore","slut","damn","hell","ass","piss","crap","wtf","stfu","fck","sh1t","b1tch","a$$","fuk"];
function hasProfanity(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  return lower.split(/\s+/).some(w => BLOCKED_WORDS.includes(w));
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

type ProfileViewer = {
  viewerId: string;
  viewerName: string;
  viewerImage: string | null;
  viewedAt: string;
};

type Experience = {
  id: string;
  companyName: string;
  roleTitle: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
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

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
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
  const { colors: avatarColors } = useTheme();
  const [imgError, setImgError] = useState(false);
  const initials = name.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  if (uri && !imgError) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColors.toggleBg }} onError={() => setImgError(true)} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColors.toggleBg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.33, fontWeight: "700", color: avatarColors.primary }}>{initials}</Text>
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
  const [commentText, setCommentText] = useState("");
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const { colors } = useTheme();

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
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => {
      showToast(useLang.getState().t("comment_failed"));
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
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => {
      showToast(useLang.getState().t("comment_delete_failed"));
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
            backgroundColor: colors.card,
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
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ flex: 1, fontSize: 17, fontWeight: "700", color: colors.text }}>
              {t("comments_title")}
            </Text>
            <Pressable onPress={onClose} style={{ padding: 4 }} hitSlop={8}>
              <X size={22} color={colors.textMuted} />
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
              borderBottomColor: colors.border,
            }}
          >
            <Pressable
              testID={`like-button-modal-${post.id}`}
              onPress={onLike}
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <Heart
                size={20}
                color={post.isLikedByMe ? "#EF4444" : colors.textMuted}
                fill={post.isLikedByMe ? "#EF4444" : "none"}
              />
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>{post.likeCount ?? 0}</Text>
            </Pressable>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <MessageCircle size={20} color={colors.textMuted} />
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>{post.commentCount ?? 0}</Text>
            </View>
            <Pressable
              testID={`repost-button-modal-${post.id}`}
              onPress={onRepost}
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <Repeat2
                size={20}
                color={post.isRepostedByMe ? GREEN : colors.textMuted}
              />
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>{post.repostCount ?? 0}</Text>
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
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : comments.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ fontSize: 14, color: colors.textMuted }}>{t("profile_no_comments")}</Text>
              </View>
            ) : (
              comments.map((comment) => (
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
                        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
                          {comment.author.name}
                        </Text>
                        {comment.author.isVerified ? <VerifiedBadge type="blue" /> : null}
                        {comment.author.isGoldVerified ? <VerifiedBadge type="gold" /> : null}
                      </View>
                    </Pressable>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginTop: 2 }}>
                      {comment.content}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                      {relativeTime(comment.createdAt, lang)}
                    </Text>
                  </View>
                  {comment.author.id === myUserId ? (
                    <Pressable
                      onPress={() => deleteCommentMutation.mutate(comment.id)}
                      style={{ padding: 4 }}
                      hitSlop={8}
                    >
                      <Trash2 size={15} color="#EF4444" />
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>

          {/* Input row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              gap: 10,
            }}
          >
            <TextInput
              testID="comment-input"
              value={commentText}
              onChangeText={setCommentText}
              placeholder={t("profile_write_comment")}
              placeholderTextColor={colors.textMuted}
              style={{
                flex: 1,
                fontSize: 14,
                color: colors.text,
                backgroundColor: colors.toggleBg,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: colors.border,
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
                backgroundColor: commentText.trim() ? colors.primary : colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {createCommentMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={18} color={commentText.trim() ? "#FFFFFF" : colors.textMuted} />
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

function PostCard({
  post,
  onPin,
  onDelete,
  onLike,
  onRepost,
  onOpenComments,
}: {
  post: Post;
  onPin: (post: Post) => void;
  onDelete: (post: Post) => void;
  onLike: (post: Post) => void;
  onRepost: (post: Post) => void;
  onOpenComments: (post: Post) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const { colors } = useTheme();
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);

  return (
    <View
      testID={`post-card-${post.id}`}
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Pin badge + menu row */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: post.isPinned ? 8 : 0 }}>
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
              flex: 1,
            }}
          >
            <Pin size={11} color={AMBER} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: AMBER }}>{t("profile_pinned")}</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable
          testID={`post-menu-button-${post.id}`}
          onPress={() => setShowMenu(true)}
          style={{ padding: 4 }}
          hitSlop={8}
        >
          <MoreHorizontal size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Content */}
      <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22, marginTop: post.isPinned ? 0 : 4 }}>
        {post.content}
      </Text>

      {/* Image */}
      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 10, marginTop: 12 }}
          resizeMode="cover"
        />
      ) : null}

      {/* Timestamp */}
      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 10 }}>
        {relativeTime(post.createdAt, lang)}
      </Text>

      {/* Interaction bar */}
      <PostInteractionBar
        post={post}
        onLike={() => onLike(post)}
        onRepost={() => onRepost(post)}
        onOpenComments={() => onOpenComments(post)}
      />

      {/* Action menu modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 36,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textMuted, textAlign: "center", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("profile_post_options")}
            </Text>
            <Pressable
              testID={`post-pin-button-${post.id}`}
              onPress={() => {
                setShowMenu(false);
                onPin(post);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderRadius: 12,
              }}
            >
              <Pin size={20} color={AMBER} />
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>
                {post.isPinned ? t("profile_unpin") : t("profile_pin_to_top")}
              </Text>
            </Pressable>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Pressable
              testID={`post-delete-button-${post.id}`}
              onPress={() => {
                setShowMenu(false);
                onDelete(post);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderRadius: 12,
              }}
            >
              <Trash2 size={20} color="#EF4444" />
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#EF4444" }}>{t("profile_delete_post")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function ComposeModal({
  visible,
  onClose,
  onSubmit,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string, imageUri: string | null) => void;
  isLoading: boolean;
}) {
  const [text, setText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showProfanityModal, setShowProfanityModal] = useState(false);
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const { colors } = useTheme();
  const canSubmit = text.trim().length > 0 || imageUri !== null;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast(
        lang === "fr" ? "Permission requise pour accéder à la galerie" :
        lang === "zh" ? "需要相册访问权限" : "Permission required to access gallery",
        "error"
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit || isLoading) return;
    if (text.trim() && hasProfanity(text.trim())) {
      setShowProfanityModal(true);
      return;
    }
    onSubmit(text.trim(), imageUri);
    setText("");
    setImageUri(null);
  };

  const handleClose = () => {
    setText("");
    setImageUri(null);
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable style={{ flex: 1 }} onPress={handleClose}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
          </Pressable>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: 36,
              minHeight: 280,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: "700", color: colors.text }}>
                {t("profile_share_post")}
              </Text>
              <Pressable
                testID="compose-close-button"
                onPress={handleClose}
                style={{ padding: 4 }}
                hitSlop={8}
              >
                <X size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <TextInput
              testID="compose-text-input"
              value={text}
              onChangeText={setText}
              placeholder={t("profile_whats_on_mind")}
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
              style={{
                fontSize: 15,
                color: colors.text,
                lineHeight: 24,
                minHeight: 120,
                textAlignVertical: "top",
              }}
            />

            {/* Image preview */}
            {imageUri ? (
              <View style={{ marginTop: 12, position: "relative" }}>
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 10 }}
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => setImageUri(null)}
                  style={{
                    position: "absolute", top: 6, right: 6,
                    width: 26, height: 26, borderRadius: 13,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <X size={13} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>
              </View>
            ) : null}

            {/* Bottom toolbar: image picker + submit */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
              <Pressable
                testID="compose-image-button"
                onPress={pickImage}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                  backgroundColor: colors.toggleBg,
                }}
              >
                <ImageIcon size={16} color={colors.accent} strokeWidth={2} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary }}>
                  {lang === "fr" ? "Photo" : lang === "zh" ? "照片" : "Photo"}
                </Text>
              </Pressable>
              <Pressable
                testID="compose-submit-button"
                onPress={handleSubmit}
                disabled={!canSubmit || isLoading}
                style={{
                  backgroundColor: canSubmit ? colors.primary : colors.border,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 24,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  opacity: !canSubmit || isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : null}
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>{t("profile_post_btn")}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Profanity warning modal */}
      <Modal
        visible={showProfanityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfanityModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 32 }}
          onPress={() => setShowProfanityModal(false)}
        >
          <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 24, width: "100%", gap: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>Inappropriate Content</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>Your post contains offensive language. Please revise and try again.</Text>
            <Pressable
              onPress={() => setShowProfanityModal(false)}
              style={{ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 4 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>OK</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export default function CandidateProfileScreen() {
  const router = useRouter();
  const invalidateSession = useInvalidateSession();
  const queryClient = useQueryClient();
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const { colors, isDark } = useTheme();
  const setDemoLoggedIn = useDemoStore((s) => s.setDemoLoggedIn);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [showDeletePostModal, setShowDeletePostModal] = useState<Post | null>(null);
  const [showRemoveCvModal, setShowRemoveCvModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "reposts" | "comments">("posts");
  const [bioExpanded, setBioExpanded] = useState(false);
  const [jobsTab, setJobsTab] = useState<"applications" | "saved">("applications");
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [skillsSearch, setSkillsSearch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Experience states
  const [showAddExpModal, setShowAddExpModal] = useState(false);
  const [addExpCompany, setAddExpCompany] = useState("");
  const [addExpRole, setAddExpRole] = useState("");
  const [addExpStart, setAddExpStart] = useState("");
  const [addExpEnd, setAddExpEnd] = useState("");
  const [addExpDesc, setAddExpDesc] = useState("");
  const [addExpIsImproving, setAddExpIsImproving] = useState(false);

  const { user, profile } = useUserWithProfile();

  const demoUserName = useDemoStore((s) => s.demoUserName);
  const demoHeadline = useDemoStore((s) => s.demoHeadline);
  const demoPhotoUri = useDemoStore((s) => s.demoPhotoUri);
  const profileHeadline = useDemoStore((s) => s.profileEdits.headline);
  const demoConnections = useDemoStore((s) => s.connections);
  const acceptedCount = demoConnections.filter((c) => c.status === "accepted").length;
  const savedJobIds = useDemoStore((s) => s.savedJobIds);

  const displayName = user?.name ?? demoUserName ?? t("profile_user_fallback");
  const displayHeadline = profile?.headline ?? demoHeadline ?? profileHeadline ?? null;
  const displayPhotoUri = user?.image ?? profile?.profilePhotoUrl ?? demoPhotoUri ?? null;
  const displayLocation = profile?.city ?? null;

  // Posts query
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["my-posts"],
    queryFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/posts`, { credentials: "include" });
      const json = await res.json();
      return (json.data ?? []) as Post[];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Reposted posts query
  const { data: repostedPosts = [] } = useQuery<Post[]>({
    queryKey: ["my-reposts"],
    queryFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/posts/reposts`, { credentials: "include" });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data ?? []) as Post[];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Commented-on posts query
  const { data: commentedPosts = [] } = useQuery<Post[]>({
    queryKey: ["my-comments"],
    queryFn: () => api.get<Post[]>("/api/posts/my-comments"),
    staleTime: 0,
  });

  const cvUrl = profile?.cvUrl ?? null;

  // Experiences query
  const { data: experiences = [] } = useQuery<Experience[]>({
    queryKey: ["my-experiences"],
    queryFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/profile/experiences`, { credentials: "include" });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data ?? []) as Experience[];
    },
  });

  const DEMO_PROFILE_VIEWERS: ProfileViewer[] = [
    {
      viewerId: "demo-viewer-1",
      viewerName: "Aminata Diallo",
      viewerImage: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&face",
      viewedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      viewerId: "demo-viewer-2",
      viewerName: "Oumar Ndiaye",
      viewerImage: "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=100&h=100&fit=crop",
      viewedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      viewerId: "demo-viewer-3",
      viewerName: "Rokhaya Seck",
      viewerImage: "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=100&h=100&fit=crop",
      viewedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    },
  ];

  const { data: rawProfileViewers = [] } = useQuery<ProfileViewer[]>({
    queryKey: ["profileViews"],
    queryFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/profile-views/mine`, { credentials: "include" });
      const json = await res.json();
      return (json.data ?? []) as ProfileViewer[];
    },
    enabled: !!user?.isPremium,
  });

  const profileViewers = rawProfileViewers.length > 0 ? rawProfileViewers : DEMO_PROFILE_VIEWERS;

  const uploadCvMutation = useMutation({
    mutationFn: async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) throw new Error("cancelled");
      const asset = result.assets[0];
      const { uploadFile } = await import("@/lib/upload");
      const uploaded = await uploadFile(asset.uri, asset.name, asset.mimeType ?? "application/pdf");
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/profile/cv`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cvUrl: uploaded.url, cvFileId: uploaded.id }),
      });
      if (!res.ok) throw new Error("Failed to save CV");
      return uploaded.url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      showToast(t("profile_cv_uploaded"));
    },
    onError: (err: any) => {
      if (err?.message !== "cancelled") showToast(useLang.getState().t("error_upload_cv"));
    },
  });

  const removeCvMutation = useMutation({
    mutationFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/profile/cv`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove CV");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      showToast(t("cv_removed"));
    },
  });

  // Experience mutations
  const addExpMutation = useMutation({
    mutationFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/profile/experiences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          companyName: addExpCompany.trim(),
          roleTitle: addExpRole.trim(),
          startDate: addExpStart.trim(),
          endDate: addExpEnd.trim() || null,
          description: addExpDesc.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add experience");
      const json = await res.json();
      return json.data as Experience;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-experiences"] });
      setShowAddExpModal(false);
      setAddExpCompany("");
      setAddExpRole("");
      setAddExpStart("");
      setAddExpEnd("");
      setAddExpDesc("");
      showToast(t("experience_added"));
    },
    onError: () => {
      showToast(useLang.getState().t("error_add_experience"));
    },
  });

  const deleteExpMutation = useMutation({
    mutationFn: async (expId: string) => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/profile/experiences/${expId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete experience");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-experiences"] });
    },
  });

  const improveTextMutation = useMutation({
    mutationFn: async (text: string) => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/profile/improve-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to improve text");
      const json = await res.json();
      return json.data as string;
    },
    onSuccess: (improved: string) => {
      setAddExpDesc(improved);
      showToast(t("profile_improved_success"));
    },
    onError: () => {
      showToast(useLang.getState().t("error_improve_text"));
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async ({ content, imageUri }: { content: string; imageUri: string | null }) => {
      let imageUrl: string | null = null;
      if (imageUri) {
        if (imageUri.startsWith("http")) {
          imageUrl = imageUri;
        } else {
          const filename = `post-${Date.now()}.jpg`;
          const uploaded = await uploadFile(imageUri, filename, "image/jpeg");
          imageUrl = uploaded.url;
        }
      }
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, imageUrl }),
      });
      if (!res.ok) throw new Error("Failed to create post");
      const json = await res.json();
      return json.data as Post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      setShowComposeModal(false);
      showToast(t("post_shared"));
    },
    onError: () => {
      showToast(useLang.getState().t("error_share_post"));
    },
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/posts/${postId}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-reposts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const pinPostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/posts/${postId}/pin`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to pin post");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => {
      showToast(useLang.getState().t("error_pin_post"));
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete post");
    },
    onMutate: (postId: string) => {
      // Optimistically remove instantly from cache
      queryClient.setQueryData<Post[]>(["my-posts"], (old) =>
        old ? old.filter((p) => p.id !== postId) : old
      );
      showToast(t("post_deleted"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      showToast(useLang.getState().t("error_delete_post"));
    },
  });

  const rechargeMutation = useMutation({
    mutationFn: () => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      return fetch(`${baseUrl}/api/subscription/recharge`, {
        method: "POST",
        credentials: "include",
      }).then((res) => {
        // 409 = already recharged this month; silently ignore
        if (!res.ok && res.status !== 409) throw new Error("Recharge failed");
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
    },
  });

  // Trigger monthly credit recharge silently when the user is premium
  useEffect(() => {
    if (user?.isPremium) {
      rechargeMutation.mutate();
    }
    // Only run once when premium status is known
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isPremium]);

  const verifyPhone = useMutation({
    mutationFn: (phone: string) => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      return fetch(`${baseUrl}/api/verification/phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      }).then((res) => {
        if (!res.ok) throw new Error("Failed");
      });
    },
    onSuccess: () => {
      setShowVerifyModal(false);
      setPhoneInput("");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      showToast(t("verified_success"));
    },
    onError: () => showToast(useLang.getState().t("error_verify")),
  });

  const saveSkillsMutation = useMutation({
    mutationFn: async (skills: string[]) => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      for (const skillName of skills) {
        await fetch(`${baseUrl}/api/profile/skills`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ skillName, skillLevel: "intermediate" }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setShowSkillsModal(false);
      setSelectedSkills([]);
      setSkillsSearch("");
      showToast(lang === "fr" ? "Compétences ajoutées" : lang === "zh" ? "技能已添加" : "Skills added");
    },
    onError: () => {
      showToast(lang === "fr" ? "Erreur lors de l'ajout des compétences" : lang === "zh" ? "添加技能失败" : "Failed to add skills");
    },
  });

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const activePost = activePostId ? sortedPosts.find((p) => p.id === activePostId) ?? null : null;

  const handleDeletePost = (post: Post) => {
    setShowDeletePostModal(post);
  };

  const profileCompletePct = (profile as any)?.profileCompletePct ?? 0;

  const verificationStatus = useVerificationStore((s) => s.status);

  // Calculate profile completion
  const completionItems = [
    { key: "photo", weight: 10, done: !!(user?.image || profile?.profilePhotoUrl), labelKey: "completion_photo" as const, nav: "/(app)/edit-profile" },
    { key: "headline", weight: 10, done: !!(profile?.headline && profile.headline.length > 0), labelKey: "completion_title" as const, nav: "/(app)/edit-profile" },
    { key: "bio", weight: 10, done: !!(profile?.bio && profile.bio.length > 10), labelKey: "completion_bio" as const, nav: "/(app)/edit-profile" },
    { key: "skills", weight: 15, done: !!(profile?.skills && (profile.skills as unknown[]).length > 0), labelKey: "completion_skills" as const, nav: "/(app)/skills" },
    { key: "experience", weight: 20, done: experiences.length > 0, labelKey: "completion_experience" as const, nav: "/(app)/edit-profile" },
    { key: "education", weight: 10, done: !!(profile?.education && (profile.education as unknown[]).length > 0), labelKey: "completion_education" as const, nav: "/(app)/edit-profile" },
    { key: "phone", weight: 15, done: !!(user as any)?.phone, labelKey: "completion_phone" as const, nav: "/(app)/edit-profile" },
    { key: "identity", weight: 10, done: verificationStatus === "verified", labelKey: "completion_identity" as const, nav: "/(app)/(candidate)/verify-identity" },
  ];

  const completionPct = completionItems.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
  const incompleteItems = completionItems.filter((item) => !item.done);

  const presentLabel = lang === "fr" ? "Actuel" : lang === "zh" ? "当前" : "Present";

  // Multilingual labels
  const labelAbout = lang === "fr" ? "À propos" : lang === "zh" ? "关于" : "About";
  const labelActivity = lang === "fr" ? "Activité" : lang === "zh" ? "动态" : "Activity";
  const labelPosts = lang === "fr" ? "Publications" : lang === "zh" ? "帖子" : "Posts";
  const labelComments = lang === "fr" ? "Commentaires" : lang === "zh" ? "评论" : "Comments";
  const labelReposts = lang === "fr" ? "Repartages" : lang === "zh" ? "转发" : "Reposts";
  const labelExperience = lang === "fr" ? "Expérience" : lang === "zh" ? "经验" : "Experience";
  const labelSeeMore = lang === "fr" ? "Voir plus" : lang === "zh" ? "查看更多" : "See more";
  const labelSeeLess = lang === "fr" ? "Voir moins" : lang === "zh" ? "收起" : "See less";
  const labelConnections = lang === "fr" ? "connexions" : lang === "zh" ? "联系人" : "connections";
  const labelApplications = lang === "fr" ? "candidatures" : lang === "zh" ? "申请" : "applications";
  const labelEditProfile = lang === "fr" ? "Modifier le profil" : lang === "zh" ? "编辑资料" : "Edit Profile";

  // Tab filtered posts

  // Section header style
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
    borderRadius: 12,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  };

  return (
    <View testID="candidate-profile-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.background }}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 12,
            paddingTop: 8,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>
            {t("profile_title")}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
        {/* Profile Header - no banner */}
        <View style={{ backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
            {/* Avatar with edit overlay */}
            <Pressable
              onPress={() => router.push("/edit-profile" as never)}
              style={{ position: "relative" }}
            >
              <View style={{
                width: 88, height: 88, borderRadius: 44,
                borderWidth: 3, borderColor: GREEN,
                overflow: "hidden",
                backgroundColor: NAVY,
              }}>
                <UserAvatar name={displayName} imageUrl={displayPhotoUri} size={82} backgroundColor={NAVY} />
              </View>
              <View style={{
                position: "absolute", bottom: 0, right: 0,
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: GREEN, alignItems: "center", justifyContent: "center",
                borderWidth: 2, borderColor: colors.background
              }}>
                <Edit3 size={11} color="#fff" />
              </View>
            </Pressable>

            {/* Stats row */}
            <View style={{ flex: 1, flexDirection: "row", gap: 0, justifyContent: "space-around", alignItems: "center", paddingTop: 8 }}>
              <Pressable style={{ alignItems: "center" }} onPress={() => router.push("/(app)/all-activities" as never)}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{posts.length}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {lang === "fr" ? "Posts" : lang === "zh" ? "帖子" : "Posts"}
                </Text>
              </Pressable>
              <Pressable
                style={{ alignItems: "center" }}
                onPress={() => router.push("/connections" as never)}
              >
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{acceptedCount}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {lang === "fr" ? "Connexions" : lang === "zh" ? "联系" : "Connections"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Name + badges row */}
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
              {displayName}
            </Text>
            {profile?.isVerified ? <VerifiedBadge type="blue" /> : null}
            {user?.isPremium ? (
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 3,
                backgroundColor: "#FEF3C7", borderRadius: 10,
                paddingHorizontal: 7, paddingVertical: 2,
                borderWidth: 1, borderColor: "#FCD34D",
              }}>
                <Crown size={10} color="#92400E" strokeWidth={2.5} />
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#92400E" }}>PRO</Text>
              </View>
            ) : null}
          </View>
          {displayHeadline ? (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 3 }}>{displayHeadline}</Text>
          ) : null}
          {/* Bio inline below name */}
          {profile?.bio ? (
            <Text
              style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: 5 }}
              numberOfLines={3}
            >
              {profile.bio}
            </Text>
          ) : null}
          {displayLocation ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <MapPin size={12} color={colors.textMuted} />
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{displayLocation}</Text>
            </View>
          ) : null}

          {/* Credits pill */}
          {user?.credits !== undefined ? (
            <Pressable
              testID="credits-pill"
              onPress={() => router.push("/buy-credits" as never)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 5,
                backgroundColor: "#EEF4FF", borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 5,
                marginTop: 8, alignSelf: "flex-start",
                borderWidth: 1, borderColor: "#C7D7FA",
              }}
            >
              <Zap size={12} color="#007AFF" fill="#007AFF" />
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#007AFF" }}>
                {user.credits} {t("profile_credits_remaining")}
              </Text>
            </Pressable>
          ) : null}

          {/* Action buttons row */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <Pressable
              testID="edit-profile-button"
              onPress={() => router.push("/edit-profile" as never)}
              style={{
                flex: 1, flexDirection: "row", alignItems: "center",
                justifyContent: "center", gap: 6, height: 38,
                borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
                backgroundColor: colors.card,
              }}
            >
              <Edit3 size={14} color={colors.text} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
                {labelEditProfile}
              </Text>
            </Pressable>
            <Pressable
              testID="open-compose-button"
              onPress={() => setShowComposeModal(true)}
              style={{
                flex: 1, flexDirection: "row", alignItems: "center",
                justifyContent: "center", gap: 6, height: 48,
                borderRadius: 10, borderWidth: 1.5, borderColor: GREEN,
                backgroundColor: GREEN,
              }}
            >
              <PlusSquare size={14} color="#FFFFFF" />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>
                {t("profile_post_btn")}
              </Text>
            </Pressable>
            <Pressable
              testID="settings-nav-button"
              onPress={() => router.push("/settings" as never)}
              style={{
                width: 38, height: 38, borderRadius: 10,
                borderWidth: 1.5, borderColor: colors.border,
                backgroundColor: colors.card,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Settings size={16} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Thin separator */}
        <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 4 }} />

        {/* Profile Completion Card */}
        {completionPct < 100 ? (
          <Pressable
            onPress={() => {
              if (incompleteItems[0]?.key === "skills") {
                router.push("/(app)/skills" as never);
              } else {
                router.push("/(app)/complete-profile" as never);
              }
            }}
            style={{
              marginHorizontal: 16,
              marginTop: 8,
              marginBottom: 4,
              backgroundColor: colors.card,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {/* Title row */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Sparkles size={15} color={GREEN} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                  {lang === "fr" ? "Complétez votre profil" : lang === "zh" ? "完善您的档案" : "Complete your profile"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: GREEN }}>{completionPct}%</Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </View>
            </View>

            {/* Progress bar */}
            <View style={{ height: 6, backgroundColor: isDark ? colors.border : "#E8EDF5", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
              <View style={{ height: 6, width: `${completionPct}%`, backgroundColor: GREEN, borderRadius: 3 }} />
            </View>

            {/* Show top 2 incomplete items with better labels */}
            {incompleteItems.slice(0, 2).map((item, idx) => {
              const label = item.key === "bio"
                ? (lang === "fr" ? "Ajoutez votre description" : lang === "zh" ? "添加个人简介" : "Add your about section")
                : item.key === "skills"
                ? (lang === "fr" ? "Ajoutez vos compétences" : lang === "zh" ? "添加技能" : "Add your skill set")
                : item.key === "experience"
                ? (lang === "fr" ? "Ajoutez une expérience" : lang === "zh" ? "添加工作经历" : "Add work experience")
                : item.key === "photo"
                ? (lang === "fr" ? "Ajoutez votre photo de profil" : lang === "zh" ? "添加头像" : "Add your profile picture")
                : item.key === "cv"
                ? (lang === "fr" ? "Ajoutez votre CV" : lang === "zh" ? "上传简历" : "Upload your CV / Resume")
                : t(item.labelKey);
              return (
                <View
                  key={item.key}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 6,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN + "80" }} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary }}>{label}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: GREEN }}>+{item.weight}%</Text>
                </View>
              );
            })}
          </Pressable>
        ) : (
          <View style={{
            marginHorizontal: 16, marginTop: 8,
            flexDirection: "row", alignItems: "center",
            backgroundColor: GREEN + "18", borderRadius: 12,
            paddingHorizontal: 14, paddingVertical: 10, gap: 8,
          }}>
            <CheckCircle2 size={18} color={GREEN} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: GREEN }}>{t("profile_complete_badge")}</Text>
          </View>
        )}

        {/* About section */}
        {profile?.bio ? (
          <View style={cardStyle}>
            <Text style={sectionHeaderStyle}>{labelAbout}</Text>
            <Text
              style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}
              numberOfLines={bioExpanded ? undefined : 3}
            >
              {profile.bio}
            </Text>
            <Pressable onPress={() => setBioExpanded((v) => !v)} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? GREEN : NAVY }}>
                {bioExpanded ? labelSeeLess : labelSeeMore}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Skills section */}
        {profile?.skills && (profile.skills as unknown[]).length > 0 ? (
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Text style={{ ...sectionHeaderStyle, marginBottom: 0 }}>
                {lang === "fr" ? "Compétences" : lang === "zh" ? "技能" : "Skills"}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>
                {(profile.skills as unknown[]).length} {lang === "fr" ? "compétences" : lang === "zh" ? "项技能" : "skills"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(profile.skills as unknown as { id: string; skillName: string }[]).map((skill) => (
                <View
                  key={skill.id}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isDark ? "rgba(0,212,110,0.10)" : "rgba(0,35,82,0.06)",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(0,212,110,0.25)" : "rgba(0,35,82,0.12)",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? GREEN : NAVY }}>{skill.skillName}</Text>
                </View>
              ))}
            </View>
            <Pressable
            onPress={() => router.push("/(app)/skills" as never)}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? GREEN : NAVY }}>
                {lang === "fr" ? "Modifier les compétences" : lang === "zh" ? "编辑技能" : "Edit skills"}
              </Text>
              <ChevronRight size={14} color={isDark ? GREEN : NAVY} strokeWidth={2.5} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push("/(app)/skills" as never)}
            style={{
              ...cardStyle,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: isDark ? "rgba(0,212,110,0.10)" : "rgba(0,35,82,0.06)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ fontSize: 20 }}>🎯</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                {lang === "fr" ? "Ajoutez vos compétences" : lang === "zh" ? "添加您的技能" : "Add your skills"}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {lang === "fr" ? "Montrez ce que vous savez faire" : lang === "zh" ? "展示您的能力" : "Show recruiters what you can do"}
              </Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>
        )}

        {/* Activity section */}
        <View style={cardStyle}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Text style={[sectionHeaderStyle, { marginBottom: 0 }]}>{labelActivity}</Text>
            <Pressable
              testID="open-compose-button-section"
              onPress={() => setShowComposeModal(true)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: pressed ? "#2e9a43" : GREEN,
                borderRadius: 10,
                paddingHorizontal: 12,
                height: 38,
                justifyContent: "center",
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>
                {labelPosts}
              </Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 }}>
            <Pressable onPress={() => router.push("/(app)/(candidate)/applications" as never)}>
              <Text style={{ fontSize: 13, color: isDark ? GREEN : NAVY, fontWeight: "600" }}>0 {labelApplications}</Text>
            </Pressable>
            <Text style={{ fontSize: 13, color: colors.textMuted }}> · </Text>
            <Pressable onPress={() => router.push("/connections" as never)}>
              <Text style={{ fontSize: 13, color: isDark ? GREEN : NAVY, fontWeight: "600" }}>{acceptedCount} {labelConnections}</Text>
            </Pressable>
          </View>

          {/* Tab row */}
          <View
            style={{
              flexDirection: "row",
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              marginBottom: 16,
            }}
          >
            {(["posts", "reposts", "comments"] as const).map((tab) => {
              const label = tab === "posts" ? labelPosts : tab === "reposts" ? labelReposts : labelComments;
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
                  {t("profile_posts_empty")}
                </Text>
              </View>
            ) : (
              sortedPosts.slice(0, 3).map((post) => (
                <Pressable key={post.id} onPress={() => router.push(`/post-detail?postId=${post.id}` as never)}>
                  <PostCard
                    post={post}
                    onPin={(p) => pinPostMutation.mutate(p.id)}
                    onDelete={handleDeletePost}
                    onLike={(p) => likePostMutation.mutate(p.id)}
                    onRepost={(p) => repostMutation.mutate(p.id)}
                    onOpenComments={(p) => {
                      setActivePostId(p.id);
                      setShowCommentsModal(true);
                    }}
                  />
                </Pressable>
              ))
            )
          ) : null}

          {/* Comments tab */}
          {activeTab === "comments" ? (
            commentedPosts.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center" }}>
                  {lang === "fr" ? "Aucun commentaire" : lang === "zh" ? "暂无评论" : "No commented posts yet"}
                </Text>
              </View>
            ) : (
              commentedPosts.slice(0, 3).map((post) => (
                <Pressable
                  key={post.id}
                  testID={`comment-tab-card-${post.id}`}
                  onPress={() => router.push(`/post-detail?postId=${post.id}` as never)}
                  style={{
                    backgroundColor: colors.background,
                    marginBottom: 10,
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: colors.text, lineHeight: 21 }} numberOfLines={3}>
                      {post.content}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
                      {timeAgo(post.createdAt)}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Heart size={13} color={post.isLikedByMe ? "#EF4444" : colors.textMuted} fill={post.isLikedByMe ? "#EF4444" : "none"} />
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{post.likeCount ?? 0}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <MessageCircle size={13} color={colors.textMuted} />
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{post.commentCount ?? 0}</Text>
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={16} color={colors.textMuted} />
                </Pressable>
              ))
            )
          ) : null}

          {/* Reposts tab */}
          {activeTab === "reposts" ? (
            repostedPosts.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center" }}>
                  {lang === "fr" ? "Aucun repartage" : lang === "zh" ? "暂无转发" : "No reposts yet"}
                </Text>
              </View>
            ) : (
              repostedPosts.slice(0, 3).map((post) => (
                <Pressable
                  key={post.id}
                  testID={`repost-tab-card-${post.id}`}
                  onPress={() => router.push(`/post-detail?postId=${post.id}` as never)}
                  style={{
                    backgroundColor: colors.background,
                    marginBottom: 10,
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 }}>
                    <Repeat2 size={13} color={GREEN} />
                    <Text style={{ fontSize: 12, color: GREEN, fontWeight: "600", flex: 1 }}>
                      {lang === "fr" ? "Repartagé" : lang === "zh" ? "已转发" : "Reposted"}
                    </Text>
                    <ChevronRight size={14} color={colors.textMuted} />
                  </View>
                  <Text style={{ fontSize: 14, color: colors.text, lineHeight: 21 }} numberOfLines={3}>
                    {post.content}
                  </Text>
                  {post.imageUrl ? (
                    <Image
                      source={{ uri: post.imageUrl }}
                      style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 8, marginTop: 8 }}
                      resizeMode="cover"
                    />
                  ) : null}
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
                    {timeAgo(post.createdAt)}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Heart size={14} color={post.isLikedByMe ? "#EF4444" : colors.textMuted} fill={post.isLikedByMe ? "#EF4444" : "none"} />
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{post.likeCount ?? 0}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <MessageCircle size={14} color={colors.textMuted} />
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{post.commentCount ?? 0}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Repeat2 size={14} color={GREEN} />
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{post.repostCount ?? 0}</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )
          ) : null}

          {/* View All Activities button */}
          <Pressable
            testID="view-all-activities-button"
            onPress={() => router.push("/(app)/all-activities" as never)}
            style={{
              marginTop: 8,
              paddingVertical: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: isDark ? GREEN : NAVY,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: isDark ? GREEN : NAVY }}>
              {lang === "fr" ? "Voir toutes les activités" : lang === "zh" ? "查看所有动态" : "View All Activities"}
            </Text>
          </Pressable>
        </View>


        {/* Who Viewed Your Profile section */}
        <View style={cardStyle}>
          {/* Section header row */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ ...sectionHeaderStyle, marginBottom: 0, flex: 1 }}>{t("profile_views_title")}</Text>
            {user?.isPremium ? (
              profileViewers.length > 0 ? (
                <View
                  style={{
                    backgroundColor: isDark ? GREEN : NAVY,
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    minWidth: 24,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>{profileViewers.length}</Text>
                </View>
              ) : null
            ) : (
              <Pressable
                onPress={() => router.push("/premium")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#D97706",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Crown size={11} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>Go Premium</Text>
              </Pressable>
            )}
          </View>

          {!user?.isPremium ? (
            // Locked state for non-premium users
            <View testID="profile-views-locked">
              {/* Blurred demo viewer rows */}
              {DEMO_PROFILE_VIEWERS.map((viewer, i) => {
                const initials = viewer.viewerName.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
                return (
                  <View
                    key={viewer.viewerId}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 10,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                      opacity: 0.35,
                    }}
                  >
                    {viewer.viewerImage ? (
                      <Image
                        source={{ uri: viewer.viewerImage }}
                        style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                        blurRadius={8}
                      />
                    ) : (
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.toggleBg, marginRight: 12, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? GREEN : NAVY }}>{initials}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ height: 13, backgroundColor: colors.toggleBg, borderRadius: 6, width: "60%" }} />
                      <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 5, width: "40%" }} />
                    </View>
                    <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 5, width: 30 }} />
                  </View>
                );
              })}

              {/* Upgrade card */}
              <View
                style={{
                  borderWidth: 1,
                  borderColor: isDark ? "#5A4500" : "#FDE68A",
                  backgroundColor: isDark ? "#2A2000" : "#FFFBEB",
                  borderRadius: 12,
                  padding: 20,
                  alignItems: "center",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                {/* Crown icon in amber circle */}
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: "#FEF3C7",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Crown size={24} color="#D97706" strokeWidth={2} />
                </View>

                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "center" }}>
                  3 People Viewed Your Profile
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19 }}>
                  Know exactly which recruiters and companies have visited your profile in the last 30 days.
                </Text>

                {/* Feature bullets */}
                {[
                  "See recruiter names & companies",
                  "Track views from the past 30 days",
                  "Know when your profile is trending",
                ].map((bullet) => (
                  <View key={bullet} style={{ flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "stretch" }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: "#FEF3C7",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Check size={13} color="#D97706" strokeWidth={2.5} />
                    </View>
                    <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>{bullet}</Text>
                  </View>
                ))}

                {/* CTA button */}
                <Pressable
                  testID="profile-views-go-premium-button"
                  onPress={() => router.push("/premium" as never)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    backgroundColor: "#D97706",
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignSelf: "stretch",
                    opacity: pressed ? 0.85 : 1,
                    marginTop: 2,
                  })}
                >
                  <Crown size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>{t("profile_go_premium")}</Text>
                </Pressable>
              </View>
            </View>
          ) : profileViewers.length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center", paddingVertical: 12 }}>
              {t("profile_views_empty")}
            </Text>
          ) : (
            profileViewers.slice(0, 10).map((viewer, index) => {
              const initials = viewer.viewerName
                .split(" ")
                .map((w) => w[0] ?? "")
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <View
                  key={viewer.viewerId}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}
                >
                  {viewer.viewerImage ? (
                    <Image
                      source={{ uri: viewer.viewerImage }}
                      style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: colors.toggleBg,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? GREEN : NAVY }}>{initials}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{viewer.viewerName}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{timeAgo(viewer.viewedAt)}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Low credit warning */}
        {/* Jobs Section */}
        <View style={{
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 12,
          padding: 18,
          backgroundColor: colors.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 }}>
            {lang === "fr" ? "Mes Candidatures & Emplois sauvegardés" : lang === "zh" ? "我的申请和收藏职位" : "My Applications & Saved Jobs"}
          </Text>

          {/* Sub-tab toggle */}
          <View style={{ flexDirection: "row", backgroundColor: colors.background, borderRadius: 10, padding: 3, marginBottom: 14 }}>
            <Pressable
              onPress={() => setJobsTab("applications")}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: "center",
                backgroundColor: jobsTab === "applications" ? colors.card : "transparent",
              }}
              testID="jobs-section-tab-applications"
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: jobsTab === "applications" ? GREEN : colors.textMuted }}>
                {lang === "fr" ? "Candidatures" : lang === "zh" ? "申请" : "Applications"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setJobsTab("saved")}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: "center",
                backgroundColor: jobsTab === "saved" ? colors.card : "transparent",
              }}
              testID="jobs-section-tab-saved"
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: jobsTab === "saved" ? GREEN : colors.textMuted }}>
                {lang === "fr" ? "Emplois sauvegardés" : lang === "zh" ? "收藏职位" : "Saved Jobs"}
              </Text>
            </Pressable>
          </View>

          {/* Applications tab */}
          {jobsTab === "applications" ? (
            <Pressable
              testID="view-applications-link"
              onPress={() => router.push("/(app)/(candidate)/applications" as never)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 16,
                backgroundColor: colors.background,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Briefcase size={18} color={GREEN} strokeWidth={2} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                  {lang === "fr" ? "Voir mes candidatures" : lang === "zh" ? "查看我的申请" : "View my applications"}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}

          {/* Saved Jobs tab */}
          {jobsTab === "saved" ? (
            savedJobIds.size === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center" }}>
                  {lang === "fr" ? "Aucun emploi sauvegardé" : lang === "zh" ? "暂无收藏职位" : "No saved jobs yet"}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {(DEMO_JOBS as unknown as { id: string; title: string; company: { companyName: string; logoColor: string; logoInitials: string }; locationCity: string; contractType: string }[])
                  .filter((j) => savedJobIds.has(j.id))
                  .map((job) => (
                    <View
                      key={job.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        backgroundColor: colors.background,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                      testID={`saved-job-card-${job.id}`}
                    >
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: job.company.logoColor + "20",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: job.company.logoColor }}>
                          {job.company.logoInitials}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }} numberOfLines={1}>
                          {job.title}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                          {job.company.companyName} · {job.locationCity}
                        </Text>
                      </View>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.border }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textSecondary }}>{job.contractType}</Text>
                      </View>
                    </View>
                  ))}
              </View>
            )
          ) : null}
        </View>

        {!user?.isPremium && (user?.credits ?? 0) <= 2 && user?.credits !== undefined ? (
          <Pressable
            testID="low-credit-warning"
            onPress={() => router.push("/buy-credits" as never)}
            style={{ marginHorizontal: 16, marginTop: 4, marginBottom: 8 }}
          >
            <View
              style={{
                backgroundColor: isDark ? "#2A2000" : "#FFF3CD",
                borderRadius: 12,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertTriangle size={16} color={isDark ? "#D4A017" : "#856404"} />
              <Text style={{ color: isDark ? "#D4A017" : "#856404", flex: 1, fontSize: 13, lineHeight: 18 }}>
                You have {user?.credits} credit{user?.credits === 1 ? "" : "s"} left. Buy more to keep applying.
              </Text>
              <Text style={{ color: "#007AFF", fontSize: 13, fontWeight: "600" }}>Buy</Text>
            </View>
          </Pressable>
        ) : null}

      </ScrollView>

      {/* Compose Modal */}
      <ComposeModal
        visible={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        onSubmit={(content, imageUri) => createPostMutation.mutate({ content, imageUri: imageUri ?? null })}
        isLoading={createPostMutation.isPending}
      />

      {/* Comments Modal */}
      {activePost ? (
        <CommentsModal
          visible={showCommentsModal}
          postId={activePost.id}
          myUserId={user?.id}
          onClose={() => {
            setShowCommentsModal(false);
            setActivePostId(null);
          }}
          onLike={() => likePostMutation.mutate(activePost.id)}
          onRepost={() => repostMutation.mutate(activePost.id)}
          post={activePost}
          queryKeyToInvalidate={["my-posts"]}
        />
      ) : null}

      {/* Phone Verification Modal */}
      <Modal
        visible={showVerifyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVerifyModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setShowVerifyModal(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
          </Pressable>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ flex: 1, fontSize: 20, fontWeight: "800", color: colors.text }}>
                {t("profile_verify_account")}
              </Text>
              <Pressable onPress={() => setShowVerifyModal(false)} style={{ padding: 4 }} hitSlop={8}>
                <X size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 24 }}>
              {t("profile_verify_desc")}
            </Text>
            <TextInput
              testID="phone-verify-input"
              value={phoneInput}
              onChangeText={setPhoneInput}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              style={{
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.toggleBg,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderWidth: 1.5,
                borderColor: colors.border,
                marginBottom: 16,
              }}
            />
            <Pressable
              testID="verify-submit-button"
              onPress={() => {
                if (phoneInput.trim()) verifyPhone.mutate(phoneInput.trim());
              }}
              disabled={!phoneInput.trim() || verifyPhone.isPending}
              style={{
                backgroundColor: phoneInput.trim() ? "#1D9BF0" : colors.border,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              {verifyPhone.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>Verify</Text>
              )}
            </Pressable>
            <Pressable
              testID="verify-cancel-button"
              onPress={() => setShowVerifyModal(false)}
              style={{ paddingVertical: 12, alignItems: "center" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "500", color: colors.textSecondary }}>{t("profile_experience_cancel")}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Post confirmation modal */}
      <Modal
        visible={!!showDeletePostModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeletePostModal(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 32 }}
          onPress={() => setShowDeletePostModal(null)}
        >
          <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 24, width: "100%", gap: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>{t("profile_delete_post")}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>Are you sure you want to delete this post?</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => setShowDeletePostModal(null)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: "center" }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{t("profile_experience_cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (showDeletePostModal) {
                    deletePostMutation.mutate(showDeletePostModal.id);
                    setShowDeletePostModal(null);
                  }
                }}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#EF4444", alignItems: "center" }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>{t("profile_experience_delete")}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Remove CV confirmation modal */}
      <Modal
        visible={showRemoveCvModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemoveCvModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 32 }}
          onPress={() => setShowRemoveCvModal(false)}
        >
          <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 24, width: "100%", gap: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>Remove CV</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>Are you sure you want to remove your CV?</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => setShowRemoveCvModal(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: "center" }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{t("profile_experience_cancel")}</Text>
              </Pressable>
              <Pressable
                testID="confirm-remove-cv-button"
                onPress={() => {
                  setShowRemoveCvModal(false);
                  removeCvMutation.mutate();
                }}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#EF4444", alignItems: "center" }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Skills Picker Modal */}
      <Modal
        visible={showSkillsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSkillsModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setShowSkillsModal(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
          </Pressable>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 36,
              maxHeight: "80%",
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                  {lang === "fr" ? "Ajoutez vos compétences" : lang === "zh" ? "添加技能" : "Add your skills"}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {lang === "fr" ? "Maximum 5 compétences" : lang === "zh" ? "最多5项技能" : "Up to 5 skills max"}
                </Text>
              </View>
              <Pressable onPress={() => setShowSkillsModal(false)} style={{ padding: 4 }} hitSlop={8}>
                <X size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Selected skills chips */}
            {selectedSkills.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, paddingTop: 12 }}>
                {selectedSkills.map((skill) => (
                  <Pressable
                    key={skill}
                    onPress={() => setSelectedSkills((prev) => prev.filter((s) => s !== skill))}
                    style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: GREEN, borderWidth: 1, borderColor: GREEN }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>{skill}</Text>
                    <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Search input */}
            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
              <TextInput
                testID="skills-search-input"
                value={skillsSearch}
                onChangeText={setSkillsSearch}
                placeholder={lang === "fr" ? "Rechercher ou saisir une compétence..." : lang === "zh" ? "搜索或输入技能..." : "Search or type a skill..."}
                placeholderTextColor={colors.textMuted}
                style={{
                  fontSize: 14,
                  color: colors.text,
                  backgroundColor: colors.toggleBg,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>

            {/* Skill chips grid */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {[
                "JavaScript", "Python", "React", "Node.js", "SQL", "Excel", "Communication",
                "Management", "Marketing", "Sales", "Design", "Accounting", "Customer Service",
                "Leadership", "Project Management", "Data Analysis", "Social Media",
                "Photoshop", "Video Editing", "Public Speaking", "Negotiation", "Teamwork",
                "Problem Solving", "Microsoft Office", "French", "English", "Arabic",
                "Driving License", "Logistics", "Security", "Teaching", "Construction",
                "Electrician", "Plumbing", "Welding", "Cooking", "Healthcare", "Nursing",
                "Retail", "Warehousing", "Cleaning", "Tailoring", "Agriculture",
              ]
                .filter((s) => !skillsSearch.trim() || s.toLowerCase().includes(skillsSearch.trim().toLowerCase()))
                .map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  const atMax = selectedSkills.length >= 5;
                  return (
                    <Pressable
                      key={skill}
                      testID={`skill-chip-${skill}`}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedSkills((prev) => prev.filter((s) => s !== skill));
                        } else if (!atMax) {
                          setSelectedSkills((prev) => [...prev, skill]);
                        }
                      }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: isSelected ? GREEN : isDark ? "rgba(0,212,110,0.10)" : "rgba(0,35,82,0.06)",
                        borderWidth: 1,
                        borderColor: isSelected ? GREEN : isDark ? "rgba(0,212,110,0.25)" : "rgba(0,35,82,0.12)",
                        opacity: !isSelected && atMax ? 0.4 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: isSelected ? "#FFFFFF" : isDark ? GREEN : NAVY }}>{skill}</Text>
                    </Pressable>
                  );
                })}
              {/* Custom skill from search */}
              {skillsSearch.trim().length > 0 && !["JavaScript","Python","React","Node.js","SQL","Excel","Communication","Management","Marketing","Sales","Design","Accounting","Customer Service","Leadership","Project Management","Data Analysis","Social Media","Photoshop","Video Editing","Public Speaking","Negotiation","Teamwork","Problem Solving","Microsoft Office","French","English","Arabic","Driving License","Logistics","Security","Teaching","Construction","Electrician","Plumbing","Welding","Cooking","Healthcare","Nursing","Retail","Warehousing","Cleaning","Tailoring","Agriculture"].some((s) => s.toLowerCase() === skillsSearch.trim().toLowerCase()) ? (
                <Pressable
                  testID="skill-chip-custom"
                  onPress={() => {
                    const trimmed = skillsSearch.trim();
                    if (!selectedSkills.includes(trimmed) && selectedSkills.length < 5) {
                      setSelectedSkills((prev) => [...prev, trimmed]);
                      setSkillsSearch("");
                    }
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isDark ? "rgba(0,212,110,0.10)" : "rgba(0,35,82,0.06)",
                    borderWidth: 1.5,
                    borderColor: GREEN,
                    borderStyle: "dashed",
                    opacity: selectedSkills.length >= 5 ? 0.4 : 1,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? GREEN : NAVY }}>+ "{skillsSearch.trim()}"</Text>
                </Pressable>
              ) : null}
            </ScrollView>

            {/* Max reached warning */}
            {selectedSkills.length >= 5 ? (
              <Text style={{ fontSize: 12, color: AMBER, textAlign: "center", paddingHorizontal: 20, paddingBottom: 8 }}>
                {lang === "fr" ? "Maximum 5 compétences atteint" : lang === "zh" ? "已达到最多5项技能" : "Maximum 5 skills reached"}
              </Text>
            ) : null}

            {/* Add button */}
            <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
              <Pressable
                testID="skills-add-button"
                onPress={() => {
                  if (selectedSkills.length > 0 && !saveSkillsMutation.isPending) {
                    saveSkillsMutation.mutate(selectedSkills);
                  }
                }}
                disabled={selectedSkills.length === 0 || saveSkillsMutation.isPending}
                style={{
                  backgroundColor: selectedSkills.length > 0 ? GREEN : colors.border,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {saveSkillsMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : null}
                <Text style={{ fontSize: 15, fontWeight: "700", color: selectedSkills.length > 0 ? "#FFFFFF" : colors.textMuted }}>
                  {lang === "fr" ? "Ajouter" : lang === "zh" ? "添加" : "Add"}{selectedSkills.length > 0 ? ` (${selectedSkills.length})` : null}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Experience Modal */}
      <Modal
        visible={showAddExpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddExpModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setShowAddExpModal(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
          </Pressable>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 40,
              maxHeight: "90%",
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 24, gap: 14 }}
            >
              {/* Header */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: colors.text }}>
                  {t("profile_add_experience")}
                </Text>
                <Pressable onPress={() => setShowAddExpModal(false)} style={{ padding: 4 }} hitSlop={8}>
                  <X size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Company */}
              <View>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
                  {t("profile_experience_company")}
                </Text>
                <TextInput
                  testID="exp-company-input"
                  value={addExpCompany}
                  onChangeText={setAddExpCompany}
                  placeholder="ex: Google, Dakar Tech..."
                  placeholderTextColor={colors.textMuted}
                  style={{
                    fontSize: 15,
                    color: colors.text,
                    backgroundColor: colors.toggleBg,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                  }}
                />
              </View>

              {/* Role */}
              <View>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
                  {t("profile_experience_role")}
                </Text>
                <TextInput
                  testID="exp-role-input"
                  value={addExpRole}
                  onChangeText={setAddExpRole}
                  placeholder="ex: Développeur Senior..."
                  placeholderTextColor={colors.textMuted}
                  style={{
                    fontSize: 15,
                    color: colors.text,
                    backgroundColor: colors.toggleBg,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                  }}
                />
              </View>

              {/* Dates row */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
                    {t("profile_experience_start")}
                  </Text>
                  <TextInput
                    testID="exp-start-input"
                    value={addExpStart}
                    onChangeText={setAddExpStart}
                    placeholder="Jan 2022"
                    placeholderTextColor={colors.textMuted}
                    style={{
                      fontSize: 14,
                      color: colors.text,
                      backgroundColor: colors.toggleBg,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderWidth: 1.5,
                      borderColor: colors.border,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
                    {t("profile_experience_end")}
                  </Text>
                  <TextInput
                    testID="exp-end-input"
                    value={addExpEnd}
                    onChangeText={setAddExpEnd}
                    placeholder={presentLabel}
                    placeholderTextColor={colors.textMuted}
                    style={{
                      fontSize: 14,
                      color: colors.text,
                      backgroundColor: colors.toggleBg,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderWidth: 1.5,
                      borderColor: colors.border,
                    }}
                  />
                </View>
              </View>

              {/* Description */}
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, flex: 1 }}>
                    {t("profile_experience_desc")}
                  </Text>
                  <Pressable
                    testID="improve-desc-button"
                    onPress={() => {
                      if (addExpDesc.length > 10 && !improveTextMutation.isPending) {
                        setAddExpIsImproving(true);
                        improveTextMutation.mutate(addExpDesc);
                      }
                    }}
                    disabled={addExpDesc.length <= 10 || improveTextMutation.isPending}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      backgroundColor: addExpDesc.length > 10 ? NAVY : colors.border,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 20,
                    }}
                  >
                    {improveTextMutation.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Sparkles size={13} color={addExpDesc.length > 10 ? "#FFFFFF" : colors.textMuted} />
                    )}
                    <Text style={{ fontSize: 12, fontWeight: "600", color: addExpDesc.length > 10 ? "#FFFFFF" : colors.textMuted }}>
                      {improveTextMutation.isPending ? t("profile_improving") : t("profile_improve_ai")}
                    </Text>
                  </Pressable>
                </View>
                <TextInput
                  testID="exp-desc-input"
                  value={addExpDesc}
                  onChangeText={(v) => setAddExpDesc(v.slice(0, 500))}
                  placeholder={t("profile_experience_desc_hint")}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={{
                    fontSize: 14,
                    color: colors.text,
                    backgroundColor: colors.toggleBg,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    minHeight: 100,
                    textAlignVertical: "top",
                  }}
                />
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: "right", marginTop: 4 }}>
                  {addExpDesc.length}/500
                </Text>
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                <Pressable
                  testID="exp-cancel-button"
                  onPress={() => setShowAddExpModal(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary }}>{t("profile_experience_cancel")}</Text>
                </Pressable>
                <Pressable
                  testID="exp-add-button"
                  onPress={() => {
                    if (addExpCompany.trim() && addExpRole.trim() && addExpStart.trim() && !addExpMutation.isPending) {
                      addExpMutation.mutate();
                    }
                  }}
                  disabled={!addExpCompany.trim() || !addExpRole.trim() || !addExpStart.trim() || addExpMutation.isPending}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 14,
                    backgroundColor: (addExpCompany.trim() && addExpRole.trim() && addExpStart.trim()) ? NAVY : colors.toggleBg,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {addExpMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : null}
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>{t("profile_experience_add_btn")}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
