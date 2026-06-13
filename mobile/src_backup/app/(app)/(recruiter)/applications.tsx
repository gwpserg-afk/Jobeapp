import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  X,
  Clock,
  Eye,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  MapPin,
  Briefcase,
  ArrowLeft,
  ChevronRight,
  UserCheck,
} from "lucide-react-native";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLang, type TranslationKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useDebounce } from "@/lib/useDebounce";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api/api";
import { showToast } from "@/lib/toast";

// Translated titles for demo jobs (they are stored in French in DEMO_APPLICATIONS)
const DEMO_JOB_TITLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  "demo-job-1": { fr: "Développeur React Native", en: "React Native Developer", zh: "React Native 开发工程师" },
  "demo-job-2": { fr: "Comptable Senior", en: "Senior Accountant", zh: "高级会计师" },
  "demo-job-3": { fr: "Responsable Marketing Digital", en: "Digital Marketing Manager", zh: "数字营销经理" },
};

// Translate a title if it matches any known demo job title
function translateJobTitle(title: string, langCode: string): string {
  for (const titles of Object.values(DEMO_JOB_TITLE_TRANSLATIONS)) {
    if (Object.values(titles).includes(title)) {
      return titles[langCode] ?? titles["en"] ?? title;
    }
  }
  return title;
}

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";

const AVATAR_COLORS = [
  "#E74C3C", "#27AE60", "#9B59B6", "#3498DB",
  "#E67E22", "#1ABC9C", "#E91E63", "#FF5722",
];

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function getRelativeDays(dateString: string, t: (k: TranslationKey) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return t("recruiter_today");
  if (diffDays === 1) return t("recruiter_yesterday");
  return `${t("recruiter_days_ago")} ${diffDays}${t("recruiter_days_suffix")}`;
}

type StatusFilter = "all" | "pending" | "viewed" | "interview" | "accepted" | "rejected";
type ApplicationStatus = "pending" | "viewed" | "interview" | "rejected" | "accepted";

type RecruiterApplication = {
  id: string;
  jobId: string;
  candidateId: string;
  coverMessage: string | null;
  status: string;
  recruiterNotes: string | null;
  appliedAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    company: { companyName: string; logoUrl: string | null };
  } | null;
  candidate: {
    id: string;
    fullName: string;
    profilePhotoUrl: string | null;
    headline: string | null;
    city?: string;
    bio?: string | null;
    availabilityStatus?: string;
    cvUrl?: string | null;
    skills?: { skillName: string; skillLevel: string }[];
    experiences?: {
      roleTitle: string;
      companyName: string;
      startDate: string;
      endDate: string | null;
      isCurrent: boolean;
    }[];
    education?: {
      degreeLevel: string;
      institutionName: string;
      fieldOfStudy: string | null;
      endYear: string | null;
    }[];
  } | null;
};

