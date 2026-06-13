import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  BadgeCheck,
  Star,
  MessageCircle,
  Briefcase,
  GraduationCap,
  Languages,
  Award,
  Globe,
} from "lucide-react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { api } from "@/lib/api/api";
import { DEMO_CANDIDATES } from "@/lib/demoData";

// ─── Brand constants ──────────────────────────────────────────────────────────

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";
const ORANGE = "#F39C12";

// ─── Types ────────────────────────────────────────────────────────────────────

type Skill = {
  id: string;
  skillName: string;
  skillLevel: string;
};

type Experience = {
  id: string;
  roleTitle: string;
  companyName: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
};

type Education = {
  id: string;
  degree: string;
  institution: string;
  fieldOfStudy: string | null;
  startYear: number | null;
  endYear: number | null;
};

type Language = {
  id: string;
  language: string;
  level: string;
};

type CandidateProfile = {
  id: string;
  userId: string;
  fullName: string;
  profilePhotoUrl: string | null;
  city: string | null;
  neighborhood: string | null;
  headline: string | null;
  bio: string | null;
  availabilityStatus: string;
  isVerified?: boolean;
  isGoldVerified?: boolean;
  isPremium?: boolean;
  skills: Skill[];
  experiences: Experience[];
  education: Education[];
  languages: Language[];
  user?: {
    name: string | null;
    image: string | null;
    isVerified: boolean;
    isGoldVerified: boolean;
    isPremium: boolean;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function generateColorFromName(name: string): string {
  const colors = [
    "#E74C3C", "#27AE60", "#9B59B6", "#E67E22",
    "#2980B9", "#16A085", "#D35400", "#8E44AD",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? NAVY;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { month: "short", year: "numeric" });
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  isDark,
  navyText,
}: {
  icon: React.ReactNode;
  title: string;
  isDark: boolean;
  navyText: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.08)",
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: isDark ? "rgba(27,47,110,0.4)" : "rgba(27,47,110,0.08)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <Text style={{ fontSize: 16, fontWeight: "700", color: navyText, letterSpacing: -0.2 }}>
        {title}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CandidateProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; candidateId?: string }>();
  // Support both `id` and `candidateId` params
  const id = params.candidateId ?? params.id;
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);

  const [translatedBio, setTranslatedBio] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState<boolean>(false);

  const navyText = isDark ? "#F5F5F5" : NAVY;
  const cardBg = colors.card;
  const pageBg = colors.background;
  const borderColor = isDark ? "#2A3B6A" : "#E5E7EB";

  // Try API first
  const { data: apiCandidate, isLoading, isError } = useQuery({
    queryKey: ["candidate-profile", id],
    queryFn: () => api.get<CandidateProfile>(`/api/candidates/${id}`),
    enabled: !!id,
    retry: 1,
  });

  // Build demo candidate fallback from DEMO_CANDIDATES
  const demoMatch = id ? DEMO_CANDIDATES.find((c) => c.id === id) : null;
  const demoCandidate: CandidateProfile | null = demoMatch ? {
    id: demoMatch.id,
    userId: demoMatch.userId,
    fullName: demoMatch.fullName,
    profilePhotoUrl: demoMatch.avatarUri ?? null,
    city: demoMatch.city,
    neighborhood: demoMatch.neighborhood ?? null,
    headline: demoMatch.headline,
    bio: lang === "zh" ? (demoMatch.bioZh ?? demoMatch.bio) : lang === "en" ? (demoMatch.bioEn ?? demoMatch.bio) : demoMatch.bio,
    availabilityStatus: demoMatch.availabilityStatus,
    isVerified: demoMatch.isVerified,
    skills: demoMatch.skills.map((s) => ({ id: s.id, skillName: s.skillName, skillLevel: s.level })),
    experiences: [],
    education: [],
    languages: [],
  } : null;

  // Use API data if available, otherwise fall back to demo
  const candidate = apiCandidate ?? (isError || (!isLoading && !apiCandidate) ? demoCandidate : null);

  // Bio translation mutation
  const translateMutation = useMutation({
    mutationFn: (text: string) =>
      api.post<{ translatedText: string }>("/api/messages/translate", { text, targetLanguage: lang }),
    onSuccess: (data) => {
      setTranslatedBio(data.translatedText);
      setShowTranslated(true);
    },
  });

  // Loading state — only show spinner if we have no demo fallback
  if (isLoading && !demoCandidate) {
    return (
      <View
        testID="candidate-profile-loading"
        style={{ flex: 1, backgroundColor: pageBg, alignItems: "center", justifyContent: "center" }}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={{ marginTop: 16, fontSize: 14, color: isDark ? "#9BA5BF" : "#6B7280" }}>
          {t("candidate_profile_loading")}
        </Text>
      </View>
    );
  }

  // Error / not found state
  if (!candidate) {
    return (
      <View
        testID="candidate-profile-error"
        style={{ flex: 1, backgroundColor: pageBg }}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <SafeAreaView edges={["top"]} style={{ backgroundColor: cardBg }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <ArrowLeft size={20} color={navyText} strokeWidth={2} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: navyText }}>
              {t("candidate_profile_back")}
            </Text>
          </Pressable>
        </SafeAreaView>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: isDark ? "#1E2C50" : "#EEF2FF",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <Briefcase size={30} color={NAVY} strokeWidth={1.5} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: "700", color: navyText, textAlign: "center" }}>
            {t("candidate_profile_error")}
          </Text>
        </View>
      </View>
    );
  }

  const isVerified = candidate.isVerified ?? candidate.user?.isVerified ?? false;
  const isGoldVerified = candidate.isGoldVerified ?? candidate.user?.isGoldVerified ?? false;
  const avatarColor = generateColorFromName(candidate.fullName);
  const initials = getInitials(candidate.fullName);
  const photoUrl = candidate.profilePhotoUrl ?? candidate.user?.image ?? null;

  const availStatus = candidate.availabilityStatus;
  const availLabel =
    availStatus === "available"
      ? t("candidate_profile_available")
      : availStatus === "soon"
      ? t("candidate_profile_soon")
      : t("candidate_profile_unavailable");
  const availBg =
    availStatus === "available"
      ? (isDark ? "rgba(59,173,78,0.25)" : "#DCFCE7")
      : availStatus === "soon"
      ? (isDark ? "rgba(243,156,18,0.25)" : "#FEF3C7")
      : (isDark ? "rgba(148,163,184,0.15)" : "#F1F5F9");
  const availColor =
    availStatus === "available"
      ? GREEN
      : availStatus === "soon"
      ? ORANGE
      : (isDark ? "#94A3B8" : "#64748B");

  function handleContact() {
    if (!candidate) return;
    router.push({
      pathname: "/(app)/(recruiter)/messages",
      params: {
        openUserId: candidate.userId,
        openUserName: candidate.fullName,
      },
    } as never);
  }

  return (
    <View testID="candidate-profile-screen" style={{ flex: 1, backgroundColor: pageBg }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Hero Header ── */}
        <View
          style={{
            backgroundColor: cardBg,
            paddingBottom: 24,
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
          }}
        >
          <SafeAreaView edges={["top"]}>
            {/* Back button */}
            <Pressable
              testID="back-button"
              onPress={() => router.back()}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 14,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <ArrowLeft size={20} color={navyText} strokeWidth={2} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: navyText }}>
                {t("candidate_profile_back")}
              </Text>
            </Pressable>
          </SafeAreaView>

          {/* Avatar */}
          <View style={{ alignItems: "center", paddingTop: 8 }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                overflow: "hidden",
                backgroundColor: avatarColor,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: isDark ? "#2A3B6A" : "#E5E7EB",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.18,
                shadowRadius: 10,
                elevation: 8,
              }}
            >
              {photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                />
              ) : (
                <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF" }}>
                  {initials}
                </Text>
              )}
            </View>

            {/* Name + verified badge */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginTop: 16,
                paddingHorizontal: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: navyText,
                  letterSpacing: -0.5,
                  textAlign: "center",
                }}
              >
                {candidate.fullName}
              </Text>
              {isGoldVerified ? (
                <Star size={20} color="#F59E0B" fill="#F59E0B" strokeWidth={1.5} />
              ) : isVerified ? (
                <BadgeCheck size={20} color="#2563EB" strokeWidth={2} />
              ) : null}
            </View>

            {/* Headline */}
            {candidate.headline ? (
              <Text
                style={{
                  fontSize: 14,
                  color: isDark ? "#9BA5BF" : "#6B7280",
                  marginTop: 6,
                  textAlign: "center",
                  paddingHorizontal: 32,
                  lineHeight: 20,
                }}
              >
                {candidate.headline}
              </Text>
            ) : null}

            {/* Location */}
            {candidate.city ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 10,
                }}
              >
                <MapPin size={14} color={isDark ? "#9BA5BF" : "#6B7280"} strokeWidth={2} />
                <Text style={{ fontSize: 13, color: isDark ? "#9BA5BF" : "#6B7280" }}>
                  {candidate.city}
                  {candidate.neighborhood ? ` · ${candidate.neighborhood}` : null}
                </Text>
              </View>
            ) : null}

            {/* Availability pill */}
            <View
              style={{
                backgroundColor: availBg,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 5,
                marginTop: 12,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: availColor }}>
                {availLabel}
              </Text>
            </View>

            {/* Contact button */}
            <Pressable
              testID="contact-button"
              onPress={handleContact}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#2EA040" : GREEN,
                borderRadius: 14,
                paddingHorizontal: 32,
                paddingVertical: 13,
                marginTop: 20,
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
              <MessageCircle size={18} color="#FFFFFF" strokeWidth={2} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>
                {t("candidate_profile_contact")}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Sections ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 20 }}>

          {/* Bio */}
          {candidate.bio ? (
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 14,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.08)" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: isDark ? "rgba(27,47,110,0.4)" : "rgba(27,47,110,0.08)", alignItems: "center", justifyContent: "center" }}>
                    <Award size={16} color={NAVY} strokeWidth={2} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: navyText, letterSpacing: -0.2 }}>
                    {t("candidate_profile_bio")}
                  </Text>
                </View>
                <Pressable
                  testID="translate-bio-button"
                  onPress={() => {
                    if (showTranslated) {
                      setShowTranslated(false);
                    } else if (translatedBio) {
                      setShowTranslated(true);
                    } else {
                      translateMutation.mutate(candidate.bio!);
                    }
                  }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: pressed
                      ? (isDark ? "rgba(27,47,110,0.4)" : "rgba(27,47,110,0.1)")
                      : (isDark ? "rgba(27,47,110,0.25)" : "rgba(27,47,110,0.06)"),
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(27,47,110,0.5)" : "rgba(27,47,110,0.15)",
                  })}
                >
                  {translateMutation.isPending ? (
                    <ActivityIndicator size="small" color={NAVY} />
                  ) : (
                    <Globe size={13} color={isDark ? "#8EA8FF" : NAVY} strokeWidth={2} />
                  )}
                  <Text style={{ fontSize: 11, fontWeight: "600", color: isDark ? "#8EA8FF" : NAVY }}>
                    {showTranslated ? t("candidate_profile_show_original") : t("candidate_profile_translate")}
                  </Text>
                </Pressable>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  color: isDark ? "#C8D0E0" : "#374151",
                  lineHeight: 22,
                }}
              >
                {showTranslated && translatedBio ? translatedBio : candidate.bio}
              </Text>
            </View>
          ) : null}

          {/* Skills */}
          {candidate.skills.length > 0 ? (
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 14,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <SectionHeader
                icon={<Star size={16} color={NAVY} strokeWidth={2} />}
                title={t("candidate_profile_skills")}
                isDark={isDark}
                navyText={navyText}
              />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {candidate.skills.map((skill) => (
                  <View
                    key={skill.id}
                    style={{
                      backgroundColor: isDark ? "#243260" : "#EEF2FF",
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: navyText }}>
                      {skill.skillName}
                    </Text>
                    {skill.skillLevel ? (
                      <Text
                        style={{
                          fontSize: 10,
                          color: isDark ? "#9BA5BF" : "#6B7280",
                          marginTop: 1,
                          textAlign: "center",
                        }}
                      >
                        {skill.skillLevel}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Experience */}
          {candidate.experiences.length > 0 ? (
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 14,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <SectionHeader
                icon={<Briefcase size={16} color={NAVY} strokeWidth={2} />}
                title={t("candidate_profile_experience")}
                isDark={isDark}
                navyText={navyText}
              />
              <View style={{ gap: 16 }}>
                {candidate.experiences.map((exp, index) => (
                  <View
                    key={exp.id}
                    style={{
                      flexDirection: "row",
                      gap: 12,
                    }}
                  >
                    {/* Timeline dot + line */}
                    <View style={{ alignItems: "center", width: 16 }}>
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: exp.isCurrent ? GREEN : (isDark ? "#4A5568" : "#CBD5E0"),
                          borderWidth: 2,
                          borderColor: exp.isCurrent ? GREEN : (isDark ? "#2A3B6A" : "#E2E8F0"),
                          marginTop: 4,
                        }}
                      />
                      {index < candidate.experiences.length - 1 ? (
                        <View
                          style={{
                            width: 2,
                            flex: 1,
                            backgroundColor: isDark ? "#2A3B6A" : "#E2E8F0",
                            marginTop: 4,
                            minHeight: 20,
                          }}
                        />
                      ) : null}
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1, paddingBottom: index < candidate.experiences.length - 1 ? 4 : 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: navyText,
                            flex: 1,
                          }}
                          numberOfLines={2}
                        >
                          {exp.roleTitle}
                        </Text>
                        {exp.isCurrent ? (
                          <View
                            style={{
                              backgroundColor: isDark ? "rgba(59,173,78,0.2)" : "#DCFCE7",
                              borderRadius: 6,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: "700", color: GREEN }}>
                              {t("candidate_profile_current")}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={{
                          fontSize: 13,
                          color: isDark ? "#9BA5BF" : "#6B7280",
                          marginTop: 2,
                          fontWeight: "600",
                        }}
                      >
                        {exp.companyName}
                      </Text>
                      {(exp.startDate || exp.endDate) ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: isDark ? "#6B7A99" : "#9CA3AF",
                            marginTop: 3,
                          }}
                        >
                          {formatDate(exp.startDate)}
                          {exp.endDate || exp.isCurrent
                            ? ` – ${exp.isCurrent ? t("candidate_profile_current") : formatDate(exp.endDate)}`
                            : null}
                        </Text>
                      ) : null}
                      {exp.description ? (
                        <Text
                          style={{
                            fontSize: 13,
                            color: isDark ? "#C8D0E0" : "#374151",
                            marginTop: 6,
                            lineHeight: 20,
                          }}
                          numberOfLines={4}
                        >
                          {exp.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Education */}
          {candidate.education.length > 0 ? (
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 14,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <SectionHeader
                icon={<GraduationCap size={16} color={NAVY} strokeWidth={2} />}
                title={t("candidate_profile_education")}
                isDark={isDark}
                navyText={navyText}
              />
              <View style={{ gap: 14 }}>
                {candidate.education.map((edu, index) => (
                  <View
                    key={edu.id}
                    style={{
                      paddingBottom: index < candidate.education.length - 1 ? 14 : 0,
                      borderBottomWidth: index < candidate.education.length - 1 ? 1 : 0,
                      borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "700", color: navyText }}>
                      {edu.degree}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: isDark ? "#9BA5BF" : "#6B7280",
                        marginTop: 2,
                        fontWeight: "600",
                      }}
                    >
                      {edu.institution}
                    </Text>
                    {edu.fieldOfStudy ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: isDark ? "#6B7A99" : "#9CA3AF",
                          marginTop: 2,
                        }}
                      >
                        {edu.fieldOfStudy}
                      </Text>
                    ) : null}
                    {(edu.startYear || edu.endYear) ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: isDark ? "#6B7A99" : "#9CA3AF",
                          marginTop: 3,
                        }}
                      >
                        {edu.startYear ?? ""}
                        {edu.endYear ? ` – ${edu.endYear}` : null}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Languages */}
          {candidate.languages.length > 0 ? (
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 14,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <SectionHeader
                icon={<Languages size={16} color={NAVY} strokeWidth={2} />}
                title={t("candidate_profile_languages")}
                isDark={isDark}
                navyText={navyText}
              />
              <View style={{ gap: 10 }}>
                {candidate.languages.map((lang) => (
                  <View
                    key={lang.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: navyText }}>
                      {lang.language}
                    </Text>
                    <View
                      style={{
                        backgroundColor: isDark ? "#243260" : "#EEF2FF",
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#9BA5BF" : "#6B7280" }}>
                        {lang.level}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

        </View>
      </ScrollView>
    </View>
  );
}
