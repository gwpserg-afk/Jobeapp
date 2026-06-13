import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  StatusBar,
  Image,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  MapPin,
  Users,
  X,
  ChevronDown,
  UserCheck,
  BadgeCheck,
} from "lucide-react-native";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme";
import { useDebounce } from "@/lib/useDebounce";
import { useLang } from "@/lib/i18n";
import { api } from "@/lib/api/api";
import { DEMO_CANDIDATES } from "@/lib/demoData";
import { useRouter } from "expo-router";

// ─── Brand constants ──────────────────────────────────────────────────────────

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";
const ORANGE = "#F39C12";

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchCandidate = {
  id: string;
  userId: string;
  fullName: string;
  profilePhotoUrl: string | null;
  city: string;
  neighborhood: string | null;
  headline: string | null;
  availabilityStatus: string;
  profileCompletePct: number;
  cvUrl: string | null;
  _count: { experiences: number; skills: number };
  skills: { skillName: string; skillLevel: string }[];
  experiences: { companyName: string; roleTitle: string; isCurrent: boolean }[];
  languages: { language: string; level: string }[];
  updatedAt: string;
  isVerified?: boolean;
  initials?: string;
  avatarColor?: string;
};

type AvailFilter = "all" | "available" | "soon";

// ─── City list ───────────────────────────────────────────────────────────────

