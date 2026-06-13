import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Search,
  X,
  MapPin,
  User,
  Building2,
  Crown,
  CheckCircle2,
  BadgeCheck,
  Briefcase,
  Check,
} from "lucide-react-native";
import { useDemoStore } from "../../../lib/demoStore";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { DEMO_CANDIDATES, DEMO_COMPANIES } from "@/lib/demoData";

// Local trilingual helper
function tl(lang: string, fr: string, en: string, zh: string): string {
  if (lang === "fr") return fr;
  if (lang === "zh") return zh;
  return en;
}

type PersonResult = {
  id: string;
  userId: string;
  name: string;
  subtitle: string;
  photoUrl: string | null;
  isVerified: boolean;
  isPremium?: boolean;
  type: "candidate" | "company";
  city?: string;
  isAvailable?: boolean;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

async function searchPeople(
  q: string
): Promise<{ candidates: PersonResult[]; companies: PersonResult[] }> {
  const lq = q.toLowerCase();

  const demoCandidates: PersonResult[] = DEMO_CANDIDATES
    .filter((c) =>
      c.fullName.toLowerCase().includes(lq) ||
      c.headline.toLowerCase().includes(lq) ||
      c.city.toLowerCase().includes(lq) ||
      c.skills.some((s) => s.skillName.toLowerCase().includes(lq))
    )
    .map((c) => ({
      id: c.userId,
      userId: c.userId,
      name: c.fullName,
      subtitle: c.headline,
      photoUrl: c.avatarUri,
      isVerified: c.isVerified,
      isPremium: false,
      type: "candidate" as const,
      city: c.city,
      isAvailable: c.availabilityStatus?.toLowerCase().includes("disponible") ||
        c.availabilityStatus?.toLowerCase().includes("available") ||
        c.availabilityStatus?.toLowerCase().includes("ouvert") ||
        c.availabilityStatus?.toLowerCase().includes("open"),
    }));

  const demoCompanies: PersonResult[] = DEMO_COMPANIES
    .filter((c) =>
      c.companyName.toLowerCase().includes(lq) ||
      c.sector.toLowerCase().includes(lq) ||
      c.city.toLowerCase().includes(lq)
    )
    .map((c) => ({
      id: c.id,
      userId: c.id,
      name: c.companyName,
      subtitle: c.sector,
      photoUrl: null,
      isVerified: c.isVerified,
      isPremium: false,
      type: "company" as const,
      city: c.city,
      isAvailable: false,
    }));

  try {
    if (!q.trim()) return { candidates: demoCandidates, companies: demoCompanies };
    const base = process.env.EXPO_PUBLIC_BACKEND_URL!;
    const res = await fetch(
      `${base}/api/search/people?q=${encodeURIComponent(q)}`,
      { credentials: "include" }
    );
    const json = (await res.json()) as any;
    if (!res.ok) return { candidates: demoCandidates, companies: demoCompanies };
    const backendData = json.data as { candidates: PersonResult[]; companies: PersonResult[] };
    const realCandidateIds = new Set(backendData.candidates.map((c) => c.userId));
    const mergedCandidates = [
      ...backendData.candidates,
      ...demoCandidates.filter((d) => !realCandidateIds.has(d.userId)),
    ];
    const realCompanyIds = new Set(backendData.companies.map((c) => c.id));
    const mergedCompanies = [
      ...backendData.companies,
      ...demoCompanies.filter((d) => !realCompanyIds.has(d.id)),
    ];
    return { candidates: mergedCandidates.slice(0, 20), companies: mergedCompanies };
  } catch {
    return { candidates: demoCandidates, companies: demoCompanies };
  }
}

function PersonAvatar({
  uri,
  name,
  type,
  colors,
}: {
  uri: string | null;
  name: string;
  type: "candidate" | "company";
  colors: any;
}) {
  const bg = type === "candidate" ? colors.placeholder : colors.card;
  const color = type === "candidate" ? colors.primary : colors.accent;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: 48, height: 48, borderRadius: 24 }}
      />
    );
  }
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700", color }}>
        {initials || "?"}
      </Text>
    </View>
  );
}

const CITIES = ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor"];

