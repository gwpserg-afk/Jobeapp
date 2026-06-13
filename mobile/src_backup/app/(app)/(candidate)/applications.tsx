import { View, Text, ScrollView, FlatList, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  FileText,
  MapPin,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Users,
} from "lucide-react-native";
import { useState } from "react";
import { useLang, type TranslationKey } from "@/lib/i18n";
import { useTheme, type ThemeColors } from "@/lib/theme";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusKey = "all" | "pending" | "viewed" | "interview" | "rejected" | "accepted";

interface RealApplication {
  id: string;
  jobId: string;
  status: "pending" | "viewed" | "interview" | "rejected" | "accepted";
  appliedAt: string;
  job: {
    id: string;
    title: string;
    contractType: string;
    locationCity: string;
    company: {
      companyName: string;
      logoUrl: string | null;
    };
  } | null;
}

// ─── Demo Applications ────────────────────────────────────────────────────────

const DEMO_JOB_TITLES: Record<string, { fr: string; en: string; zh: string }> = {
  "job-1": { fr: "Chauffeur Livreur", en: "Delivery Driver", zh: "送货司机" },
  "job-2": { fr: "Agent de Sécurité", en: "Security Guard", zh: "保安员" },
  "job-3": { fr: "Menuisier Qualifié", en: "Qualified Carpenter", zh: "木工" },
  "job-4": { fr: "Comptable Senior", en: "Senior Accountant", zh: "高级会计" },
  "job-5": { fr: "Développeur Mobile", en: "Mobile Developer", zh: "移动端开发" },
  "job-6": { fr: "Enseignant de Mathématiques", en: "Mathematics Teacher", zh: "数学教师" },
  "job-7": { fr: "Technicien Réseau", en: "Network Technician", zh: "网络技术员" },
  "job-8": { fr: "Commercial Terrain", en: "Field Sales Representative", zh: "销售代表" },
};

function getDemoApplications(lang: string): RealApplication[] {
  const l = lang === "fr" ? "fr" : lang === "zh" ? "zh" : "en";
  return [
    {
      id: "demo-app-1",
      jobId: "job-1",
      status: "interview",
      appliedAt: "2026-03-08T10:00:00.000Z",
      job: { id: "job-1", title: DEMO_JOB_TITLES["job-1"]![l], contractType: "CDI", locationCity: "Dakar", company: { companyName: "Orange Sénégal", logoUrl: null } },
    },
    {
      id: "demo-app-2",
      jobId: "job-2",
      status: "viewed",
      appliedAt: "2026-03-06T09:00:00.000Z",
      job: { id: "job-2", title: DEMO_JOB_TITLES["job-2"]![l], contractType: "CDI", locationCity: "Dakar", company: { companyName: "Orange Sénégal", logoUrl: null } },
    },
    {
      id: "demo-app-3",
      jobId: "job-3",
      status: "pending",
      appliedAt: "2026-03-11T14:00:00.000Z",
      job: { id: "job-3", title: DEMO_JOB_TITLES["job-3"]![l], contractType: "Freelance", locationCity: "Dakar", company: { companyName: "La Sénégalaise de l'Automobile", logoUrl: null } },
    },
    {
      id: "demo-app-4",
      jobId: "job-4",
      status: "rejected",
      appliedAt: "2026-02-28T08:30:00.000Z",
      job: { id: "job-4", title: DEMO_JOB_TITLES["job-4"]![l], contractType: "CDI", locationCity: "Dakar", company: { companyName: "Banque de l'Afrique de l'Ouest", logoUrl: null } },
    },
    {
      id: "demo-app-5",
      jobId: "job-5",
      status: "pending",
      appliedAt: "2026-03-14T11:00:00.000Z",
      job: { id: "job-5", title: DEMO_JOB_TITLES["job-5"]![l], contractType: "CDD", locationCity: "Dakar", company: { companyName: "ChinAfrica Construction", logoUrl: null } },
    },
    {
      id: "demo-app-6",
      jobId: "job-6",
      status: "viewed",
      appliedAt: "2026-03-10T16:00:00.000Z",
      job: { id: "job-6", title: DEMO_JOB_TITLES["job-6"]![l], contractType: "CDI", locationCity: "Thiès", company: { companyName: "Groupe Scolaire Excellence", logoUrl: null } },
    },
    {
      id: "demo-app-7",
      jobId: "job-7",
      status: "pending",
      appliedAt: "2026-03-18T09:15:00.000Z",
      job: { id: "job-7", title: DEMO_JOB_TITLES["job-7"]![l], contractType: "Stage", locationCity: "Dakar", company: { companyName: "Orange Sénégal", logoUrl: null } },
    },
    {
      id: "demo-app-8",
      jobId: "job-8",
      status: "rejected",
      appliedAt: "2026-03-01T13:00:00.000Z",
      job: { id: "job-8", title: DEMO_JOB_TITLES["job-8"]![l], contractType: "CDI", locationCity: "Dakar", company: { companyName: "La Sénégalaise de l'Automobile", logoUrl: null } },
    },
  ];
}

// ─── Constants ───────────────────────────────────────────────────────────────