// Demo candidates to pre-populate when API returns nothing
const DEMO_APPLICATIONS: RecruiterApplication[] = [
  { id: "da1", jobId: "demo-job-1", candidateId: "dc1", coverMessage: "Je suis très motivé pour rejoindre votre équipe et contribuer à vos projets innovants.", status: "pending", recruiterNotes: null, appliedAt: new Date(Date.now() - 2 * 86400000).toISOString(), updatedAt: new Date().toISOString(), job: { id: "demo-job-1", title: "Développeur React Native", company: { companyName: "Demo Corp", logoUrl: null } }, candidate: { id: "dc1", fullName: "Fatou Ndiaye", profilePhotoUrl: null, headline: "Développeuse Full Stack · 5 ans d'exp.", city: "Dakar, Almadies", bio: "Passionnée par le développement mobile et web.", skills: [{ skillName: "React Native", skillLevel: "expert" }, { skillName: "TypeScript", skillLevel: "advanced" }, { skillName: "Node.js", skillLevel: "intermediate" }], experiences: [{ roleTitle: "Dev Frontend", companyName: "Orange Sénégal", startDate: "2021-01", endDate: null, isCurrent: true }], education: [] } },
  { id: "da2", jobId: "demo-job-1", candidateId: "dc2", coverMessage: "Votre offre correspond exactement à mon profil et à mes ambitions professionnelles.", status: "viewed", recruiterNotes: null, appliedAt: new Date(Date.now() - 5 * 86400000).toISOString(), updatedAt: new Date().toISOString(), job: { id: "demo-job-1", title: "Développeur React Native", company: { companyName: "Demo Corp", logoUrl: null } }, candidate: { id: "dc2", fullName: "Ibrahima Sow", profilePhotoUrl: null, headline: "Ingénieur Logiciel Senior", city: "Dakar, Plateau", bio: null, skills: [{ skillName: "JavaScript", skillLevel: "expert" }, { skillName: "Python", skillLevel: "advanced" }], experiences: [], education: [] } },
  { id: "da3", jobId: "demo-job-2", candidateId: "dc3", coverMessage: null, status: "interview", recruiterNotes: null, appliedAt: new Date(Date.now() - 1 * 86400000).toISOString(), updatedAt: new Date().toISOString(), job: { id: "demo-job-2", title: "Comptable Senior", company: { companyName: "Demo Corp", logoUrl: null } }, candidate: { id: "dc3", fullName: "Aminata Baldé", profilePhotoUrl: null, headline: "Comptable SYSCOHADA · Expert", city: "Dakar, Mermoz", bio: "10 ans d'expérience en comptabilité d'entreprise.", skills: [{ skillName: "Comptabilité", skillLevel: "expert" }, { skillName: "Excel", skillLevel: "advanced" }, { skillName: "SAGE", skillLevel: "intermediate" }], experiences: [{ roleTitle: "Chef Comptable", companyName: "BAO Sénégal", startDate: "2019-03", endDate: null, isCurrent: true }], education: [] } },
  { id: "da4", jobId: "demo-job-2", candidateId: "dc4", coverMessage: "Fort de 8 ans d'expérience en comptabilité, je suis disponible immédiatement.", status: "pending", recruiterNotes: null, appliedAt: new Date(Date.now() - 3 * 86400000).toISOString(), updatedAt: new Date().toISOString(), job: { id: "demo-job-2", title: "Comptable Senior", company: { companyName: "Demo Corp", logoUrl: null } }, candidate: { id: "dc4", fullName: "Moussa Diallo", profilePhotoUrl: null, headline: "Comptable Certifié OHADA", city: "Dakar, Rufisque", bio: null, skills: [{ skillName: "Comptabilité", skillLevel: "expert" }, { skillName: "Fiscalité", skillLevel: "intermediate" }], experiences: [], education: [] } },
  { id: "da5", jobId: "demo-job-2", candidateId: "dc5", coverMessage: "Je souhaite mettre mes compétences en comptabilité au service de votre entreprise.", status: "accepted", recruiterNotes: null, appliedAt: new Date(Date.now() - 10 * 86400000).toISOString(), updatedAt: new Date().toISOString(), job: { id: "demo-job-2", title: "Comptable Senior", company: { companyName: "Demo Corp", logoUrl: null } }, candidate: { id: "dc5", fullName: "Rokhaya Touré", profilePhotoUrl: null, headline: "Comptable Senior · DSCG", city: "Dakar, Sicap", bio: "Spécialiste en gestion financière et reporting.", skills: [{ skillName: "Comptabilité", skillLevel: "expert" }, { skillName: "Audit", skillLevel: "advanced" }, { skillName: "Excel", skillLevel: "expert" }], experiences: [{ roleTitle: "Comptable", companyName: "Expresso", startDate: "2020-06", endDate: null, isCurrent: true }], education: [] } },
  { id: "da6", jobId: "demo-job-3", candidateId: "dc6", coverMessage: null, status: "rejected", recruiterNotes: null, appliedAt: new Date(Date.now() - 15 * 86400000).toISOString(), updatedAt: new Date().toISOString(), job: { id: "demo-job-3", title: "Responsable Marketing Digital", company: { companyName: "Demo Corp", logoUrl: null } }, candidate: { id: "dc6", fullName: "Ousmane Ba", profilePhotoUrl: null, headline: "Marketing Digital · SEO/SEA", city: "Thiès", bio: null, skills: [{ skillName: "Marketing Digital", skillLevel: "expert" }], experiences: [], education: [] } },
  { id: "da7", jobId: "demo-job-1", candidateId: "dc7", coverMessage: "Développeur passionné avec 6 ans d'expérience React Native, disponible pour rejoindre votre équipe.", status: "pending", recruiterNotes: null, appliedAt: new Date(Date.now() - 1 * 86400000).toISOString(), updatedAt: new Date().toISOString(), job: { id: "demo-job-1", title: "Développeur React Native", company: { companyName: "Demo Corp", logoUrl: null } }, candidate: { id: "dc7", fullName: "Mariama Camara", profilePhotoUrl: null, headline: "Développeuse Mobile · React Native & Flutter", city: "Ziguinchor", bio: "Spécialisée en développement mobile cross-platform.", skills: [{ skillName: "React Native", skillLevel: "expert" }, { skillName: "Flutter", skillLevel: "advanced" }], experiences: [{ roleTitle: "Dev Mobile", companyName: "Sonatel", startDate: "2018-09", endDate: null, isCurrent: true }], education: [] } },
  { id: "da8", jobId: "demo-job-3", candidateId: "dc8", coverMessage: "Je souhaite rejoindre votre équipe et apporter mon expertise en marketing digital.", status: "viewed", recruiterNotes: null, appliedAt: new Date(Date.now() - 7 * 86400000).toISOString(), updatedAt: new Date().toISOString(), job: { id: "demo-job-3", title: "Responsable Marketing Digital", company: { companyName: "Demo Corp", logoUrl: null } }, candidate: { id: "dc8", fullName: "Aïssatou Diop", profilePhotoUrl: null, headline: "Community Manager · Créatrice de contenu", city: "Dakar, Almadies", bio: null, skills: [{ skillName: "Réseaux Sociaux", skillLevel: "expert" }, { skillName: "Canva", skillLevel: "expert" }, { skillName: "SEO", skillLevel: "advanced" }], experiences: [], education: [] } },
];

