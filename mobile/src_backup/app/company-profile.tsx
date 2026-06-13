import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  CheckCircle,
  Briefcase,
  ChevronRight,
  Building2,
  Clock,
  Users,
  MessageCircle,
  Send,
  X,
  Globe,
  FileText,
  ThumbsUp,
  BadgeCheck,
  Star,
  UserPlus,
  Calendar,
  TrendingUp,
  Check,
} from "lucide-react-native";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import { USER_ME_QUERY_KEY } from "@/lib/hooks/useUser";
import type { UserMe } from "@/types";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { DEMO_COMPANIES, DEMO_COMPANY_POSTS, DEMO_JOBS } from "@/lib/demoData";

const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_HEIGHT = 160;
const LOGO_SIZE = 80;
const LOGO_OFFSET = LOGO_SIZE / 2;

// ─── Types ────────────────────────────────────────────────────────────────────

type RequiredSkill = {
  id: string;
  skillName: string;
};

type JobListing = {
  id: string;
  title: string;
  contractType: string;
  locationCity: string | null;
  locationNeighborhood: string | null;
  workMode: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable: boolean;
  isUrgent: boolean;
  requiredSkills: RequiredSkill[];
  _count: { applications: number };
};

type Company = {
  id: string;
  userId: string;
  companyName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  sector: string | null;
  sizeRange: string | null;
  description: string | null;
  website: string | null;
  location: string | null;
  isVerified: boolean;
  contactName: string | null;
  jobListings: JobListing[];
};

type DemoTeamMember = {
  id: string;
  candidateId: string;
  name: string;
  role: string;
  avatarUri: string;
  initials: string;
  avatarColor: string;
};

