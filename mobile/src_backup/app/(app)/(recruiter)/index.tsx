import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bell,
  Plus,
  TrendingUp,
  Briefcase,
  Users,
  MapPin,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
} from "lucide-react-native";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useLang } from "@/lib/i18n";
import { useDemoStore } from "@/lib/demoStore";
import { useTheme } from "@/lib/theme";
import { api } from "@/lib/api/api";
import { useUserMe } from "@/lib/hooks/useUser";
import type { Company } from "@/types";
import { DEMO_CANDIDATES } from "@/lib/demoData";

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";

const DEMO_JOBS_DASHBOARD = [
  { id: "demo-job-1", title: "Développeur React Native", contractType: "cdi", locationCity: "Dakar, Almadies", isActive: true, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), _count: { applications: 5 }, viewCount: 142 },
  { id: "demo-job-2", title: "Comptable Senior", contractType: "cdi", locationCity: "Dakar, Plateau", isActive: true, createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), _count: { applications: 3 }, viewCount: 87 },
  { id: "demo-job-3", title: "Responsable Marketing Digital", contractType: "cdi", locationCity: "Dakar, Mermoz", isActive: false, createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), _count: { applications: 2 }, viewCount: 65 },
];

function getInitialsFromName(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function generateColorFromName(name: string): string {
  const colors = ["#FF6600","#FF1744","#D500F9","#2979F3","#00BCD4","#009688","#4CAF50","#FF9800","#F44336","#673AB7"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? "#1B2F6E";
}

export default function RecruiterDashboardScreen() {
  const router = useRouter();
  const t = useLang((s) => s.t);
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
const [refreshing, setRefreshing] = useState<boolean>(false);
  const unreadNotificationsCount = useDemoStore((s) => s.unreadNotificationsCount);
  const unreadCount = unreadNotificationsCount();

  const userQuery = useUserMe();
  const userName = userQuery.data?.name?.split(" ")[0] ?? "Recruiter";

  const queryClient = useQueryClient();

  const jobsQuery = useQuery({
    queryKey: ["jobs-mine"],
    queryFn: () => api.get<{ jobs: { id: string; title: string; contractType: string; locationCity: string; isActive: boolean; createdAt: string; _count: { applications: number }; viewCount: number }[] }>("/api/jobs/mine"),
    staleTime: 60 * 1000,
  });

  const appsQuery = useQuery({
    queryKey: ["applications"],
    queryFn: () => api.get<{ applications: { id: string; status: string; appliedAt: string; job: { id: string; title: string } | null; candidate: { fullName: string; profilePhotoUrl: string | null } | null }[]; pagination: { total: number } }>("/api/applications"),
    staleTime: 60 * 1000,
  });

  const companyQuery = useQuery({
    queryKey: ["company"],
    queryFn: () => api.get<Company>("/api/company"),
    retry: 1,
  });

  const candidatesQuery = useQuery({
    queryKey: ["candidates-search", { limit: 8 }],
    queryFn: () =>
      api.get<{
        candidates: {
          id: string;
          userId: string;
          fullName: string;
          profilePhotoUrl: string | null;
          headline: string | null;
        }[];
      }>("/api/candidates/search?limit=8"),
    staleTime: 60 * 1000,
  });

  const company = companyQuery.data;
  const companyName = company?.companyName ?? "My Company";

  const realJobs = jobsQuery.data?.jobs ?? [];
  const myJobs = realJobs.length > 0 ? realJobs : DEMO_JOBS_DASHBOARD;
  const activeJobsCount = myJobs.filter((j) => j.isActive).length;
  const totalAppsCount = appsQuery.data?.pagination?.total ?? (realJobs.length > 0 ? 0 : 10);
  const allApps = appsQuery.data?.applications ?? [];
  const now = new Date();
  const thisMonthCount = allApps.filter((app) => {
    const d = new Date(app.appliedAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length || (realJobs.length > 0 ? 0 : 8);
  const activeListings = myJobs.filter((j) => j.isActive).slice(0, 5);

  // Merge real candidates with demo data — show at least 8
  const realCandidates = candidatesQuery.data?.candidates ?? [];
  type DisplayCandidate = { id: string; fullName: string; headline: string | null; profilePhotoUrl: string | null };
  const CANDIDATE_DISPLAY_COUNT = 8;
  const displayCandidates: DisplayCandidate[] = realCandidates.length >= CANDIDATE_DISPLAY_COUNT
    ? realCandidates.slice(0, CANDIDATE_DISPLAY_COUNT)
    : [
        ...realCandidates,
        ...DEMO_CANDIDATES.filter((d) => !realCandidates.some((r) => r.id === d.id)).slice(
          0,
          CANDIDATE_DISPLAY_COUNT - realCandidates.length
        ).map((d) => ({
          id: d.id,
          fullName: d.fullName,
          headline: d.headline,
          profilePhotoUrl: d.avatarUri,
        })),
      ];

  const navyText = isDark ? "#F5F5F5" : NAVY;
  const cardBg = colors.card;

  function getRelativeDays(dateString: string): string {
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t("recruiter_today");
    if (diffDays === 1) return t("recruiter_yesterday");
    return `${t("recruiter_days_ago")} ${diffDays}${t("recruiter_days_suffix")}`;
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([jobsQuery.refetch(), appsQuery.refetch(), companyQuery.refetch(), candidatesQuery.refetch()]);
    setRefreshing(false);
  }

  return (
    <View testID="recruiter-dashboard" style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: cardBg }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingBottom: 16,
            paddingTop: 8,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(27,47,110,0.08)",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(27,47,110,0.5)",
                letterSpacing: 0.3,
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {companyName}
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: navyText,
                letterSpacing: -0.5,
              }}
            >
              {t("greeting") + ", " + userName + " 👋"}
            </Text>
          </View>
          <Pressable
            testID="bell-icon-button"
            onPress={() => router.push("/notifications" as never)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(27,47,110,0.08)",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 12,
            }}
          >
            <Bell size={20} color={navyText} strokeWidth={2} />
            {unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  backgroundColor: GREEN,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: cardBg,
                }}
              >
                <Text style={{ fontSize: 9, color: "#FFFFFF", fontWeight: "800" }}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        testID="dashboard-scroll"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={NAVY} colors={[NAVY]} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        {/* Stats Row */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* Active Jobs — Navy BG */}
            <View
              testID="stat-active-jobs"
              style={{
                flex: 1,
                backgroundColor: NAVY,
                borderRadius: 12,
                padding: 16,
                shadowColor: NAVY,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <Briefcase size={16} color="#FFFFFF" />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#FFFFFF", lineHeight: 30 }}>
                {activeJobsCount}
              </Text>
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 4, fontWeight: "600" }}>
                {t("recruiter_active_jobs")}
              </Text>
            </View>

            {/* Total Applications — White/Card BG */}
            <View
              testID="stat-applications"
              style={{
                flex: 1,
                backgroundColor: cardBg,
                borderRadius: 12,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: isDark ? "rgba(59,173,78,0.2)" : "rgba(59,173,78,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <Users size={16} color={GREEN} />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "800", color: navyText, lineHeight: 30 }}>
                {totalAppsCount}
              </Text>
              <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(27,47,110,0.5)", marginTop: 4, fontWeight: "600" }}>
                {t("recruiter_applications")}
              </Text>
            </View>

            {/* This Month — White/Card BG */}
            <View
              testID="stat-this-month"
              style={{
                flex: 1,
                backgroundColor: cardBg,
                borderRadius: 12,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: isDark ? "rgba(59,173,78,0.2)" : "rgba(59,173,78,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <TrendingUp size={16} color={GREEN} />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "800", color: navyText, lineHeight: 30 }}>
                {thisMonthCount}
              </Text>
              <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(27,47,110,0.5)", marginTop: 4, fontWeight: "600" }}>
                {t("recruiter_this_month")}
              </Text>
            </View>
          </View>
        </View>

        {/* Recommended Candidates */}
        <View style={{ paddingTop: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 17, fontWeight: "700", color: navyText, letterSpacing: 0 }}>
                {t("recruiter_recommended_candidates")}
              </Text>
            </View>
            <Pressable onPress={() => router.push("/applications" as never)}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: GREEN }}>{t("home_see_all")}</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            style={{ flexGrow: 0 }}
          >
            {displayCandidates.map((candidate) => {
              const initials = getInitialsFromName(candidate.fullName);
              const avatarColor = generateColorFromName(candidate.fullName);
              return (
                <Pressable
                  key={candidate.id}
                  testID={`recommended-candidate-${candidate.id}`}
                  onPress={() => router.push({ pathname: "/(app)/(recruiter)/candidate-profile", params: { candidateId: candidate.id } } as never)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(27,47,110,0.03)") : cardBg,
                    borderRadius: 12,
                    padding: 16,
                    width: 140,
                    flexShrink: 0,
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 6,
                    elevation: 3,
                  })}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: avatarColor,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                      overflow: "hidden",
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF" }}>
                      {initials}
                    </Text>
                  </View>
                  <Text
                    style={{ fontSize: 13, fontWeight: "700", color: navyText, textAlign: "center", marginBottom: 2 }}
                    numberOfLines={1}
                  >
                    {candidate.fullName}
                  </Text>
                  <Text
                    style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(27,47,110,0.5)", textAlign: "center", marginBottom: 12 }}
                    numberOfLines={2}
                  >
                    {candidate.headline ?? ""}
                  </Text>
                  <View
                    style={{
                      backgroundColor: GREEN,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>{t("recruiter_view_btn")}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Active Listings */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 17, fontWeight: "700", color: navyText, letterSpacing: 0 }}>
                {t("recruiter_active_listings")}
              </Text>
            </View>
            <Pressable testID="see-all-listings-button" onPress={() => router.push("/listings" as never)}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: GREEN }}>{t("home_see_all")}</Text>
            </Pressable>
          </View>

          <View style={{ gap: 10 }}>
            {activeListings.length === 0 ? (
              <View
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  padding: 24,
                  alignItems: "center",
                }}
              >
                <Briefcase size={32} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(27,47,110,0.15)"} />
                <Text style={{ fontSize: 14, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.4)", marginTop: 10, fontWeight: "600" }}>
                  {t("dashboard_no_listings")}
                </Text>
              </View>
            ) : null}
            {activeListings.map((job) => (
              <Pressable
                key={job.id}
                testID={`job-card-${job.id}`}
                onPress={() => router.push({ pathname: "/(app)/(recruiter)/applications", params: { jobId: job.id } } as never)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(27,47,110,0.04)") : cardBg,
                  borderRadius: 12,
                  padding: 16,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
                  elevation: 3,
                })}
              >
                {/* Title row */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: navyText, flex: 1, marginRight: 8 }} numberOfLines={1}>
                    {job.title}
                  </Text>
                  <View
                    style={{
                      backgroundColor: isDark ? "rgba(59,173,78,0.2)" : "rgba(59,173,78,0.12)",
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "800", color: GREEN, letterSpacing: 0.5 }}>
                      {job.contractType.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Location */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                  <MapPin size={12} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.4)"} />
                  <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(27,47,110,0.55)", fontWeight: "500" }}>
                    {job.locationCity}
                  </Text>
                </View>

                {/* Stats row */}
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        backgroundColor: isDark ? "rgba(59,173,78,0.2)" : "rgba(59,173,78,0.12)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Users size={11} color={GREEN} />
                    </View>
                    <Text style={{ fontSize: 12, color: navyText, fontWeight: "700" }}>
                      {job._count.applications} {job._count.applications !== 1 ? t("listings_candidates") : t("listings_candidate")}
                    </Text>
                  </View>
                  <View style={{ marginLeft: "auto" }}>
                    <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.4)", fontWeight: "600" }}>
                      {getRelativeDays(job.createdAt)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        testID="publish-job-button"
        onPress={() => router.push("/(app)/(recruiter)/listings" as never)}
        style={({ pressed }) => ({
          position: "absolute",
          bottom: 16,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: pressed ? "#2EA040" : GREEN,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: GREEN,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        })}
      >
        <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}
