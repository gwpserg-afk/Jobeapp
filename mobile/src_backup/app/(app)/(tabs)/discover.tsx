import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  ScrollView,
  Image,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Briefcase,
  Building2,
  Users,
  X,
  ChevronDown,
  BadgeCheck,
  UserPlus,
  TrendingUp,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { useDemoStore } from "@/lib/demoStore";

const ACCENT = "#3BAD4E";
const NAVY = "#1B2F6E";

type Tab = "jobs" | "people" | "companies";

const CONTRACT_COLORS: Record<string, string> = {
  CDI: "#3BAD4E",
  CDD: "#2563EB",
  Stage: "#F97316",
  Freelance: "#9333EA",
};

const JOBS = [
  { id: "j1", title: "Ingénieur Développement Web", company: "Orange Sénégal", location: "Dakar, Plateau", contract: "CDI", salary: "800–1 200K CFA", verified: true, urgent: false, initials: "OS", logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&q=80", sector: "Tech", applicants: 34 },
  { id: "j2", title: "Responsable Marketing Digital", company: "Sonatel", location: "Dakar, Almadies", contract: "CDI", salary: "600–900K CFA", verified: true, urgent: true, initials: "SO", logo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=80&q=80", sector: "Marketing", applicants: 18 },
  { id: "j3", title: "Comptable Senior", company: "Coris Bank", location: "Dakar, Mermoz", contract: "CDI", salary: "500–700K CFA", verified: true, urgent: false, initials: "CB", logo: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=80&q=80", sector: "Finance", applicants: 52 },
  { id: "j4", title: "Chef de Projet Agile", company: "Gainde 2000", location: "Dakar, Point E", contract: "CDD", salary: "700K CFA", verified: false, urgent: false, initials: "G2", logo: undefined, sector: "Logistique", applicants: 7 },
  { id: "j5", title: "Designer UI/UX Senior", company: "Expresso", location: "Dakar, Liberté 6", contract: "Freelance", salary: "Sur dossier", verified: true, urgent: false, initials: "EX", logo: undefined, sector: "Design", applicants: 12 },
  { id: "j6", title: "Chargé de Communication", company: "La Poste Sénégal", location: "Dakar, Médina", contract: "Stage", salary: "150K CFA", verified: true, urgent: false, initials: "LP", logo: undefined, sector: "Communication", applicants: 29 },
  { id: "j7", title: "Data Analyst", company: "Wave Mobile Money", location: "Dakar, Plateau", contract: "CDI", salary: "900K–1.4M CFA", verified: true, urgent: true, initials: "WV", logo: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=80&q=80", sector: "Tech", applicants: 41 },
];

const PEOPLE = [
  { id: "p1", name: "Aminata Sow", title: "Développeuse Full-Stack", location: "Dakar", avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&q=80", connections: 312, connected: false, openToWork: true },
  { id: "p2", name: "Ousmane Diallo", title: "Directeur Financier", location: "Dakar", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80", connections: 841, connected: true, openToWork: false },
  { id: "p3", name: "Fatou Diop", title: "Chef de Projet Marketing", location: "Dakar", avatar: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=120&q=80", connections: 567, connected: false, openToWork: false },
  { id: "p4", name: "Boubacar Ndiaye", title: "Ingénieur Systèmes", location: "Saint-Louis", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&q=80", connections: 198, connected: false, openToWork: true },
  { id: "p5", name: "Mariama Balde", title: "Consultante RH", location: "Dakar", avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=120&q=80", connections: 423, connected: true, openToWork: false },
  { id: "p6", name: "Ibrahima Dieng", title: "Architecte Logiciel", location: "Dakar", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80", connections: 275, connected: false, openToWork: false },
];

const COMPANIES = [
  { id: "c1", name: "Orange Sénégal", sector: "Télécommunications", location: "Dakar", employees: "5 000+", openJobs: 8, logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=120&q=80", following: false, verified: true },
  { id: "c2", name: "Sonatel", sector: "Télécommunications", location: "Dakar", employees: "3 500+", openJobs: 5, logo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120&q=80", following: true, verified: true },
  { id: "c3", name: "Wave Mobile Money", sector: "Fintech", location: "Dakar", employees: "500–1 000", openJobs: 12, logo: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=120&q=80", following: false, verified: true },
  { id: "c4", name: "Coris Bank", sector: "Banque & Finance", location: "Dakar", employees: "1 000–2 000", openJobs: 3, logo: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=120&q=80", following: false, verified: true },
  { id: "c5", name: "Expresso", sector: "Télécommunications", location: "Dakar", employees: "2 000+", openJobs: 6, logo: undefined, following: false, verified: false },
  { id: "c6", name: "Gainde 2000", sector: "Logistique", location: "Dakar", employees: "200–500", openJobs: 2, logo: undefined, following: true, verified: true },
];

const CITIES = ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kaolack"];
const CONTRACTS = ["CDI", "CDD", "Stage", "Freelance"];
const SECTORS = ["Tech", "Finance", "Marketing", "RH", "Design", "Logistique", "Communication"];

function JobCard({ job, colors, isDark, index }: { job: typeof JOBS[0]; colors: any; isDark: boolean; index: number }) {
  const barColor = CONTRACT_COLORS[job.contract] ?? ACCENT;
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60)} style={{
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 10,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    }}>
      <View style={{ width: 4, backgroundColor: barColor }} />
      <View style={{ flex: 1, padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isDark ? "#2A3B6A" : "#EEF2FF", alignItems: "center", justifyContent: "center", overflow: "hidden", marginRight: 10 }}>
            {job.logo ? (
              <Image source={{ uri: job.logo }} style={{ width: 40, height: 40 }} resizeMode="cover" />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: "700", color: NAVY }}>{job.initials}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "500" }} numberOfLines={1}>{job.company}</Text>
              {job.verified ? <BadgeCheck size={13} color={ACCENT} strokeWidth={2.5} /> : null}
            </View>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 2 }} numberOfLines={2}>{job.title}</Text>
          </View>
          {job.urgent ? (
            <View style={{ backgroundColor: "#FEF2F2", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#EF4444" }}>URGENT</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <MapPin size={12} color={colors.textMuted} strokeWidth={2} />
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{job.location}</Text>
          </View>
          <View style={{ backgroundColor: barColor + "22", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: barColor }}>{job.contract}</Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>{job.salary}</Text>
        </View>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>{job.applicants} candidats</Text>
      </View>
    </Animated.View>
  );
}

function PersonCard({ person, colors, isDark, index }: { person: typeof PEOPLE[0]; colors: any; isDark: boolean; index: number }) {
  const [connected, setConnected] = useState(person.connected);
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60)} style={{
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 10,
      padding: 14,
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    }}>
      <View style={{ position: "relative" }}>
        <Image source={{ uri: person.avatar }} style={{ width: 52, height: 52, borderRadius: 26 }} />
        {person.openToWork ? (
          <View style={{ position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: ACCENT, borderWidth: 2, borderColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={8} color="#FFF" strokeWidth={3} />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{person.name}</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }} numberOfLines={1}>{person.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
          <MapPin size={11} color={colors.textMuted} strokeWidth={2} />
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{person.location}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>· {person.connections} connexions</Text>
        </View>
      </View>
      <Pressable
        onPress={() => setConnected(!connected)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: connected ? colors.toggleBg : NAVY,
        }}
      >
        {!connected ? <UserPlus size={13} color="#FFF" strokeWidth={2.5} /> : null}
        <Text style={{ fontSize: 12, fontWeight: "700", color: connected ? colors.text : "#FFF" }}>
          {connected ? "Abonné" : "Connecter"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function CompanyCard({ company, colors, isDark, index }: { company: typeof COMPANIES[0]; colors: any; isDark: boolean; index: number }) {
  const [following, setFollowing] = useState(company.following);
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60)} style={{
      backgroundColor: colors.card,
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 10,
      padding: 14,
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: isDark ? "#2A3B6A" : "#EEF2FF", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {company.logo ? (
            <Image source={{ uri: company.logo }} style={{ width: 52, height: 52 }} resizeMode="cover" />
          ) : (
            <Building2 size={24} color={NAVY} strokeWidth={1.5} />
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{company.name}</Text>
            {company.verified ? <BadgeCheck size={14} color={ACCENT} strokeWidth={2.5} /> : null}
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>{company.sector}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <MapPin size={11} color={colors.textMuted} strokeWidth={2} />
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{company.location}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Users size={11} color={colors.textMuted} strokeWidth={2} />
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{company.employees}</Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={() => setFollowing(!following)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: following ? colors.toggleBg : NAVY,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: following ? colors.text : "#FFF" }}>
            {following ? "Suivi" : "Suivre"}
          </Text>
        </Pressable>
      </View>
      <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          <Text style={{ fontWeight: "700", color: ACCENT }}>{company.openJobs}</Text> poste{company.openJobs > 1 ? "s" : ""} ouvert{company.openJobs > 1 ? "s" : ""}
        </Text>
        <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: NAVY }}>Voir les offres</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function DiscoverScreen() {
  const { colors, isDark } = useTheme();
  const demoAccountType = useDemoStore((s) => s.demoAccountType);
  const isRecruiter = demoAccountType === "recruiter";

  const [activeTab, setActiveTab] = useState<Tab>("jobs");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const filterHeight = useSharedValue(0);
  const filterOpacity = useSharedValue(0);

  const toggleFilters = useCallback(() => {
    const opening = !showFilters;
    setShowFilters(opening);
    filterHeight.value = withTiming(opening ? 1 : 0, { duration: 250 });
    filterOpacity.value = withTiming(opening ? 1 : 0, { duration: 200 });
  }, [showFilters]);

  const filterAnimStyle = useAnimatedStyle(() => ({
    opacity: filterOpacity.value,
    maxHeight: filterHeight.value * 200,
    overflow: "hidden",
  }));

  const filteredJobs = JOBS.filter((j) => {
    const q = query.toLowerCase();
    if (q && !j.title.toLowerCase().includes(q) && !j.company.toLowerCase().includes(q)) return false;
    if (selectedCity && !j.location.includes(selectedCity)) return false;
    if (selectedContract && j.contract !== selectedContract) return false;
    if (selectedSector && j.sector !== selectedSector) return false;
    return true;
  });

  const filteredPeople = PEOPLE.filter((p) => {
    const q = query.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
  });

  const filteredCompanies = COMPANIES.filter((c) => {
    const q = query.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q);
  });

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "jobs", label: "Offres", icon: Briefcase },
    { key: "people", label: "Personnes", icon: Users },
    { key: "companies", label: "Entreprises", icon: Building2 },
  ];

  const activeFiltersCount = [selectedCity, selectedContract, selectedSector].filter(Boolean).length;

  return (
    <View testID="discover-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.primary, letterSpacing: -0.5 }}>
            {isRecruiter ? "Trouver des talents" : "Explorer"}
          </Text>

          {/* Search bar */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 12,
            borderRadius: 14,
            backgroundColor: colors.card,
            borderWidth: 1.5,
            borderColor: query.length > 0 ? ACCENT : colors.border,
            paddingHorizontal: 12,
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}>
            <Search size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              testID="search-input"
              value={query}
              onChangeText={setQuery}
              placeholder={activeTab === "jobs" ? "Titre, entreprise, secteur..." : activeTab === "people" ? "Nom, titre professionnel..." : "Nom d'entreprise, secteur..."}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              selectionColor={ACCENT}
              cursorColor={ACCENT}
              style={{ flex: 1, paddingVertical: 13, marginLeft: 8, fontSize: 15, color: colors.text }}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery("")} style={{ padding: 4 }}>
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            ) : (
              <Pressable
                testID="filter-button"
                onPress={toggleFilters}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: showFilters ? NAVY : colors.toggleBg,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                }}
              >
                <SlidersHorizontal size={14} color={showFilters ? "#FFF" : colors.textSecondary} strokeWidth={2} />
                {activeFiltersCount > 0 ? (
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFF" }}>{activeFiltersCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            )}
          </View>

          {/* Filter panel */}
          {activeTab === "jobs" ? (
            <Animated.View style={filterAnimStyle}>
              <View style={{ paddingTop: 12, gap: 8 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
                  {CITIES.map((city) => (
                    <Pressable
                      key={city}
                      onPress={() => setSelectedCity(selectedCity === city ? null : city)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        backgroundColor: selectedCity === city ? NAVY : colors.toggleBg,
                        borderWidth: 1,
                        borderColor: selectedCity === city ? NAVY : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: selectedCity === city ? "#FFF" : colors.textSecondary }}>{city}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
                  {CONTRACTS.map((ct) => (
                    <Pressable
                      key={ct}
                      onPress={() => setSelectedContract(selectedContract === ct ? null : ct)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        backgroundColor: selectedContract === ct ? (CONTRACT_COLORS[ct] ?? ACCENT) : colors.toggleBg,
                        borderWidth: 1,
                        borderColor: selectedContract === ct ? (CONTRACT_COLORS[ct] ?? ACCENT) : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: selectedContract === ct ? "#FFF" : colors.textSecondary }}>{ct}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </Animated.View>
          ) : null}

          {/* Tab toggle */}
          <View style={{
            flexDirection: "row",
            marginTop: 12,
            backgroundColor: colors.toggleBg,
            borderRadius: 12,
            padding: 3,
          }}>
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = activeTab === key;
              return (
                <Pressable
                  key={key}
                  testID={`discover-tab-${key}`}
                  onPress={() => setActiveTab(key)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    paddingVertical: 8,
                    borderRadius: 9,
                    backgroundColor: active ? colors.card : "transparent",
                    shadowColor: active ? "#000" : "transparent",
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: active ? 2 : 0,
                  }}
                >
                  <Icon size={14} color={active ? NAVY : colors.textMuted} strokeWidth={active ? 2.5 : 2} />
                  <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? NAVY : colors.textMuted }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Results */}
        {activeTab === "jobs" ? (
          <FlatList
            data={filteredJobs}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <JobCard job={item} colors={colors} isDark={isDark} index={index} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 48 }}>
                <Text style={{ fontSize: 15, color: colors.textMuted }}>Aucune offre trouvée</Text>
              </View>
            }
          />
        ) : activeTab === "people" ? (
          <FlatList
            data={filteredPeople}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <PersonCard person={item} colors={colors} isDark={isDark} index={index} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 48 }}>
                <Text style={{ fontSize: 15, color: colors.textMuted }}>Aucune personne trouvée</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={filteredCompanies}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <CompanyCard company={item} colors={colors} isDark={isDark} index={index} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 48 }}>
                <Text style={{ fontSize: 15, color: colors.textMuted }}>Aucune entreprise trouvée</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}
