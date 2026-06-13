import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Settings,
  Edit3,
  Share2,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  BadgeCheck,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Plus,
  TrendingUp,
  Camera,
  Building2,
  Grid3x3,
  List,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme";
import { useDemoStore } from "@/lib/demoStore";
import { useSession } from "@/lib/auth/use-session";

const ACCENT = "#3BAD4E";
const NAVY = "#1B2F6E";
const SCREEN_W = Dimensions.get("window").width;
const GRID_CELL = (SCREEN_W - 4) / 3;

const COVER_URL = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80";

const SKILLS_CANDIDATE = ["React Native", "TypeScript", "Node.js", "PostgreSQL", "Docker", "Figma", "Python", "AWS"];
const SKILLS_RECRUITER = ["Recrutement", "RH & Talent", "Management", "Finance RH", "SIRH", "LinkedIn"];

const GRID_IMAGES = [
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&q=80",
  "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&q=80",
  "https://images.unsplash.com/photo-1555066931-4365d14431b9?w=300&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80",
  "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=300&q=80",
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&q=80",
];

const CANDIDATE_EXPERIENCE = [
  { id: "e1", role: "Développeur Full-Stack", company: "Orange Sénégal", period: "Jan 2022 – Présent", duration: "2 ans 5 mois", logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&q=80" },
  { id: "e2", role: "Développeur Frontend", company: "Sonatel", period: "Mar 2020 – Déc 2021", duration: "1 an 9 mois", logo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=80&q=80" },
  { id: "e3", role: "Stage Développement Web", company: "Gainde 2000", period: "Juil 2019 – Fév 2020", duration: "7 mois", logo: undefined },
];

const CANDIDATE_EDUCATION = [
  { id: "ed1", school: "École Supérieure Polytechnique de Dakar", degree: "Master en Génie Informatique", period: "2017 – 2019" },
  { id: "ed2", school: "Université Cheikh Anta Diop", degree: "Licence en Mathématiques", period: "2014 – 2017" },
];

const RECRUITER_JOBS = [
  { id: "rj1", title: "Ingénieur Développement Web", status: "active", applicants: 34, views: 412, daysLeft: 18 },
  { id: "rj2", title: "Chef de Projet Digital", status: "active", applicants: 19, views: 287, daysLeft: 25 },
  { id: "rj3", title: "Designer UI/UX", status: "closed", applicants: 67, views: 1204, daysLeft: 0 },
];

type ProfileTab = "posts" | "about";
type ViewMode = "grid" | "list";

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const demoAccountType = useDemoStore((s) => s.demoAccountType);
  const { data: session } = useSession();
  const router = useRouter();

  const isRecruiter = demoAccountType === "recruiter"
    || (session?.user as any)?.accountType === "recruiter";

  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Real user data or mock
  const sessionName = (session?.user as any)?.name;
  const sessionAvatar = (session?.user as any)?.image;

  const displayName = sessionName ?? (isRecruiter ? "Moussa Ndiaye" : "Aminata Sow");
  const displayTitle = isRecruiter ? "DRH · Orange Sénégal" : "Directrice Marketing · Orange SN";
  const displayLocation = "Dakar, Sénégal";
  const avatarUrl = sessionAvatar ?? (
    isRecruiter
      ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80"
      : "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80"
  );
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const skills = isRecruiter ? SKILLS_RECRUITER : SKILLS_CANDIDATE;

  const bg = isDark ? "#0F172A" : "#F8FAFC";
  const cardBg = isDark ? "#111827" : "#FFFFFF";

  return (
    <View testID="profile-screen" style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >

          {/* ── Cover photo ── */}
          <View style={{ position: "relative", height: 160, marginBottom: 54 }}>
            <Image
              source={{ uri: COVER_URL }}
              style={{ width: "100%", height: 160 }}
              resizeMode="cover"
            />
            {/* Navy-to-transparent gradient overlay */}
            <LinearGradient
              colors={["rgba(27,47,110,0.72)", "transparent"]}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 100 }}
            />

            {/* Settings button top-right */}
            <Pressable
              onPress={() => router.push("/(app)/settings" as never)}
              style={{
                position: "absolute",
                top: 12,
                right: 14,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(0,0,0,0.42)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Settings size={17} color="#FFFFFF" strokeWidth={2} />
            </Pressable>

            {/* Avatar — overlapping cover bottom */}
            <View
              style={{
                position: "absolute",
                bottom: -48,
                left: 18,
              }}
            >
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  borderWidth: 3,
                  borderColor: isDark ? "#0F172A" : "#FFFFFF",
                  backgroundColor: NAVY,
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOpacity: 0.22,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 6,
                }}
              >
                {sessionAvatar ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                )}
              </View>
              {/* OPEN badge for candidate */}
              {!isRecruiter ? (
                <View
                  style={{
                    position: "absolute",
                    bottom: 2,
                    right: -4,
                    backgroundColor: ACCENT,
                    borderRadius: 7,
                    paddingHorizontal: 5,
                    paddingVertical: 2,
                    borderWidth: 2,
                    borderColor: isDark ? "#0F172A" : "#FFFFFF",
                  }}
                >
                  <Text style={{ fontSize: 8, fontWeight: "800", color: "#FFF" }}>OPEN</Text>
                </View>
              ) : null}
            </View>

            {/* Edit + Share buttons */}
            <View
              style={{
                position: "absolute",
                bottom: -40,
                right: 14,
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Pressable
                onPress={() => router.push("/(app)/edit-profile" as never)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: cardBg,
                  borderWidth: 1.5,
                  borderColor: isDark ? "#374151" : "#E5E7EB",
                }}
              >
                <Edit3 size={13} color={isDark ? "#D1D5DB" : "#374151"} strokeWidth={2.5} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#D1D5DB" : "#374151" }}>
                  Modifier
                </Text>
              </Pressable>
              <Pressable
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: cardBg,
                  borderWidth: 1.5,
                  borderColor: isDark ? "#374151" : "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Share2 size={15} color={isDark ? "#D1D5DB" : "#374151"} strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          {/* ── Identity ── */}
          <View style={{ paddingHorizontal: 18, paddingTop: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: isDark ? "#F9FAFB" : "#111827",
                  letterSpacing: -0.5,
                }}
              >
                {displayName}
              </Text>
              <BadgeCheck size={18} color={ACCENT} strokeWidth={2.5} />
            </View>
            <Text style={{ fontSize: 14, color: isDark ? "#9CA3AF" : "#6B7280", marginTop: 3, lineHeight: 20 }}>
              {displayTitle}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }}>
              <MapPin size={13} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />
              <Text style={{ fontSize: 13, color: isDark ? "#6B7280" : "#9CA3AF" }}>{displayLocation}</Text>
            </View>

            {/* Recruiter company card */}
            {isRecruiter ? (
              <View
                style={{
                  marginTop: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  backgroundColor: isDark ? "#1E2C50" : "#EEF2FF",
                  borderRadius: 12,
                }}
              >
                <Image
                  source={{ uri: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&q=80" }}
                  style={{ width: 32, height: 32, borderRadius: 8 }}
                />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: isDark ? "#D1D5DB" : "#111827" }}>Orange Sénégal</Text>
                  <Text style={{ fontSize: 12, color: isDark ? "#6B7280" : "#9CA3AF" }}>Télécommunications · 5 000+ employés</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* ── Stats row ── */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(80)}
            style={{
              flexDirection: "row",
              marginHorizontal: 18,
              marginTop: 18,
              backgroundColor: cardBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark ? "#1F2937" : "#E5E7EB",
              overflow: "hidden",
            }}
          >
            {[
              { value: "23", label: "Posts" },
              { value: "1.2K", label: "Abonnés" },
              { value: "847", label: "Suivis" },
            ].map((stat, i) => (
              <Pressable
                key={stat.label}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 14,
                  borderRightWidth: i < 2 ? 1 : 0,
                  borderRightColor: isDark ? "#1F2937" : "#E5E7EB",
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: "800", color: isDark ? "#F9FAFB" : NAVY }}>
                  {stat.value}
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? "#6B7280" : "#9CA3AF", marginTop: 2 }}>
                  {stat.label}
                </Text>
              </Pressable>
            ))}
          </Animated.View>

          {/* ── Profile strength (candidate) ── */}
          {!isRecruiter ? (
            <Animated.View
              entering={FadeInDown.duration(400).delay(130)}
              style={{
                marginHorizontal: 18,
                marginTop: 12,
                padding: 14,
                backgroundColor: isDark ? "#052E16" : "#F0FDF4",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isDark ? "#14532D" : "#BBF7D0",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <TrendingUp size={18} color={ACCENT} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: ACCENT }}>Profil à 78%</Text>
                <View
                  style={{
                    height: 5,
                    backgroundColor: isDark ? "#166534" : "#BBF7D0",
                    borderRadius: 3,
                    marginTop: 6,
                    overflow: "hidden",
                  }}
                >
                  <View style={{ width: "78%", height: 5, backgroundColor: ACCENT, borderRadius: 3 }} />
                </View>
              </View>
              <Text style={{ fontSize: 12, color: ACCENT, fontWeight: "700" }}>Compléter</Text>
            </Animated.View>
          ) : null}

          {/* ── Skills pills ── */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(160)}
            style={{ marginTop: 16, paddingHorizontal: 18 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Award size={15} color={NAVY} strokeWidth={2} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#F9FAFB" : "#111827" }}>
                  Compétences
                </Text>
              </View>
              <Pressable>
                <Plus size={17} color={NAVY} strokeWidth={2.5} />
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              style={{ flexGrow: 0 }}
            >
              {skills.map((skill) => (
                <View
                  key={skill}
                  style={{
                    paddingHorizontal: 13,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: isDark ? "#1E2C50" : "#EEF2FF",
                    borderWidth: 1,
                    borderColor: isDark ? "#3B4F8A" : "#C7D2FE",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#A5B4FC" : NAVY }}>
                    {skill}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Animated.View>

          {/* ── Content tabs ── */}
          <View
            style={{
              marginTop: 20,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? "#1F2937" : "#E5E7EB",
              flexDirection: "row",
              paddingHorizontal: 18,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flexDirection: "row" }}>
              {(["posts", "about"] as ProfileTab[]).map((tab) => {
                const active = activeTab === tab;
                const label = tab === "posts" ? "Activité" : isRecruiter ? "Offres" : "Expérience";
                return (
                  <Pressable
                    key={tab}
                    testID={`profile-tab-${tab}`}
                    onPress={() => setActiveTab(tab)}
                    style={{
                      paddingBottom: 12,
                      marginRight: 24,
                      borderBottomWidth: 2.5,
                      borderBottomColor: active ? ACCENT : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: active ? "700" : "500",
                        color: active ? (isDark ? "#F9FAFB" : "#111827") : isDark ? "#6B7280" : "#9CA3AF",
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Grid/List toggle (posts tab only) */}
            {activeTab === "posts" ? (
              <View style={{ flexDirection: "row", gap: 10, paddingBottom: 8 }}>
                <Pressable onPress={() => setViewMode("grid")} hitSlop={8}>
                  <Grid3x3
                    size={20}
                    color={viewMode === "grid" ? ACCENT : isDark ? "#6B7280" : "#9CA3AF"}
                    strokeWidth={2}
                  />
                </Pressable>
                <Pressable onPress={() => setViewMode("list")} hitSlop={8}>
                  <List
                    size={20}
                    color={viewMode === "list" ? ACCENT : isDark ? "#6B7280" : "#9CA3AF"}
                    strokeWidth={2}
                  />
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* ── Tab content ── */}
          {activeTab === "posts" ? (
            viewMode === "grid" ? (
              /* 3-column photo grid */
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 2,
                  paddingTop: 2,
                }}
              >
                {GRID_IMAGES.map((uri, i) => (
                  <Animated.View
                    key={i}
                    entering={FadeInDown.duration(300).delay(i * 40)}
                  >
                    <Pressable
                      style={{
                        width: GRID_CELL,
                        height: GRID_CELL,
                        backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
                        overflow: "hidden",
                      }}
                    >
                      <Image
                        source={{ uri }}
                        style={{ width: GRID_CELL, height: GRID_CELL }}
                        resizeMode="cover"
                      />
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            ) : (
              /* List view */
              <View style={{ paddingHorizontal: 18, paddingTop: 14, gap: 12 }}>
                {GRID_IMAGES.map((uri, i) => (
                  <Animated.View
                    key={i}
                    entering={FadeInDown.duration(300).delay(i * 40)}
                    style={{
                      backgroundColor: cardBg,
                      borderRadius: 14,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: isDark ? "#1F2937" : "#E5E7EB",
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={{ width: "100%", height: 180 }}
                      resizeMode="cover"
                    />
                    <View style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 16 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Heart size={15} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />
                        <Text style={{ fontSize: 12, color: isDark ? "#6B7280" : "#9CA3AF" }}>{47 + i * 13}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <MessageCircle size={15} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />
                        <Text style={{ fontSize: 12, color: isDark ? "#6B7280" : "#9CA3AF" }}>{8 + i * 3}</Text>
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </View>
            )
          ) : isRecruiter ? (
            /* Recruiter: active job listings */
            <View style={{ paddingHorizontal: 18, paddingTop: 14, gap: 10 }}>
              {RECRUITER_JOBS.map((job, i) => (
                <Animated.View
                  key={job.id}
                  entering={FadeInDown.duration(350).delay(i * 60)}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: isDark ? "#1F2937" : "#E5E7EB",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text
                      style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#F9FAFB" : "#111827", flex: 1 }}
                      numberOfLines={1}
                    >
                      {job.title}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: job.status === "active" ? (isDark ? "#052E16" : "#F0FDF4") : isDark ? "#1F2937" : "#F9FAFB",
                        marginLeft: 8,
                        borderWidth: 1,
                        borderColor: job.status === "active" ? (isDark ? "#14532D" : "#BBF7D0") : isDark ? "#374151" : "#E5E7EB",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: job.status === "active" ? ACCENT : isDark ? "#6B7280" : "#9CA3AF",
                        }}
                      >
                        {job.status === "active" ? "Actif" : "Fermé"}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Users size={13} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />
                      <Text style={{ fontSize: 12, color: isDark ? "#6B7280" : "#9CA3AF" }}>{job.applicants} candidats</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Eye size={13} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />
                      <Text style={{ fontSize: 12, color: isDark ? "#6B7280" : "#9CA3AF" }}>{job.views} vues</Text>
                    </View>
                    {job.status === "active" ? (
                      <Text style={{ fontSize: 12, color: isDark ? "#6B7280" : "#9CA3AF", marginLeft: "auto" }}>
                        {job.daysLeft}j restants
                      </Text>
                    ) : null}
                  </View>
                </Animated.View>
              ))}
              <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 14,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: isDark ? "#374151" : NAVY,
                  borderStyle: "dashed",
                  marginTop: 4,
                }}
              >
                <Plus size={16} color={isDark ? "#6B7280" : NAVY} strokeWidth={2.5} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#6B7280" : NAVY }}>
                  Publier une offre
                </Text>
              </Pressable>
            </View>
          ) : (
            /* Candidate: experience + education */
            <View style={{ paddingHorizontal: 18, paddingTop: 14, gap: 20 }}>

              {/* Experience */}
              <Animated.View entering={FadeInDown.duration(350).delay(0)}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Briefcase size={16} color={NAVY} strokeWidth={2} />
                    <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#F9FAFB" : "#111827" }}>
                      Expérience
                    </Text>
                  </View>
                  <Pressable>
                    <Plus size={18} color={NAVY} strokeWidth={2.5} />
                  </Pressable>
                </View>
                <View
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: isDark ? "#1F2937" : "#E5E7EB",
                    overflow: "hidden",
                  }}
                >
                  {CANDIDATE_EXPERIENCE.map((exp, i) => (
                    <View
                      key={exp.id}
                      style={{
                        padding: 14,
                        borderBottomWidth: i < CANDIDATE_EXPERIENCE.length - 1 ? 1 : 0,
                        borderBottomColor: isDark ? "#1F2937" : "#F3F4F6",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            backgroundColor: isDark ? "#1E2C50" : "#EEF2FF",
                            overflow: "hidden",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {exp.logo ? (
                            <Image source={{ uri: exp.logo }} style={{ width: 42, height: 42 }} resizeMode="cover" />
                          ) : (
                            <Building2 size={18} color={NAVY} strokeWidth={1.5} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#F9FAFB" : "#111827" }}>
                            {exp.role}
                          </Text>
                          <Text style={{ fontSize: 13, color: isDark ? "#9CA3AF" : "#6B7280", marginTop: 1 }}>
                            {exp.company}
                          </Text>
                          <Text style={{ fontSize: 12, color: isDark ? "#6B7280" : "#9CA3AF", marginTop: 2 }}>
                            {exp.period} · {exp.duration}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>

              {/* Education */}
              <Animated.View entering={FadeInDown.duration(350).delay(80)}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <GraduationCap size={16} color={NAVY} strokeWidth={2} />
                    <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#F9FAFB" : "#111827" }}>
                      Formation
                    </Text>
                  </View>
                  <Pressable>
                    <Plus size={18} color={NAVY} strokeWidth={2.5} />
                  </Pressable>
                </View>
                <View
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: isDark ? "#1F2937" : "#E5E7EB",
                    overflow: "hidden",
                  }}
                >
                  {CANDIDATE_EDUCATION.map((edu, i) => (
                    <View
                      key={edu.id}
                      style={{
                        padding: 14,
                        borderBottomWidth: i < CANDIDATE_EDUCATION.length - 1 ? 1 : 0,
                        borderBottomColor: isDark ? "#1F2937" : "#F3F4F6",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            backgroundColor: isDark ? "#1E2C50" : "#EEF2FF",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <GraduationCap size={18} color={NAVY} strokeWidth={1.5} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#F9FAFB" : "#111827" }}>
                            {edu.school}
                          </Text>
                          <Text style={{ fontSize: 13, color: isDark ? "#9CA3AF" : "#6B7280", marginTop: 1 }}>
                            {edu.degree}
                          </Text>
                          <Text style={{ fontSize: 12, color: isDark ? "#6B7280" : "#9CA3AF", marginTop: 2 }}>
                            {edu.period}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
