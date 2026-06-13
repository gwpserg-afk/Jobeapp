import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Animated,
  Image,
  Modal,
  ActivityIndicator,
  FlatList,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bell,
  Search,
  MapPin,
  Briefcase,
  Clock,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
  Heart,
  MessageCircle,
  Send,
  Plus,
  CheckCircle2,
  Users,
  Languages,
  Globe,
  UserCheck,
  Zap,
  X,
  Sparkles,
  ChevronRight,
  MoreVertical,
  Repeat2,
  Flag,
  Trash2,
  Building2,
  Crown,
  Check,
} from "lucide-react-native";
import { DEMO_POSTS, DemoJob, CANDIDATE_HEADLINE_KEYS, POST_CAPTION_TRANSLATED_KEYS, DEMO_CANDIDATES, DEMO_JOBS } from "../../../lib/demoData";
import { useDemoStore } from "../../../lib/demoStore";
import { showToast } from "../../../lib/toast";
import { useLang, type TranslationKey } from "../../../lib/i18n";
import { UserAvatar } from "@/components/UserAvatar";
import { useUserWithProfile } from "@/lib/hooks/useUser";
import { useTheme } from "@/lib/theme";
import { CandidateProfileModal, type DemoCandidate } from "@/components/CandidateProfileModal";
import { JobDetailModal } from "@/components/JobDetailModal";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import type { UserMe } from "@/types";
import { USER_ME_QUERY_KEY } from "@/lib/hooks/useUser";

// Backend job type matching /api/jobs response
interface BackendJob {
  id: string;
  title: string;
  contractType: string;
  workMode: string;
  locationCity: string;
  locationNeighborhood: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable: boolean;
  isBoosted: boolean;
  isUrgent: boolean;
  createdAt: string;
  description: string;
  requiredSkills?: { skillName: string; isRequired: boolean }[];
  company: {
    id: string;
    companyName: string;
    logoUrl: string | null;
    sector: string | null;
    isVerified: boolean;
  };
  _count: { applications: number };
  applicantCount?: number | null;
}

// Feed post types
interface FeedPost {
  id: string;
  content: string;
  captionEn?: string; // English translation for demo posts
  imageUrl: string | null;
  isPinned: boolean;
  isBoosted?: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  isLikedByMe: boolean;
  isRepostedByMe: boolean;
  isDemo?: boolean; // true for demo posts
  user: {
    id: string;
    name: string;
    image: string | null;
    accountType: string;
    isVerified: boolean;
    isGoldVerified: boolean;
    isPremium?: boolean;
  };
}

interface FeedComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    isVerified: boolean;
    isGoldVerified: boolean;
    isPremium?: boolean;
  };
}

// Color palette for company logos (derived from name)
const LOGO_COLORS = ["#1B2F6E","#3BAD4E","#E74C3C","#9B59B6","#E67E22","#16A085","#2980B9","#8E44AD","#C0392B","#27AE60"];
function getLogoColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length] ?? "#1B2F6E";
}
function getLogoInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function backendJobToDemoJob(job: BackendJob): DemoJob {
  const logoColor = getLogoColor(job.company.companyName);
  const logoInitials = getLogoInitials(job.company.companyName);
  return {
    ...job,
    latitude: null as unknown as number,
    longitude: null as unknown as number,
    isActive: true,
    applicantsCount: job.applicantCount ?? -1,
    viewCount: 0,
    requiredSkills: (job.requiredSkills ?? []).map((s) => s.skillName),
    companyId: job.company.id,
    company: {
      id: job.company.id,
      companyName: job.company.companyName,
      isVerified: job.company.isVerified,
      logoInitials,
      logoColor,
    },
  } as unknown as DemoJob;
}

const PRIMARY = "#1B2F6E";
const GREEN = "#3BAD4E";

// Map demo posts to FeedPost format for demo fallback
const DEMO_FEED_POSTS: FeedPost[] = DEMO_POSTS.map((p) => ({
  id: p.id,
  content: (p as any).captionFr ?? p.caption,
  captionEn: (p as any).captionEn ?? undefined,
  imageUrl: ((p as any).images?.[0] as string | undefined) ?? null,
  isPinned: false,
  isBoosted: false,
  createdAt: p.createdAt,
  likeCount: p.likes,
  commentCount: p.comments,
  repostCount: 0,
  isLikedByMe: p.isLiked,
  isRepostedByMe: false,
  isDemo: true,
  user: {
    id: (p.author as any).userId || p.author.id,
    name: p.author.fullName,
    image: ((p.author as any).avatarUri as string | undefined) ?? null,
    accountType: (p as any).isCompany ? "recruiter" : "candidate",
    isVerified: false,
    isGoldVerified: false,
  },
}));

const CONTRACT_COLORS: Record<string, string> = {
  CDI: "#27AE60",
  CDD: "#3498DB",
  Stage: "#F39C12",
  Freelance: "#9B59B6",
};

function formatSalary(
  min?: number | null,
  max?: number | null,
  negotiable?: boolean,
  t?: (key: TranslationKey) => string
) {
  const negotiableText = t ? t("search_negotiable") : "Negotiable";
  if (negotiable || (!min && !max)) return negotiableText;
  const fmt = (n: number) => (n / 1000).toFixed(0) + "k FCFA";
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return fmt(min);
  if (max) return fmt(max);
  return negotiableText;
}