type CompanyPost = {
  id: string;
  companyId: string;
  userId: string;
  content: string;
  contentFr: string;
  contentEn: string;
  contentZh: string;
  likes: number;
  comments: number;
  createdAt: string;
  user: { name: string; image: string | null; isVerified: boolean };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CONTRACT_COLORS: Record<string, { bg: string; text: string }> = {
  CDI: { bg: "#DCFCE7", text: "#166534" },
  CDD: { bg: "#DBEAFE", text: "#1E40AF" },
  Stage: { bg: "#FEF3C7", text: "#92400E" },
  Freelance: { bg: "#F3E8FF", text: "#7C3AED" },
};

function formatSalary(
  min: number | null,
  max: number | null,
  negotiable: boolean
): string {
  if (negotiable) return "Négociable";
  if (!min && !max) return "Non précisé";
  const fmt = (n: number) => (n / 1000).toFixed(0) + "k FCFA";
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `${fmt(max!)}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));
  if (lang === "zh") {
    if (days >= 1) return `${days}天前`;
    if (hours >= 1) return `${hours}小时前`;
    return `${minutes}分钟前`;
  } else if (lang === "en") {
    if (days >= 1) return `${days}d ago`;
    if (hours >= 1) return `${hours}h ago`;
    return `${minutes}m ago`;
  } else {
    if (days >= 1) return `${days}j`;
    if (hours >= 1) return `${hours}h`;
    return `${minutes}min`;
  }
}

function getPostContent(post: CompanyPost, lang: string): string {
  if (lang === "en") return post.contentEn || post.content;
  if (lang === "zh") return post.contentZh || post.content;
  return post.contentFr || post.content;
}

// ─── Gradient colors per company ─────────────────────────────────────────────

function getBannerGradient(logoColor: string): [string, string, string] {
  // Creates a gradient from the company color, dark → mid → faded
  return [logoColor, `${logoColor}CC`, `${logoColor}44`];
}

// ─── Team Member Avatar ────────────────────────────────────────────────────────

function TeamAvatar({
  uri,
  initials,
  avatarColor,
  size,
}: {
  uri: string;
  initials: string;
  avatarColor: string;
  size: number;
}) {
  const [error, setError] = useState(false);
  if (uri && !error) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setError(true)}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: avatarColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontSize: size * 0.32, fontWeight: "700" }}>
        {initials}
      </Text>
    </View>
  );
}

// ─── Message Modal ────────────────────────────────────────────────────────────

function MessageModal({
  visible,
  companyName,
  receiverId,
  onClose,
}: {
  visible: boolean;
  companyName: string;
  receiverId: string;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const { colors } = useTheme();
  const t = useLang((s) => s.t);

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: () =>
      api.post("/api/messages", { receiverId, content: text }),
    onSuccess: () => {
      setText("");
      onClose();
      Alert.alert(t("company_message_sent_title"), t("company_message_sent_desc").replace("{name}", companyName));
    },
    onError: () => {
      Alert.alert(t("company_message_error_title"), t("company_message_error_desc"));
    },
  });

  const handleClose = () => {
    setText("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.card }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable
              onPress={handleClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.toggleBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} color={colors.text} strokeWidth={2.5} />
            </Pressable>
            <Text
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 16,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              {t("company_message_contact_title")} {companyName}
            </Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={{ flex: 1, padding: 20, gap: 14 }}>
            <View
              style={{
                backgroundColor: "#EFF6FF",
                borderRadius: 12,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <MessageCircle size={18} color="#1D4ED8" strokeWidth={2} />
              <Text style={{ flex: 1, fontSize: 13, color: "#1D4ED8", lineHeight: 19 }}>
                {t("company_message_info").replace("{name}", companyName)}
              </Text>
            </View>
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: 8,
                }}
              >
                {t("company_message_field_label")}
              </Text>
              <TextInput
                multiline
                value={text}
                onChangeText={setText}
                placeholder={t("company_message_placeholder").replace("{name}", companyName)}
                placeholderTextColor={colors.textMuted}
                style={{
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 14,
                  color: colors.text,
                  minHeight: 140,
                  textAlignVertical: "top",
                  lineHeight: 21,
                  backgroundColor: colors.background,
                }}
                maxLength={500}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textMuted,
                  textAlign: "right",
                  marginTop: 4,
                }}
              >
                {text.length}/500
              </Text>
            </View>
          </View>
          <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Pressable
              onPress={() => sendMessage()}
              disabled={!text.trim() || isPending}
              style={{
                backgroundColor: !text.trim() || isPending ? colors.border : "#1B2F6E",
                borderRadius: 14,
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
              )}
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
                {isPending ? t("company_message_sending") : t("company_message_send_btn")}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Apply Modal ──────────────────────────────────────────────────────────────

function ApplyModal({
  visible,
  job,
  onClose,
  onApplied,
}: {
  visible: boolean;
  job: JobListing | null;
  onClose: () => void;
  onApplied: (jobId: string) => void;
}) {
  const [coverMessage, setCoverMessage] = useState("");
  const { colors } = useTheme();
  const t = useLang((s) => s.t);

  const { mutate: applyToJob, isPending, error } = useMutation({
    mutationFn: () =>
      api.post(`/api/jobs/${job!.id}/apply`, {
        coverMessage: coverMessage.trim() || null,
      }),
    onSuccess: () => {
      setCoverMessage("");
      onApplied(job!.id);
      onClose();
      Alert.alert(
        t("apply_sent_title"),
        t("apply_sent_desc").replace("{title}", job?.title ?? "")
      );
    },
    onError: (err: unknown) => {
      const code = (err as { code?: string })?.code;
      if (code === "ALREADY_APPLIED") {
        Alert.alert(t("apply_already_title"), t("apply_already_desc"));
        onClose();
      } else if (code === "PROFILE_REQUIRED") {
        Alert.alert(t("apply_profile_required_title"), t("apply_profile_required_desc"));
        onClose();
      }
    },
  });

  const handleClose = () => {
    setCoverMessage("");
    onClose();
  };

  if (!job) return null;

  const contractColors = CONTRACT_COLORS[job.contractType] ?? { bg: "#F3F4F6", text: "#374151" };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.card }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable
              onPress={handleClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.toggleBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} color={colors.text} strokeWidth={2.5} />
            </Pressable>
            <Text style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: colors.text }}>
              {t("company_apply_modal_title")}
            </Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                backgroundColor: colors.background,
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: colors.toggleBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Briefcase size={16} color="#4338CA" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }} numberOfLines={1}>
                    {job.title}
                  </Text>
                  {job.locationCity ? (
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{job.locationCity}</Text>
                  ) : null}
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                <View style={{ backgroundColor: contractColors.bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: contractColors.text }}>{job.contractType}</Text>
                </View>
                {(job.salaryMin || job.salaryMax || job.salaryNegotiable) ? (
                  <View style={{ backgroundColor: "#DCFCE7", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#166534" }}>
                      {formatSalary(job.salaryMin, job.salaryMax, job.salaryNegotiable)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                {t("company_apply_cover_label")}{" "}
                <Text style={{ color: colors.textMuted, fontWeight: "400" }}>{t("company_apply_cover_optional")}</Text>
              </Text>
              <TextInput
                multiline
                value={coverMessage}
                onChangeText={setCoverMessage}
                placeholder={t("company_apply_cover_placeholder")}
                placeholderTextColor={colors.textMuted}
                style={{
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 14,
                  color: colors.text,
                  minHeight: 130,
                  textAlignVertical: "top",
                  lineHeight: 21,
                  backgroundColor: colors.background,
                }}
                maxLength={1000}
              />
              <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: "right", marginTop: 4 }}>
                {coverMessage.length}/1000
              </Text>
            </View>
            {job.requiredSkills.length > 0 ? (
              <View>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                  {t("company_apply_skills_label")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {job.requiredSkills.map((s) => (
                    <View
                      key={s.id}
                      style={{ backgroundColor: colors.toggleBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}
                    >
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>{s.skillName}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
          <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: colors.border }}>
            {error ? (
              <Text style={{ fontSize: 13, color: "#DC2626", textAlign: "center", marginBottom: 10 }}>
                {t("company_apply_error")}
              </Text>
            ) : null}
            <Pressable
              onPress={() => applyToJob()}
              disabled={isPending}
              style={{
                backgroundColor: isPending ? colors.border : "#1B2F6E",
                borderRadius: 14,
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <FileText size={18} color="#FFFFFF" strokeWidth={2.5} />
              )}
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
                {isPending ? t("company_apply_sending") : t("company_apply_send_btn")}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  logoColor,
  logoInitials,
  isCandidate,
  alreadyApplied,
  onPress,
  onApply,
}: {
  job: JobListing;
  logoColor: string;
  logoInitials: string;
  isCandidate: boolean;
  alreadyApplied: boolean;
  onPress: () => void;
  onApply: () => void;
}) {
  const { colors } = useTheme();
  const t = useLang((s) => s.t);
  const contractColors = CONTRACT_COLORS[job.contractType] ?? { bg: "#F3F4F6", text: "#374151" };

  const workModeKey = job.workMode === "onsite"
    ? "search_workmode_onsite"
    : job.workMode === "hybrid"
    ? "search_workmode_hybrid"
    : "search_workmode_remote";

  return (
    <Pressable
      testID={`job-card-${job.id}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.92 : 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      })}
    >
      {/* Top row */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
        {/* Logo */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: `${logoColor}18`,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "800", color: logoColor }}>{logoInitials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 3 }} numberOfLines={2}>
            {job.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MapPin size={11} color={colors.textMuted} strokeWidth={2} />
            <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
              {job.locationCity ?? "Dakar"}
              {job.locationNeighborhood ? `, ${job.locationNeighborhood}` : null}
            </Text>
          </View>
        </View>
        {job.isUrgent ? (
          <View style={{ backgroundColor: "#FEF2F2", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
            <Text style={{ fontSize: 9, fontWeight: "800", color: "#E74C3C", letterSpacing: 0.5 }}>URGENT</Text>
          </View>
        ) : null}
      </View>

      {/* Tags row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <View style={{ backgroundColor: contractColors.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: contractColors.text }}>{job.contractType}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.toggleBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Clock size={11} color={colors.textSecondary} strokeWidth={2} />
          <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "500" }}>
            {t(workModeKey)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.toggleBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Users size={11} color={colors.textSecondary} strokeWidth={2} />
          <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "500" }}>
            {job._count.applications}
          </Text>
        </View>
      </View>

      {/* Bottom row: salary + apply */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#3BAD4E" }}>
          {formatSalary(job.salaryMin, job.salaryMax, job.salaryNegotiable)}
        </Text>
        {isCandidate ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onApply();
            }}
            disabled={alreadyApplied}
            style={{
              backgroundColor: alreadyApplied ? "#DCFCE7" : "#1B2F6E",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 5,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            {alreadyApplied ? (
              <CheckCircle size={12} color="#166534" strokeWidth={2.5} />
            ) : (
              <FileText size={12} color="#FFFFFF" strokeWidth={2.5} />
            )}
            <Text style={{ fontSize: 11, fontWeight: "700", color: alreadyApplied ? "#166534" : "#FFFFFF" }}>
              {alreadyApplied ? t("apply_applied_btn") : t("apply_btn")}
            </Text>
          </Pressable>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  companyLogoColor,
  companyLogoInitials,
  lang,
}: {
  post: CompanyPost;
  companyLogoColor: string;
  companyLogoInitials: string;
  lang: string;
}) {
  const { colors } = useTheme();
  const [liked, setLiked] = useState(false);
  const content = getPostContent(post, lang);
  const timeAgo = formatRelativeTime(post.createdAt, lang);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", padding: 14, paddingBottom: 10, gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: companyLogoColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "800" }}>{companyLogoInitials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }} numberOfLines={1}>
              {post.user.name}
            </Text>
            {post.user.isVerified ? (
              <BadgeCheck size={13} color="#3BAD4E" strokeWidth={2.5} />
            ) : null}
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{timeAgo}</Text>
        </View>
      </View>
      <Text
        style={{ fontSize: 14, color: colors.text, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 12 }}
      >
        {content}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingBottom: 12,
          paddingTop: 10,
          gap: 16,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => setLiked((l) => !l)}
          style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
        >
          <ThumbsUp
            size={14}
            color={liked ? "#1B2F6E" : colors.textSecondary}
            fill={liked ? "#1B2F6E" : "none"}
            strokeWidth={2}
          />
          <Text style={{ fontSize: 13, color: liked ? "#1B2F6E" : colors.textSecondary, fontWeight: "600" }}>
            {liked ? post.likes + 1 : post.likes}
          </Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <MessageCircle size={14} color={colors.textSecondary} strokeWidth={2} />
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "600" }}>{post.comments}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        paddingVertical: 14,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: `${color}15`,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
        }}
      >
        {icon}
      </View>
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: "500", marginTop: 1, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 }}>
      <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text, letterSpacing: -0.3 }}>
        {title}
      </Text>
      {count !== undefined ? (
        <View style={{ backgroundColor: "#1B2F6E", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CompanyProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const { colors, isDark } = useTheme();
  const lang = useLang((s) => s.lang);
  const t = useLang((s) => s.t);

  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [applyJob, setApplyJob] = useState<JobListing | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [isFollowing, setIsFollowing] = useState(false);

  const { data: user } = useQuery({
    queryKey: USER_ME_QUERY_KEY,
    queryFn: () => api.get<UserMe>("/api/me"),
  });

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => api.get<Company>(`/api/company/${companyId}`),
    enabled: !!companyId,
  });

  const { data: backendPosts } = useQuery({
    queryKey: ["company-posts", companyId],
    queryFn: () => api.get<CompanyPost[]>(`/api/company/${companyId}/posts`),
    enabled: !!companyId,
  });

  const isCandidate = user?.accountType === "candidate";

  const handleApplied = (jobId: string) => {
    setAppliedJobIds((prev) => new Set([...prev, jobId]));
    queryClient.invalidateQueries({ queryKey: ["my-applications"] });
  };

  // Demo data
  const demoCompany = DEMO_COMPANIES.find((c) => c.id === companyId);

  const demoFallbackCompany: Company | null = demoCompany
    ? {
        id: demoCompany.id,
        userId: `demo-${demoCompany.id}`,
        companyName: demoCompany.companyName,
        logoUrl: null,
        bannerUrl: null,
        sector: demoCompany.sector,
        sizeRange: null,
        description:
          lang === "en"
            ? demoCompany.descriptionEn
            : lang === "zh"
            ? demoCompany.descriptionZh
            : demoCompany.descriptionFr,
        website: null,
        location: demoCompany.city,
        isVerified: demoCompany.isVerified,
        contactName: null,
        jobListings: DEMO_JOBS.filter((j) => j.companyId === demoCompany.id).map((j) => ({
          id: j.id,
          title: j.title,
          contractType: j.contractType,
          locationCity: j.locationCity,
          locationNeighborhood: j.locationNeighborhood,
          workMode: j.workMode,
          salaryMin: j.salaryMin,
          salaryMax: j.salaryMax,
          salaryNegotiable: j.salaryNegotiable,
          isUrgent: j.isUrgent,
          requiredSkills: (j.requiredSkills ?? []).map((s, idx) => ({
            id: `rs-${j.id}-${idx}`,
            skillName: s,
          })),
          _count: { applications: j.applicantsCount },
        })),
      }
    : null;

  const teamMembers: DemoTeamMember[] = (demoCompany?.teamMembers ?? []) as DemoTeamMember[];

  const demoPosts = DEMO_COMPANY_POSTS.filter((p) => p.companyId === companyId);
  const realPosts: CompanyPost[] = Array.isArray(backendPosts) ? backendPosts : [];
  const allPosts: CompanyPost[] = [
    ...demoPosts,
    ...realPosts.filter((r) => !demoPosts.some((d) => d.id === r.id)),
  ];

  const effectiveCompany = company ?? demoFallbackCompany;

  const logoColor = demoCompany?.logoColor ?? "#1B2F6E";
  const logoInitials = demoCompany?.logoInitials ?? getInitials(effectiveCompany?.companyName ?? "CO");
  const bannerGradient = getBannerGradient(logoColor);

  // Label helpers
  const isFr = lang === "fr";
  const isEn = lang === "en";
  const aboutLabel = t("company_description_label");
  const teamLabel = t("team_our_team");
  const postsLabel = t("company_posts_title");
  const jobsLabel = isEn ? "Open Positions" : isFr ? "Offres d'emploi" : "招聘职位";
  const followLabel = isFollowing
    ? (isEn ? "Following" : isFr ? "Suivi" : "已关注")
    : (isEn ? "Follow" : isFr ? "Suivre" : "关注");
  const messageLabel = isEn ? "Message" : isFr ? "Message" : "发消息";
  const followersLabel = isEn ? "Followers" : isFr ? "Abonnés" : "关注者";
  const activeJobsLabel = isEn ? "Jobs" : isFr ? "Offres" : "职位";
  const employeesLabel = isEn ? "Employees" : isFr ? "Employés" : "员工";

  // Fake follower count based on company id for demo feel
  const followerCount = demoCompany
    ? (demoCompany.id === "company-1"
        ? "12.4k"
        : demoCompany.id === "company-2"
        ? "3.2k"
        : demoCompany.id === "company-3"
        ? "8.1k"
        : demoCompany.id === "company-4"
        ? "1.9k"
        : "4.7k")
    : "–";

  const employeeCount = demoCompany
    ? (demoCompany.id === "company-1"
        ? "500+"
        : demoCompany.id === "company-2"
        ? "120"
        : demoCompany.id === "company-3"
        ? "350"
        : demoCompany.id === "company-4"
        ? "80"
        : "200")
    : effectiveCompany?.sizeRange ?? "–";

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (isLoading && !demoFallbackCompany) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.9)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={20} color="#1B2F6E" strokeWidth={2.5} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#1B2F6E" />
        </View>
      </View>
    );
  }

  // ─── Not Found ─────────────────────────────────────────────────────────────

  if (!effectiveCompany) {
    return (
      <View testID="company-not-found" style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.toggleBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={20} color="#1B2F6E" strokeWidth={2.5} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Building2 size={48} color={colors.border} strokeWidth={1.5} />
          <Text style={{ fontSize: 16, color: colors.textSecondary, fontWeight: "600" }}>
            {t("company_not_found")}
          </Text>
        </View>
      </View>
    );
  }

  const jobs = effectiveCompany.jobListings ?? [];

  return (
    <View testID="company-profile-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Modals */}
      <MessageModal
        visible={messageModalVisible}
        companyName={effectiveCompany.companyName}
        receiverId={effectiveCompany.userId}
        onClose={() => setMessageModalVisible(false)}
      />
      <ApplyModal
        visible={!!applyJob}
        job={applyJob}
        onClose={() => setApplyJob(null)}
        onApplied={handleApplied}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── BANNER HEADER ─────────────────────────────────────────────── */}
        <View style={{ position: "relative", marginBottom: LOGO_OFFSET + 8 }}>
          {/* Banner: image if available, else gradient */}
          {effectiveCompany.bannerUrl ? (
            <Image
              source={{ uri: effectiveCompany.bannerUrl }}
              style={{ width: SCREEN_WIDTH, height: BANNER_HEIGHT }}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[bannerGradient[0], bannerGradient[1], bannerGradient[2]] as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: SCREEN_WIDTH, height: BANNER_HEIGHT }}
            >
              {/* Subtle pattern overlay */}
              <View style={{ position: "absolute", inset: 0, opacity: 0.08 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={{
                      position: "absolute",
                      width: 120 + i * 60,
                      height: 120 + i * 60,
                      borderRadius: (120 + i * 60) / 2,
                      borderWidth: 1,
                      borderColor: "#FFFFFF",
                      top: -30 + i * 10,
                      right: -40 + i * 5,
                    }}
                  />
                ))}
              </View>
            </LinearGradient>
          )}

          {/* Back button — floating on banner */}
          <View
            style={{
              position: "absolute",
              top: insets.top + 12,
              left: 16,
            }}
          >
            <Pressable
              testID="back-button"
              onPress={() => router.back()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(0,0,0,0.25)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Company logo circle — overlaps banner bottom */}
          <View
            style={{
              position: "absolute",
              bottom: -LOGO_OFFSET,
              left: 20,
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              borderRadius: LOGO_SIZE / 2,
              backgroundColor: isDark ? colors.card : "#FFFFFF",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 12,
              elevation: 8,
              borderWidth: 3,
              borderColor: "#FFFFFF",
            }}
          >
            <View
              style={{
                width: LOGO_SIZE - 10,
                height: LOGO_SIZE - 10,
                borderRadius: (LOGO_SIZE - 10) / 2,
                backgroundColor: `${logoColor}18`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 26, fontWeight: "900", color: logoColor, letterSpacing: -0.5 }}>
                {logoInitials}
              </Text>
            </View>
          </View>

          {/* Follow + Message buttons — top-right of banner bottom */}
          <View
            style={{
              position: "absolute",
              bottom: -LOGO_OFFSET + 8,
              right: 16,
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
            }}
          >
            {isCandidate ? (
              <Pressable
                testID="message-recruiter-button"
                onPress={() => setMessageModalVisible(true)}
                style={{
                  height: 36,
                  paddingHorizontal: 16,
                  borderRadius: 18,
                  backgroundColor: colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  flexDirection: "row",
                  gap: 5,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <MessageCircle size={14} color={colors.text} strokeWidth={2.5} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>{messageLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              testID="follow-button"
              onPress={() => setIsFollowing((f) => !f)}
              style={{
                height: 36,
                paddingHorizontal: 18,
                borderRadius: 18,
                backgroundColor: isFollowing ? colors.card : "#1B2F6E",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1.5,
                borderColor: "#1B2F6E",
                flexDirection: "row",
                gap: 5,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {isFollowing ? (
                <Star size={14} color="#1B2F6E" strokeWidth={2.5} fill="#1B2F6E" />
              ) : (
                <UserPlus size={14} color="#FFFFFF" strokeWidth={2.5} />
              )}
              <Text style={{ fontSize: 13, fontWeight: "700", color: isFollowing ? "#1B2F6E" : "#FFFFFF" }}>
                {followLabel}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── IDENTITY BLOCK ────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          {/* Name + verified badge */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text, letterSpacing: -0.5, flex: 1 }} numberOfLines={2}>
              {effectiveCompany.companyName}
            </Text>
            {effectiveCompany.isVerified ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF8C00', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3, marginLeft: 4, gap: 3 }}>
                <Building2 size={10} color="#fff" strokeWidth={2.5} />
                <Check size={10} color="#fff" strokeWidth={3} />
              </View>
            ) : null}
          </View>

          {/* Sector badge */}
          {effectiveCompany.sector ? (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <View
                style={{
                  backgroundColor: `${logoColor}18`,
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Building2 size={12} color={logoColor} strokeWidth={2.5} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: logoColor }}>
                  {effectiveCompany.sector}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Location + website row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {effectiveCompany.location ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <MapPin size={13} color={colors.textMuted} strokeWidth={2} />
                <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "500" }}>
                  {effectiveCompany.location}
                </Text>
              </View>
            ) : null}
            {effectiveCompany.website ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Globe size={13} color="#3B82F6" strokeWidth={2} />
                <Text style={{ fontSize: 13, color: "#3B82F6", fontWeight: "500" }}>
                  {effectiveCompany.website}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── STATS CARD ────────────────────────────────────────────────── */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 16,
            backgroundColor: colors.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: "row",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          <StatPill
            icon={<Briefcase size={16} color="#1B2F6E" strokeWidth={2.5} />}
            label={activeJobsLabel}
            value={String(jobs.length || demoCompany?.activeJobsCount || 0)}
            color="#1B2F6E"
          />
          <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 12 }} />
          <StatPill
            icon={<Users size={16} color="#3BAD4E" strokeWidth={2.5} />}
            label={employeesLabel}
            value={employeeCount}
            color="#3BAD4E"
          />
          <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 12 }} />
          <StatPill
            icon={<TrendingUp size={16} color="#F39C12" strokeWidth={2.5} />}
            label={followersLabel}
            value={isFollowing ? (followerCount.endsWith("k") ? followerCount : `${parseInt(followerCount) + 1}`) : followerCount}
            color="#F39C12"
          />
        </View>

        {/* ── ABOUT CARD ────────────────────────────────────────────────── */}
        {effectiveCompany.description ? (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <SectionHeader title={aboutLabel} />
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>
                {effectiveCompany.description}
              </Text>
              {/* Extra details row */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 12,
                  marginTop: 14,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Calendar size={13} color={colors.textMuted} strokeWidth={2} />
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "500" }}>
                    {isEn ? "Est." : isFr ? "Fondée en" : "成立于"} 2005
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Users size={13} color={colors.textMuted} strokeWidth={2} />
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "500" }}>
                    {employeeCount} {employeesLabel.toLowerCase()}
                  </Text>
                </View>
                {effectiveCompany.sector ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Building2 size={13} color={colors.textMuted} strokeWidth={2} />
                    <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "500" }}>
                      {effectiveCompany.sector}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* ── TEAM SECTION ─────────────────────────────────────────────── */}
        {teamMembers.length > 0 ? (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <SectionHeader title={teamLabel} count={teamMembers.length} />
            <View style={{ gap: 10 }}>
              {teamMembers.slice(0, 3).map((member) => (
                <Pressable
                  key={member.id}
                  testID={`team-member-${member.id}`}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/profile-view",
                      params: { userId: member.candidateId },
                    })
                  }
                  style={({ pressed }) => ({
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  })}
                >
                  <TeamAvatar
                    uri={member.avatarUri}
                    initials={member.initials}
                    avatarColor={member.avatarColor}
                    size={46}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }} numberOfLines={1}>
                      {member.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                      {member.role}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.border} strokeWidth={2} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── POSTS SECTION ─────────────────────────────────────────────── */}
        {allPosts.length > 0 ? (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <SectionHeader title={postsLabel} count={allPosts.length} />
            {allPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                companyLogoColor={logoColor}
                companyLogoInitials={logoInitials}
                lang={lang}
              />
            ))}
          </View>
        ) : null}

        {/* ── JOBS SECTION ──────────────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
          <SectionHeader title={jobsLabel} count={jobs.length} />
          {jobs.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 28,
                alignItems: "center",
                gap: 10,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: colors.toggleBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Briefcase size={24} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600" }}>
                {t("company_no_active_positions")}
              </Text>
            </View>
          ) : (
            jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                logoColor={logoColor}
                logoInitials={logoInitials}
                isCandidate={isCandidate}
                alreadyApplied={appliedJobIds.has(job.id)}
                onPress={() =>
                  router.push({
                    pathname: "/job-detail",
                    params: { jobId: job.id },
                  })
                }
                onApply={() => setApplyJob(job)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