function PersonRow({
  person,
  colors,
  onPress,
  hasSent,
  onConnect,
}: {
  person: PersonResult;
  colors: any;
  onPress: () => void;
  hasSent?: boolean;
  onConnect?: () => void;
}) {
  const { t } = useLang();
  const lang = useLang((s) => s.lang);
  const isCompany = person.type === "company";
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        padding: 12,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
      testID={`person-row-${person.userId}`}
    >
      <PersonAvatar uri={person.photoUrl} name={person.name} type={person.type} colors={colors} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text
            style={{ fontSize: 15, fontWeight: "700", color: colors.text }}
            numberOfLines={1}
          >
            {person.name}
          </Text>
          {person.isPremium ? (
            <Crown size={13} color="#F5A623" strokeWidth={2.5} />
          ) : null}
          {person.isVerified ? (
            isCompany ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF8C00', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 2, gap: 2 }}>
                <Building2 size={9} color="#fff" strokeWidth={2.5} />
                <Check size={9} color="#fff" strokeWidth={3} />
              </View>
            ) : (
              <CheckCircle2 size={13} color={colors.accent} />
            )
          ) : null}
        </View>
        {person.subtitle ? (
          <Text
            style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}
            numberOfLines={1}
          >
            {person.subtitle}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          onPress();
        }}
        testID={`view-profile-btn-${person.userId}`}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: "#3BAD4E",
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }} numberOfLines={1}>
          {tl(lang, "Voir le profil", "View Profile", "查看资料")}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

type DemoCompany = typeof DEMO_COMPANIES[0];