function getRelativeTime(iso: string, t?: (key: TranslationKey) => string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return t ? t("search_just_now") : "Just now";
  if (hours < 24) return t ? t("search_hours_ago").replace("{n}", String(hours)) : `${hours}h ago`;
  if (days === 1) return t ? t("search_yesterday") : "Yesterday";
  if (days < 7) return t ? t("search_days_ago").replace("{n}", String(days)) : `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return t ? t("search_days_ago").replace("{n}", String(days)) : `${weeks}w ago`;
}

function JobCard({
  job,
  onPress,
  onMoreInfo,
  t,
}: {
  job: DemoJob;
  onPress: () => void;
  onMoreInfo: () => void;
  t: (key: TranslationKey) => string;
}) {
  const savedJobIds = useDemoStore((s) => s.savedJobIds);
  const toggleSaveJob = useDemoStore((s) => s.toggleSaveJob);
  const isSaved = savedJobIds.has(job.id);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const contractColor = CONTRACT_COLORS[job.contractType] ?? "#6B7280";
  const { colors } = useTheme();

  const handleSave = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.3,
        useNativeDriver: true,
        tension: 100,
      }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    toggleSaveJob(job.id);
    showToast(
      isSaved ? t("search_removed_favorites") : t("search_saved"),
      isSaved ? "info" : "success"
    );
  };

  return (
    <View
      style={{ flexDirection: "row", backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 }}
      testID={`job-card-${job.id}`}
    >
      <View style={{ width: 4, backgroundColor: contractColor }} />
      <View style={{ flex: 1, padding: 14, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: job.company.logoColor + "20",
            }}
          >
            <Text
              style={{ fontSize: 14, fontWeight: "800", color: job.company.logoColor }}
            >
              {job.company.logoInitials}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary }} numberOfLines={1}>
              {job.title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{job.company.companyName}</Text>
              {job.company.isVerified ? (
                <CheckCircle2
                  size={12}
                  color={colors.accent}
                  style={{ marginLeft: 3 }}
                />
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              onPress={onMoreInfo}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID={`more-info-${job.id}`}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.primary }}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID={`save-job-${job.id}`}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                {isSaved ? (
                  <BookmarkCheck size={20} color={colors.accent} />
                ) : (
                  <Bookmark size={20} color={colors.textMuted} />
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MapPin size={12} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              {job.locationCity}
              {job.locationNeighborhood ? `, ${job.locationNeighborhood}` : ""}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Briefcase size={12} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: contractColor }}>
              {job.contractType}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{getRelativeTime(job.createdAt, t)}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.accent }}>
            {formatSalary(job.salaryMin, job.salaryMax, job.salaryNegotiable, t)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {job.isUrgent ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.urgentBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                <AlertCircle size={10} color={colors.urgentText} />
                <Text style={{ fontSize: 10, color: colors.urgentText, fontWeight: "700" }}>URGENT</Text>
              </View>
            ) : null}
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              {(job.applicantsCount ?? -1) >= 0 ? `${job.applicantsCount} ${t("home_candidates")}` : null}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function PostCard({ post, t }: { post: (typeof DEMO_POSTS)[0]; t: (key: TranslationKey) => string }) {
  const toggleLike = useDemoStore((s) => s.toggleLike);
  const toggleRepost = useDemoStore((s) => s.toggleRepost);
  const addComment = useDemoStore((s) => s.addComment);
  const posts = useDemoStore((s) => s.posts);
  const router = useRouter();
  const { colors } = useTheme();
  const currentPost = posts.find((p) => p.id === post.id) ?? post;
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const heartAnim = useRef(new Animated.Value(1)).current;
  const repostAnim = useRef(new Animated.Value(1)).current;

  // Translate author headline using candidate headline keys
  const authorId = currentPost.author.id;
  const headlineKey = authorId ? CANDIDATE_HEADLINE_KEYS[authorId] : undefined;
  const translatedHeadline = headlineKey ? t(headlineKey) : (currentPost.author.headline || currentPost.author.fullName);

  // Get translated caption if available
  const translatedCaptionKey = POST_CAPTION_TRANSLATED_KEYS[currentPost.id];
  const translatedCaption = translatedCaptionKey ? t(translatedCaptionKey) : currentPost.caption;
  const displayCaption = showTranslation ? translatedCaption : currentPost.caption;
  const hasTranslation = translatedCaptionKey != null;

  const handleLike = () => {
    Animated.sequence([
      Animated.spring(heartAnim, {
        toValue: 1.4,
        useNativeDriver: true,
        tension: 100,
      }),
      Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    toggleLike(post.id);
  };

  const handleRepost = () => {
    Animated.sequence([
      Animated.spring(repostAnim, {
        toValue: 1.4,
        useNativeDriver: true,
        tension: 100,
      }),
      Animated.spring(repostAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    toggleRepost(post.id);
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    addComment(post.id, commentText.trim());
    setCommentText("");
  };

  const navigateToMessages = () => {
    router.push({
      pathname: "/(app)/(candidate)/messages",
    } as never);
  };

  return (
    <View style={{ backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }} testID={`post-card-${post.id}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <TouchableOpacity
          onPress={navigateToMessages}
          activeOpacity={0.7}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: currentPost.author.avatarColor,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
              {currentPost.author.initials}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={navigateToMessages}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary }}>{currentPost.author.fullName}</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{translatedHeadline}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>
          {getRelativeTime(currentPost.createdAt, t)}
        </Text>
      </View>

      <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 10 }}>{displayCaption}</Text>

      {hasTranslation ? (
        <TouchableOpacity
          onPress={() => setShowTranslation(!showTranslation)}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8, paddingVertical: 2 }}
          activeOpacity={0.7}
          testID={`translate-post-${post.id}`}
        >
          <Languages size={13} color={colors.textSecondary} />
          <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "500" }}>
            {showTranslation ? t("feed_show_original") : t("feed_translate")}
          </Text>
        </TouchableOpacity>
      ) : null}

      {(currentPost.images as string[]).length > 0 && (
        <View style={{ marginBottom: 10 }}>
          {(currentPost.images as string[]).length === 1 ? (
            (currentPost.images as string[])[0] && ((currentPost.images as string[])[0].startsWith("http") || (currentPost.images as string[])[0].startsWith("file")) ? (
              <Image
                source={{ uri: (currentPost.images as string[])[0] }}
                style={{ width: "100%", height: 200, borderRadius: 12, backgroundColor: colors.placeholder }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ backgroundColor: colors.placeholder, borderRadius: 12, height: 140, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <Text style={{ fontSize: 14, color: colors.textMuted }}>
                  {`Image: ${(currentPost.images as string[])[0]}`}
                </Text>
              </View>
            )
          ) : (currentPost.images as string[]).length === 2 ? (
            <View style={{ flexDirection: "row", gap: 4, height: 200 }}>
              {(currentPost.images as string[]).map((img, idx) => (
                img && (img.startsWith("http") || img.startsWith("file")) ? (
                  <Image
                    key={idx}
                    source={{ uri: img }}
                    style={{ flex: 1, borderRadius: 12, backgroundColor: colors.placeholder }}
                    resizeMode="cover"
                  />
                ) : (
                  <View key={idx} style={{ flex: 1, backgroundColor: colors.placeholder, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 14, color: colors.textMuted }}>{img}</Text>
                  </View>
                )
              ))}
            </View>
          ) : (currentPost.images as string[]).length === 3 ? (
            <View style={{ flexDirection: "row", gap: 4, height: 200 }}>
              {(currentPost.images as string[])[0] && ((currentPost.images as string[])[0].startsWith("http") || (currentPost.images as string[])[0].startsWith("file")) ? (
                <Image
                  source={{ uri: (currentPost.images as string[])[0] }}
                  style={{ flex: 1, borderRadius: 12, backgroundColor: colors.placeholder }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ flex: 1, backgroundColor: colors.placeholder, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 14, color: colors.textMuted }}>{(currentPost.images as string[])[0]}</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                {(currentPost.images as string[]).slice(1).map((img, idx) => (
                  img.startsWith("http") || img.startsWith("file") ? (
                    <Image
                      key={idx}
                      source={{ uri: img }}
                      style={{ flex: 1, borderRadius: 12, backgroundColor: colors.placeholder }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View key={idx} style={{ flex: 1, backgroundColor: colors.placeholder, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 14, color: colors.textMuted }}>{img}</Text>
                    </View>
                  )
                ))}
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
              {(currentPost.images as string[]).slice(0, 4).map((img, idx) => (
                img && (img.startsWith("http") || img.startsWith("file")) ? (
                  <Image
                    key={idx}
                    source={{ uri: img }}
                    style={{ width: "48.5%", height: 120, borderRadius: 12, backgroundColor: colors.placeholder }}
                    resizeMode="cover"
                  />
                ) : (
                  <View key={idx} style={{ width: "48.5%", height: 120, backgroundColor: colors.placeholder, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 14, color: colors.textMuted }}>{img}</Text>
                  </View>
                )
              ))}
            </View>
          )}
        </View>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
          onPress={handleLike}
          testID={`like-post-${post.id}`}
        >
          <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
            <Heart
              size={18}
              color={currentPost.isLiked ? '#FF3B30' : colors.textMuted}
              fill={currentPost.isLiked ? '#FF3B30' : "none"}
            />
          </Animated.View>
          <Text
            style={{
              fontSize: 13,
              color: currentPost.isLiked ? '#FF3B30' : colors.textMuted,
              fontWeight: "500",
            }}
          >
            {currentPost.likes}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
          onPress={handleRepost}
          testID={`repost-post-${post.id}`}
        >
          <Animated.View style={{ transform: [{ scale: repostAnim }] }}>
            <Repeat2
              size={18}
              color={currentPost.isReposted ? '#00C853' : colors.textMuted}
            />
          </Animated.View>
          <Text
            style={{
              fontSize: 13,
              color: currentPost.isReposted ? '#00C853' : colors.textMuted,
              fontWeight: "500",
            }}
          >
            {currentPost.reposts}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
          onPress={() => setShowComments(!showComments)}
          testID={`comment-toggle-${post.id}`}
        >
          <MessageCircle size={18} color={colors.textMuted} />
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "500" }}>{currentPost.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
          onPress={navigateToMessages}
          testID={`contact-post-${post.id}`}
        >
          <Send size={18} color={colors.textMuted} />
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "500" }}>{t("home_contact")}</Text>
        </TouchableOpacity>
      </View>

      {showComments ? (
        <View style={{ marginTop: 10, gap: 6 }}>
          {currentPost.commentsList.slice(0, 3).map((c) => (
            <View key={c.id} style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>{c.author}</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}> {c.text}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.placeholder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 4 }}>
            <TextInput
              style={{ flex: 1, fontSize: 14, color: colors.primary }}
              placeholder={t("home_add_comment_placeholder")}
              placeholderTextColor={colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              onSubmitEditing={handleSendComment}
              returnKeyType="send"
              testID={`comment-input-${post.id}`}
            />
            <TouchableOpacity
              onPress={handleSendComment}
              testID={`comment-send-${post.id}`}
            >
              <Send
                size={18}
                color={commentText.trim() ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ─── Recommended For You ─────────────────────────────────────────────────────

type RecommendedJob = {
  id: string;
  title: string;
  contractType: string;
  locationCity: string | null;
  workMode: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable: boolean;
  isUrgent: boolean;
  company: {
    id: string;
    companyName: string;
    logoUrl: string | null;
    sector: string | null;
    isVerified: boolean;
  };
};

type RecommendationsResponse = {
  jobs: RecommendedJob[];
  reasons: Record<string, string>;
};

const CONTRACT_BG: Record<string, string> = {
  CDI: "#DCFCE7",
  CDD: "#DBEAFE",
  Stage: "#FEF3C7",
  Freelance: "#F3E8FF",
};
const CONTRACT_TEXT: Record<string, string> = {
  CDI: "#166534",
  CDD: "#1E40AF",
  Stage: "#92400E",
  Freelance: "#7C3AED",
};

function RecommendedJobCard({
  job,
  reason,
  onPress,
}: {
  job: RecommendedJob;
  reason: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const initials = job.company.companyName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const bgColor = CONTRACT_BG[job.contractType] ?? "#F3F4F6";
  const textColor = CONTRACT_TEXT[job.contractType] ?? "#374151";

  return (
    <TouchableOpacity
      testID={`recommended-job-${job.id}`}
      onPress={onPress}
      activeOpacity={0.82}
      style={{
        width: 220,
        backgroundColor: colors.card,
        borderRadius: 18,
        padding: 14,
        marginRight: 12,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      {/* Company logo row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.placeholder,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.primary }}>
            {initials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "500" }}
            numberOfLines={1}
          >
            {job.company.companyName}
          </Text>
          {job.company.isVerified ? (
            <Text style={{ fontSize: 10, color: colors.accent, fontWeight: "600" }}>
              Vérifié ✓
            </Text>
          ) : null}
        </View>
        {job.isUrgent ? (
          <View
            style={{
              backgroundColor: colors.urgentBg,
              borderRadius: 5,
              paddingHorizontal: 5,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: "800", color: colors.urgentText }}>
              URGENT
            </Text>
          </View>
        ) : null}
      </View>

      {/* Title */}
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 6,
          lineHeight: 19,
        }}
        numberOfLines={2}
      >
        {job.title}
      </Text>

      {/* Location */}
      {job.locationCity ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 8 }}>
          <MapPin size={11} color={colors.textMuted} strokeWidth={2} />
          <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
            {job.locationCity}
          </Text>
        </View>
      ) : null}

      {/* Contract type pill */}
      <View style={{ flexDirection: "row", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
        <View
          style={{
            backgroundColor: bgColor,
            borderRadius: 20,
            paddingHorizontal: 7,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "700", color: textColor }}>
            {job.contractType}
          </Text>
        </View>
        {job.workMode ? (
          <View
            style={{
              backgroundColor: colors.border,
              borderRadius: 20,
              paddingHorizontal: 7,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "600", color: colors.textSecondary }}>
              {job.workMode === "remote"
                ? "Télétravail"
                : job.workMode === "hybrid"
                ? "Hybride"
                : "Présentiel"}
            </Text>
          </View>
        ) : null}
      </View>

      {/* AI match reason */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          backgroundColor: colors.placeholder,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 5,
        }}
      >
        <Sparkles size={11} color={colors.primary} strokeWidth={2.5} />
        <Text
          style={{ fontSize: 11, color: colors.primary, fontWeight: "600", flex: 1 }}
          numberOfLines={1}
        >
          {reason}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function RecommendedSection({ onJobPress }: { onJobPress: (jobId: string) => void }) {
  const t = useLang((s) => s.t);
  const { colors } = useTheme();
  const { data, isLoading } = useQuery({
    queryKey: ["job-recommendations"],
    queryFn: () => api.get<RecommendationsResponse>("/api/jobs/recommendations"),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const jobs = data?.jobs ?? [];
  const reasons = data?.reasons ?? {};

  // Don't render if no data and not loading
  if (!isLoading && jobs.length === 0) return null;

  return (
    <View style={{ marginBottom: 4 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 10,
          gap: 6,
        }}
      >
        <Sparkles size={16} color={colors.primary} strokeWidth={2.5} />
        <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text, flex: 1 }}>
          {t("home_recommended")}
        </Text>
        <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
      </View>

      {/* Horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 6 }}
        testID="recommended-jobs-scroll"
        style={{ flexGrow: 0 }}
      >
        {isLoading ? (
          // Skeleton placeholders
          [0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: 220,
                height: 172,
                backgroundColor: colors.border,
                borderRadius: 18,
                marginRight: 12,
                opacity: 0.5 + i * 0.15,
              }}
            />
          ))
        ) : (
          jobs.map((job) => (
            <RecommendedJobCard
              key={job.id}
              job={job}
              reason={reasons[job.id] ?? "Correspond à votre profil"}
              onPress={() => onJobPress(job.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Divider */}
      <View
        style={{
          height: 1,
          backgroundColor: colors.border,
          marginHorizontal: 16,
          marginTop: 6,
        }}
      />
    </View>
  );
}

function getSimpleRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function FeedPostCard({
  post,
  currentUserId,
  comments,
  isExpanded,
  onLike,
  onRepost,
  onDelete,
  onReport,
  onToggleComments,
  onAddComment,
  onPressAuthor,
  t,
  colors,
}: {
  post: FeedPost;
  currentUserId: string | undefined;
  comments: FeedComment[];
  isExpanded: boolean;
  onLike: () => void;
  onRepost: () => void;
  onDelete: () => void;
  onReport: (type: "post" | "profile_image") => void;
  onToggleComments: () => void;
  onAddComment: (text: string) => void;
  onPressAuthor: () => void;
  t: (key: import("../../../lib/i18n").TranslationKey) => string;
  colors: import("../../../lib/theme").ThemeColors;
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [localCommentText, setLocalCommentText] = useState("");
  const [translatedComments, setTranslatedComments] = useState<Record<string, string>>({});
  const [translatingCommentId, setTranslatingCommentId] = useState<string | null>(null);
  const { isDark } = useTheme();

  const translateComment = async (commentId: string, text: string) => {
    if (translatedComments[commentId]) {
      setTranslatedComments(prev => { const n = {...prev}; delete n[commentId]; return n; });
      return;
    }
    setTranslatingCommentId(commentId);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/messages/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text, targetLang: 'en' }),
      });
      const data = await res.json();
      if (data?.data?.translated) {
        setTranslatedComments(prev => ({ ...prev, [commentId]: data.data.translated }));
      }
    } catch (e) {
      // silently fail
    } finally {
      setTranslatingCommentId(null);
    }
  };
  const heartAnim = useRef(new Animated.Value(1)).current;
  const isOwnPost = currentUserId === post.user.id;

  const handleLike = () => {
    Animated.sequence([
      Animated.spring(heartAnim, { toValue: 1.4, useNativeDriver: true, tension: 100 }),
      Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onLike();
  };

  const displayContent = isTranslated && post.captionEn ? post.captionEn : post.content;
  const hasTranslation = !!(post.captionEn && post.captionEn !== post.content);

  const displayComments = [...comments].sort((a, b) => {
    if (a.author.isVerified === b.author.isVerified) return 0;
    return a.author.isVerified ? -1 : 1;
  });

  const authorInitial = post.user.name.trim().charAt(0).toUpperCase();
  const AVATAR_COLORS = ["#1B2F6E","#3BAD4E","#E74C3C","#9B59B6","#E67E22","#16A085"];
  let hash = 0;
  for (let i = 0; i < post.user.id.length; i++) hash = post.user.id.charCodeAt(i) + ((hash << 5) - hash);
  const avatarBg = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? "#1B2F6E";

  return (
    <View
      style={{
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
      testID={`feed-post-card-${post.id}`}
    >
      {/* Header row */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 10 }}>
        <TouchableOpacity onPress={onPressAuthor} activeOpacity={0.8} testID={`post-author-avatar-${post.id}`}>
          {post.user.image ? (
            <Image
              source={{ uri: post.user.image }}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: avatarBg, marginRight: 10 }}
            />
          ) : (
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: avatarBg,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{authorInitial}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={onPressAuthor} activeOpacity={0.8} testID={`post-author-name-${post.id}`}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{post.user.name}</Text>
              {post.user.isGoldVerified ? (
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#F5A623', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>
                  <Check size={11} color="#fff" strokeWidth={3} />
                </View>
              ) : post.user.isVerified && post.user.accountType !== 'recruiter' ? (
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#1D9BF0', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>
                  <Check size={11} color="#fff" strokeWidth={3} />
                </View>
              ) : post.user.isVerified && post.user.accountType === 'recruiter' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF8C00', borderRadius: 9, paddingHorizontal: 5, paddingVertical: 2, marginLeft: 2, gap: 2 }}>
                  <Building2 size={9} color="#fff" strokeWidth={2.5} />
                  <Check size={9} color="#fff" strokeWidth={3} />
                </View>
              ) : null}
              {post.user.isPremium ? (
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#3BAD4E', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>
                  <Crown size={11} color="#fff" strokeWidth={2} />
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{post.user.accountType}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>·</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{getSimpleRelativeTime(post.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        </View>
        {/* Three-dot menu */}
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID={`post-menu-${post.id}`}
        >
          <MoreVertical size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Boosted label */}
      {post.isBoosted ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <View style={{
            backgroundColor: isDark ? '#2A1F00' : '#FFF3CD',
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 3,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            alignSelf: 'flex-start',
          }}>
            <Zap size={10} color="#D97706" />
            <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '600' }}>Mis en avant</Text>
          </View>
        </View>
      ) : null}

      {/* Content */}
      <Text style={{ fontSize: 14, color: colors.text, lineHeight: 21, marginBottom: hasTranslation ? 6 : 10 }}>
        {displayContent}
      </Text>

      {/* Translate button */}
      {hasTranslation ? (
        <TouchableOpacity
          onPress={() => setIsTranslated(!isTranslated)}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10, paddingVertical: 2 }}
          activeOpacity={0.7}
          testID={`translate-feed-post-${post.id}`}
        >
          <Globe size={13} color={isTranslated ? "#3B82F6" : colors.textMuted} />
          <Text style={{ fontSize: 12, color: isTranslated ? "#3B82F6" : colors.textMuted, fontWeight: "500" }}>
            {isTranslated ? t("feed_show_original") : t("feed_translate")}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Image */}
      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={{
            width: "100%",
            aspectRatio: 16 / 9,
            borderRadius: 10,
            marginBottom: 10,
            backgroundColor: colors.border,
          }}
          resizeMode="cover"
        />
      ) : null}

      {/* Action row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 20,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
          onPress={handleLike}
          testID={`like-feed-post-${post.id}`}
        >
          <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
            <Heart
              size={18}
              color={post.isLikedByMe ? colors.urgentText : colors.textMuted}
              fill={post.isLikedByMe ? colors.urgentText : "none"}
            />
          </Animated.View>
          <Text style={{ fontSize: 13, color: post.isLikedByMe ? colors.urgentText : colors.textMuted, fontWeight: "500" }}>
            {post.likeCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
          onPress={onToggleComments}
          testID={`comment-feed-post-${post.id}`}
        >
          <MessageCircle size={18} color={colors.textMuted} />
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "500" }}>{post.commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
          onPress={onRepost}
          testID={`repost-feed-post-${post.id}`}
        >
          <Repeat2
            size={18}
            color={post.isRepostedByMe ? colors.accent : colors.textMuted}
          />
          <Text style={{ fontSize: 13, color: post.isRepostedByMe ? colors.accent : colors.textMuted, fontWeight: "500" }}>
            {post.repostCount}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comments section */}
      {isExpanded ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          {comments.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: "center", paddingVertical: 8 }}>
              {t("feed_comments_empty")}
            </Text>
          ) : (
            displayComments.map((c) => {
              const cInitial = c.author.name.trim().charAt(0).toUpperCase();
              let cHash = 0;
              for (let i = 0; i < c.author.id.length; i++) cHash = c.author.id.charCodeAt(i) + ((cHash << 5) - cHash);
              const cBg = AVATAR_COLORS[Math.abs(cHash) % AVATAR_COLORS.length] ?? "#1B2F6E";
              return (
                <View key={c.id} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  {c.author.image ? (
                    <Image source={{ uri: c.author.image }} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: cBg }} />
                  ) : (
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: cBg, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{cInitial}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>{c.author.name}</Text>
                      {c.author.isGoldVerified ? (
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#F5A623', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={9} color="#fff" strokeWidth={3} />
                        </View>
                      ) : c.author.isVerified ? (
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#1D9BF0', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={9} color="#fff" strokeWidth={3} />
                        </View>
                      ) : null}
                      {c.author.isPremium ? (
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#3BAD4E', alignItems: 'center', justifyContent: 'center' }}>
                          <Crown size={9} color="#fff" strokeWidth={2} />
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>
                      {translatedComments[c.id] ?? c.content}
                    </Text>
                    <TouchableOpacity
                      onPress={() => translateComment(c.id, c.content)}
                      style={{ marginTop: 2 }}
                    >
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '500' }}>
                        {translatingCommentId === c.id
                          ? 'Translating...'
                          : translatedComments[c.id]
                            ? 'Show original'
                            : 'Translate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          {/* Comment input */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: colors.background,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginTop: 4,
            }}
          >
            <TextInput
              style={{ flex: 1, fontSize: 14, color: colors.text }}
              placeholder={t("feed_comment_placeholder")}
              placeholderTextColor={colors.textMuted}
              value={localCommentText}
              onChangeText={setLocalCommentText}
              onSubmitEditing={() => {
                if (!localCommentText.trim()) return;
                onAddComment(localCommentText.trim());
                setLocalCommentText("");
              }}
              returnKeyType="send"
              testID={`feed-comment-input-${post.id}`}
            />
            <TouchableOpacity
              onPress={() => {
                if (!localCommentText.trim()) return;
                onAddComment(localCommentText.trim());
                setLocalCommentText("");
              }}
              testID={`feed-comment-send-${post.id}`}
            >
              <Send size={18} color={localCommentText.trim() ? colors.primary : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Three-dot menu modal */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 36,
              gap: 4,
            }}
          >
            <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}
              onPress={() => {
                setMenuVisible(false);
                onReport("post");
              }}
              testID={`report-post-${post.id}`}
            >
              <Flag size={20} color={colors.urgentText} />
              <Text style={{ fontSize: 15, color: colors.urgentText, fontWeight: "600" }}>{t("feed_report_post")}</Text>
            </TouchableOpacity>
            {isOwnPost ? (
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}
                onPress={() => {
                  setMenuVisible(false);
                  onDelete();
                }}
                testID={`delete-post-${post.id}`}
              >
                <Trash2 size={20} color={colors.urgentText} />
                <Text style={{ fontSize: 15, color: colors.urgentText, fontWeight: "600" }}>{t("feed_delete_post")}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}
              onPress={() => setMenuVisible(false)}
            >
              <X size={20} color={colors.textMuted} />
              <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "500" }}>{t("settings_cancel")}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── People You May Know ──────────────────────────────────────────────────────

function PeopleYouMayKnow() {
  const { colors, isDark } = useTheme();
  const connections = useDemoStore((s) => s.connections);
  const router = useRouter();
  const t = useLang((s) => s.t);
  const candidates = DEMO_CANDIDATES.slice(0, 5);

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 10 }}>
        {t("home_people_you_may_know")}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
        style={{ flexGrow: 0 }}
      >
        {candidates.map((candidate) => {
          const hasSent = connections.some(
            (c) => c.candidate.id === candidate.id && (c.status === "pending_sent" || c.status === "accepted")
          );
          return (
            <TouchableOpacity
              key={candidate.id}
              activeOpacity={0.85}
              testID={`people-suggest-${candidate.id}`}
              onPress={() =>
                router.push({
                  pathname: "/(app)/profile-view",
                  params: { userId: candidate.userId, type: "candidate" },
                } as never)
              }
              style={{
                width: 150,
                backgroundColor: colors.card,
                borderRadius: 12,
                padding: 12,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.07,
                shadowRadius: 6,
                elevation: 2,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: candidate.avatarColor,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                  {candidate.initials}
                </Text>
              </View>
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 2 }}
                numberOfLines={1}
              >
                {candidate.fullName}
              </Text>
              <Text
                style={{ fontSize: 11, color: colors.textSecondary, textAlign: "center", marginBottom: 4 }}
                numberOfLines={2}
              >
                {candidate.headline}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 10 }}>
                <MapPin size={10} color={colors.textMuted} />
                <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
                  {candidate.city}
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: hasSent ? colors.border : GREEN,
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  alignSelf: "stretch",
                  alignItems: "center",
                }}
                onPress={() => {
                  if (!hasSent) {
                    useDemoStore.getState().addConnection(candidate);
                    showToast(`Demande envoyée à ${candidate.fullName}`, "success");
                  }
                }}
                testID={`people-suggest-follow-${candidate.id}`}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: hasSent ? colors.textMuted : "#fff" }}>
                  {hasSent ? "Envoyé" : "Suivre"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function CandidateHomeScreen() {
  const router = useRouter();
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const isFr = lang === "fr";
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<"jobs" | "feed" | "connections">("jobs");
  const [refreshing, setRefreshing] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState<string>("");
  const jobsScrollRef = useRef<ScrollView>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<DemoCandidate | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DemoJob | null>(null);
  const [jobModalVisible, setJobModalVisible] = useState(false);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);

  // Community feed state
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<{ visible: boolean; postId: string; type: "post" | "profile_image" } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Use Zustand selector to subscribe to posts changes
  const posts = useDemoStore((s) => s.posts);
  const connections = useDemoStore((s) => s.connections);

  const unreadNotificationsCount = useDemoStore(
    (s) => s.unreadNotificationsCount
  );
  const unreadCount = unreadNotificationsCount();

  // Get real user data from API
  const { user, profile, refetch: refetchUser } = useUserWithProfile();
  const queryClient = useQueryClient();

  // Fetch real jobs from backend
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs-feed"],
    queryFn: () => api.get<{ jobs: BackendJob[]; pagination: unknown }>("/api/jobs"),
    staleTime: 2 * 60 * 1000,
  });
  const realJobs: DemoJob[] = (jobsData?.jobs ?? []).map(backendJobToDemoJob);
  const allJobs: DemoJob[] = [
    ...(DEMO_JOBS as unknown as DemoJob[]),
    ...realJobs.filter((r) => !DEMO_JOBS.some((d) => d.id === r.id)),
  ];

  const filteredAllJobs: DemoJob[] = jobSearchQuery.trim() === ""
    ? allJobs
    : allJobs.filter((job) => {
        const q = jobSearchQuery.toLowerCase();
        return (
          job.title.toLowerCase().includes(q) ||
          job.company.companyName.toLowerCase().includes(q) ||
          job.locationCity.toLowerCase().includes(q) ||
          job.contractType.toLowerCase().includes(q)
        );
      });

  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return api.post("/api/applications", { jobId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      showToast(t("search_applied"), "success");
    },
    onError: (err: any) => {
      const msg: string = err?.message ?? "";
      if (msg.includes("Insufficient credits") || msg.includes("INSUFFICIENT_CREDITS") || err?.code === "INSUFFICIENT_CREDITS") {
        setJobModalVisible(false);
        setSelectedJob(null);
        setShowNoCreditsModal(true);
      } else if (msg.includes("Already applied") || msg.includes("ALREADY_APPLIED") || err?.code === "ALREADY_APPLIED") {
        showToast(t("jobs_already_applied"), "info");
      } else {
        showToast(t("jobs_apply_error"), "error");
      }
    },
  });

  const demoApplyMutation = useMutation({
    mutationFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/credits/spend`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw { status: res.status, code: (body as any)?.error?.code };
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
      showToast(t("search_applied"), "success");
    },
    onError: (err: any) => {
      if (err?.code === "INSUFFICIENT_CREDITS") {
        setShowNoCreditsModal(true);
      } else {
        showToast(t("jobs_apply_error"), "error");
      }
    },
  });

  // Get credits from the me query (already cached)
  const { data: meData } = useQuery({
    queryKey: USER_ME_QUERY_KEY,
    queryFn: () => api.get<UserMe>("/api/me"),
    staleTime: 1000 * 60 * 5,
  });

  // Community feed query
  const { data: feedData, isLoading: feedLoading, refetch: feedRefetch } = useQuery({
    queryKey: ["feed"],
    queryFn: () => api.get<{ posts: FeedPost[] }>("/api/posts/feed"),
    enabled: activeTab === "feed",
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const realFeedPosts: FeedPost[] = feedData?.posts ?? [];
  // Merge live demoStore post state into DEMO_FEED_POSTS so that likes/reposts/comments reflect live changes
  const liveDemoFeedPosts: FeedPost[] = DEMO_FEED_POSTS.map((d) => {
    const livePost = posts.find((p) => p.id === d.id);
    if (!livePost) return d;
    return {
      ...d,
      likeCount: livePost.likes,
      commentCount: livePost.comments,
      repostCount: livePost.reposts,
      isLikedByMe: livePost.isLiked,
      isRepostedByMe: livePost.isReposted,
    };
  });
  const newLocalPosts: FeedPost[] = posts
    .filter((p) => !DEMO_FEED_POSTS.some((d) => d.id === p.id))
    .map((p): FeedPost => ({
      id: p.id,
      content: (p as any).captionFr ?? (p as any).caption ?? "",
      captionEn: (p as any).captionEn ?? undefined,
      imageUrl: (p as any).imageUrl ?? ((p as any).images?.[0] as string | undefined) ?? null,
      isPinned: false,
      isBoosted: false,
      createdAt: (p as any).createdAt ?? new Date().toISOString(),
      likeCount: p.likes,
      commentCount: p.comments,
      repostCount: p.reposts,
      isLikedByMe: p.isLiked,
      isRepostedByMe: p.isReposted,
      isDemo: true,
      user: {
        id: (p.author as any).userId || p.author.id,
        name: p.author.fullName,
        image: ((p.author as any).avatarUri as string | undefined) ?? null,
        accountType: "candidate",
        isVerified: false,
        isGoldVerified: false,
      },
    }));

  // Stable post order: shuffle only when the set of post IDs changes, not on every like/repost
  const feedPostIds = useMemo(() => {
    const all = [...realFeedPosts, ...liveDemoFeedPosts, ...newLocalPosts];
    const seen = new Set<string>();
    const pinned: string[] = [];
    const unpinned: string[] = [];
    for (const p of all) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      if (p.isPinned) pinned.push(p.id);
      else unpinned.push(p.id);
    }
    // Fisher-Yates shuffle once per set of IDs
    const shuffled = [...unpinned];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    return [...pinned, ...shuffled];
  // Only re-shuffle when the IDs themselves change (new/deleted posts), not on like/repost
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    realFeedPosts.map((p) => p.id).join(","),
    liveDemoFeedPosts.map((p) => p.id).join(","),
    newLocalPosts.map((p) => p.id).join(","),
  ]);

  const feedPosts: FeedPost[] = useMemo(() => {
    const allMap = new Map<string, FeedPost>();
    for (const p of [...realFeedPosts, ...liveDemoFeedPosts, ...newLocalPosts]) {
      allMap.set(p.id, p);
    }
    return feedPostIds.map((id) => allMap.get(id)).filter((p): p is FeedPost => p != null);
  }, [feedPostIds, realFeedPosts, liveDemoFeedPosts, newLocalPosts]);

  // Comments query for expanded post
  const { data: commentsData } = useQuery({
    queryKey: ["post-comments", expandedComments],
    queryFn: () =>
      expandedComments
        ? api.get<FeedComment[]>(`/api/posts/${expandedComments}/comments`)
        : Promise.resolve([]),
    enabled: !!expandedComments,
  });
  const postComments: FeedComment[] = commentsData ?? [];

  const likeMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/api/posts/${postId}/like`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
    },
  });

  const repostMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/api/posts/${postId}/repost`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-reposts"] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: string) =>
      api.delete(`/api/posts/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      showToast(t("feed_post_deleted"), "success");
    },
  });

  const reportMutation = useMutation({
    mutationFn: (data: { type: string; targetId: string; reason: string }) =>
      api.post("/api/report", data),
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      api.post(`/api/posts/${postId}/comments`, { content }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["post-comments", vars.postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
    },
  });
  const userCredits = meData?.credits;

  // Feed items union type for FlatList (supports injecting special sections)
  type FeedItem = { type: 'post'; post: FeedPost } | { type: 'people_suggestion' };
  const feedItems: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = feedPosts.map((p) => ({ type: 'post' as const, post: p }));
    if (items.length >= 2) {
      items.splice(2, 0, { type: 'people_suggestion' as const });
    }
    return items;
  }, [feedPosts]);

  // Use demoUserName as fallback for demo mode
  const demoUserName = useDemoStore((s) => s.demoUserName);
  const demoHeadline = useDemoStore((s) => s.demoHeadline);
  const demoPhotoUri = useDemoStore((s) => s.demoPhotoUri);
  const demoCity = useDemoStore((s) => s.demoCity);
  const demoToggleLike = useDemoStore((s) => s.toggleLike);
  const demoToggleRepost = useDemoStore((s) => s.toggleRepost);
  const demoAddComment = useDemoStore((s) => s.addComment);

  // Determine the display name: prefer API user name, fallback to demo name
  const displayName = user?.name ?? demoUserName ?? "";
  const firstName = displayName.trim().split(" ")[0] ?? "";

  // Professional title from profile headline
  const professionalTitle = profile?.headline ?? (demoHeadline || null);

  // Avatar image: prefer API, fallback to demo photo
  const avatarImageUrl = user?.image ?? profile?.profilePhotoUrl ?? demoPhotoUri;

  const onRefresh = () => {
    setRefreshing(true);
    refetchUser();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
      testID="candidate-home"
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <View>
          {/* Jobé brand logo */}
          <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: -0.5, lineHeight: 28 }}>
            Job<Text style={{ color: colors.accent }}>é</Text>
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>
            {firstName ? `${t("greeting")}, ${firstName} 👋` : t("greeting")}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            style={{ position: "relative", padding: 6 }}
            onPress={() => router.push("/notifications" as never)}
            testID="notifications-button"
          >
            <Bell size={20} color={colors.primary} />
            {unreadCount > 0 && (
              <View style={{ position: "absolute", top: 0, right: 0, backgroundColor: colors.urgentText, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.background }}>
                <Text style={{ fontSize: 10, color: "#fff", fontWeight: "700" }}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={{}}
            onPress={() =>
              router.push("/(app)/(candidate)/profile" as never)
            }
            testID="profile-button"
          >
            <UserAvatar
              name={displayName}
              imageUrl={avatarImageUrl}
              size={38}
              backgroundColor={isDark ? "#243260" : colors.primary}
              textColor="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
      >
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={{ flex: 1, fontSize: 14, color: colors.text }}
          placeholder={t("home_search_placeholder")}
          placeholderTextColor={colors.textMuted}
          value={jobSearchQuery}
          onChangeText={setJobSearchQuery}
          returnKeyType="search"
          testID="job-search-input"
          selectionColor={colors.accent}
        />
        {jobSearchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() => setJobSearchQuery("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="job-search-clear"
          >
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 4, backgroundColor: colors.card, borderRadius: 12, padding: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, backgroundColor: activeTab === "jobs" ? colors.placeholder : "transparent" }}
          onPress={() => setActiveTab("jobs")}
          testID="tab-jobs"
        >
          <Briefcase
            size={15}
            color={activeTab === "jobs" ? colors.accent : colors.textMuted}
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: activeTab === "jobs" ? colors.accent : colors.textMuted,
            }}
          >
            {t("home_tab_jobs")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, backgroundColor: activeTab === "feed" ? colors.placeholder : "transparent" }}
          onPress={() => setActiveTab("feed")}
          testID="tab-feed"
        >
          <Users size={15} color={activeTab === "feed" ? colors.accent : colors.textMuted} />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: activeTab === "feed" ? colors.accent : colors.textMuted,
            }}
          >
            {t("home_tab_feed")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, backgroundColor: activeTab === "connections" ? colors.placeholder : "transparent" }}
          onPress={() => setActiveTab("connections")}
          testID="tab-connections"
        >
          <UserCheck
            size={15}
            color={activeTab === "connections" ? colors.accent : colors.textMuted}
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: activeTab === "connections" ? colors.accent : colors.textMuted,
            }}
          >
            {t("home_tab_connections")}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "jobs" ? (
        <ScrollView
          ref={jobsScrollRef}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          testID="jobs-scroll"
          style={{ backgroundColor: colors.background }}
        >
          {/* Recommended For You */}
          <RecommendedSection
            onJobPress={(jobId) =>
              router.push({
                pathname: "/job-detail",
                params: { jobId },
              } as never)
            }
          />

          {/* Section header */}
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: GREEN }}>{t("home_offers_for_you")}</Text>
          </View>

          {jobsLoading && filteredAllJobs.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <ActivityIndicator size="small" color={GREEN} />
            </View>
          ) : filteredAllJobs.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>{t("jobs_no_jobs")}</Text>
            </View>
          ) : (
            <>
              {(showAllJobs ? filteredAllJobs : filteredAllJobs.slice(0, 6)).map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  t={t}
                  onPress={() =>
                    router.push({
                      pathname: "/job-detail",
                      params: { jobId: job.id },
                    } as never)
                  }
                  onMoreInfo={() => {
                    setSelectedJob(job);
                    setJobModalVisible(true);
                  }}
                />
              ))}
              {!showAllJobs && filteredAllJobs.length > 6 ? (
                <TouchableOpacity
              onPress={() => setShowAllJobs(true)}
                  style={{
                    marginHorizontal: 16,
                    marginTop: 4,
                    marginBottom: 8,
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                  testID="see-all-jobs-btn"
                >
                  <Text style={{ fontSize: 15, fontWeight: "700", color: GREEN }}>
                    {isFr ? `Voir tous les ${filteredAllJobs.length} offres` : `See all ${filteredAllJobs.length} jobs`}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      ) : activeTab === "feed" ? (
        <>
          {feedLoading && feedPosts.length === 0 ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }} testID="feed-loading">
              <ActivityIndicator size="large" color={GREEN} />
              <Text style={{ marginTop: 12, fontSize: 14, color: colors.textMuted }}>{t("feed_loading")}</Text>
            </View>
          ) : feedPosts.length === 0 ? (
            <>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, marginHorizontal: 16, marginTop: 8, marginBottom: 12, borderRadius: 12, padding: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
                onPress={() => router.navigate("/(app)/create-post" as never)}
                testID="create-post-button"
              >
                <UserAvatar name={displayName} imageUrl={avatarImageUrl} size={36} backgroundColor={PRIMARY} />
                <Text style={{ flex: 1, fontSize: 14, color: colors.textMuted }}>{t("create_post_placeholder")}</Text>
                <View style={{ backgroundColor: GREEN, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }}>
                  <Plus size={16} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={{ paddingVertical: 48, alignItems: "center", paddingHorizontal: 32 }} testID="feed-empty">
                <Users size={48} color={colors.border} />
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 16, textAlign: "center" }}>{t("feed_no_posts")}</Text>
                <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 6, textAlign: "center" }}>{t("feed_no_posts_desc")}</Text>
              </View>
            </>
          ) : (
            <FlatList
              data={feedItems}
              keyExtractor={(item) => item.type === 'people_suggestion' ? 'people-suggestion' : item.post.id}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              ListHeaderComponent={
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, marginHorizontal: 16, marginTop: 8, marginBottom: 12, borderRadius: 12, padding: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
                  onPress={() => router.navigate("/(app)/create-post" as never)}
                  testID="create-post-button"
                >
                  <UserAvatar name={displayName} imageUrl={avatarImageUrl} size={36} backgroundColor={PRIMARY} />
                  <Text style={{ flex: 1, fontSize: 14, color: colors.textMuted }}>{t("create_post_placeholder")}</Text>
                  <View style={{ backgroundColor: GREEN, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }}>
                    <Plus size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              }
              renderItem={({ item }) => {
                if (item.type === 'people_suggestion') {
                  return <PeopleYouMayKnow />;
                }
                const post = item.post;
                const liveStorePost = post.isDemo ? posts.find((p) => p.id === post.id) : undefined;
                const demoComments: FeedComment[] = liveStorePost
                  ? liveStorePost.commentsList.map((c) => ({
                      id: c.id,
                      content: c.text,
                      createdAt: new Date().toISOString(),
                      author: {
                        id: c.id,
                        name: c.author,
                        image: null,
                        isVerified: false,
                        isGoldVerified: false,
                      },
                    }))
                  : [];
                const commentsForPost = expandedComments === post.id
                  ? (post.isDemo ? demoComments : postComments)
                  : [];
                return (
                <FeedPostCard
                  post={post}
                  currentUserId={user?.id}
                  comments={commentsForPost}
                  isExpanded={expandedComments === post.id}
                  onLike={() => {
                    if (post.isDemo) {
                      demoToggleLike(post.id);
                    } else {
                      likeMutation.mutate(post.id);
                    }
                  }}
                  onRepost={() => {
                    if (!post.isDemo) {
                      repostMutation.mutate(post.id);
                    } else {
                      demoToggleRepost(post.id);
                    }
                  }}
                  onDelete={() => setDeleteConfirm(post.id)}
                  onReport={(type) => setReportModal({ visible: true, postId: post.id, type })}
                  onPressAuthor={() => router.push({ pathname: "/(app)/profile-view", params: { userId: post.user.id, type: "candidate" } } as never)}
                  onToggleComments={() =>
                    setExpandedComments(expandedComments === post.id ? null : post.id)
                  }
                  onAddComment={(text) => {
                    if (!text.trim()) return;
                    if (post.isDemo) {
                      demoAddComment(post.id, text.trim());
                    } else {
                      addCommentMutation.mutate({ postId: post.id, content: text.trim() });
                    }
                  }}
                  t={t}
                  colors={colors}
                />
                );
              }}
              ListFooterComponent={<View style={{ height: 100 }} />}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); feedRefetch().finally(() => setRefreshing(false)); }} tintColor={GREEN} />
              }
            />
          )}

          {/* Report modal */}
          <Modal
            visible={!!reportModal?.visible}
            transparent
            animationType="slide"
            onRequestClose={() => setReportModal(null)}
            testID="report-modal"
          >
            <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => setReportModal(null)}>
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
                <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
                <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 16 }}>
                  {reportModal?.type === "profile_image" ? t("feed_report_photo") : t("feed_report_post")}
                </Text>
                <TextInput
                  style={{ backgroundColor: colors.background, borderRadius: 12, padding: 12, fontSize: 14, color: colors.text, minHeight: 80, borderWidth: 1, borderColor: colors.border, textAlignVertical: "top", marginBottom: 16 }}
                  placeholder={t("feed_report_reason")}
                  placeholderTextColor={colors.textMuted}
                  value={reportReason}
                  onChangeText={setReportReason}
                  multiline
                  testID="report-reason-input"
                />
                <TouchableOpacity
                  style={{ backgroundColor: reportReason.trim() ? colors.urgentText : colors.border, borderRadius: 12, paddingVertical: 14, alignItems: "center" }}
                  disabled={!reportReason.trim()}
                  testID="report-submit-button"
                  onPress={() => {
                    if (!reportModal || !reportReason.trim()) return;
                    reportMutation.mutate({ type: reportModal.type, targetId: reportModal.postId, reason: reportReason.trim() });
                    setReportModal(null);
                    setReportReason("");
                    showToast(t("feed_report_sent"), "success");
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{t("feed_report_submit")}</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>

          {/* Delete confirmation modal */}
          <Modal
            visible={!!deleteConfirm}
            transparent
            animationType="fade"
            onRequestClose={() => setDeleteConfirm(null)}
            testID="delete-confirm-modal"
          >
            <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 }} onPress={() => setDeleteConfirm(null)}>
              <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 24, width: "100%", maxWidth: 340, gap: 12 }}>
                <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center" }}>{t("feed_delete_post")}</Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 }}>{t("feed_confirm_delete")}</Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.background, alignItems: "center", borderWidth: 1, borderColor: colors.border }}
                    onPress={() => setDeleteConfirm(null)}
                    testID="delete-cancel-button"
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{t("settings_cancel")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: "#EF4444", alignItems: "center" }}
                    testID="delete-confirm-button"
                    onPress={() => {
                      if (deleteConfirm) deletePostMutation.mutate(deleteConfirm);
                      setDeleteConfirm(null);
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{t("feed_delete_post")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </Modal>
        </>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GREEN}
            />
          }
          testID="connections-scroll"
          style={{ backgroundColor: colors.background }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: GREEN }}>{isFr ? "Découvrir des Professionnels" : lang === "zh" ? "发现专业人士" : "Discover Professionals"}</Text>
          </View>

          {DEMO_CANDIDATES.map((candidate) => {
            const hasSent = connections.some(c => c.candidate.id === candidate.id && (c.status === "pending_sent" || c.status === "accepted"));
            return (
              <TouchableOpacity
                key={candidate.id}
                onPress={() => {
                  router.push({
                    pathname: "/(app)/profile-view",
                    params: { userId: candidate.userId, type: "candidate" },
                  } as never);
                }}
                activeOpacity={0.85}
                testID={`connection-card-${candidate.id}`}
              >
                <View style={{ backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: candidate.avatarColor,
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                        {candidate.initials}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 2 }} numberOfLines={1}>
                        {candidate.fullName}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }} numberOfLines={1}>
                        {candidate.headline}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <MapPin size={12} color={colors.textMuted} />
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>
                          {candidate.city}
                        </Text>
                        {candidate.availabilityStatus === "available" && (
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN, marginLeft: 4 }} />
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: hasSent ? colors.border : GREEN,
                        borderRadius: 10,
                        paddingVertical: 12,
                        gap: 6,
                      }}
                      onPress={() => {
                        if (!hasSent) {
                          useDemoStore.getState().addConnection(candidate);
                          showToast(
                            `Connection request sent to ${candidate.fullName}`,
                            "success"
                          );
                        }
                      }}
                      disabled={hasSent}
                      testID={`connect-button-${candidate.id}`}
                    >
                      <UserCheck size={16} color={hasSent ? colors.textMuted : "#fff"} />
                      <Text
                        style={{
                          color: hasSent ? colors.textMuted : "#fff",
                          fontSize: 14,
                          fontWeight: "600",
                        }}
                      >
                        {hasSent ? t("connections_sent_label") : t("connection_connect")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.card,
                        borderRadius: 10,
                        paddingVertical: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        gap: 6,
                      }}
                      onPress={() => {
                        router.push({
                          pathname: "/(app)/(candidate)/messages",
                          params: { openUserId: candidate.id, openUserName: candidate.fullName },
                        } as never);
                      }}
                      testID={`message-button-${candidate.id}`}
                    >
                      <MessageCircle size={16} color={colors.text} />
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>Message</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <JobDetailModal
        visible={jobModalVisible}
        job={selectedJob}
        userCredits={userCredits}
        onClose={() => {
          setJobModalVisible(false);
          setSelectedJob(null);
        }}
        onApply={(job) => {
          if (userCredits !== undefined && userCredits <= 0) {
            setJobModalVisible(false);
            setSelectedJob(null);
            setShowNoCreditsModal(true);
            return;
          }
          setJobModalVisible(false);
          setSelectedJob(null);
          const isDemoJob = DEMO_JOBS.some((d) => d.id === job.id);
          if (isDemoJob) {
            demoApplyMutation.mutate();
            return;
          }
          applyMutation.mutate(job.id);
        }}
        onSave={(job) => {
          const isSaved = useDemoStore.getState().savedJobIds.has(job.id);
          useDemoStore.getState().toggleSaveJob(job.id);
          showToast(
            isSaved ? t("search_removed_favorites") : t("search_saved"),
            isSaved ? "info" : "success"
          );
        }}
        isSaved={selectedJob ? useDemoStore.getState().savedJobIds.has(selectedJob.id) : false}
      />

      <CandidateProfileModal
        visible={modalVisible}
        candidate={selectedCandidate}
        onClose={() => {
          setModalVisible(false);
          setSelectedCandidate(null);
        }}
        onConnect={(candidate) => {
          // Find the original candidate from DEMO_CANDIDATES to pass to addConnection
          const originalCandidate = DEMO_CANDIDATES.find(c => c.id === candidate.id);
          if (originalCandidate) {
            useDemoStore.getState().addConnection(originalCandidate);
            showToast(
              `Connection request sent to ${candidate.fullName}`,
              "success"
            );
          }
        }}
        onMessage={() => {
          router.push({
            pathname: "/(app)/(candidate)/messages",
            params: { openUserId: selectedCandidate!.id, openUserName: selectedCandidate!.fullName },
          } as never);
        }}
      />

      {/* No Credits Modal */}
      <Modal
        visible={showNoCreditsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoCreditsModal(false)}
        testID="no-credits-modal"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 24,
              padding: 28,
              alignItems: "center",
              width: "100%",
              maxWidth: 340,
              gap: 10,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.toggleBg,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <Zap size={30} color="#F59E0B" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text, textAlign: "center" }}>
              {t("home_no_credits_title")}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 21, marginBottom: 4 }}>
              {t("home_no_credits_desc")}
            </Text>
            <TouchableOpacity
              testID="buy-credits-from-modal"
              onPress={() => {
                setShowNoCreditsModal(false);
                router.push("/buy-credits" as never);
              }}
              style={{
                backgroundColor: "#007AFF",
                borderRadius: 14,
                paddingVertical: 13,
                paddingHorizontal: 28,
                width: "100%",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>
                {t("home_no_credits_buy")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="cancel-no-credits"
              onPress={() => setShowNoCreditsModal(false)}
              style={{ paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "500" }}>{t("home_no_credits_cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