// These badge colors are semantic/status colors that stay consistent across themes
const CONTRACT_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  CDI: { bg: "#DCFCE7", text: "#166534" },
  CDD: { bg: "#DBEAFE", text: "#1E40AF" },
  Stage: { bg: "#FEF3C7", text: "#92400E" },
  Freelance: { bg: "#F3E8FF", text: "#7C3AED" },
};

const STATUS_ACCENT_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  viewed: "#1B2F6E",
  interview: "#3BAD4E",
  rejected: "#E74C3C",
  accepted: "#27AE60",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  const frMonths = [
    "jan.", "fév.", "mars", "avr.", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc.",
  ];
  const enMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const months = lang === "en" ? enMonths : frMonths;
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatSalary(salaryMin: number | null, salaryMax: number | null): string {
  if (!salaryMin) return "À négocier";
  const fmt = (n: number) =>
    n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
  if (salaryMax) return `${fmt(salaryMin)} – ${fmt(salaryMax)} FCFA`;
  return `${fmt(salaryMin)} FCFA`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ContractBadge({ type }: { type: string }) {
  const badge = CONTRACT_BADGE_COLORS[type] ?? { bg: "#F3F4F6", text: "#374151" };
  return (
    <View
      style={{
        borderRadius: 9999,
        paddingHorizontal: 10,
        paddingVertical: 2,
        backgroundColor: badge.bg,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: badge.text,
        }}
      >
        {type}
      </Text>
    </View>
  );
}

function StatusChip({
  status,
  t,
}: {
  status: string;
  t: (key: TranslationKey) => string;
}) {
  const isDark = useTheme((s) => s.isDark);
  const STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; text: string; icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }> }
  > = {
    pending: {
      label: t("applications_status_pending"),
      bg: isDark ? "rgba(146, 64, 14, 0.2)" : "#FEF3C7",
      text: isDark ? "#FCD34D" : "#92400E",
      icon: Clock,
    },
    viewed: {
      label: t("applications_status_viewed"),
      bg: isDark ? "rgba(27, 47, 110, 0.3)" : "#EFF6FF",
      text: isDark ? "#93C5FD" : "#1B2F6E",
      icon: Eye,
    },
    interview: {
      label: t("applications_status_interview"),
      bg: isDark ? "rgba(59, 173, 78, 0.15)" : "#F0FDF4",
      text: "#3BAD4E",
      icon: Users,
    },
    rejected: {
      label: t("applications_status_rejected"),
      bg: isDark ? "rgba(231, 76, 60, 0.15)" : "#FEF2F2",
      text: isDark ? "#FCA5A5" : "#E74C3C",
      icon: XCircle,
    },
    accepted: {
      label: t("applications_status_accepted"),
      bg: isDark ? "rgba(39, 174, 96, 0.15)" : "#F0FDF4",
      text: "#27AE60",
      icon: CheckCircle,
    },
  };

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG["pending"]!;
  const IconComponent = config.icon;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderRadius: 9999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: config.bg,
      }}
    >
      <IconComponent size={11} color={config.text} strokeWidth={2.5} />
      <Text style={{ fontSize: 12, fontWeight: "600", color: config.text }}>
        {config.label}
      </Text>
    </View>
  );
}

// ─── Application Card ─────────────────────────────────────────────────────────

function ApplicationCard({
  application,
  t,
  lang,
  colors,
}: {
  application: RealApplication;
  t: (key: TranslationKey) => string;
  lang: string;
  colors: ThemeColors;
}) {
  const job = application.job;
  const companyName = job?.company?.companyName ?? t("applications_company_fallback");
  const jobTitle = job?.title ?? t("applications_job_fallback");
  const contractType = job?.contractType;
  const city = job?.locationCity;
  const appliedDate = formatDate(application.appliedAt, lang);
  const accentColor = STATUS_ACCENT_COLORS[application.status] ?? "#6B7280";

  return (
    <View
      testID={`application-card-${application.id}`}
      style={{
        marginBottom: 12,
        borderRadius: 16,
        backgroundColor: colors.card,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Top accent bar based on status */}
      <View
        style={{
          height: 4,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          width: "100%",
          backgroundColor: accentColor,
        }}
      />

      <View style={{ padding: 16 }}>
        {/* Header row */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View
            style={{
              height: 44,
              width: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              marginRight: 12,
              flexShrink: 0,
              backgroundColor: colors.placeholder,
            }}
          >
            <Briefcase size={18} color={colors.textMuted} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                lineHeight: 20,
                color: colors.primary,
              }}
              numberOfLines={1}
            >
              {jobTitle}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 14, fontWeight: "500", color: colors.textMuted }} numberOfLines={1}>
              {companyName}
            </Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {contractType ? <ContractBadge type={contractType} /> : null}
          {city ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <MapPin size={12} color={colors.textMuted} strokeWidth={2} />
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{city}</Text>
            </View>
          ) : null}
        </View>

        {/* Footer row */}
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Calendar size={12} color={colors.textMuted} strokeWidth={2} />
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{t("applications_applied_on")} {appliedDate}</Text>
          </View>
          <StatusChip status={application.status} t={t} />
        </View>
      </View>
    </View>
  );
}

