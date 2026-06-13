import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  Briefcase,
  MapPin,
  DollarSign,
  Zap,
  Calendar,
  Users,
  Eye,
  Building2,
} from "lucide-react-native";

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";

type ContractType = "cdi" | "cdd" | "stage" | "freelance" | "temps_partiel";
type WorkMode = "presentiel" | "hybride" | "teletravail";
type Step = 1 | 2 | 3 | 4;

function getContractOptions(lang: string): Array<{ value: ContractType; label: string; color: string }> {
  const tl = (fr: string, en: string, zh: string) => lang === "fr" ? fr : lang === "zh" ? zh : en;
  return [
    { value: "cdi", label: "CDI", color: NAVY },
    { value: "cdd", label: "CDD", color: "#F39C12" },
    { value: "stage", label: tl("Stage", "Internship", "实习"), color: "#00897B" },
    { value: "freelance", label: "Freelance", color: "#9B59B6" },
    { value: "temps_partiel", label: tl("Temps partiel", "Part-time", "兼职"), color: "#E74C3C" },
  ];
}

function getJobSuggestions(lang: string): string[] {
  if (lang === "zh") return ["Web开发工程师", "移动端开发", "会计", "销售", "司机/快递员", "安保员", "护士", "医生", "教师", "人力资源经理", "社区运营", "UI/UX设计师", "IT技术员", "厨师", "市场经理"];
  if (lang === "en") return ["Web Developer", "Mobile Developer", "Accountant", "Sales Rep", "Delivery Driver", "Security Guard", "Nurse", "Doctor", "Teacher", "HR Manager", "Community Manager", "UX/UI Designer", "IT Technician", "Chef", "Marketing Manager"];
  return ["Développeur Web", "Développeur Mobile", "Comptable", "Commercial", "Chauffeur Livreur", "Agent de Sécurité", "Infirmier(e)", "Médecin", "Enseignant(e)", "Responsable RH", "Community Manager", "Designer UX/UI", "Technicien IT", "Cuisinier(e)", "Responsable Marketing"];
}

function getSkillsList(lang: string): string[] {
  const tl = (fr: string, en: string, zh: string) => lang === "fr" ? fr : lang === "zh" ? zh : en;
  return [
    "JavaScript", "React", "React Native", "Python", "Java", "PHP", "TypeScript",
    "Node.js", "SQL", "Excel", "Word", "PowerPoint",
    tl("Comptabilité SYSCOHADA", "SYSCOHADA Accounting", "SYSCOHADA会计"),
    tl("Vente", "Sales", "销售"),
    tl("Marketing Digital", "Digital Marketing", "数字营销"),
    "Communication", "Leadership",
    tl("Gestion projet", "Project Management", "项目管理"),
    tl("Français", "French", "法语"),
    tl("Anglais", "English", "英语"),
    tl("Arabe", "Arabic", "阿拉伯语"),
    "Wolof",
    tl("Conduite", "Driving", "驾驶"),
    tl("Service client", "Customer Service", "客户服务"),
    tl("Design graphique", "Graphic Design", "平面设计"),
    "Photoshop",
    tl("Réseaux", "Networking", "网络"),
    tl("Sécurité informatique", "Cybersecurity", "网络安全"),
  ];
}

const DEADLINE_PRESETS = [
  { fr: "1 semaine", en: "1 week", zh: "1周", days: 7 },
  { fr: "2 semaines", en: "2 weeks", zh: "2周", days: 14 },
  { fr: "1 mois", en: "1 month", zh: "1个月", days: 30 },
  { fr: "2 mois", en: "2 months", zh: "2个月", days: 60 },
  { fr: "3 mois", en: "3 months", zh: "3个月", days: 90 },
];