function CompanyCard({
  company,
  colors,
  isDark,
  lang,
  onPress,
}: {
  company: DemoCompany;
  colors: any;
  isDark: boolean;
  lang: string;
  onPress: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
      testID={`company-card-${company.id}`}
    >
      {/* Header row: logo + name + verified */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
        {/* Logo circle */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: company.logoColor,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#FFFFFF" }}>
            {company.logoInitials}
          </Text>
        </View>

        {/* Name + badge */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: colors.text }}
              numberOfLines={1}
            >
              {company.companyName}
            </Text>
            {company.isVerified ? (
              <BadgeCheck size={16} color="#F59E0B" strokeWidth={2} />
            ) : null}
          </View>

          {/* Sector */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
            <Briefcase size={12} color={colors.textMuted} strokeWidth={2} />
            <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
              {company.sector}
            </Text>
          </View>
        </View>
      </View>

      {/* Location + jobs count row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <MapPin size={12} color={colors.textMuted} strokeWidth={2} />
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            {company.city}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Briefcase size={12} color="#3BAD4E" strokeWidth={2} />
          <Text style={{ fontSize: 13, color: "#3BAD4E", fontWeight: "600" }}>
            {company.activeJobsCount} {tl(lang, "offres actives", "active listings", "个职位")}
          </Text>
        </View>
      </View>

      {/* View profile button */}
      <TouchableOpacity
        onPress={onPress}
        testID={`company-view-profile-${company.id}`}
        style={{
          backgroundColor: "#3BAD4E",
          borderRadius: 10,
          paddingVertical: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
          {tl(lang, "Voir le profil", "View profile", "查看资料")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const { t } = useLang();
  const lang = useLang((s) => s.lang);
  const isFr = lang === "fr";

  const [activeTab, setActiveTab] = useState<"people" | "companies">("people");
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [selectedPeopleCity, setSelectedPeopleCity] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const addConnection = useDemoStore((s) => s.addConnection);
  const connections = useDemoStore((s) => s.connections);

  const debouncedQuery = useDebounce(query, 350);
  const [peopleResults, setPeopleResults] = useState<{
    candidates: PersonResult[];
    companies: PersonResult[];
  }>({ candidates: [], companies: [] });
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPeopleLoading(true);
    setPeopleError(false);
    searchPeople(debouncedQuery)
      .then((res) => {
        if (!cancelled) {
          setPeopleResults(res);
          setPeopleLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPeopleError(true);
          setPeopleLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Apply people filters to candidates
  const filteredCandidates = peopleResults.candidates.filter((p) => {
    if (selectedPeopleCity && p.city !== selectedPeopleCity) return false;
    if (verifiedOnly && !p.isVerified) return false;
    if (availableOnly && !p.isAvailable) return false;
    return true;
  });

  // Apply filters to companies
  const filteredCompanies = peopleResults.companies.filter((p) => {
    if (selectedPeopleCity && p.city !== selectedPeopleCity) return false;
    if (verifiedOnly && !p.isVerified) return false;
    return true;
  });

  // Filter DEMO_COMPANIES directly for the companies tab (richer data)
  const lq = debouncedQuery.toLowerCase();
  const filteredDemoCompanies = DEMO_COMPANIES.filter((c) => {
    const matchesQuery =
      !lq ||
      c.companyName.toLowerCase().includes(lq) ||
      c.sector.toLowerCase().includes(lq) ||
      c.city.toLowerCase().includes(lq);
    const matchesCity = !selectedPeopleCity || c.city === selectedPeopleCity;
    const matchesVerified = !verifiedOnly || c.isVerified;
    return matchesQuery && matchesCity && matchesVerified;
  });

  const hasPeopleFilters = selectedPeopleCity !== null || verifiedOnly || availableOnly;
  const clearPeopleFilters = () => {
    setSelectedPeopleCity(null);
    setVerifiedOnly(false);
    setAvailableOnly(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      {/* Search bar */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.card,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 11,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={{ flex: 1, fontSize: 15, color: colors.text }}
            placeholder={t("search_input_placeholder")}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            testID="search-input"
            selectionColor={colors.accent}
            cursorColor={colors.accent}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} testID="clear-search-button">
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab bar */}
      <View
        style={{
          flexDirection: "row",
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 10,
          backgroundColor: isDark ? "#243260" : "#F3F4F6",
          padding: 4,
        }}
        testID="search-tabs"
      >
        <TouchableOpacity
          onPress={() => setActiveTab("people")}
          testID="tab-people"
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            alignItems: "center",
            backgroundColor: activeTab === "people" ? "#3BAD4E" : "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: activeTab === "people" ? "700" : "500",
              color: activeTab === "people" ? "#FFFFFF" : (isDark ? "#9BA5BF" : "#6B7280"),
            }}
          >
            {tl(lang, "Personnes", "People", "人才")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("companies")}
          testID="tab-companies"
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            alignItems: "center",
            backgroundColor: activeTab === "companies" ? "#3BAD4E" : "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: activeTab === "companies" ? "700" : "500",
              color: activeTab === "companies" ? "#FFFFFF" : (isDark ? "#9BA5BF" : "#6B7280"),
            }}
          >
            {tl(lang, "Entreprises", "Companies", "企业")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
        testID="people-list"
      >
        {/* Inline filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: "center", paddingBottom: 10 }}
        >
          {/* City chips */}
          {CITIES.map((city) => (
            <TouchableOpacity
              key={city}
              onPress={() => setSelectedPeopleCity(selectedPeopleCity === city ? null : city)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                height: 36,
                paddingHorizontal: 14,
                borderRadius: 18,
                backgroundColor: selectedPeopleCity === city ? colors.primary : colors.card,
                borderWidth: 1,
                borderColor: selectedPeopleCity === city ? colors.primary : colors.border,
              }}
            >
              <MapPin size={12} color={selectedPeopleCity === city ? "#fff" : colors.textMuted} strokeWidth={2} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: selectedPeopleCity === city ? "#fff" : colors.textSecondary }}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Verified chip */}
          <TouchableOpacity
            onPress={() => setVerifiedOnly(!verifiedOnly)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              height: 36,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: verifiedOnly ? colors.accent : colors.card,
              borderWidth: 1,
              borderColor: verifiedOnly ? colors.accent : colors.border,
            }}
          >
            <BadgeCheck size={12} color={verifiedOnly ? "#fff" : colors.accent} strokeWidth={2} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: verifiedOnly ? "#fff" : colors.textSecondary }}>
              {tl(lang, "Vérifiée", "Verified", "已认证")}
            </Text>
          </TouchableOpacity>

          {/* Available chip — only shown on People tab */}
          {activeTab === "people" ? (
            <TouchableOpacity
              onPress={() => setAvailableOnly(!availableOnly)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                height: 36,
                paddingHorizontal: 14,
                borderRadius: 18,
                backgroundColor: availableOnly ? "#3BAD4E" : colors.card,
                borderWidth: 1,
                borderColor: availableOnly ? "#3BAD4E" : colors.border,
              }}
            >
              <Briefcase size={12} color={availableOnly ? "#fff" : "#3BAD4E"} strokeWidth={2} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: availableOnly ? "#fff" : colors.textSecondary }}>
                {isFr ? "Disponible" : "Available"}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Clear filters */}
          {hasPeopleFilters ? (
            <TouchableOpacity
              onPress={clearPeopleFilters}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 10,
                height: 36,
                backgroundColor: colors.toggleBg,
                borderRadius: 18,
              }}
            >
              <X size={13} color={colors.textMuted} />
              <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "600" }}>
                {isFr ? "Effacer" : "Clear"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {/* ── PEOPLE TAB ── */}
        {activeTab === "people" ? (
          <>
            {peopleLoading ? (
              <View style={{ alignItems: "center", paddingTop: 60 }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : peopleError ? (
              <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 40 }}>
                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center" }}>
                  {isFr
                    ? "Erreur lors de la recherche. Veuillez réessayer."
                    : "Search failed. Please try again."}
                </Text>
              </View>
            ) : filteredCandidates.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 60,
                  gap: 10,
                  paddingHorizontal: 40,
                }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: colors.placeholder,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <User size={32} color={colors.textMuted} strokeWidth={1.5} />
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.text,
                    textAlign: "center",
                  }}
                >
                  {isFr ? "Aucun résultat trouvé" : "No results found"}
                </Text>
                {query.trim().length > 0 ? (
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textMuted,
                      textAlign: "center",
                    }}
                  >
                    {isFr
                      ? `Aucun résultat pour « ${query} »`
                      : `No results for "${query}"`}
                  </Text>
                ) : null}
              </View>
            ) : (
              <>
                {/* Candidates section header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    gap: 6,
                  }}
                >
                  <User size={14} color={colors.primary} strokeWidth={2.5} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: colors.primary,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    {isFr ? "Candidats" : "Candidates"}
                    {"  "}
                    <Text style={{ color: colors.textMuted, fontWeight: "500" }}>
                      {filteredCandidates.length}
                    </Text>
                  </Text>
                </View>
                {filteredCandidates.map((person) => (
                  <PersonRow
                    key={person.userId}
                    person={person}
                    colors={colors}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/profile-view",
                        params: { userId: person.userId, type: "candidate" },
                      })
                    }
                    hasSent={sentRequests.has(person.userId) || connections.some((c) => c.candidate.id === person.userId)}
                    onConnect={() => {
                      setSentRequests((prev) => new Set([...prev, person.userId]));
                      const demoCandidate = DEMO_CANDIDATES.find((c) => c.userId === person.userId);
                      if (demoCandidate) {
                        addConnection(demoCandidate);
                      }
                    }}
                  />
                ))}
              </>
            )}
          </>
        ) : null}

        {/* ── COMPANIES TAB ── */}
        {activeTab === "companies" ? (
          <>
            {filteredDemoCompanies.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 60,
                  gap: 10,
                  paddingHorizontal: 40,
                }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: colors.placeholder,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Building2 size={32} color={colors.textMuted} strokeWidth={1.5} />
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.text,
                    textAlign: "center",
                  }}
                >
                  {tl(lang, "Aucune entreprise trouvée", "No companies found", "没有找到公司")}
                </Text>
                {query.trim().length > 0 ? (
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textMuted,
                      textAlign: "center",
                    }}
                  >
                    {isFr
                      ? `Aucun résultat pour « ${query} »`
                      : `No results for "${query}"`}
                  </Text>
                ) : null}
              </View>
            ) : (
              <>
                {/* Companies section header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    gap: 6,
                  }}
                >
                  <Building2 size={14} color={colors.accent} strokeWidth={2.5} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: colors.accent,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    {tl(lang, "Entreprises", "Companies", "企业")}
                    {"  "}
                    <Text style={{ color: colors.textMuted, fontWeight: "500" }}>
                      {filteredDemoCompanies.length}
                    </Text>
                  </Text>
                </View>
                {filteredDemoCompanies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    colors={colors}
                    isDark={isDark}
                    lang={lang}
                    onPress={() =>
                      router.push({
                        pathname: "/company-profile",
                        params: { companyId: company.id },
                      } as never)
                    }
                  />
                ))}
              </>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