const CITIES = [
  null,
  "Dakar",
  "Thiès",
  "Saint-Louis",
  "Ziguinchor",
  "Kaolack",
  "Rufisque",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── CandidateCard ───────────────────────────────────────────────────────────

function CandidateCard({
  candidate,
  onPress,
  isDark,
  navyText,
  t,
}: {
  candidate: SearchCandidate;
  onPress: () => void;
  isDark: boolean;
  navyText: string;
  t: (k: import("@/lib/i18n").TranslationKey) => string;
}) {
  const cardBg = isDark ? "#1E2C50" : "#FFFFFF";
  const initials = candidate.initials ?? getInitials(candidate.fullName);
  const avatarColor = candidate.avatarColor ?? NAVY;
  const skills = candidate.skills ?? [];
  const visibleSkills = skills.slice(0, 3);
  const extraCount = skills.length - 3;

  const availStatus = candidate.availabilityStatus;
  const availLabel =
    availStatus === "available"
      ? t("talents_available_label")
      : availStatus === "soon"
      ? t("talents_soon_label")
      : t("talents_unavailable_label");
  const availBg =
    availStatus === "available"
      ? "#DCFCE7"
      : availStatus === "soon"
      ? "#FEF3C7"
      : "#F1F5F9";
  const availColor =
    availStatus === "available"
      ? GREEN
      : availStatus === "soon"
      ? ORANGE
      : "#94A3B8";

  return (
    <Pressable
      testID={`candidate-card-${candidate.id}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? (isDark ? "#243260" : "#F8FAFF") : cardBg,
        borderRadius: 12,
        marginBottom: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.2 : 0.06,
        shadowRadius: 8,
        elevation: 3,
      })}
    >
      {/* Top row: avatar + info */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        {/* Avatar */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: avatarColor,
            flexShrink: 0,
          }}
        >
          {candidate.profilePhotoUrl ? (
            <Image
              source={{ uri: candidate.profilePhotoUrl }}
              style={{ width: 52, height: 52, borderRadius: 26 }}
            />
          ) : (
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#FFFFFF" }}>
              {initials}
            </Text>
          )}
        </View>

        {/* Name + headline + location + badges */}
        <View style={{ flex: 1 }}>
          {/* Name row with verified badge */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{ fontSize: 15, fontWeight: "700", color: navyText, lineHeight: 20, flex: 1, flexShrink: 1 }}
              numberOfLines={1}
            >
              {candidate.fullName}
            </Text>
            {candidate.isVerified ? (
              <BadgeCheck size={15} color="#2563EB" strokeWidth={2} />
            ) : null}
          </View>

          {/* Headline */}
          {candidate.headline ? (
            <Text
              style={{
                fontSize: 12,
                color: isDark ? "#9BA5BF" : "#6B7280",
                marginTop: 2,
                lineHeight: 16,
              }}
              numberOfLines={2}
            >
              {candidate.headline}
            </Text>
          ) : null}

          {/* Location row */}
          {candidate.city ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
                marginTop: 5,
              }}
            >
              <MapPin size={12} color={isDark ? "#9BA5BF" : "#6B7280"} strokeWidth={2} />
              <Text style={{ fontSize: 12, color: isDark ? "#9BA5BF" : "#6B7280" }}>
                {candidate.city}
                {candidate.neighborhood ? ` · ${candidate.neighborhood}` : null}
              </Text>
            </View>
          ) : null}

          {/* Availability badge */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 }}>
            <View
              style={{
                backgroundColor: availBg,
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: availColor }}>
                {availLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Skills row */}
      {visibleSkills.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {visibleSkills.map((skill) => (
            <View
              key={skill.skillName}
              style={{
                backgroundColor: isDark ? "#243260" : "#EEF2FF",
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: navyText }}>
                {skill.skillName}
              </Text>
            </View>
          ))}
          {extraCount > 0 ? (
            <View
              style={{
                backgroundColor: isDark ? "#2A3B6A" : "#F3F4F6",
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: isDark ? "#9BA5BF" : "#6B7280",
                }}
              >
                +{extraCount}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* View profile button */}
      <Pressable
        testID={`view-profile-btn-${candidate.id}`}
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: pressed ? "#2E9940" : GREEN,
          borderRadius: 8,
          height: 40,
          marginTop: 12,
        })}
      >
        <UserCheck size={16} color="#FFFFFF" strokeWidth={2} />
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
          {t("talents_view_profile_btn")}
        </Text>
      </Pressable>
    </Pressable>
  );
}

// ─── CityPickerModal ──────────────────────────────────────────────────────────

function CityPickerModal({
  visible,
  selectedCity,
  onSelect,
  onClose,
  isDark,
  navyText,
  t,
}: {
  visible: boolean;
  selectedCity: string;
  onSelect: (city: string) => void;
  onClose: () => void;
  isDark: boolean;
  navyText: string;
  t: (k: import("@/lib/i18n").TranslationKey) => string;
}) {
  const cardBg = isDark ? "#1E2C50" : "#FFFFFF";
  const pageBg = isDark ? "#0F1B3D" : "#F5F7FA";
  const borderColor = isDark ? "#2A3B6A" : "#E5E7EB";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: pageBg }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
            backgroundColor: cardBg,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: navyText }}>
            {t("talents_city_picker_title")}
          </Text>
          <Pressable
            testID="close-city-modal"
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isDark ? "#243260" : "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} color={isDark ? "#9BA5BF" : "#6B7280"} strokeWidth={2.5} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 8 }}>
          {CITIES.map((city) => {
            const isAllCities = city === null;
            const isSelected = isAllCities ? selectedCity === "" : selectedCity === city;
            const displayCity = isAllCities ? t("talents_all_cities") : city;
            return (
              <Pressable
                key={city ?? "__all__"}
                testID={`city-option-${city ?? "all"}`}
                onPress={() => {
                  onSelect(isAllCities ? "" : city!);
                  onClose();
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  backgroundColor: pressed
                    ? isDark
                      ? "#243260"
                      : "#F8FAFF"
                    : isSelected
                    ? isDark
                      ? "#1E2C50"
                      : "#EEF2FF"
                    : "transparent",
                })}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: isSelected ? "700" : "500",
                    color: isSelected ? navyText : isDark ? "#9BA5BF" : "#374151",
                  }}
                >
                  {displayCity}
                </Text>
                {isSelected ? (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: NAVY,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#FFFFFF", fontWeight: "700" }}>
                      ✓
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TalentsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const t = useLang((s) => s.t);
  const navyText = isDark ? "#F5F5F5" : NAVY;
  const pageBg = isDark ? "#0F1B3D" : "#F5F7FA";
  const cardBg = isDark ? "#1E2C50" : "#FFFFFF";
  const searchBg = isDark ? "#243260" : "#EDEDF0";
  const borderColor = isDark ? "#2A3B6A" : "#E5E7EB";

  const [query, setQuery] = useState<string>("");
  const [availFilter, setAvailFilter] = useState<AvailFilter>("all");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [cityModalVisible, setCityModalVisible] = useState<boolean>(false);

  const debouncedQuery = useDebounce(query, 350);

  // Build query params for API
  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (debouncedQuery.trim()) p.q = debouncedQuery.trim();
    if (availFilter !== "all") p.availability = availFilter;
    if (selectedCity.trim()) p.city = selectedCity.trim();
    return p;
  }, [debouncedQuery, availFilter, selectedCity]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["candidates-search", queryParams],
    queryFn: () =>
      api.get<{
        candidates: SearchCandidate[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/api/candidates/search?${new URLSearchParams(queryParams).toString()}`),
    staleTime: 30000,
  });

  const candidates = data?.candidates ?? [];

  // Build demo candidates in the SearchCandidate shape with "soon" override for indices 15, 16, 17
  const demoCandidatesAsSearch: SearchCandidate[] = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    return DEMO_CANDIDATES.map((c, idx) => ({
      id: c.id,
      userId: c.userId,
      fullName: c.fullName,
      profilePhotoUrl: c.avatarUri,
      city: c.city,
      neighborhood: c.neighborhood ?? null,
      headline: c.headline,
      availabilityStatus: idx === 15 || idx === 16 || idx === 17 ? "soon" : "available",
      profileCompletePct: 80,
      cvUrl: null,
      _count: { experiences: 0, skills: c.skills.length },
      skills: c.skills.map((s) => ({ skillName: s.skillName, skillLevel: s.level })),
      experiences: [],
      languages: [],
      updatedAt: new Date().toISOString(),
      isVerified: c.isVerified,
      initials: c.initials,
      avatarColor: c.avatarColor,
    })).filter((c) => {
      if (q.length > 0) {
        return (
          c.fullName.toLowerCase().includes(q) ||
          (c.headline ?? "").toLowerCase().includes(q) ||
          c.skills.some((s) => s.skillName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [debouncedQuery]);

  // Merge real + demo: interleave so real profiles are spread throughout, not all at the top
  const mergedCandidates: SearchCandidate[] = useMemo(() => {
    if (candidates.length >= 20) return candidates;
    const realIds = new Set(candidates.map((c) => c.userId));
    const demoFill = demoCandidatesAsSearch.filter((d) => !realIds.has(d.userId));
    if (candidates.length === 0) return demoFill.slice(0, 20);
    // Spread real candidates evenly through the list
    const total = Math.min(candidates.length + demoFill.length, 20);
    const step = Math.floor(total / candidates.length);
    const result: SearchCandidate[] = [];
    let ri = 0;
    let di = 0;
    for (let i = 0; i < total; i++) {
      if (ri < candidates.length && (i % step === Math.floor(step / 2) || di >= demoFill.length)) {
        result.push(candidates[ri++]!);
      } else if (di < demoFill.length) {
        result.push(demoFill[di++]!);
      }
    }
    return result;
  }, [candidates, demoCandidatesAsSearch]);

  // Apply availability + city filters client-side
  const filteredCandidates: SearchCandidate[] = useMemo(() => {
    return mergedCandidates.filter((c) => {
      if (availFilter !== "all" && c.availabilityStatus !== availFilter) return false;
      if (selectedCity && c.city !== selectedCity) return false;
      return true;
    });
  }, [mergedCandidates, availFilter, selectedCity]);

  async function handleRefresh() {
    await refetch();
  }

  const filterChips: Array<{
    key: AvailFilter;
    label: string;
    activeColor: string;
  }> = [
    { key: "all", label: t("talents_filter_all"), activeColor: NAVY },
    { key: "available", label: t("talents_filter_available"), activeColor: GREEN },
    { key: "soon", label: t("talents_filter_soon"), activeColor: ORANGE },
  ];

  const profileCount = filteredCandidates.length;

  return (
    <View
      testID="talents-screen"
      style={{ flex: 1, backgroundColor: pageBg }}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={cardBg}
      />

      {/* Header + search + filters (sticky top area) */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: cardBg }}>
        {/* Title block */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: navyText,
              letterSpacing: -0.5,
              marginBottom: 2,
            }}
          >
            {t("talents_title")}
          </Text>
          <Text style={{ fontSize: 13, color: isDark ? "#9BA5BF" : "#6B7280" }}>
            {t("talents_subtitle")}
          </Text>

          {/* Search bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: searchBg,
              borderRadius: 24,
              paddingHorizontal: 14,
              height: 48,
              marginTop: 14,
              gap: 8,
            }}
          >
            <Search size={18} color={isDark ? "#9BA5BF" : "#9CA3AF"} strokeWidth={2} />
            <TextInput
              testID="talent-search-input"
              value={query}
              onChangeText={setQuery}
              placeholder={t("talents_search_placeholder")}
              placeholderTextColor={isDark ? "#9BA5BF" : "#9CA3AF"}
              style={{
                flex: 1,
                fontSize: 15,
                color: isDark ? "#F5F5F5" : "#111827",
                fontWeight: "400",
                height: 48,
              }}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 ? (
              <Pressable
                testID="clear-talent-search"
                onPress={() => setQuery("")}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: isDark ? "#2A3B6A" : "#D1D5DB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={12} color={isDark ? "#9BA5BF" : "#6B7280"} strokeWidth={2.5} />
              </Pressable>
            ) : null}
          </View>

          {/* Filter chips row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, marginTop: 12 }}
            contentContainerStyle={{ gap: 8, paddingRight: 4 }}
          >
            {filterChips.map((chip) => {
              const isActive = availFilter === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  testID={`filter-chip-${chip.key}`}
                  onPress={() => setAvailFilter(chip.key)}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    backgroundColor: isActive
                      ? chip.activeColor
                      : isDark
                      ? "#243260"
                      : "#EDEDF0",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: isActive ? "#FFFFFF" : navyText,
                    }}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Count line */}
          <Text
            style={{
              fontSize: 13,
              color: isDark ? "#9BA5BF" : "#6B7280",
              marginTop: 10,
            }}
          >
            {isLoading
              ? t("recruiter_loading")
              : `${profileCount} ${t("talents_profiles_found")}`}
          </Text>

          {/* Location filter pill row */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
            {selectedCity ? (
              <Pressable
                testID="city-filter-pill"
                onPress={() => setCityModalVisible(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: isDark ? "#FFFFFF" : NAVY,
                }}
              >
                <MapPin size={13} color={navyText} strokeWidth={2} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: navyText }}>
                  {selectedCity}
                </Text>
                <Pressable
                  testID="clear-city-filter"
                  onPress={() => setSelectedCity("")}
                  hitSlop={8}
                >
                  <X size={13} color={navyText} strokeWidth={2.5} />
                </Pressable>
              </Pressable>
            ) : (
              <Pressable
                testID="city-filter-pill"
                onPress={() => setCityModalVisible(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: isDark ? "#4A5568" : NAVY,
                }}
              >
                <MapPin size={13} color={navyText} strokeWidth={2} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: navyText }}>
                  {t("talents_all_cities_btn")}
                </Text>
                <ChevronDown size={13} color={navyText} strokeWidth={2} />
              </Pressable>
            )}
            {isFetching && !isLoading ? (
              <ActivityIndicator
                testID="fetching-indicator"
                size="small"
                color={NAVY}
                style={{ marginLeft: 10 }}
              />
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      {/* Main list content */}
      {isLoading ? (
        <View
          testID="loading-indicator"
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : isError ? (
        <View
          testID="error-state"
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              color: isDark ? "#9BA5BF" : "#6B7280",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
          {t("talents_load_error")}
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#152452" : NAVY,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 24,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
              {t("recruiter_retry_btn")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          testID="talents-list"
          data={filteredCandidates}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CandidateCard
              candidate={item}
              onPress={() => router.push({ pathname: "/(app)/(recruiter)/candidate-profile", params: { id: item.id } } as never)}
              isDark={isDark}
              navyText={navyText}
              t={t}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 32,
          }}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: pageBg }}
          refreshControl={
            <RefreshControl
              refreshing={!!(isFetching && !isLoading)}
              onRefresh={handleRefresh}
              tintColor={NAVY}
              colors={[NAVY]}
            />
          }
          ListEmptyComponent={
            <View
              testID="talents-empty-state"
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 32,
                paddingTop: 80,
              }}
            >
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
                <Users size={30} color={NAVY} strokeWidth={1.5} />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: navyText,
                  textAlign: "center",
                }}
              >
                {query.length > 0
                  ? `${t("talents_empty_search_prefix")} "${query}"`
                  : t("talents_empty_no_profiles")}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: isDark ? "#9BA5BF" : "#6B7280",
                  textAlign: "center",
                  marginTop: 8,
                  lineHeight: 18,
                }}
              >
                {query.length > 0
                  ? t("talents_empty_try_keywords")
                  : t("talents_empty_modify_filters")}
              </Text>
            </View>
          }
        />
      )}

      {/* City Picker Modal */}
      <CityPickerModal
        visible={cityModalVisible}
        selectedCity={selectedCity}
        onSelect={setSelectedCity}
        onClose={() => setCityModalVisible(false)}
        isDark={isDark}
        navyText={navyText}
        t={t}
      />
    </View>
  );
}