function formatDeadline(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function PostJobScreen() {
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const t = useLang((s) => s.t);
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [jobTitle, setJobTitle] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [contractType, setContractType] = useState<ContractType>("cdi");
  const [locationCity, setLocationCity] = useState<string>("Dakar");
  const [workMode, setWorkMode] = useState<WorkMode>("presentiel");

  // Step 2
  const [salaryMin, setSalaryMin] = useState<string>("");
  const [salaryMax, setSalaryMax] = useState<string>("");
  const [salaryNegotiable, setSalaryNegotiable] = useState<boolean>(true);
  const [description, setDescription] = useState<string>("");
  const [requirements, setRequirements] = useState<string>("");

  // Step 3
  const [skills, setSkills] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState<string>("");
  const [positions, setPositions] = useState<string>("1");
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDeadlineModal, setShowDeadlineModal] = useState<boolean>(false);
  const [isUrgent, setIsUrgent] = useState<boolean>(false);

  const navyText = isDark ? "#F5F5F5" : NAVY;

  function tl(fr: string, en: string, zh: string): string {
    return lang === "fr" ? fr : lang === "zh" ? zh : en;
  }

  const CONTRACT_OPTIONS = getContractOptions(lang);
  const JOB_SUGGESTIONS = getJobSuggestions(lang);
  const SKILLS_LIST = getSkillsList(lang);

  const createJobMutation = useMutation({
    mutationFn: () =>
      api.post("/api/jobs", {
        title: jobTitle.trim(),
        description: description.trim(),
        contractType,
        locationCity: locationCity.trim() || "Dakar",
        locationNeighborhood: null,
        workMode,
        salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
        salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
        salaryNegotiable,
        isUrgent,
        requiredExperience: requirements.trim() || null,
        requiredEducation: null,
        requiredSkills: skills.map((s) => ({ skillName: s, isRequired: true })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs-mine"] });
      queryClient.invalidateQueries({ queryKey: ["jobs-feed"] });
      showToast(t("listings_job_posted"), "success");
      router.back();
    },
    onError: () => {
      showToast(t("listings_job_error"), "error");
    },
  });

  function handleTitleChange(text: string) {
    setJobTitle(text);
    if (text.length > 0) {
      const filtered = JOB_SUGGESTIONS.filter((s) =>
        s.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredSuggestions(filtered.slice(0, 5));
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions(JOB_SUGGESTIONS.slice(0, 6));
      setShowSuggestions(true);
    }
  }

  function selectSuggestion(suggestion: string) {
    setJobTitle(suggestion);
    setShowSuggestions(false);
  }

  function toggleSkill(skill: string) {
    if (skills.includes(skill)) {
      setSkills(skills.filter((s) => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  }

  function addCustomSkill() {
    const trimmed = skillSearch.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillSearch("");
    }
  }

  function handleBack() {
    if (step === 1) {
      router.back();
    } else {
      setStep((step - 1) as Step);
    }
  }

  function handleNext() {
    if (step < 3) {
      setStep((step + 1) as Step);
    } else if (step === 3) {
      setStep(4);
    } else {
      createJobMutation.mutate();
    }
  }

  function isStepValid(): boolean {
    if (step === 1) return jobTitle.trim().length > 0 && locationCity.trim().length > 0;
    if (step === 2) return description.trim().length > 0;
    return true;
  }

  const fieldStyle = {
    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(27,47,110,0.04)",
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15 as const,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.12)",
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: "700" as const,
    color: isDark ? "rgba(255,255,255,0.5)" : "rgba(27,47,110,0.5)",
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 8,
    marginTop: 20,
  };

  // Step labels
  const STEP_LABELS = [
    { fr: "Poste", en: "Position", zh: "职位" },
    { fr: "Détails", en: "Details", zh: "详情" },
    { fr: "Compétences", en: "Skills", zh: "技能" },
    { fr: "Aperçu", en: "Preview", zh: "预览" },
  ];

  function renderProgressBar() {
    return (
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {STEP_LABELS.map((label, index) => {
            const stepNum = index + 1;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            const isLast = index === STEP_LABELS.length - 1;
            return (
              <View key={stepNum} style={{ flexDirection: "row", alignItems: "center", flex: isLast ? 0 : 1 }}>
                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: isDone ? GREEN : isActive ? NAVY : (isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.1)"),
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: isActive ? 2 : 0,
                      borderColor: isActive ? NAVY : "transparent",
                    }}
                  >
                    {isDone ? (
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <Text style={{ fontSize: 12, fontWeight: "800", color: isActive ? "#FFFFFF" : (isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.35)") }}>
                        {stepNum}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 9, fontWeight: "700", color: isActive ? navyText : (isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.35)"), marginTop: 4, width: 52, textAlign: "center" }}>
                    {tl(label.fr, label.en, label.zh)}
                  </Text>
                </View>
                {!isLast && (
                  <View style={{ flex: 1, height: 2, backgroundColor: isDone ? GREEN : (isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.1)"), marginHorizontal: 4, marginBottom: 16 }} />
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  function renderStep1() {
    return (
      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: navyText, letterSpacing: -0.5, marginTop: 8 }}>
          {tl("Décrivez le poste", "Describe the Position", "描述职位")}
        </Text>
        <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(27,47,110,0.5)", marginTop: 4, marginBottom: 4 }}>
          {tl("Étape 1 sur 3", "Step 1 of 3", "第1步，共3步")}
        </Text>

        {/* Job Title */}
        <Text style={labelStyle}>{tl("Titre du poste *", "Job Title *", "职位名称 *")}</Text>
        <TextInput
          testID="post-job-title-input"
          value={jobTitle}
          onChangeText={handleTitleChange}
          onFocus={() => {
            setFilteredSuggestions(JOB_SUGGESTIONS.slice(0, 6));
            setShowSuggestions(true);
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={tl("ex: Développeur Web, Comptable...", "e.g. Web Developer, Accountant...", "例：网页开发者")}
          placeholderTextColor={isDark ? "rgba(255,255,255,0.25)" : "rgba(27,47,110,0.25)"}
          style={fieldStyle}
        />
        {showSuggestions && filteredSuggestions.length > 0 ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.12)", overflow: "hidden", marginTop: 4 }}>
            {filteredSuggestions.map((sug, i) => (
              <Pressable
                key={sug}
                onPress={() => selectSuggestion(sug)}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: pressed ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(27,47,110,0.04)") : "transparent",
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(27,47,110,0.06)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                })}
              >
                <Briefcase size={13} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.35)"} />
                <Text style={{ fontSize: 14, color: navyText, fontWeight: "500" }}>{sug}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Contract Type */}
        <Text style={labelStyle}>{tl("Type de contrat *", "Contract Type *", "合同类型 *")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CONTRACT_OPTIONS.map((opt) => {
            const selected = contractType === opt.value;
            return (
              <Pressable
                key={opt.value}
                testID={`contract-${opt.value}`}
                onPress={() => setContractType(opt.value)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: selected ? opt.color : (isDark ? "rgba(255,255,255,0.06)" : "rgba(27,47,110,0.05)"),
                  borderWidth: 1.5,
                  borderColor: selected ? opt.color : (isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.1)"),
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {selected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                <Text style={{ fontSize: 13, fontWeight: "700", color: selected ? "#FFFFFF" : (isDark ? "rgba(255,255,255,0.55)" : "rgba(27,47,110,0.55)") }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Location */}
        <Text style={labelStyle}>{tl("Ville *", "City *", "城市 *")}</Text>
        <View style={{ position: "relative" }}>
          <View style={{ position: "absolute", left: 14, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 }}>
            <MapPin size={16} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.4)"} />
          </View>
          <TextInput
            testID="post-job-city-input"
            value={locationCity}
            onChangeText={setLocationCity}
            placeholder="Dakar"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.25)" : "rgba(27,47,110,0.25)"}
            style={{ ...fieldStyle, paddingLeft: 40 }}
          />
        </View>

        {/* Work Mode */}
        <Text style={labelStyle}>{tl("Mode de travail *", "Work Mode *", "工作模式 *")}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            { value: "presentiel" as WorkMode, fr: "Présentiel", en: "Onsite", zh: "线下" },
            { value: "hybride" as WorkMode, fr: "Hybride", en: "Hybrid", zh: "混合" },
            { value: "teletravail" as WorkMode, fr: "Télétravail", en: "Remote", zh: "远程" },
          ].map((opt) => {
            const selected = workMode === opt.value;
            return (
              <Pressable
                key={opt.value}
                testID={`workmode-${opt.value}`}
                onPress={() => setWorkMode(opt.value)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: selected ? NAVY : (isDark ? "rgba(255,255,255,0.06)" : "rgba(27,47,110,0.05)"),
                  borderWidth: 1.5,
                  borderColor: selected ? NAVY : (isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.1)"),
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: selected ? "#FFFFFF" : (isDark ? "rgba(255,255,255,0.55)" : "rgba(27,47,110,0.55)") }}>
                  {tl(opt.fr, opt.en, opt.zh)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  function renderStep2() {
    return (
      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: navyText, letterSpacing: -0.5, marginTop: 8 }}>
          {tl("Rémunération & Description", "Compensation & Description", "薪酬与描述")}
        </Text>
        <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(27,47,110,0.5)", marginTop: 4 }}>
          {tl("Étape 2 sur 3", "Step 2 of 3", "第2步，共3步")}
        </Text>

        {/* Salary */}
        <Text style={labelStyle}>{tl("Salaire (FCFA / mois)", "Salary (FCFA / month)", "薪资（FCFA/月）")}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <View style={{ position: "absolute", left: 14, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 }}>
              <DollarSign size={14} color={GREEN} />
            </View>
            <TextInput
              testID="post-job-salary-min"
              value={salaryMin}
              onChangeText={setSalaryMin}
              placeholder={tl("Min FCFA", "Min FCFA", "最低FCFA")}
              placeholderTextColor={isDark ? "rgba(255,255,255,0.25)" : "rgba(27,47,110,0.25)"}
              keyboardType="numeric"
              style={{ ...fieldStyle, paddingLeft: 38 }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ position: "absolute", left: 14, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 }}>
              <DollarSign size={14} color={GREEN} />
            </View>
            <TextInput
              testID="post-job-salary-max"
              value={salaryMax}
              onChangeText={setSalaryMax}
              placeholder={tl("Max FCFA", "Max FCFA", "最高FCFA")}
              placeholderTextColor={isDark ? "rgba(255,255,255,0.25)" : "rgba(27,47,110,0.25)"}
              keyboardType="numeric"
              style={{ ...fieldStyle, paddingLeft: 38 }}
            />
          </View>
        </View>

        {/* Negotiable */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(27,47,110,0.04)", borderRadius: 8, padding: 14 }}>
          <Text style={{ fontSize: 14, color: navyText, fontWeight: "600" }}>
            {tl("Salaire négociable", "Salary Negotiable", "薪资可协商")}
          </Text>
          <Switch
            testID="post-job-negotiable"
            value={salaryNegotiable}
            onValueChange={setSalaryNegotiable}
            trackColor={{ false: isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.1)", true: GREEN }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Description */}
        <Text style={labelStyle}>{tl("Description du poste *", "Job Description *", "职位描述 *")}</Text>
        <TextInput
          testID="post-job-description"
          value={description}
          onChangeText={setDescription}
          placeholder={tl("Décrivez les responsabilités, l'environnement de travail, les avantages...", "Describe responsibilities, work environment, benefits...", "描述职责、工作环境、福利...")}
          placeholderTextColor={isDark ? "rgba(255,255,255,0.25)" : "rgba(27,47,110,0.25)"}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={{
            ...fieldStyle,
            height: 130,
            paddingTop: 14,
            paddingBottom: 14,
          }}
        />

        {/* Requirements */}
        <Text style={labelStyle}>{tl("Profil recherché", "Requirements", "候选人要求")}</Text>
        <TextInput
          testID="post-job-requirements"
          value={requirements}
          onChangeText={setRequirements}
          placeholder={tl("Expérience requise, niveau d'études, qualités attendues...", "Required experience, education level, expected qualities...", "所需经验、学历、期望品质...")}
          placeholderTextColor={isDark ? "rgba(255,255,255,0.25)" : "rgba(27,47,110,0.25)"}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{
            ...fieldStyle,
            height: 110,
            paddingTop: 14,
            paddingBottom: 14,
          }}
        />
      </View>
    );
  }

  function renderStep3() {
    const filteredSkills = skillSearch.length > 0
      ? SKILLS_LIST.filter((s) => s.toLowerCase().includes(skillSearch.toLowerCase()))
      : SKILLS_LIST;

    return (
      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: navyText, letterSpacing: -0.5, marginTop: 8 }}>
          {tl("Compétences & Détails", "Skills & Details", "技能与详情")}
        </Text>
        <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(27,47,110,0.5)", marginTop: 4 }}>
          {tl("Étape 3 sur 3", "Step 3 of 3", "第3步，共3步")}
        </Text>

        {/* Skills */}
        <Text style={labelStyle}>{tl("Compétences requises", "Required Skills", "所需技能")}</Text>

        {/* Selected skills */}
        {skills.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {skills.map((skill) => (
              <View
                key={skill}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: NAVY,
                  borderRadius: 8,
                  paddingVertical: 6,
                  paddingLeft: 12,
                  paddingRight: 8,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>{skill}</Text>
                <Pressable onPress={() => toggleSkill(skill)} hitSlop={4}>
                  <X size={12} color="rgba(255,255,255,0.7)" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {/* Skill search */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          <TextInput
            testID="post-job-skill-search"
            value={skillSearch}
            onChangeText={setSkillSearch}
            placeholder={tl("Rechercher ou ajouter une compétence...", "Search or add a skill...", "搜索或添加技能...")}
            placeholderTextColor={isDark ? "rgba(255,255,255,0.25)" : "rgba(27,47,110,0.25)"}
            style={{ ...fieldStyle, flex: 1 }}
            onSubmitEditing={addCustomSkill}
            returnKeyType="done"
          />
          <Pressable
            testID="post-job-add-skill"
            onPress={addCustomSkill}
            style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" }}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Skill chips grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          {filteredSkills.slice(0, 16).map((skill) => {
            const selected = skills.includes(skill);
            return (
              <Pressable
                key={skill}
                onPress={() => toggleSkill(skill)}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: selected ? GREEN : (isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.06)"),
                  borderWidth: 1,
                  borderColor: selected ? GREEN : (isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.1)"),
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {selected ? <Check size={10} color="#FFFFFF" strokeWidth={3} /> : null}
                <Text style={{ fontSize: 12, fontWeight: "600", color: selected ? "#FFFFFF" : (isDark ? "rgba(255,255,255,0.6)" : "rgba(27,47,110,0.6)") }}>
                  {skill}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Number of positions */}
        <Text style={labelStyle}>{tl("Nombre de postes", "Number of Positions", "招聘人数")}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => setPositions(String(Math.max(1, parseInt(positions, 10) - 1)))}
            style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(27,47,110,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.1)" }}
          >
            <Text style={{ fontSize: 20, color: navyText, fontWeight: "600" }}>−</Text>
          </Pressable>
          <TextInput
            testID="post-job-positions"
            value={positions}
            onChangeText={(v) => setPositions(v.replace(/[^0-9]/g, "") || "1")}
            keyboardType="numeric"
            style={{ ...fieldStyle, flex: 1, textAlign: "center", fontWeight: "800", fontSize: 18 }}
          />
          <Pressable
            onPress={() => setPositions(String(parseInt(positions, 10) + 1))}
            style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" }}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Deadline */}
        <Text style={labelStyle}>{tl("Date limite de candidature", "Application Deadline", "申请截止日期")}</Text>
        <Pressable
          testID="post-job-deadline"
          onPress={() => setShowDeadlineModal(true)}
          style={{
            ...fieldStyle,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            height: 48,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Calendar size={16} color={deadline ? GREEN : (isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.4)")} />
            <Text style={{ fontSize: 15, color: deadline ? navyText : (isDark ? "rgba(255,255,255,0.25)" : "rgba(27,47,110,0.25)"), fontWeight: deadline ? "600" : "400" }}>
              {deadline ? formatDeadline(deadline) : tl("Choisir une date", "Choose a date", "选择日期")}
            </Text>
          </View>
          <ChevronRight size={16} color={isDark ? "rgba(255,255,255,0.3)" : "rgba(27,47,110,0.3)"} />
        </Pressable>

        {/* Urgent toggle */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, backgroundColor: isUrgent ? (isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2") : (isDark ? "rgba(255,255,255,0.05)" : "rgba(27,47,110,0.04)"), borderRadius: 8, padding: 14, borderWidth: 1.5, borderColor: isUrgent ? "#EF4444" : (isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.08)") }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Zap size={18} color={isUrgent ? "#EF4444" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.4)")} strokeWidth={2.5} />
            <View>
              <Text style={{ fontSize: 14, color: isUrgent ? "#EF4444" : navyText, fontWeight: "700" }}>
                {tl("Offre urgente", "Urgent Position", "紧急职位")}
              </Text>
              <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.4)", marginTop: 1 }}>
                {tl("Badge rouge visible sur l'offre", "Red badge shown on the listing", "职位显示红色标签")}
              </Text>
            </View>
          </View>
          <Switch
            testID="post-job-urgent"
            value={isUrgent}
            onValueChange={setIsUrgent}
            trackColor={{ false: isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.1)", true: "#EF4444" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    );
  }

  function renderPreview() {
    const contractLabel = CONTRACT_OPTIONS.find((c) => c.value === contractType)?.label ?? contractType.toUpperCase();
    const contractColor = CONTRACT_OPTIONS.find((c) => c.value === contractType)?.color ?? NAVY;
    const salaryText = salaryMin && salaryMax
      ? `${Math.round(parseInt(salaryMin, 10) / 1000)}k – ${Math.round(parseInt(salaryMax, 10) / 1000)}k FCFA`
      : salaryNegotiable ? tl("Salaire négociable", "Negotiable salary", "薪资可协商") : null;

    return (
      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: navyText, letterSpacing: -0.5, marginTop: 8 }}>
          {tl("Aperçu de l'offre", "Job Preview", "职位预览")}
        </Text>
        <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(27,47,110,0.5)", marginTop: 4, marginBottom: 20 }}>
          {tl("Vérifiez avant de publier", "Review before publishing", "发布前请核查")}
        </Text>

        {/* Preview Card */}
        <View style={{ backgroundColor: colors.card, borderRadius: 12, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDark ? 0.2 : 0.1, shadowRadius: 12, elevation: 6 }}>
          {/* Top accent */}
          <View style={{ height: 4, backgroundColor: contractColor }} />
          <View style={{ padding: 20 }}>
            {/* Title + urgent */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: navyText, flex: 1, lineHeight: 24 }}>
                {jobTitle || tl("Sans titre", "Untitled", "无标题")}
              </Text>
              {isUrgent ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Zap size={10} color="#EF4444" strokeWidth={2.5} />
                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#EF4444" }}>{t("listings_urgent_badge")}</Text>
                </View>
              ) : null}
            </View>

            {/* Company & Location */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }}>
              <Building2 size={12} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)"} />
              <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(27,47,110,0.5)", fontWeight: "500" }}>
                {tl("Votre entreprise", "Your Company", "您的公司")}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <MapPin size={11} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.4)"} />
                <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(27,47,110,0.5)" }}>{locationCity}</Text>
              </View>
              <View style={{ backgroundColor: isDark ? `${contractColor}30` : `${contractColor}18`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: contractColor }}>{contractLabel}</Text>
              </View>
            </View>

            {/* Salary */}
            {salaryText ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10 }}>
                <DollarSign size={12} color={GREEN} />
                <Text style={{ fontSize: 13, color: GREEN, fontWeight: "700" }}>{salaryText}</Text>
              </View>
            ) : null}

            {/* Description preview */}
            {description ? (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.65)" : "rgba(27,47,110,0.7)", lineHeight: 20 }} numberOfLines={4}>
                  {description}
                </Text>
              </View>
            ) : null}

            {/* Skills */}
            {skills.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                {skills.slice(0, 6).map((skill) => (
                  <View key={skill} style={{ backgroundColor: isDark ? "rgba(27,47,110,0.3)" : "rgba(27,47,110,0.08)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: navyText }}>{skill}</Text>
                  </View>
                ))}
                {skills.length > 6 ? (
                  <View style={{ backgroundColor: isDark ? "rgba(27,47,110,0.3)" : "rgba(27,47,110,0.08)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: navyText }}>+{skills.length - 6}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.07)", marginTop: 14, marginBottom: 12 }} />

            {/* Footer stats */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Users size={13} color={NAVY} />
                <Text style={{ fontSize: 12, color: navyText, fontWeight: "700" }}>{`0 ${t("listings_candidates")}`}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Eye size={13} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.4)"} />
                <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(27,47,110,0.5)", fontWeight: "500" }}>{`0 ${t("listings_views")}`}</Text>
              </View>
              {deadline ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginLeft: "auto" }}>
                  <Calendar size={11} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.4)"} />
                  <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)" }}>
                    {formatDeadline(deadline)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Edit sections */}
        <Text style={{ fontSize: 12, fontWeight: "700", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.4)", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 24, marginBottom: 12 }}>
          {tl("Modifier", "Edit Sections", "编辑部分")}
        </Text>
        {[
          { step: 1 as Step, fr: "Poste & Localisation", en: "Position & Location", zh: "职位与地点" },
          { step: 2 as Step, fr: "Rémunération & Description", en: "Compensation & Description", zh: "薪酬与描述" },
          { step: 3 as Step, fr: "Compétences & Détails", en: "Skills & Details", zh: "技能与详情" },
        ].map((item) => (
          <Pressable
            key={item.step}
            onPress={() => setStep(item.step)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: pressed ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(27,47,110,0.04)") : colors.card,
              borderRadius: 8,
              padding: 14,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.07)",
            })}
          >
            <Text style={{ fontSize: 14, color: navyText, fontWeight: "600" }}>{tl(item.fr, item.en, item.zh)}</Text>
            <ChevronRight size={16} color={isDark ? "rgba(255,255,255,0.3)" : "rgba(27,47,110,0.3)"} />
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View testID="post-job-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.card }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 4, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.07)" }}>
          <Pressable
            testID="post-job-back"
            onPress={handleBack}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.07)", alignItems: "center", justifyContent: "center", marginRight: 12 }}
          >
            <ArrowLeft size={20} color={navyText} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: navyText, letterSpacing: -0.3 }}>
              {tl("Publier une offre", "Post a Job", "发布职位")}
            </Text>
            <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.4)" }}>
              Post a Job · 发布职位
            </Text>
          </View>
        </View>
        {renderProgressBar()}
      </SafeAreaView>

      {/* Content */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={insets.top + 56}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderPreview()}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(27,47,110,0.06)" }}>
          <Pressable
            testID="post-job-next"
            onPress={handleNext}
            disabled={!isStepValid() || createJobMutation.isPending}
            style={({ pressed }) => ({
              backgroundColor: !isStepValid() ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(27,47,110,0.1)") : pressed ? "#2EA040" : GREEN,
              borderRadius: 10,
              height: 52,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              shadowColor: isStepValid() ? GREEN : "transparent",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: isStepValid() ? 6 : 0,
            })}
          >
            {createJobMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : step === 4 ? (
              <>
                <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF" }}>
                  {tl("Publier l'offre", "Post Job", "发布职位")}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 16, fontWeight: "800", color: isStepValid() ? "#FFFFFF" : (isDark ? "rgba(255,255,255,0.3)" : "rgba(27,47,110,0.3)") }}>
                  {tl("Continuer", "Continue", "继续")}
                </Text>
                <ChevronRight size={18} color={isStepValid() ? "#FFFFFF" : (isDark ? "rgba(255,255,255,0.3)" : "rgba(27,47,110,0.3)")} strokeWidth={2.5} />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Deadline Picker Modal */}
      <Modal
        visible={showDeadlineModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDeadlineModal(false)}
      >
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setShowDeadlineModal(false)} />
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(27,47,110,0.15)" }} />
          </View>
          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: navyText, marginBottom: 16 }}>
              {tl("Date limite", "Application Deadline", "申请截止")}
            </Text>
            {DEADLINE_PRESETS.map((preset) => {
              const date = new Date(Date.now() + preset.days * 86400000);
              const isSelected = deadline && deadline.toDateString() === date.toDateString();
              return (
                <Pressable
                  key={preset.days}
                  onPress={() => { setDeadline(date); setShowDeadlineModal(false); }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    backgroundColor: isSelected ? (isDark ? "rgba(27,47,110,0.4)" : "rgba(27,47,110,0.08)") : pressed ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(27,47,110,0.04)") : "transparent",
                    marginBottom: 6,
                    borderWidth: 1.5,
                    borderColor: isSelected ? NAVY : (isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.07)"),
                  })}
                >
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: navyText }}>
                      {tl(preset.fr, preset.en, preset.zh)}
                    </Text>
                    <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)", marginTop: 2 }}>
                      {formatDeadline(date)}
                    </Text>
                  </View>
                  {isSelected ? <Check size={18} color={NAVY} strokeWidth={2.5} /> : null}
                </Pressable>
              );
            })}
            {deadline ? (
              <Pressable
                onPress={() => { setDeadline(null); setShowDeadlineModal(false); }}
                style={{ alignItems: "center", paddingVertical: 12, marginTop: 4 }}
              >
                <Text style={{ fontSize: 14, color: "#EF4444", fontWeight: "600" }}>
                  {tl("Supprimer la date", "Remove deadline", "删除截止日期")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