// ─── Status Config ────────────────────────────────────────────────────────────

function useStatusConfig(isDark: boolean) {
  const t = useLang((s) => s.t);
  return {
    pending: {
      label: t("recruiter_status_pending"),
      color: "#6B7280",
      bg: isDark ? "rgba(107,114,128,0.2)" : "#F3F4F6",
      borderColor: isDark ? "rgba(107,114,128,0.35)" : "#E5E7EB",
      icon: <Clock size={10} color="#6B7280" />,
    },
    viewed: {
      label: t("recruiter_status_reviewing"),
      color: "#F39C12",
      bg: isDark ? "rgba(243,156,18,0.2)" : "#FEF3C7",
      borderColor: isDark ? "rgba(243,156,18,0.35)" : "#FDE68A",
      icon: <Eye size={10} color="#F39C12" />,
    },
    interview: {
      label: t("recruiter_status_interview"),
      color: isDark ? "#8EA8FF" : NAVY,
      bg: isDark ? "rgba(27,47,110,0.3)" : "rgba(27,47,110,0.08)",
      borderColor: isDark ? "rgba(27,47,110,0.5)" : "rgba(27,47,110,0.2)",
      icon: <Calendar size={10} color={isDark ? "#8EA8FF" : NAVY} />,
    },
    accepted: {
      label: t("recruiter_status_accepted"),
      color: GREEN,
      bg: isDark ? "rgba(59,173,78,0.2)" : "#DCFCE7",
      borderColor: isDark ? "rgba(59,173,78,0.35)" : "#BBF7D0",
      icon: <CheckCircle size={10} color={GREEN} />,
    },
    rejected: {
      label: t("recruiter_status_rejected"),
      color: "#EF4444",
      bg: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2",
      borderColor: isDark ? "rgba(239,68,68,0.35)" : "#FECACA",
      icon: <XCircle size={10} color="#EF4444" />,
    },
  };
}

// ─── Application Detail Modal ────────────────────────────────────────────────