function TabBar({
  activeTab,
  onTabChange,
  counts,
  t,
  colors,
}: {
  activeTab: StatusKey;
  onTabChange: (tab: StatusKey) => void;
  counts: Record<StatusKey, number>;
  t: (key: TranslationKey) => string;
  colors: ThemeColors;
}) {
  const STATUS_TABS: { key: StatusKey; label: string }[] = [
    { key: "all", label: t("applications_tab_all") },
    { key: "pending", label: t("applications_tab_pending") },
    { key: "viewed", label: t("applications_tab_viewed") },
    { key: "interview", label: t("applications_tab_interview") },
    { key: "rejected", label: t("applications_tab_rejected") },
    { key: "accepted", label: t("applications_tab_accepted") },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 8 }}
    >
      {STATUS_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const count = counts[tab.key];
        return (
          <Pressable
            key={tab.key}
            testID={`tab-${tab.key}`}
            onPress={() => onTabChange(tab.key)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 9999,
              paddingHorizontal: 16,
              paddingVertical: 8,
              minHeight: 44,
              backgroundColor: colors.card,
              borderWidth: isActive ? 2 : 1,
              borderColor: isActive ? "#1B2F6E" : colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0,
              shadowRadius: 0,
              elevation: 0,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: isActive ? "#1B2F6E" : colors.textSecondary,
              }}
            >
              {tab.label}
            </Text>
            {count > 0 ? (
              <View
                style={{
                  marginLeft: 6,
                  height: 20,
                  minWidth: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 9999,
                  paddingHorizontal: 4,
                  backgroundColor: isActive ? "rgba(27,47,110,0.12)" : colors.placeholder,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: isActive ? "#1B2F6E" : colors.textSecondary,
                  }}
                >
                  {count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function EmptyState({
  filtered,
  t,
  colors,
}: {
  filtered: boolean;
  t: (key: TranslationKey) => string;
  colors: ThemeColors;
}) {
  return (
    <View testID="applications-empty" style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 48 }}>
      <View
        style={{
          width: 80,
          height: 80,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          marginBottom: 16,
          backgroundColor: colors.placeholder,
        }}
      >
        <FileText size={36} color={colors.textMuted} strokeWidth={1.5} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: "700", textAlign: "center", color: colors.primary }}>
        {filtered ? t("applications_empty_filtered") : t("applications_empty")}
      </Text>
      <Text style={{ marginTop: 8, fontSize: 14, textAlign: "center", color: colors.textMuted, lineHeight: 22 }}>
        {filtered
          ? t("applications_empty_filtered_desc")
          : t("applications_empty_all_desc")}
      </Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ApplicationsScreen() {
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const colors = useTheme((s) => s.colors);
  const [activeTab, setActiveTab] = useState<StatusKey>("all");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["applications"],
    queryFn: () => api.get<{ applications: RealApplication[]; pagination: unknown }>("/api/applications"),
    staleTime: 60 * 1000,
  });
  const realApplications: RealApplication[] = data?.applications ?? [];
  const demoApplications = getDemoApplications(lang);
  // Always show demo applications merged with any real ones, sorted newest first
  const applications: RealApplication[] = [
    ...demoApplications,
    ...realApplications.filter((r) => !demoApplications.some((d: RealApplication) => d.jobId === r.jobId)),
  ].sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

  // Compute per-tab counts
  const counts: Record<StatusKey, number> = {
    all: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    viewed: applications.filter((a) => a.status === "viewed").length,
    interview: applications.filter((a) => a.status === "interview").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
    accepted: applications.filter((a) => a.status === "accepted").length,
  };

  const filtered =
    activeTab === "all"
      ? applications
      : applications.filter((a) => a.status === activeTab);

  return (
    <View testID="applications-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.card }}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>
            {t("tab_jobs")}
          </Text>
          {applications.length > 0 ? (
            <Text style={{ marginTop: 2, fontSize: 14, color: colors.textMuted }}>
              {counts.all} {counts.all === 1 ? t("search_application") : t("search_applications")}
            </Text>
          ) : null}
        </View>

        {/* Tab filters */}
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={counts}
          t={t}
          colors={colors}
        />
      </SafeAreaView>

      {/* Loading state - only block if we have no demo data yet */}
      {isLoading && applications.length === 0 ? (
        <View testID="applications-loading" style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View testID="applications-error" style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.placeholder,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <FileText size={32} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 4, textAlign: "center" }}>
            {t("applications_error")}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 20, textAlign: "center" }}>
            {"Something went wrong. Please try again."}
          </Text>
          <Pressable
            testID="applications-retry"
            onPress={() => refetch()}
            style={{ backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, minHeight: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>{t("applications_retry")}</Text>
          </Pressable>
        </View>
      ) : (
        /* Content: Featured jobs + applications list */
        <FlatList
          testID="applications-list"
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ApplicationCard
              application={item}
              t={t}
              lang={lang}
              colors={colors}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: 32,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={null}
          ListEmptyComponent={<EmptyState filtered={activeTab !== "all"} t={t} colors={colors} />}
        />
      )}
    </View>
  );
}
