import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import { useLang, type TranslationKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { useState } from "react";
import {
  Plus,
  Users,
  MapPin,
  Zap,
  Briefcase,
  Building2,
  DollarSign,
} from "lucide-react-native";

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";

type TabFilter = "active" | "inactive";

interface RecruiterJob {
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
  isActive: boolean;
  createdAt: string;
  description: string;
  viewCount: number;
  requiredSkills: { id: string; skillName: string; isRequired: boolean }[];
  company: {
    id: string;
    companyName: string;
    logoUrl: string | null;
    sector: string | null;
    isVerified: boolean;
  };
  _count: { applications: number };
}

const DEMO_COMPANY = { id: "demo", companyName: "Demo Corp", logoUrl: null, sector: null, isVerified: false };

const DEMO_JOBS: RecruiterJob[] = [
  { id: "demo-job-1", title: "Développeur React Native", contractType: "cdi", workMode: "hybride", locationCity: "Dakar, Almadies", locationNeighborhood: null, salaryMin: 450000, salaryMax: 700000, salaryNegotiable: true, isBoosted: false, isUrgent: true, isActive: true, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), description: "", viewCount: 142, requiredSkills: [], company: DEMO_COMPANY, _count: { applications: 5 } },
  { id: "demo-job-2", title: "Comptable Senior", contractType: "cdi", workMode: "presentiel", locationCity: "Dakar, Plateau", locationNeighborhood: null, salaryMin: 400000, salaryMax: 600000, salaryNegotiable: true, isBoosted: false, isUrgent: false, isActive: true, createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), description: "", viewCount: 87, requiredSkills: [], company: DEMO_COMPANY, _count: { applications: 3 } },
  { id: "demo-job-3", title: "Responsable Marketing Digital", contractType: "cdi", workMode: "hybride", locationCity: "Dakar, Mermoz", locationNeighborhood: null, salaryMin: 350000, salaryMax: 550000, salaryNegotiable: true, isBoosted: true, isUrgent: false, isActive: false, createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), description: "", viewCount: 65, requiredSkills: [], company: DEMO_COMPANY, _count: { applications: 2 } },
];

function getContractStyle(type: string, isDark: boolean): { bg: string; text: string; solid: string } {
  const key = type.toLowerCase();
  const map: Record<string, { bg: string; text: string; solid: string }> = {
    cdi: { bg: isDark ? "rgba(27,47,110,0.35)" : "rgba(27,47,110,0.1)", text: isDark ? "#8EA8FF" : NAVY, solid: NAVY },
    cdd: { bg: isDark ? "rgba(243,156,18,0.25)" : "#FEF3C7", text: "#D97706", solid: "#F39C12" },
    stage: { bg: isDark ? "rgba(0,137,123,0.25)" : "#E0F2F1", text: "#00695C", solid: "#00897B" },
    freelance: { bg: isDark ? "rgba(155,89,182,0.25)" : "#F3E8FF", text: "#7C3AED", solid: "#9B59B6" },
    temps_partiel: { bg: isDark ? "rgba(231,76,60,0.25)" : "#FEE2E2", text: "#DC2626", solid: "#E74C3C" },
  };
  return map[key] ?? { bg: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6", text: "#6B7280", solid: "#9CA3AF" };
}

function displayContractType(type: string, t: (k: TranslationKey) => string): string {
  const map: Record<string, string> = {
    cdi: "CDI",
    cdd: "CDD",
    stage: t("listings_contract_stage"),
    freelance: "Freelance",
    temps_partiel: t("listings_contract_partiel"),
  };
  return map[type.toLowerCase()] ?? type.toUpperCase();
}


function formatSalary(min: number | null, max: number | null, t: (k: TranslationKey) => string): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : `${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)} FCFA`;
  if (min) return `${t("listings_salary_from")} ${fmt(min)} FCFA`;
  if (max) return `${t("listings_salary_up_to")} ${fmt(max)} FCFA`;
  return null;
}

function getRelativeDays(dateString: string, t: (k: TranslationKey) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return t("recruiter_today");
  if (diffDays === 1) return t("recruiter_yesterday");
  return `${t("recruiter_days_ago")} ${diffDays}${t("recruiter_days_suffix")}`;
}