function ApplicationDetailModal({
  application,
  visible,
  onClose,
  onStatusUpdate,
  isUpdating,
}: {
  application: RecruiterApplication | null;
  visible: boolean;
  onClose: () => void;
  onStatusUpdate: (id: string, status: ApplicationStatus) => void;
  isUpdating: boolean;
}) {
  const { colors } = useTheme();
  const isDark = useTheme((s) => s.isDark);
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | null>(null);
  const statusConfig = useStatusConfig(isDark);

  if (!application) return null;

  const candidate = application.candidate;
  const candidateName = candidate?.fullName ?? t("recruiter_candidate_label");
  const avatarColor = getAvatarColor(candidateName);
  const initials = getInitials(candidateName);
  const currentStatus = (selectedStatus ?? application.status) as ApplicationStatus;
  const navyText = isDark ? "#F5F5F5" : NAVY;

  const STATUS_OPTIONS: Array<{ value: ApplicationStatus; label: string; color: string; bg: string }> = [
    { value: "pending", label: t("recruiter_status_pending"), color: "#6B7280", bg: isDark ? "rgba(107,114,128,0.2)" : "#F3F4F6" },
    { value: "viewed", label: t("recruiter_status_reviewing"), color: "#F39C12", bg: isDark ? "rgba(243,156,18,0.2)" : "#FEF3C7" },
    { value: "interview", label: t("recruiter_status_interview"), color: isDark ? "#8EA8FF" : NAVY, bg: isDark ? "rgba(27,47,110,0.3)" : "rgba(27,47,110,0.08)" },
    { value: "accepted", label: t("recruiter_status_accepted"), color: GREEN, bg: isDark ? "rgba(59,173,78,0.2)" : "#DCFCE7" },
    { value: "rejected", label: t("recruiter_status_rejected"), color: "#EF4444", bg: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2" },
  ];

  function handleSave() {
    if (selectedStatus && selectedStatus !== application!.status) {
      onStatusUpdate(application!.id, selectedStatus);
    } else {
      onClose();
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onClose} />
      <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88%" }}>
        <View style={{ alignItems: "center", paddingTop: 12 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(27,47,110,0.12)" }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: navyText }}>
            {t("recruiter_applications_title")}
          </Text>
          <Pressable testID="close-detail-modal" onPress={onClose} hitSlop={8}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(27,47,110,0.07)", alignItems: "center", justifyContent: "center" }}>
            <X size={16} color={isDark ? "rgba(255,255,255,0.5)" : "rgba(27,47,110,0.5)"} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          {/* Candidate info */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(27,47,110,0.04)", borderRadius: 12, padding: 14 }}>
            {candidate?.profilePhotoUrl ? (
              <Image source={{ uri: candidate.profilePhotoUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
            ) : (
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: avatarColor, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#FFFFFF" }}>{initials}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: navyText }}>{candidateName}</Text>
              {candidate?.headline ? <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.55)" : "rgba(27,47,110,0.6)", marginTop: 2 }} numberOfLines={2}>{candidate.headline}</Text> : null}
              {candidate?.city ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <MapPin size={11} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.4)"} />
                  <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)" }}>{candidate.city}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {application.job ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, backgroundColor: isDark ? "rgba(27,47,110,0.2)" : "rgba(27,47,110,0.06)", borderRadius: 10, padding: 12 }}>
              <Briefcase size={16} color={isDark ? "#8EA8FF" : NAVY} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: navyText }} numberOfLines={1}>
                {DEMO_JOB_TITLE_TRANSLATIONS[application.job.id]?.[lang as "fr"|"en"|"zh"] ?? application.job.title}
              </Text>
            </View>
          ) : null}

          {candidate?.skills && candidate.skills.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.4)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>{t("recruiter_skills_label")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {candidate.skills.slice(0, 8).map((skill, i) => (
                  <View key={i} style={{ backgroundColor: isDark ? "rgba(27,47,110,0.25)" : "rgba(27,47,110,0.07)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: navyText }}>{skill.skillName}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {candidate?.experiences && candidate.experiences.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.4)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>{t("recruiter_experience_label")}</Text>
              {candidate.experiences.slice(0, 3).map((exp, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN, marginTop: 5 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: navyText }}>{exp.roleTitle}</Text>
                    <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(27,47,110,0.55)" }}>{exp.companyName}{exp.isCurrent ? ` · ${t("recruiter_current_label")}` : null}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {candidate?.bio ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.4)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>{t("recruiter_about_label")}</Text>
              <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.65)" : "rgba(27,47,110,0.7)", lineHeight: 20 }} numberOfLines={4}>{candidate.bio}</Text>
            </View>
          ) : null}

          {application.coverMessage ? (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.4)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>{t("recruiter_cover_message_label")}</Text>
              <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(27,47,110,0.03)", borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: GREEN }}>
                <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(27,47,110,0.75)", lineHeight: 20 }}>{application.coverMessage}</Text>
              </View>
            </View>
          ) : null}

          <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.4)", marginBottom: 16 }}>
          {t("recruiter_applied_label")} {getRelativeDays(application.appliedAt, t)}
          </Text>

          <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.4)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 }}>
            {t("recruiter_change_status_label")}
          </Text>
          <View style={{ gap: 8, marginBottom: 20 }}>
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = currentStatus === opt.value;
              return (
                <Pressable key={opt.value} testID={`status-option-${opt.value}`} onPress={() => setSelectedStatus(opt.value)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: isSelected ? opt.bg : "transparent", borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: isSelected ? opt.color : (isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.1)") }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: isSelected ? opt.color : (isDark ? "rgba(255,255,255,0.7)" : "rgba(27,47,110,0.65)") }}>{opt.label}</Text>
                  {isSelected ? <CheckCircle size={18} color={opt.color} /> : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 }}>
          <Pressable testID="save-status-button" onPress={handleSave} disabled={isUpdating}
            style={({ pressed }) => ({ backgroundColor: pressed ? "#2EA040" : GREEN, borderRadius: 10, paddingVertical: 15, alignItems: "center", opacity: isUpdating ? 0.7 : 1 })}>
            {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{t("recruiter_save_btn")}</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RecruiterApplicationsScreen() {
  const router = useRouter();
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const { colors } = useTheme();
  const isDark = useTheme((s) => s.isDark);
  const queryClient = useQueryClient();
  const { jobId: jobIdParam } = useLocalSearchParams<{ jobId?: string }>();
  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [jobFilter, setJobFilter] = useState<string>(jobIdParam ?? "all");
  const [selectedApp, setSelectedApp] = useState<RecruiterApplication | null>(null);

  useEffect(() => {
    if (jobIdParam) setJobFilter(jobIdParam);
  }, [jobIdParam]);

  const debouncedQuery = useDebounce(query, 350);
  const statusConfig = useStatusConfig(isDark);
  const navyText = isDark ? "#F5F5F5" : NAVY;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["recruiter-applications", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("limit", "50");
      return api.get<{ applications: RecruiterApplication[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(
        `/api/applications?${params.toString()}`
      );
    },
    staleTime: 30000,
  });

  // Fetch job title for header
  const jobsQuery = useQuery({
    queryKey: ["jobs-mine"],
    queryFn: () => api.get<{ jobs: { id: string; title: string }[] }>("/api/jobs/mine"),
    staleTime: 60000,
    enabled: !!jobIdParam,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      api.put(`/api/applications/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiter-applications"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setSelectedApp(null);
      showToast(t("recruiter_status_updated"), "success");
    },
    onError: () => {
      showToast(t("recruiter_status_error"), "error");
    },
  });

  const realApplications = data?.applications ?? [];
  // Use demo data as fallback when API returns nothing
  const allApplications: RecruiterApplication[] = realApplications.length > 0
    ? realApplications
    : DEMO_APPLICATIONS;

  const demoJobTitle = jobIdParam
    ? (DEMO_JOB_TITLE_TRANSLATIONS[jobIdParam]?.[lang] ?? DEMO_JOB_TITLE_TRANSLATIONS[jobIdParam]?.["en"] ?? DEMO_APPLICATIONS.find((a) => a.jobId === jobIdParam)?.job?.title ?? undefined)
    : undefined;

  const rawJobTitle = jobIdParam
    ? (jobsQuery.data?.jobs.find((j) => j.id === jobIdParam)?.title ?? demoJobTitle ?? t("applications_header_subtitle"))
    : t("applications_header_subtitle");
  const jobTitle = translateJobTitle(rawJobTitle, lang);

  const jobOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const app of allApplications) {
      if (app.job) seen.set(app.job.id, app.job.title);
    }
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
  }, [allApplications]);

  const filteredApplications = useMemo(() => {
    let results = allApplications;
    if (jobFilter !== "all") results = results.filter((app) => app.jobId === jobFilter);
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      results = results.filter((app) =>
        (app.candidate?.fullName ?? "").toLowerCase().includes(q) ||
        (app.job?.title ?? "").toLowerCase().includes(q) ||
        (app.candidate?.skills ?? []).some((s) => s.skillName.toLowerCase().includes(q))
      );
    }
    return results;
  }, [allApplications, debouncedQuery, jobFilter]);

  async function handleRefresh() { await refetch(); }

  // Count per status
  function getStatusCount(key: StatusFilter): number {
    if (key === "all") return allApplications.length;
    return allApplications.filter((a) => a.status === key).length;
  }

  const filterTabs: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: t("recruiter_filter_all") },
    { key: "pending", label: t("recruiter_status_pending") },
    { key: "viewed", label: t("recruiter_status_reviewing") },
    { key: "interview", label: t("recruiter_status_interview") },
    { key: "accepted", label: t("recruiter_status_accepted") },
    { key: "rejected", label: t("recruiter_status_rejected") },
  ];

  function getTabColor(key: StatusFilter): string {
    if (key === "all") return GREEN;
    const cfg = statusConfig[key as keyof typeof statusConfig];
    return cfg?.color ?? NAVY;
  }

  return (
    <View testID="recruiter-applications-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.card }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.07)" }}>
          {/* Top row: back + title + count */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Pressable
              onPress={() => router.back()}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.07)", alignItems: "center", justifyContent: "center" }}
            >
              <ArrowLeft size={20} color={navyText} strokeWidth={2} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: navyText, letterSpacing: -0.3 }} numberOfLines={1}>
                {jobTitle}
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)", marginTop: 1 }}>
                {t("applications_header_subtitle")}
              </Text>
            </View>
            {/* Total count badge */}
            <View style={{ backgroundColor: NAVY, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, minWidth: 36, alignItems: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#FFFFFF" }}>
                {filteredApplications.length}
              </Text>
            </View>
          </View>

          {/* Search bar */}
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(27,47,110,0.05)", borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1.5, borderColor: query.length > 0 ? GREEN : (isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.1)") }}>
            <Search size={16} color={query.length > 0 ? GREEN : (isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.35)")} strokeWidth={2} />
            <TextInput
              testID="application-search-input"
              value={query}
              onChangeText={setQuery}
              placeholder={t("applications_search_placeholder")}
              placeholderTextColor={isDark ? "rgba(255,255,255,0.25)" : "rgba(27,47,110,0.25)"}
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.text, fontWeight: "500", height: 44 }}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 ? (
              <Pressable testID="clear-application-search" onPress={() => setQuery("")}
                style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(27,47,110,0.1)", alignItems: "center", justifyContent: "center" }}>
                <X size={11} color={isDark ? "rgba(255,255,255,0.5)" : "rgba(27,47,110,0.5)"} strokeWidth={2.5} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Status filter tabs — horizontal scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }} style={{ flexGrow: 0 }}>
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            const count = getStatusCount(tab.key);
            const tabColor = getTabColor(tab.key);
            return (
              <Pressable
                key={tab.key}
                testID={`filter-chip-${tab.key}`}
                onPress={() => setStatusFilter(tab.key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: isActive
                    ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(27,47,110,0.05)")
                    : (isDark ? "rgba(255,255,255,0.06)" : "rgba(27,47,110,0.05)"),
                  borderWidth: 1.5,
                  borderColor: isActive
                    ? tabColor
                    : (isDark ? "rgba(255,255,255,0.09)" : "rgba(27,47,110,0.09)"),
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: isActive ? tabColor : (isDark ? "rgba(255,255,255,0.5)" : "rgba(27,47,110,0.5)") }}>
                  {tab.label}
                </Text>
                {count > 0 ? (
                  <View style={{ backgroundColor: isActive ? (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)") : (isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.08)"), borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: "center" }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: isActive ? tabColor : (isDark ? "rgba(255,255,255,0.5)" : "rgba(27,47,110,0.5)") }}>{count}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Loading */}
      {isLoading && allApplications.length === 0 ? (
        <View testID="applications-loading" style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : (
        <FlatList
          testID="applications-list"
          data={filteredApplications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const candidateName = item.candidate?.fullName ?? t("recruiter_candidate_label");
            const headline = item.candidate?.headline;
            const city = item.candidate?.city;
            const skills = item.candidate?.skills ?? [];
            const avatarColor = getAvatarColor(candidateName);
            const initials = getInitials(candidateName);
            const statusCfg = statusConfig[item.status as keyof typeof statusConfig] ?? {
              label: item.status,
              color: "#6B7280",
              bg: isDark ? "rgba(107,114,128,0.18)" : "#F3F4F6",
              borderColor: isDark ? "rgba(107,114,128,0.3)" : "#E5E7EB",
              icon: <AlertCircle size={10} color="#6B7280" />,
            };

            return (
              <View
                testID={`application-card-${item.id}`}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  marginHorizontal: 16,
                  marginBottom: 10,
                  padding: 16,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.15 : 0.07,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                {/* Top row: avatar + info + status badge */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  {/* Avatar */}
                  {item.candidate?.profilePhotoUrl ? (
                    <Image source={{ uri: item.candidate.profilePhotoUrl }} style={{ width: 52, height: 52, borderRadius: 26 }} />
                  ) : (
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: avatarColor, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 17, fontWeight: "800", color: "#FFFFFF" }}>{initials}</Text>
                    </View>
                  )}

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: navyText, flex: 1, flexShrink: 1 }} numberOfLines={1}>
                        {candidateName}
                      </Text>
                      {/* Status badge */}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: statusCfg.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: (statusCfg as any).borderColor ?? statusCfg.bg }}>
                        {statusCfg.icon}
                        <Text style={{ fontSize: 10, fontWeight: "700", color: statusCfg.color }}>{statusCfg.label}</Text>
                      </View>
                    </View>
                    {headline ? (
                      <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.55)" : "rgba(27,47,110,0.6)", marginTop: 2, fontWeight: "500" }} numberOfLines={1}>
                        {headline}
                      </Text>
                    ) : null}
                    {/* Location + date */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 5 }}>
                      {city ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <MapPin size={11} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.4)"} />
                          <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)", fontWeight: "500" }}>{city}</Text>
                        </View>
                      ) : null}
                      <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(27,47,110,0.35)", fontWeight: "500" }}>
                        {getRelativeDays(item.appliedAt, t)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Skills row */}
                {skills.length > 0 ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                    {skills.slice(0, 3).map((skill, i) => (
                      <View key={i} style={{ backgroundColor: isDark ? "rgba(27,47,110,0.25)" : "rgba(27,47,110,0.07)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: isDark ? "rgba(255,255,255,0.6)" : "rgba(27,47,110,0.65)" }}>{skill.skillName}</Text>
                      </View>
                    ))}
                    {skills.length > 3 ? (
                      <Text style={{ fontSize: 10, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.4)", fontWeight: "600" }}>+{skills.length - 3}</Text>
                    ) : null}
                  </View>
                ) : null}

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(27,47,110,0.06)", marginTop: 12, marginBottom: 10 }} />

                {/* Single combined action button */}
                <Pressable
                  testID={`review-candidate-${item.id}`}
                  onPress={() => setSelectedApp(item)}
                  style={({ pressed }) => ({
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: pressed ? "#2EA040" : GREEN,
                  })}
                >
                  <UserCheck size={14} color="#FFFFFF" strokeWidth={2} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}>
                    {t("recruiter_review_and_update")}
                  </Text>
                </Pressable>
              </View>
            );
          }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: colors.background }}
          refreshControl={
            <RefreshControl refreshing={Boolean(isFetching && !isLoading)} onRefresh={handleRefresh} tintColor={NAVY} colors={[NAVY]} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingTop: 80 }}>
                <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: isDark ? "rgba(27,47,110,0.25)" : "rgba(27,47,110,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? "rgba(27,47,110,0.4)" : "rgba(27,47,110,0.12)", alignItems: "center", justifyContent: "center" }}>
                    <Users size={30} color={isDark ? "#8EA8FF" : NAVY} strokeWidth={1.5} />
                  </View>
                </View>
                <Text style={{ fontSize: 18, fontWeight: "800", color: navyText, textAlign: "center", marginTop: 16, letterSpacing: -0.3 }}>
                  {t("recruiter_no_applications")}
                </Text>
                <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)", textAlign: "center", marginTop: 6, lineHeight: 20 }}>
                  {t("recruiter_no_applications_desc")}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <ApplicationDetailModal
        application={selectedApp}
        visible={selectedApp !== null}
        onClose={() => setSelectedApp(null)}
        onStatusUpdate={(id, status) => updateStatusMutation.mutate({ id, status })}
        isUpdating={updateStatusMutation.isPending}
      />
    </View>
  );
}
