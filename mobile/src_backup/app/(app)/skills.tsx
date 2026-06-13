import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, Search, X } from "lucide-react-native";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import type { CandidateProfile } from "@/types";
import { USER_ME_QUERY_KEY, USER_PROFILE_QUERY_KEY } from "@/lib/hooks/useUser";
import { showToast } from "@/lib/toast";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";
const MAX_SKILLS = 5;

const MY_PROFILE_QUERY_KEY = ["my-profile"] as const;

type SkillCategory = {
  labelEn: string;
  labelFr: string;
  skills: string[];
};

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    labelEn: "Technology",
    labelFr: "Technologie",
    skills: [
      "JavaScript", "React", "React Native", "Python", "SQL", "Excel",
      "Word", "PowerPoint", "Java", "PHP", "HTML/CSS", "Node.js",
      "Mobile Development", "Data Analysis", "Cybersecurity",
      "Network Administration", "IT Support", "AutoCAD",
    ],
  },
  {
    labelEn: "Business & Management",
    labelFr: "Gestion & Management",
    skills: [
      "Project Management", "Team Leadership", "Business Development",
      "Strategic Planning", "Operations Management", "Supply Chain",
      "Procurement", "Risk Management", "Budgeting",
    ],
  },
  {
    labelEn: "Finance & Accounting",
    labelFr: "Finance & Comptabilité",
    skills: [
      "Accounting", "Financial Analysis", "Bookkeeping",
      "Tax Preparation", "Auditing", "Financial Reporting",
      "Banking", "Microfinance", "Treasury Management",
    ],
  },
  {
    labelEn: "Marketing & Sales",
    labelFr: "Marketing & Vente",
    skills: [
      "Digital Marketing", "Social Media", "Content Creation", "Sales",
      "Customer Service", "Market Research", "Brand Management",
      "E-commerce", "SEO",
    ],
  },
  {
    labelEn: "Communication",
    labelFr: "Communication",
    skills: [
      "French", "English", "Wolof", "Arabic", "Public Speaking",
      "Copywriting", "Translation", "Journalism", "Customer Relations",
    ],
  },
  {
    labelEn: "Design & Creative",
    labelFr: "Design & Créatif",
    skills: [
      "Graphic Design", "Video Editing", "Photography", "UI/UX Design",
      "Adobe Photoshop", "Illustrator", "After Effects", "Animation",
    ],
  },
  {
    labelEn: "Healthcare",
    labelFr: "Santé",
    skills: [
      "Nursing", "First Aid", "Medical Records", "Pharmacy",
      "Community Health", "Nutrition",
    ],
  },
  {
    labelEn: "Education & Training",
    labelFr: "Éducation & Formation",
    skills: [
      "Teaching", "Training & Development", "Curriculum Design",
      "Tutoring", "E-Learning",
    ],
  },
  {
    labelEn: "Engineering & Trades",
    labelFr: "Ingénierie & Métiers",
    skills: [
      "Electrical", "Plumbing", "Civil Engineering",
      "Mechanical Engineering", "Construction", "Architecture",
    ],
  },
  {
    labelEn: "Agriculture & Environment",
    labelFr: "Agriculture & Environnement",
    skills: [
      "Agriculture", "Animal Husbandry", "Environmental Management",
      "Forestry",
    ],
  },
  {
    labelEn: "Legal & Admin",
    labelFr: "Juridique & Administratif",
    skills: [
      "Legal Research", "Contract Management", "Administrative Support",
      "Data Entry", "Receptionist", "Office Management",
    ],
  },
  {
    labelEn: "Logistics & Transport",
    labelFr: "Logistique & Transport",
    skills: [
      "Logistics", "Driving License (Category B)", "Forklift Operation",
      "Warehouse Management", "Import/Export",
    ],
  },
];

