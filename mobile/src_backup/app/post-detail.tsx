import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  ChevronLeft,
} from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { api } from "@/lib/api/api";

const GREEN = "#3BAD4E";
const NAVY = "#1B2F6E";

type CommentAuthor = {
  id: string;
  name: string;
  image: string | null;
  isVerified?: boolean;
  isGoldVerified?: boolean;
};

type PostComment = {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: CommentAuthor;
};

type PostDetail = {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  isLikedByMe: boolean;
  isRepostedByMe: boolean;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  comments: PostComment[];
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function Avatar({
  uri,
  name,
  size = 40,
}: {
  uri: string | null;
  name: string;
  size?: number;
}) {
  const { colors } = useTheme();
  const initials = name
    .split(" ")
    .map((w) => w[0] ?? "")
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
        backgroundColor: colors.toggleBg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: size * 0.33,
          fontWeight: "700",
          color: colors.primary,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const lang = useLang((s) => s.lang);
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const {
    data: post,
    isLoading,
    isError,
  } = useQuery<PostDetail>({
    queryKey: ["post-detail", postId],
    queryFn: () => api.get<PostDetail>(`/api/posts/${postId}`),
    enabled: !!postId,
    staleTime: 0,
  });

  const likeMutation = useMutation({
    mutationFn: () => api.post(`/api/posts/${postId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-detail", postId] });
    },
  });

  const repostMutation = useMutation({
    mutationFn: () => api.post(`/api/posts/${postId}/repost`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-detail", postId] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/api/posts/${postId}/comments`, { content }),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["post-detail", postId] });
    },
  });

  const isFr = lang === "fr";
  const isZh = lang === "zh";

  const labelBack = isFr ? "Retour" : isZh ? "返回" : "Back";
  const labelComments = isFr ? "Commentaires" : isZh ? "评论" : "Comments";
  const labelNoComments = isFr
    ? "Aucun commentaire"
    : isZh
    ? "暂无评论"
    : "No comments yet";
  const labelWriteComment = isFr
    ? "Écrire un commentaire..."
    : isZh
    ? "写评论..."
    : "Write a comment...";
  const labelError = isFr
    ? "Impossible de charger ce post"
    : isZh
    ? "无法加载此帖子"
    : "Unable to load this post";

  return (
    <View
      testID="post-detail-screen"
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SafeAreaView edges={["top"]} style={{ backgroundColor: NAVY }}>
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
            testID="post-detail-back"
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={8}
          >
            <X size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF", flex: 1 }}>
            Post
          </Text>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={isDark ? GREEN : NAVY} />
        </View>
      ) : isError || !post ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <Text
            style={{ fontSize: 15, color: colors.textMuted, textAlign: "center" }}
          >
            {labelError}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              marginTop: 16,
              backgroundColor: isDark ? GREEN : NAVY,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 24,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
              {labelBack}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Post card */}
          <View
            style={{
              backgroundColor: colors.card,
              marginHorizontal: 16,
              marginTop: 16,
              borderRadius: 20,
              padding: 18,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.07,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            {/* Author row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <Avatar uri={post.author.image} name={post.author.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {post.author.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {timeAgo(post.createdAt)}
                </Text>
              </View>
            </View>

            {/* Content */}
            <Text
              style={{
                fontSize: 15,
                color: colors.text,
                lineHeight: 24,
              }}
            >
              {post.content}
            </Text>

            {/* Image */}
            {post.imageUrl ? (
              <Image
                source={{ uri: post.imageUrl }}
                style={{
                  width: "100%",
                  aspectRatio: 16 / 9,
                  borderRadius: 12,
                  marginTop: 14,
                }}
                resizeMode="cover"
              />
            ) : null}

            {/* Interaction bar */}
            <View
              style={{
                flexDirection: "row",
                gap: 24,
                marginTop: 16,
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Pressable
                testID="post-detail-like"
                onPress={() => likeMutation.mutate()}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Heart
                  size={22}
                  color={post.isLikedByMe ? "#EF4444" : colors.textMuted}
                  fill={post.isLikedByMe ? "#EF4444" : "none"}
                />
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                  {post.likeCount ?? 0}
                </Text>
              </Pressable>

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <MessageCircle size={22} color={colors.textMuted} />
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                  {post.commentCount ?? 0}
                </Text>
              </View>

              <Pressable
                testID="post-detail-repost"
                onPress={() => repostMutation.mutate()}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Repeat2
                  size={22}
                  color={post.isRepostedByMe ? GREEN : colors.textMuted}
                />
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                  {post.repostCount ?? 0}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Comments section */}
          <View style={{ marginHorizontal: 16, marginTop: 20 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: isDark ? GREEN : NAVY,
                marginBottom: 14,
              }}
            >
              {labelComments}
            </Text>

            {/* Comment input */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                gap: 10,
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
              }}
            >
              <TextInput
                testID="post-detail-comment-input"
                value={commentText}
                onChangeText={setCommentText}
                placeholder={labelWriteComment}
                placeholderTextColor={colors.textMuted}
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: colors.text,
                  minHeight: 36,
                  maxHeight: 100,
                  textAlignVertical: "top",
                }}
                multiline
              />
              <Pressable
                testID="post-detail-send-comment"
                onPress={() => {
                  if (!commentText.trim() || commentMutation.isPending) return;
                  commentMutation.mutate(commentText.trim());
                }}
                disabled={!commentText.trim() || commentMutation.isPending}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: commentText.trim()
                    ? isDark
                      ? GREEN
                      : NAVY
                    : colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {commentMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send
                    size={16}
                    color={commentText.trim() ? "#FFFFFF" : colors.textMuted}
                  />
                )}
              </Pressable>
            </View>

            {/* Comments list */}
            {post.comments.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ fontSize: 14, color: colors.textMuted }}>
                  {labelNoComments}
                </Text>
              </View>
            ) : (
              post.comments.map((comment) => (
                <View
                  key={comment.id}
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    backgroundColor: colors.card,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <Avatar
                    uri={comment.author.image}
                    name={comment.author.name}
                    size={36}
                  />
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: colors.text,
                        }}
                      >
                        {comment.author.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        {timeAgo(comment.createdAt)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                        lineHeight: 21,
                      }}
                    >
                      {comment.content}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
