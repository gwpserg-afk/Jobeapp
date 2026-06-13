import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Send, X } from "lucide-react-native";
import { useState } from "react";
import { useDemoStore } from "../../lib/demoStore";
import { useLang } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { showToast } from "../../lib/toast";

const CONTRACT_TYPES = ["CDI", "CDD", "Stage", "Freelance"];
const LOCATIONS = ["Dakar", "Thiès", "Kaolack", "Saint-Louis"];
const PRESET_SKILLS = [
  "Conduite",
  "Cuisine",
  "React Native",
  "Gestion",
  "Communication",
  "Vente",
  "Comptabilite",
  "Transport",
];

export default function CreateJobScreen() {
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const t = useLang((s) => s.t);
  const { colors } = useTheme();
  const addJob = useDemoStore((s) => s.addJob);
  const demoCompanyName = useDemoStore((s) => s.demoCompanyName);
  const demoCompanyInitials = useDemoStore((s) => s.demoCompanyInitials);

  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [neighborhood, setNeighborhood] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");

  const isFr = lang === "fr";
  const isZh = lang === "zh";
  const charCount = description.length;
  const MAX_CHARS = 500;
  const canPost = title.trim().length > 0 && contractType && city && description.trim().length > 0;

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills((prev) => [...prev, trimmed]);
      setCustomSkill("");
    }
  };

  const handlePostJob = () => {
    if (!canPost || !contractType || !city) return;

    addJob(
      title.trim(),
      contractType,
      city,
      neighborhood.trim() || city,
      description.trim(),
      selectedSkills
    );
    showToast(
      isFr ? "Offre d'emploi creee !" : isZh ? "职位发布成功！" : "Job posting created!",
      "success"
    );
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View testID="create-job-screen" style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <SafeAreaView edges={["top"]} style={[styles.headerSafe, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable
              testID="back-button"
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: colors.background }]}
            >
              <ArrowLeft size={22} color={colors.primary} strokeWidth={2} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.primary }]}>
              {isFr ? "Publier une offre" : isZh ? "发布职位" : "Post a job"}
            </Text>
            <Pressable
              testID="post-button"
              onPress={handlePostJob}
              disabled={!canPost}
              style={[
                styles.postBtn,
                { backgroundColor: canPost ? "#3BAD4E" : colors.border },
              ]}
            >
              <Send size={15} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.postBtnText}>
                {isFr ? "Publier" : isZh ? "发布" : "Post"}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Company Info */}
          <View style={[styles.companyRow, { backgroundColor: colors.card }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{demoCompanyInitials}</Text>
            </View>
            <View>
              <Text style={[styles.companyName, { color: colors.text }]}>{demoCompanyName}</Text>
              <Text style={[styles.companySubtitle, { color: colors.textMuted }]}>
                {isFr ? "Recruteur" : isZh ? "招聘方" : "Recruiter"}
              </Text>
            </View>
          </View>

          {/* Job Title Input */}
          <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>
              {isFr ? "Titre de l'offre" : isZh ? "职位名称" : "Job title"} *
            </Text>
            <TextInput
              testID="title-input"
              style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={isFr ? "ex: Developpeur React Native" : isZh ? "例：React Native 开发工程师" : "ex: React Native Developer"}
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Contract Type */}
          <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>
              {isFr ? "Type de contrat" : isZh ? "合同类型" : "Contract type"} *
            </Text>
            <View style={styles.chipRow}>
              {CONTRACT_TYPES.map((type) => {
                const isSelected = contractType === type;
                return (
                  <Pressable
                    key={type}
                    testID={`contract-chip-${type}`}
                    onPress={() => setContractType(type)}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      isSelected && [styles.chipSelected, { backgroundColor: colors.primary, borderColor: colors.primary }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: colors.text },
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* City */}
          <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>
              {isFr ? "Ville" : isZh ? "城市" : "City"} *
            </Text>
            <View style={styles.chipRow}>
              {LOCATIONS.map((location) => {
                const isSelected = city === location;
                return (
                  <Pressable
                    key={location}
                    testID={`location-chip-${location}`}
                    onPress={() => setCity(location)}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      isSelected && [styles.chipSelected, { backgroundColor: colors.primary, borderColor: colors.primary }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: colors.text },
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {location}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Neighborhood */}
          <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>
              {isFr ? "Quartier" : isZh ? "街区" : "Neighborhood"}
            </Text>
            <TextInput
              testID="neighborhood-input"
              style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={isFr ? "ex: Plateau" : "ex: Plateau"}
              placeholderTextColor={colors.textMuted}
              value={neighborhood}
              onChangeText={setNeighborhood}
              maxLength={50}
            />
          </View>

          {/* Description */}
          <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>
              {isFr ? "Description de l'offre" : isZh ? "职位描述" : "Job description"} *
            </Text>
            <TextInput
              testID="description-input"
              style={[styles.textAreaInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={isFr ? "Decrivez le poste et les responsabilites..." : isZh ? "描述职位及职责..." : "Describe the position and responsibilities..."}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={MAX_CHARS}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: colors.textMuted }, charCount > MAX_CHARS * 0.85 && styles.charCountWarn]}>
              {charCount}/{MAX_CHARS}
            </Text>
          </View>

          {/* Required Skills */}
          <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>
              {isFr ? "Competences requises" : isZh ? "所需技能" : "Required skills"}
            </Text>
            <Text style={[styles.skillsSubtitle, { color: colors.textMuted }]}>
              {isFr ? "Selectionnez les competences necessaires" : isZh ? "选择所需技能" : "Select required skills"}
            </Text>
            <View style={styles.skillsWrap}>
              {PRESET_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <Pressable
                    key={skill}
                    testID={`skill-chip-${skill}`}
                    onPress={() => toggleSkill(skill)}
                    style={[
                      styles.skillChip,
                      { borderColor: colors.border },
                      isSelected && [styles.skillChipSelected, { backgroundColor: colors.primary, borderColor: colors.primary }],
                    ]}
                  >
                    {isSelected ? (
                      <X size={11} color="#FFFFFF" strokeWidth={2.5} style={styles.skillChipIcon} />
                    ) : null}
                    <Text
                      style={[
                        styles.skillChipText,
                        { color: colors.text },
                        isSelected && styles.skillChipTextSelected,
                      ]}
                    >
                      {skill}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom Skill Input */}
            <View style={[styles.customSkillInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.customSkillInput, { color: colors.text, borderColor: colors.border }]}
                placeholder={isFr ? "Ajouter une competence..." : isZh ? "添加技能..." : "Add a skill..."}
                placeholderTextColor={colors.textMuted}
                value={customSkill}
                onChangeText={setCustomSkill}
                onSubmitEditing={addCustomSkill}
              />
              <Pressable
                onPress={addCustomSkill}
                disabled={!customSkill.trim()}
                style={[
                  styles.addSkillBtn,
                  { backgroundColor: customSkill.trim() ? "#3BAD4E" : colors.border },
                ]}
              >
                <Text style={[styles.addSkillBtnText, !customSkill.trim() && { opacity: 0.5 }]}>
                  {isFr ? "Ajouter" : isZh ? "添加" : "Add"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Selected Skills Preview */}
          {selectedSkills.length > 0 ? (
            <View style={styles.selectedPreview}>
              <Text style={[styles.selectedPreviewLabel, { color: colors.primary }]}>
                {isFr
                  ? `${selectedSkills.length} competence${selectedSkills.length > 1 ? "s" : ""} selectionnee${selectedSkills.length > 1 ? "s" : ""}`
                  : isZh
                  ? `已选择 ${selectedSkills.length} 项技能`
                  : `${selectedSkills.length} skill${selectedSkills.length > 1 ? "s" : ""} selected`}
              </Text>
              <Pressable onPress={() => setSelectedSkills([])}>
                <Text style={[styles.clearSkills, { color: colors.textMuted }]}>
                  {isFr ? "Effacer" : isZh ? "清除" : "Clear"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerSafe: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  postBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  postBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 16,
  },
  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  companyName: {
    fontSize: 15,
    fontWeight: "700",
  },
  companySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  inputSection: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textAreaInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 100,
  },
  charCount: {
    fontSize: 11,
    marginTop: 8,
    textAlign: "right",
  },
  charCountWarn: {
    color: "#EA580C",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipSelected: {
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  skillsSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
  },
  skillChipSelected: {
    borderWidth: 1.5,
  },
  skillChipIcon: {},
  skillChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  skillChipTextSelected: {
    color: "#FFFFFF",
  },
  selectedPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  selectedPreviewLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  clearSkills: {
    fontSize: 13,
    fontWeight: "500",
  },
  customSkillInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  customSkillInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    borderRadius: 8,
    borderWidth: 1,
  },
  addSkillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  addSkillBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  addSkillBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
