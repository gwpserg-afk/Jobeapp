import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Repeat2,
  ChevronRight,
} from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import { api } from "@/lib/api/api";

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";

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

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

type Tab = "posts" | "reposts" | "comments";

export default function AllActivitiesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("posts");

  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
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

  const { data: repostedPosts = [], isLoading: repostsLoading } = useQuery<Post[]>({
    queryKey: ["my-reposts"],
    queryFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/posts/reposts`, { credentials: "include" });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data ?? []) as Post[];
    },
  });

  const { data: commentedPosts = [], isLoading: commentsLoading } = useQuery<Post[]>({
    queryKey: ["my-comments"],
    queryFn: () => api.get<Post[]>("/api/posts/my-comments"),
    staleTime: 0,
  });

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const isLoading = postsLoading || repostsLoading || commentsLoading;

  const cardBg = {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "posts", label: "Posts" },
    { key: "reposts", label: "Reposts" },
    { key: "comments", label: "Comments" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <Pressable
          testID="back-button"
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.toggleBg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, flex: 1 }}>
          My Activity
        </Text>
      </View>

      {/* Tab row */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {tabs.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <Pressable
              key={key}
              testID={`all-activity-tab-${key}`}
              onPress={() => setActiveTab(key)}
              style={{
                flex: 1,
                paddingVertical: 12,
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

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <ScrollView
          testID="all-activities-scroll"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: colors.background }}
        >
          {/* Posts tab */}
          {activeTab === "posts" ? (
            sortedPosts.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: "center" }}>
                  No posts yet
                </Text>
              </View>
            ) : (
              sortedPosts.map((post) => (
                <Pressable
                  key={post.id}
                  testID={`all-post-card-${post.id}`}
                  onPress={() => router.push(`/post-detail?postId=${post.id}` as never)}
                  style={cardBg}
                >
                  {post.isPinned ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#F59E0B" }}>Pinned</Text>
                    </View>
                  ) : null}
                  <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }} numberOfLines={4}>
                    {post.content}
                  </Text>
                  {post.imageUrl ? (
                    <Image
                      source={{ uri: post.imageUrl }}
                      style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 8, marginTop: 10 }}
                      resizeMode="cover"
                    />
                  ) : null}
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
                    {timeAgo(post.createdAt)}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 16,
                      marginTop: 10,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Heart
                        size={14}
                        color={post.isLikedByMe ? "#EF4444" : colors.textMuted}
                        fill={post.isLikedByMe ? "#EF4444" : "none"}
                      />
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

          {/* Reposts tab */}
          {activeTab === "reposts" ? (
            repostedPosts.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: "center" }}>
                  No reposts yet
                </Text>
              </View>
            ) : (
              repostedPosts.map((post) => (
                <Pressable
                  key={post.id}
                  testID={`all-repost-card-${post.id}`}
                  onPress={() => router.push(`/post-detail?postId=${post.id}` as never)}
                  style={cardBg}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 }}>
                    <Repeat2 size={13} color={GREEN} />
                    <Text style={{ fontSize: 12, color: GREEN, fontWeight: "600", flex: 1 }}>
                      Reposted
                    </Text>
                    <ChevronRight size={14} color={colors.textMuted} />
                  </View>
                  <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }} numberOfLines={4}>
                    {post.content}
                  </Text>
                  {post.imageUrl ? (
                    <Image
                      source={{ uri: post.imageUrl }}
                      style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 8, marginTop: 10 }}
                      resizeMode="cover"
                    />
                  ) : null}
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
                    {timeAgo(post.createdAt)}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 16,
                      marginTop: 10,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Heart
                        size={14}
                        color={post.isLikedByMe ? "#EF4444" : colors.textMuted}
                        fill={post.isLikedByMe ? "#EF4444" : "none"}
                      />
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

          {/* Comments tab */}
          {activeTab === "comments" ? (
            commentedPosts.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: "center" }}>
                  No commented posts yet
                </Text>
              </View>
            ) : (
              commentedPosts.map((post) => (
                <Pressable
                  key={post.id}
                  testID={`all-comment-card-${post.id}`}
                  onPress={() => router.push(`/post-detail?postId=${post.id}` as never)}
                  style={[cardBg, { flexDirection: "row", alignItems: "flex-start", gap: 10 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }} numberOfLines={4}>
                      {post.content}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
                      {timeAgo(post.createdAt)}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Heart
                          size={13}
                          color={post.isLikedByMe ? "#EF4444" : colors.textMuted}
                          fill={post.isLikedByMe ? "#EF4444" : "none"}
                        />
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