export default function SkillsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const lang = useLang((s) => s.lang);

  const [search, setSearch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Fetch current profile to pre-select existing skills
  const { data: profile, isLoading } = useQuery({
    queryKey: MY_PROFILE_QUERY_KEY,
    queryFn: () => api.get<CandidateProfile>("/api/profile"),
  });

  // Pre-populate selected skills from profile once loaded
  if (profile && !initialized) {
    const existing = (profile.skills as unknown as { id: string; skillName: string }[]).map(
      (s) => s.skillName
    );
    setSelectedSkills(existing.slice(0, MAX_SKILLS));
    setInitialized(true);
  }

  // Existing skill IDs from profile (for deletion)
  const existingSkillMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!profile?.skills) return map;
    (profile.skills as unknown as { id: string; skillName: string }[]).forEach((s) => {
      map[s.skillName] = s.id;
    });
    return map;
  }, [profile?.skills]);

  // Save mutation: delete removed skills, add new ones
  const saveMutation = useMutation({
    mutationFn: async (newSkills: string[]) => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const existing = Object.keys(existingSkillMap);

      // Skills to delete
      const toDelete = existing.filter((name) => !newSkills.includes(name));
      // Skills to add
      const toAdd = newSkills.filter((name) => !existingSkillMap[name]);

      await Promise.all([
        ...toDelete.map((name) =>
          fetch(`${baseUrl}/api/profile/skills/${existingSkillMap[name]}`, {
            method: "DELETE",
            credentials: "include",
          })
        ),
        ...toAdd.map((name) =>
          fetch(`${baseUrl}/api/profile/skills`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ skillName: name, skillLevel: "intermediate" }),
          })
        ),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_PROFILE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      showToast(lang === "fr" ? "Compétences sauvegardées" : "Skills saved!");
      router.back();
    },
    onError: () => {
      showToast(lang === "fr" ? "Erreur lors de la sauvegarde" : "Failed to save skills. Please try again.");
    },
  });

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((s) => s !== skill);
      }
      if (prev.length >= MAX_SKILLS) return prev;
      return [...prev, skill];
    });
  };

  const searchTrimmed = search.trim().toLowerCase();

  // Filter logic: if searching, show all matching skills flat; otherwise show by category
  const filteredCategories = useMemo(() => {
    if (!searchTrimmed) return SKILL_CATEGORIES;
    return SKILL_CATEGORIES.map((cat) => ({
      ...cat,
      skills: cat.skills.filter((s) => s.toLowerCase().includes(searchTrimmed)),
    })).filter((cat) => cat.skills.length > 0);
  }, [searchTrimmed]);

  // Check if custom typed skill can be added
  const canAddCustom =
    searchTrimmed.length > 1 &&
    !SKILL_CATEGORIES.some((cat) =>
      cat.skills.some((s) => s.toLowerCase() === searchTrimmed)
    ) &&
    !selectedSkills.some((s) => s.toLowerCase() === searchTrimmed);

  const handleAddCustom = () => {
    const trimmed = search.trim();
    if (!trimmed || selectedSkills.length >= MAX_SKILLS) return;
    setSelectedSkills((prev) => [...prev, trimmed]);
    setSearch("");
  };

  const atMax = selectedSkills.length >= MAX_SKILLS;

  const cardStyle = {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 6,
    elevation: isDark ? 0 : 1,
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="skills-screen"
    >
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
      }}>
        <Pressable
          testID="back-button"
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: colors.toggleBg,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2.5} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>
            {lang === "fr" ? "Mes compétences" : "My Skills"}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
            {lang === "fr" ? `${selectedSkills.length}/${MAX_SKILLS} sélectionnées` : `${selectedSkills.length}/${MAX_SKILLS} selected`}
          </Text>
        </View>

        <Pressable
          testID="save-button"
          onPress={() => saveMutation.mutate(selectedSkills)}
          disabled={saveMutation.isPending}
          style={{
            backgroundColor: saveMutation.isPending ? colors.textMuted : GREEN,
            paddingHorizontal: 18,
            paddingVertical: 9,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            minWidth: 64,
          }}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
              {lang === "fr" ? "Sauver" : "Save"}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Search bar */}
      <View style={{
        marginHorizontal: 16,
        marginTop: 14,
        marginBottom: 4,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
      }}>
        <Search size={16} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          testID="skills-search-input"
          style={{ flex: 1, fontSize: 15, color: colors.text }}
          placeholder={lang === "fr" ? "Rechercher ou saisir une compétence..." : "Search or type a skill..."}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="done"
          selectionColor={GREEN}
          cursorColor={GREEN}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <X size={16} color={colors.textMuted} strokeWidth={2.5} />
          </Pressable>
        ) : null}
      </View>

      {/* Max reached banner */}
      {atMax ? (
        <View style={{
          marginHorizontal: 16, marginTop: 10, marginBottom: 2,
          backgroundColor: isDark ? "rgba(59,173,78,0.15)" : "#EBF8EE",
          borderRadius: 10, padding: 10,
          flexDirection: "row", alignItems: "center", gap: 6,
        }}>
          <Check size={14} color={GREEN} strokeWidth={2.5} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: GREEN }}>
            {lang === "fr" ? "Maximum 5 compétences atteint" : "Maximum 5 skills selected"}
          </Text>
        </View>
      ) : null}

      {/* Selected chips row */}
      {selectedSkills.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginTop: 10 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: "row" }}
          testID="selected-skills-row"
        >
          {selectedSkills.map((skill) => (
            <Pressable
              key={skill}
              testID={`selected-chip-${skill}`}
              onPress={() => toggleSkill(skill)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 5,
                backgroundColor: GREEN, borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 7,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>{skill}</Text>
              <X size={12} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={isDark ? GREEN : NAVY} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 32 }}
          testID="skills-scroll"
        >
          {/* Custom skill add row */}
          {canAddCustom && !atMax ? (
            <Pressable
              testID="add-custom-skill"
              onPress={handleAddCustom}
              style={{
                ...cardStyle,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
                borderWidth: 1.5,
                borderColor: GREEN + "60",
              }}
            >
              <View style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: GREEN + "20",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 18, color: GREEN, fontWeight: "700" }}>+</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: isDark ? GREEN : NAVY }}>
                {lang === "fr" ? `Ajouter "${search.trim()}"` : `Add "${search.trim()}"`}
              </Text>
            </Pressable>
          ) : null}

          {filteredCategories.map((cat) => (
            <View key={cat.labelEn} style={cardStyle}>
              <Text style={{
                fontSize: 11, fontWeight: "700", color: colors.textMuted,
                letterSpacing: 0.8, marginBottom: 12, textTransform: "uppercase",
              }}>
                {lang === "fr" ? cat.labelFr : cat.labelEn}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {cat.skills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  const isDisabled = atMax && !isSelected;
                  return (
                    <Pressable
                      key={skill}
                      testID={`skill-pill-${skill}`}
                      onPress={() => toggleSkill(skill)}
                      disabled={isDisabled}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        paddingHorizontal: 13,
                        paddingVertical: 9,
                        borderRadius: 20,
                        borderWidth: 1.5,
                        backgroundColor: isSelected
                          ? GREEN
                          : isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,35,82,0.04)",
                        borderColor: isSelected
                          ? GREEN
                          : isDisabled
                          ? colors.border + "60"
                          : isDark
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(0,35,82,0.12)",
                        opacity: isDisabled ? 0.45 : 1,
                      }}
                    >
                      {isSelected ? (
                        <Check size={12} color="#FFFFFF" strokeWidth={2.5} />
                      ) : null}
                      <Text style={{
                        fontSize: 13,
                        fontWeight: isSelected ? "700" : "500",
                        color: isSelected
                          ? "#FFFFFF"
                          : isDark
                          ? colors.textSecondary
                          : NAVY,
                      }}>
                        {skill}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {filteredCategories.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 40, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: "center" }}>
                {lang === "fr"
                  ? `Aucune compétence trouvée pour "${search.trim()}"`
                  : `No skill found for "${search.trim()}"`}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Sticky save button */}
      <View style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
      }}>
        <Pressable
          testID="save-button-bottom"
          onPress={() => saveMutation.mutate(selectedSkills)}
          disabled={saveMutation.isPending}
          style={{
            backgroundColor: saveMutation.isPending ? colors.textMuted : GREEN,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: GREEN,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: saveMutation.isPending ? 0 : 0.3,
            shadowRadius: 10,
            elevation: saveMutation.isPending ? 0 : 4,
          }}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              {lang === "fr"
                ? `Sauvegarder (${selectedSkills.length}/${MAX_SKILLS})`
                : `Save Skills (${selectedSkills.length}/${MAX_SKILLS})`}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