function ListingCard({
  job,
  onViewApplicants,
  onToggleActive,
  t,
}: {
  job: RecruiterJob;
  onViewApplicants: () => void;
  onToggleActive: () => void;
  t: (key: TranslationKey) => string;
}) {
  const { colors, isDark } = useTheme();
  const c = getContractStyle(job.contractType, isDark);
  const appCount = job._count?.applications ?? 0;
  const salaryStr = formatSalary(job.salaryMin, job.salaryMax, t);
  const navyText = isDark ? "#F5F5F5" : NAVY;

  return (
    <View
      testID={`listing-card-${job.id}`}
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.15 : 0.07,
        shadowRadius: 8,
        elevation: 3,
        flexDirection: "row",
      }}
    >
      {/* Left color strip */}
      <View style={{ width: 4, backgroundColor: c.solid }} />

      {/* Card content */}
      <View style={{ flex: 1, padding: 16 }}>
        {/* Row 1: Title + Urgent badge */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 16, fontWeight: "800", color: navyText, lineHeight: 22, flexShrink: 1 }}
              numberOfLines={2}
            >
              {job.title}
            </Text>
          </View>
          {job.isUrgent ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Zap size={9} color="#EF4444" strokeWidth={2.5} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#EF4444" }}>{t("listings_urgent_badge")}</Text>
            </View>
          ) : null}
        </View>

        {/* Row 2: Company */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 }}>
          <Building2
            size={11}
            color={isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)"}
            strokeWidth={2}
          />
          <Text
            style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(27,47,110,0.55)", fontWeight: "500" }}
            numberOfLines={1}
          >
            {job.company?.companyName ?? t("listings_my_company")}
          </Text>
        </View>

        {/* Row 3: Location + Contract badge + Date */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MapPin
              size={11}
              color={isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.4)"}
              strokeWidth={2}
            />
            <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(27,47,110,0.5)", fontWeight: "500" }}>
              {job.locationCity}
            </Text>
          </View>
          <View style={{ backgroundColor: c.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: c.text, letterSpacing: 0.3 }}>
              {displayContractType(job.contractType, t)}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(27,47,110,0.35)", marginLeft: "auto", fontWeight: "500" }}>
            {getRelativeDays(job.createdAt, t)}
          </Text>
        </View>

        {/* Salary row */}
        {salaryStr ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }}>
            <DollarSign size={11} color={GREEN} strokeWidth={2.5} />
            <Text style={{ fontSize: 12, color: GREEN, fontWeight: "700" }}>
              {salaryStr}
              {job.salaryNegotiable ? ` · ${t("listings_negotiable")}` : ""}
            </Text>
          </View>
        ) : job.salaryNegotiable ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }}>
            <DollarSign size={11} color={GREEN} strokeWidth={2.5} />
            <Text style={{ fontSize: 12, color: GREEN, fontWeight: "700" }}>{t("listings_field_salary_negotiable_label")}</Text>
          </View>
        ) : null}

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.07)",
            marginTop: 12,
            marginBottom: 10,
          }}
        />

        {/* Footer: Applicants + View button */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/* Applicant count */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                backgroundColor: isDark ? "rgba(27,47,110,0.3)" : "rgba(27,47,110,0.08)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={13} color={isDark ? "#8EA8FF" : NAVY} strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: "800", color: navyText }}>{appCount}</Text>
            <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)", fontWeight: "500" }}>
              {appCount === 1 ? t("listings_candidate") : t("listings_candidates")}
            </Text>
          </View>

          {/* View applicants button */}
          <Pressable
            testID={`view-applicants-${job.id}`}
            onPress={onViewApplicants}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              backgroundColor: pressed ? "#2EA040" : GREEN,
              borderRadius: 10,
              paddingVertical: 8,
            })}
          >
            <Users size={12} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>{t("listings_view_applicants")}</Text>
          </Pressable>
        </View>

        {/* Activate/Deactivate */}
        <Pressable
          testID={`toggle-active-${job.id}`}
          onPress={onToggleActive}
          style={{
            marginTop: 8,
            paddingVertical: 7,
            borderRadius: 10,
            backgroundColor: job.isActive
              ? (isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2")
              : (isDark ? "rgba(59,173,78,0.15)" : "#DCFCE7"),
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: job.isActive ? "#DC2626" : "#16A34A" }}>
            {job.isActive ? t("listings_deactivate") : t("listings_activate")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({
  tab,
  onAdd,
  t,
}: {
  tab: TabFilter;
  onAdd: () => void;
  t: (key: TranslationKey) => string;
}) {
  const { isDark } = useTheme();
  const navyText = isDark ? "#F5F5F5" : NAVY;

  return (
    <View
      testID="listings-empty-state"
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingTop: 80 }}
    >
      {/* Icon illustration */}
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: isDark ? "rgba(27,47,110,0.25)" : "rgba(27,47,110,0.08)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: isDark ? "rgba(27,47,110,0.4)" : "rgba(27,47,110,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Briefcase size={32} color={isDark ? "#8EA8FF" : NAVY} strokeWidth={1.5} />
        </View>
      </View>

      <Text style={{ fontSize: 18, fontWeight: "800", color: navyText, textAlign: "center", marginTop: 16, letterSpacing: -0.3 }}>
        {tab === "active" ? t("listings_empty_active_title") : t("listings_empty_inactive_title")}
      </Text>
      <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)", textAlign: "center", marginTop: 6, lineHeight: 20 }}>
        {tab === "active" ? t("listings_empty_active_subtitle") : t("listings_empty_inactive_subtitle")}
      </Text>

      {tab === "active" ? (
        <Pressable
          onPress={onAdd}
          testID="empty-add-button"
          style={({ pressed }) => ({
            marginTop: 24,
            backgroundColor: pressed ? "#2EA040" : GREEN,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 32,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            shadowColor: GREEN,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 6,
          })}
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>{t("listings_post_job")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ListingsScreen() {
  const t = useLang((s) => s.t);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabFilter>("active");
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const navyText = isDark ? "#F5F5F5" : NAVY;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["jobs-mine"],
    queryFn: () => api.get<{ jobs: RecruiterJob[] }>("/api/jobs/mine"),
    staleTime: 60 * 1000,
  });

  const realJobs: RecruiterJob[] = data?.jobs ?? [];
  // Use demo data as fallback only when there are NO real jobs
  const jobs: RecruiterJob[] = realJobs.length > 0
    ? realJobs
    : DEMO_JOBS;

  const filtered = tab === "active" ? jobs.filter((j) => j.isActive) : jobs.filter((j) => !j.isActive);
  const activeCount = jobs.filter((j) => j.isActive).length;
  const inactiveCount = jobs.filter((j) => !j.isActive).length;

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/api/jobs/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs-mine"] });
      showToast(t("listings_toggle_success"), "success");
    },
  });

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View testID="listings-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.card }}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 14,
            paddingTop: 10,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.07)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={{ fontSize: 24, fontWeight: "800", color: navyText, letterSpacing: -0.5 }}>
              {t("listings_header_title")}
            </Text>
            <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)", marginTop: 2, fontWeight: "500" }}>
              {t("listings_header_subtitle")}
            </Text>
          </View>
          <Pressable
            testID="add-listing-button"
            onPress={() => router.push("/(app)/(recruiter)/post-job" as never)}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: pressed ? "#2EA040" : GREEN,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: GREEN,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 5,
            })}
          >
            <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Tab Filter */}
        <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
          <Pressable
            testID="tab-active"
            onPress={() => setTab("active")}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              backgroundColor: tab === "active" ? NAVY : (isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.06)"),
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: tab === "active" ? "#FFFFFF" : (isDark ? "rgba(255,255,255,0.55)" : "rgba(27,47,110,0.55)") }}>
              {t("listings_tab_active")}
            </Text>
            <View
              style={{
                backgroundColor: tab === "active" ? "rgba(255,255,255,0.2)" : (isDark ? "rgba(255,255,255,0.12)" : "rgba(27,47,110,0.1)"),
                borderRadius: 10,
                paddingHorizontal: 7,
                paddingVertical: 2,
                minWidth: 22,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: tab === "active" ? "#FFFFFF" : (isDark ? "rgba(255,255,255,0.6)" : NAVY) }}>
                {activeCount}
              </Text>
            </View>
          </Pressable>

          <Pressable
            testID="tab-inactive"
            onPress={() => setTab("inactive")}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              backgroundColor: tab === "inactive" ? NAVY : (isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.06)"),
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: tab === "inactive" ? "#FFFFFF" : (isDark ? "rgba(255,255,255,0.55)" : "rgba(27,47,110,0.55)") }}>
              {t("listings_tab_inactive")}
            </Text>
            <View
              style={{
                backgroundColor: tab === "inactive" ? "rgba(255,255,255,0.2)" : (isDark ? "rgba(255,255,255,0.12)" : "rgba(27,47,110,0.1)"),
                borderRadius: 10,
                paddingHorizontal: 7,
                paddingVertical: 2,
                minWidth: 22,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: tab === "inactive" ? "#FFFFFF" : (isDark ? "rgba(255,255,255,0.6)" : NAVY) }}>
                {inactiveCount}
              </Text>
            </View>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Loading state */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator testID="listings-loading" size="large" color={NAVY} />
        </View>
      ) : (
        <FlatList
          testID="listings-list"
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard
              job={item}
              onViewApplicants={() => {
                router.push({ pathname: "/(app)/(recruiter)/applications", params: { jobId: item.id } } as never);
              }}
              onToggleActive={() => {
                if (item.id.startsWith("demo-")) return;
                toggleActiveMutation.mutate({ id: item.id, isActive: !item.isActive });
              }}
              t={t}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 32,
            flexGrow: 1,
          }}
          style={{ backgroundColor: colors.background }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={NAVY}
              colors={[NAVY]}
            />
          }
          ListEmptyComponent={<EmptyState tab={tab} onAdd={() => router.push("/(app)/(recruiter)/post-job" as never)} t={t} />}
        />
      )}
    </View>
  );
}
