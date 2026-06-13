import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Switch,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronDown,
  Briefcase,
  MapPin,
  FileText,
  Check,
  AlertCircle,
  X,
  Plus,
  Sparkles,
  Video,
  Play,
  Trash2,
} from "lucide-react-native";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeInLeft,
  FadeOutRight,
  FadeInDown,
} from "react-native-reanimated";
import { Video as ExpoVideo, ResizeMode } from "expo-av";
import { useLang } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import { useTheme } from "@/lib/theme";
import { VideoRecorder } from "@/components/VideoRecorder";
import { useDemoStore } from "@/lib/demoStore";

const TOTAL_STEPS = 3;

// Contract types
const CONTRACT_TYPES = [
  { key: "cdi", en: "CDI", fr: "CDI", zh: "CDI" },
  { key: "cdd", en: "CDD", fr: "CDD", zh: "CDD" },
  { key: "stage", en: "Internship", fr: "Stage", zh: "实习" },
  { key: "freelance", en: "Freelance", fr: "Freelance", zh: "自由职业" },
];

// Sectors with English labels
const SECTORS = [
  { key: "technology", en: "Technology", fr: "Technologie", zh: "科技" },
  { key: "finance", en: "Finance", fr: "Finance & Banque", zh: "金融与银行" },
  { key: "healthcare", en: "Healthcare", fr: "Sante", zh: "医疗健康" },
  { key: "education", en: "Education", fr: "Education", zh: "教育" },
  { key: "retail", en: "Retail", fr: "Commerce", zh: "零售" },
  { key: "manufacturing", en: "Manufacturing", fr: "Industrie", zh: "制造业" },
  { key: "construction", en: "Construction", fr: "Construction / BTP", zh: "建筑/土木" },
  { key: "transport", en: "Transport", fr: "Transport & Logistique", zh: "交通与物流" },
  { key: "agriculture", en: "Agriculture", fr: "Agriculture", zh: "农业" },
  { key: "services", en: "Services", fr: "Services", zh: "服务业" },
  { key: "other", en: "Other", fr: "Autre", zh: "其他" },
];

// Senegal cities
const CITIES = [
  { key: "dakar", name: "Dakar" },
  { key: "thies", name: "Thies" },
  { key: "saint-louis", name: "Saint-Louis" },
  { key: "kaolack", name: "Kaolack" },
  { key: "ziguinchor", name: "Ziguinchor" },
  { key: "mbour", name: "Mbour" },
  { key: "rufisque", name: "Rufisque" },
  { key: "touba", name: "Touba" },
  { key: "diourbel", name: "Diourbel" },
  { key: "louga", name: "Louga" },
  { key: "tambacounda", name: "Tambacounda" },
];

export default function CreateJobScreen() {
  const router = useRouter();
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const { colors, isDark } = useTheme();

  const isFr = lang === "fr";
  const isZh = lang === "zh";

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [publishing, setPublishing] = useState(false);

  // Step 1: Job Details
  const [jobTitle, setJobTitle] = useState("");
  const [contractType, setContractType] = useState("");
  const [sector, setSector] = useState("");
  const [sectorKey, setSectorKey] = useState("");
  const [showSectorPicker, setShowSectorPicker] = useState(false);
  const [city, setCity] = useState("");
  const [cityKey, setCityKey] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [neighborhood, setNeighborhood] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");

  // Step 2: Job Description
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [jobVideoUri, setJobVideoUri] = useState<string | null>(null);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showVideoPreviewModal, setShowVideoPreviewModal] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const entering =
    direction === "forward"
      ? FadeInRight.duration(280)
      : FadeInLeft.duration(280);
  const exiting =
    direction === "forward"
      ? FadeOutLeft.duration(200)
      : FadeOutRight.duration(200);

  const goNext = () => {
    setDirection("forward");
    setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step === 1) {
      router.back();
      return;
    }
    setDirection("back");
    setStep((s) => s - 1);
  };

  // Validation Step 1
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!jobTitle.trim()) errs.jobTitle = t("error_required");
    if (!contractType) errs.contractType = t("error_required");
    if (!sector) errs.sector = t("error_required");
    if (!city) errs.city = t("error_required");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Validation Step 2
  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!description.trim()) errs.description = t("error_required");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStep1Continue = () => {
    if (validateStep1()) goNext();
  };

  const handleStep2Continue = () => {
    if (validateStep2()) goNext();
  };

  const handleAddSkill = useCallback(() => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  }, [skillInput, skills]);

  const handleRemoveSkill = useCallback((skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }, []);

  const handleVideoSave = useCallback((uri: string) => {
    setJobVideoUri(uri);
    setShowVideoRecorder(false);
  }, []);

  const handleVideoDelete = useCallback(() => {
    setJobVideoUri(null);
  }, []);

  const setJobVideoUriStore = useDemoStore((s) => s.setJobVideoUri);

  const handlePublish = () => {
    setPublishing(true);
    // Simulate API call
    setTimeout(() => {
      // Save video to store if present (using a demo job id for now)
      if (jobVideoUri) {
        // For demo purposes, save to the first job ID
        // In a real app, this would be the newly created job's ID
        setJobVideoUriStore("job-1", jobVideoUri);
      }
      setPublishing(false);
      const message = isFr
        ? "Offre publiee avec succes !"
        : isZh ? "职位发布成功！" : "Job posted successfully!";
      showToast(message, "success");
      router.back();
    }, 1200);
  };

  const getSectorLabel = (key: string): string => {
    const found = SECTORS.find((s) => s.key === key);
    if (!found) return "";
    return isFr ? found.fr : isZh ? found.zh : found.en;
  };

  const getContractLabel = (key: string): string => {
    const found = CONTRACT_TYPES.find((c) => c.key === key);
    if (!found) return "";
    return isFr ? found.fr : isZh ? found.zh : found.en;
  };

  const formatSalary = (min: string, max: string): string => {
    if (!min && !max) return isFr ? "Non specifie" : isZh ? "未指定" : "Not specified";
    if (min && max) return `${min} - ${max} FCFA`;
    if (min) return `${min}+ FCFA`;
    return `${isFr ? "Jusqu'a" : isZh ? "最高" : "Up to"} ${max} FCFA`;
  };

  return (
    <View
      testID="create-job-screen"
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Progress bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 24,
              paddingTop: 12,
            }}
          >
            <Pressable
              testID="back-button"
              onPress={goBack}
              style={{
                marginRight: 12,
                height: 40,
                width: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
                backgroundColor: colors.card,
              }}
            >
              <ChevronLeft size={20} color={colors.text} strokeWidth={2.5} />
            </Pressable>
            <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: i < step ? "#3BAD4E" : colors.border,
                  }}
                />
              ))}
            </View>
            <Text
              style={{ marginLeft: 12, fontSize: 13, color: colors.textMuted }}
            >
              {step}/{TOTAL_STEPS}
            </Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* STEP 1: Job Details */}
            {step === 1 ? (
              <Animated.View
                key="step-1"
                entering={entering}
                exiting={exiting}
                style={{ marginTop: 24 }}
              >
                {/* Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: isDark
                        ? "rgba(59, 173, 78, 0.15)"
                        : "#EFF6FF",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Briefcase
                      size={22}
                      color={isDark ? "#3BAD4E" : "#1B2F6E"}
                      strokeWidth={2}
                    />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "800",
                        color: isDark ? "#FFFFFF" : "#1B2F6E",
                      }}
                    >
                      {isFr ? "Details du poste" : "Job Details"}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>
                      {isFr ? "Etape 1 sur 3" : "Step 1 of 3"}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginTop: 4,
                  }}
                >
                  {isFr
                    ? "Renseignez les informations de base du poste."
                    : "Enter the basic job information."}
                </Text>

                {/* Job Title */}
                <View style={{ marginTop: 24 }}>
                  <Text style={getLabelStyle(colors)}>
                    {isFr ? "Titre du poste *" : "Job title *"}
                  </Text>
                  <TextInput
                    testID="job-title-input"
                    value={jobTitle}
                    onChangeText={(v) => {
                      setJobTitle(v);
                      setErrors((e) => ({ ...e, jobTitle: "" }));
                    }}
                    placeholder={
                      isFr
                        ? "ex: Developpeur Web Senior"
                        : "e.g. Senior Web Developer"
                    }
                    placeholderTextColor={colors.textMuted}
                    style={[
                      getInputStyle(colors, isDark),
                      jobTitle.length > 0 ? activeInputStyle : null,
                    ]}
                  />
                  {errors.jobTitle ? (
                    <Text style={errorStyle}>{errors.jobTitle}</Text>
                  ) : null}
                </View>

                {/* Contract Type Pills */}
                <View style={{ marginTop: 20 }}>
                  <Text style={getLabelStyle(colors)}>
                    {isFr ? "Type de contrat *" : "Contract type *"}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 10,
                      marginTop: 8,
                    }}
                  >
                    {CONTRACT_TYPES.map((ct) => {
                      const isSelected = contractType === ct.key;
                      const label = isFr ? ct.fr : ct.en;
                      return (
                        <Pressable
                          key={ct.key}
                          testID={`contract-${ct.key}`}
                          onPress={() => {
                            setContractType(ct.key);
                            setErrors((e) => ({ ...e, contractType: "" }));
                          }}
                          style={{
                            width: 90,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 2,
                            borderColor: isSelected ? "#3BAD4E" : colors.border,
                            backgroundColor: isSelected
                              ? isDark
                                ? "rgba(59, 173, 78, 0.15)"
                                : "#F0FDF0"
                              : isDark
                              ? "rgba(255,255,255,0.05)"
                              : "#FFFFFF",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: isSelected
                                ? "#3BAD4E"
                                : colors.textSecondary,
                            }}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {errors.contractType ? (
                    <Text style={errorStyle}>{errors.contractType}</Text>
                  ) : null}
                </View>

                {/* Sector Dropdown */}
                <View style={{ marginTop: 20 }}>
                  <Text style={getLabelStyle(colors)}>
                    {isFr ? "Secteur / Departement *" : "Department / Sector *"}
                  </Text>
                  <Pressable
                    testID="sector-picker"
                    onPress={() => setShowSectorPicker(!showSectorPicker)}
                    style={[
                      getDropdownStyle(colors, isDark),
                      sector.length > 0 ? activeInputStyle : null,
                    ]}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: sector ? colors.text : colors.textMuted,
                      }}
                    >
                      {sector || (isFr ? "Choisir un secteur" : "Choose a sector")}
                    </Text>
                    <ChevronDown
                      size={16}
                      color={colors.textMuted}
                      strokeWidth={2}
                    />
                  </Pressable>
                  {showSectorPicker ? (
                    <View style={getPickerListStyle(colors, isDark)}>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {SECTORS.map((s) => {
                          const label = isFr ? s.fr : s.en;
                          const isSelected = sectorKey === s.key;
                          return (
                            <Pressable
                              key={s.key}
                              onPress={() => {
                                setSector(label);
                                setSectorKey(s.key);
                                setShowSectorPicker(false);
                                setErrors((e) => ({ ...e, sector: "" }));
                              }}
                              style={[
                                pickerItemStyle,
                                isSelected
                                  ? {
                                      backgroundColor: isDark
                                        ? "rgba(59, 173, 78, 0.15)"
                                        : "#F0FDF0",
                                    }
                                  : null,
                              ]}
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  color: isSelected ? "#3BAD4E" : colors.text,
                                  fontWeight: isSelected ? "600" : "400",
                                }}
                              >
                                {label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}
                  {errors.sector ? (
                    <Text style={errorStyle}>{errors.sector}</Text>
                  ) : null}
                </View>

                {/* Location - City */}
                <View style={{ marginTop: 20 }}>
                  <Text style={getLabelStyle(colors)}>
                    {isFr ? "Ville *" : "City *"}
                  </Text>
                  <Pressable
                    testID="city-picker"
                    onPress={() => setShowCityPicker(!showCityPicker)}
                    style={[
                      getDropdownStyle(colors, isDark),
                      city.length > 0 ? activeInputStyle : null,
                    ]}
                  >
                    <MapPin
                      size={18}
                      color={city ? "#3BAD4E" : colors.textMuted}
                      strokeWidth={2}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: city ? colors.text : colors.textMuted,
                      }}
                    >
                      {city || (isFr ? "Choisir une ville" : "Choose a city")}
                    </Text>
                    <ChevronDown
                      size={16}
                      color={colors.textMuted}
                      strokeWidth={2}
                    />
                  </Pressable>
                  {showCityPicker ? (
                    <View style={getPickerListStyle(colors, isDark)}>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {CITIES.map((c) => {
                          const isSelected = cityKey === c.key;
                          return (
                            <Pressable
                              key={c.key}
                              onPress={() => {
                                setCity(c.name);
                                setCityKey(c.key);
                                setShowCityPicker(false);
                                setErrors((e) => ({ ...e, city: "" }));
                              }}
                              style={[
                                pickerItemStyle,
                                isSelected
                                  ? {
                                      backgroundColor: isDark
                                        ? "rgba(59, 173, 78, 0.15)"
                                        : "#F0FDF0",
                                    }
                                  : null,
                              ]}
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  color: isSelected ? "#3BAD4E" : colors.text,
                                  fontWeight: isSelected ? "600" : "400",
                                }}
                              >
                                {c.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}
                  {errors.city ? (
                    <Text style={errorStyle}>{errors.city}</Text>
                  ) : null}
                </View>

                {/* Neighborhood (Optional) */}
                <View style={{ marginTop: 16 }}>
                  <Text style={getLabelStyle(colors)}>
                    {isFr ? "Quartier (Optionnel)" : "Neighborhood (Optional)"}
                  </Text>
                  <TextInput
                    testID="neighborhood-input"
                    value={neighborhood}
                    onChangeText={setNeighborhood}
                    placeholder={
                      isFr ? "ex: Plateau, Almadies" : "e.g. Plateau, Almadies"
                    }
                    placeholderTextColor={colors.textMuted}
                    style={[
                      getInputStyle(colors, isDark),
                      neighborhood.length > 0 ? activeInputStyle : null,
                    ]}
                  />
                </View>

                {/* Salary Range (Optional) */}
                <View style={{ marginTop: 20 }}>
                  <Text style={getLabelStyle(colors)}>
                    {isFr
                      ? "Fourchette salariale (Optionnel)"
                      : "Salary range (Optional)"}
                  </Text>
                  <View
                    style={{ flexDirection: "row", gap: 12, marginTop: 8 }}
                  >
                    <View style={{ flex: 1 }}>
                      <TextInput
                        testID="salary-min-input"
                        value={salaryMin}
                        onChangeText={setSalaryMin}
                        placeholder="Min"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        style={[
                          getInputStyle(colors, isDark),
                          salaryMin.length > 0 ? activeInputStyle : null,
                        ]}
                      />
                    </View>
                    <View
                      style={{
                        width: 20,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: colors.textMuted }}>-</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        testID="salary-max-input"
                        value={salaryMax}
                        onChangeText={setSalaryMax}
                        placeholder="Max"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        style={[
                          getInputStyle(colors, isDark),
                          salaryMax.length > 0 ? activeInputStyle : null,
                        ]}
                      />
                    </View>
                  </View>
                  <Text
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: colors.textMuted,
                    }}
                  >
                    FCFA / {isFr ? "mois" : "month"}
                  </Text>
                </View>

                {/* Continue Button */}
                <Pressable
                  testID="continue-btn-1"
                  onPress={handleStep1Continue}
                  style={[btnStyle, { marginTop: 32 }]}
                >
                  <Text style={btnTextStyle}>{t("signup_continue")}</Text>
                </Pressable>
              </Animated.View>
            ) : null}

            {/* STEP 2: Job Description */}
            {step === 2 ? (
              <Animated.View
                key="step-2"
                entering={entering}
                exiting={exiting}
                style={{ marginTop: 24 }}
              >
                {/* Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: isDark
                        ? "rgba(59, 173, 78, 0.15)"
                        : "#EFF6FF",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <FileText
                      size={22}
                      color={isDark ? "#3BAD4E" : "#1B2F6E"}
                      strokeWidth={2}
                    />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "800",
                        color: isDark ? "#FFFFFF" : "#1B2F6E",
                      }}
                    >
                      {isFr ? "Description du poste" : "Job Description"}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>
                      {isFr ? "Etape 2 sur 3" : "Step 2 of 3"}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginTop: 4,
                  }}
                >
                  {isFr
                    ? "Decrivez le poste et les competences requises."
                    : "Describe the job and required skills."}
                </Text>

                {/* Description */}
                <View style={{ marginTop: 24 }}>
                  <Text style={getLabelStyle(colors)}>
                    {isFr ? "Description *" : "Description *"}
                  </Text>
                  <TextInput
                    testID="description-input"
                    value={description}
                    onChangeText={(v) => {
                      setDescription(v);
                      setErrors((e) => ({ ...e, description: "" }));
                    }}
                    placeholder={
                      isFr
                        ? "Decrivez les responsabilites, missions et attentes du poste..."
                        : "Describe the responsibilities, missions and expectations of the role..."
                    }
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    style={[
                      getInputStyle(colors, isDark),
                      {
                        minHeight: 140,
                        paddingTop: 14,
                      },
                      description.length > 0 ? activeInputStyle : null,
                    ]}
                  />
                  {errors.description ? (
                    <Text style={errorStyle}>{errors.description}</Text>
                  ) : null}
                </View>

                {/* Skills/Requirements */}
                <View style={{ marginTop: 20 }}>
                  <Text style={getLabelStyle(colors)}>
                    {isFr
                      ? "Competences requises (Optionnel)"
                      : "Required skills (Optional)"}
                  </Text>
                  <View
                    style={[
                      getInputRowStyle(colors, isDark),
                      skillInput.length > 0 ? activeInputStyle : null,
                    ]}
                  >
                    <TextInput
                      testID="skill-input"
                      value={skillInput}
                      onChangeText={setSkillInput}
                      onSubmitEditing={handleAddSkill}
                      placeholder={
                        isFr
                          ? "ex: React, Python, Gestion de projet..."
                          : "e.g. React, Python, Project management..."
                      }
                      placeholderTextColor={colors.textMuted}
                      returnKeyType="done"
                      style={{
                        flex: 1,
                        paddingVertical: 13,
                        paddingLeft: 14,
                        fontSize: 15,
                        color: colors.text,
                      }}
                    />
                    <Pressable
                      testID="add-skill-btn"
                      onPress={handleAddSkill}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 13,
                        backgroundColor: "#3BAD4E",
                        borderTopRightRadius: 10,
                        borderBottomRightRadius: 10,
                      }}
                    >
                      <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                    </Pressable>
                  </View>

                  {/* Skills Pills */}
                  {skills.length > 0 ? (
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      {skills.map((skill) => (
                        <View
                          key={skill}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingLeft: 12,
                            paddingRight: 6,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor: isDark
                              ? "rgba(59, 173, 78, 0.15)"
                              : "#F0FDF0",
                            borderWidth: 1,
                            borderColor: "#3BAD4E",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "500",
                              color: "#3BAD4E",
                              marginRight: 6,
                            }}
                          >
                            {skill}
                          </Text>
                          <Pressable
                            testID={`remove-skill-${skill}`}
                            onPress={() => handleRemoveSkill(skill)}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.05)",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <X size={12} color="#3BAD4E" strokeWidth={3} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>

                {/* Urgency Toggle */}
                <View
                  style={{
                    marginTop: 24,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 16,
                    borderRadius: 14,
                    backgroundColor: isUrgent
                      ? isDark
                        ? "rgba(239, 68, 68, 0.15)"
                        : "#FEF2F2"
                      : isDark
                      ? "rgba(255,255,255,0.05)"
                      : "#F9FAFB",
                    borderWidth: 2,
                    borderColor: isUrgent ? "#EF4444" : colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <AlertCircle
                      size={22}
                      color={isUrgent ? "#EF4444" : colors.textMuted}
                      strokeWidth={2}
                    />
                    <View style={{ marginLeft: 12 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: isUrgent ? "#EF4444" : colors.text,
                        }}
                      >
                        {isFr ? "Marquer comme URGENT" : "Mark as URGENT"}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {isFr
                          ? "L'offre sera mise en avant"
                          : "The job will be highlighted"}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    testID="urgent-switch"
                    value={isUrgent}
                    onValueChange={setIsUrgent}
                    trackColor={{ false: colors.border, true: "#EF4444" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Video Preview Section */}
                <View style={{ marginTop: 24 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Video
                      size={18}
                      color={isDark ? "#3BAD4E" : "#1B2F6E"}
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        marginLeft: 8,
                        fontSize: 15,
                        fontWeight: "600",
                        color: colors.text,
                      }}
                    >
                      {t("job_video_preview")}
                    </Text>
                    <Text
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        color: colors.textMuted,
                        fontStyle: "italic",
                      }}
                    >
                      ({isFr ? "Optionnel" : "Optional"})
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      marginBottom: 12,
                    }}
                  >
                    {t("job_video_preview_desc")}
                  </Text>

                  {jobVideoUri ? (
                    <View
                      style={{
                        borderRadius: 14,
                        overflow: "hidden",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "#F9FAFB",
                        borderWidth: 2,
                        borderColor: "#3BAD4E",
                      }}
                    >
                      <Pressable
                        testID="video-preview-thumbnail"
                        onPress={() => setShowVideoPreviewModal(true)}
                        style={{
                          height: 160,
                          backgroundColor: "#000",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <ExpoVideo
                          source={{ uri: jobVideoUri }}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                          }}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay={false}
                          isMuted
                        />
                        <View
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 28,
                            backgroundColor: "rgba(0,0,0,0.6)",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
                        </View>
                      </Pressable>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          padding: 12,
                        }}
                      >
                        <Pressable
                          testID="play-video-btn"
                          onPress={() => setShowVideoPreviewModal(true)}
                          style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            paddingVertical: 10,
                            marginRight: 8,
                            borderRadius: 10,
                            backgroundColor: isDark
                              ? "rgba(59, 173, 78, 0.15)"
                              : "#F0FDF0",
                          }}
                        >
                          <Play size={16} color="#3BAD4E" />
                          <Text
                            style={{
                              marginLeft: 6,
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#3BAD4E",
                            }}
                          >
                            {t("profile_play_video")}
                          </Text>
                        </Pressable>
                        <Pressable
                          testID="delete-video-btn"
                          onPress={handleVideoDelete}
                          style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            paddingVertical: 10,
                            marginLeft: 8,
                            borderRadius: 10,
                            backgroundColor: isDark
                              ? "rgba(239, 68, 68, 0.15)"
                              : "#FEF2F2",
                          }}
                        >
                          <Trash2 size={16} color="#EF4444" />
                          <Text
                            style={{
                              marginLeft: 6,
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#EF4444",
                            }}
                          >
                            {t("profile_delete_video")}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      testID="add-video-btn"
                      onPress={() => setShowVideoRecorder(true)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 20,
                        borderRadius: 14,
                        borderWidth: 2,
                        borderStyle: "dashed",
                        borderColor: isDark ? "rgba(59, 173, 78, 0.4)" : "#3BAD4E",
                        backgroundColor: isDark
                          ? "rgba(59, 173, 78, 0.08)"
                          : "#F0FDF0",
                      }}
                    >
                      <Video size={22} color="#3BAD4E" strokeWidth={2} />
                      <Text
                        style={{
                          marginLeft: 10,
                          fontSize: 15,
                          fontWeight: "600",
                          color: "#3BAD4E",
                        }}
                      >
                        {t("job_add_video_preview")}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Continue Button */}
                <Pressable
                  testID="continue-btn-2"
                  onPress={handleStep2Continue}
                  style={[btnStyle, { marginTop: 32 }]}
                >
                  <Text style={btnTextStyle}>{t("signup_continue")}</Text>
                </Pressable>
              </Animated.View>
            ) : null}

            {/* STEP 3: Review & Publish */}
            {step === 3 ? (
              <Animated.View
                key="step-3"
                entering={FadeInDown.duration(400)}
                style={{ marginTop: 24 }}
              >
                {/* Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: isDark
                        ? "rgba(59, 173, 78, 0.15)"
                        : "#EFF6FF",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Sparkles
                      size={22}
                      color={isDark ? "#3BAD4E" : "#1B2F6E"}
                      strokeWidth={2}
                    />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "800",
                        color: isDark ? "#FFFFFF" : "#1B2F6E",
                      }}
                    >
                      {isFr ? "Verification" : "Review"}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>
                      {isFr ? "Etape 3 sur 3" : "Step 3 of 3"}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginTop: 4,
                  }}
                >
                  {isFr
                    ? "Verifiez les informations avant de publier."
                    : "Review the information before publishing."}
                </Text>

                {/* Summary Card */}
                <View
                  style={{
                    marginTop: 24,
                    padding: 20,
                    borderRadius: 16,
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.3 : 0.06,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  {/* Job Title & Urgent Badge */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 20,
                        fontWeight: "700",
                        color: colors.text,
                        marginRight: 12,
                      }}
                    >
                      {jobTitle}
                    </Text>
                    {isUrgent ? (
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor: "#EF4444",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: "#FFFFFF",
                          }}
                        >
                          URGENT
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Contract & Sector */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 12,
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: isDark
                          ? "rgba(59, 173, 78, 0.15)"
                          : "#F0FDF0",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: "#3BAD4E",
                        }}
                      >
                        {getContractLabel(contractType)}
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: isDark
                          ? "rgba(27, 47, 110, 0.3)"
                          : "#EFF6FF",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: isDark ? "#93C5FD" : "#1B2F6E",
                        }}
                      >
                        {getSectorLabel(sectorKey)}
                      </Text>
                    </View>
                  </View>

                  {/* Location */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 16,
                    }}
                  >
                    <MapPin
                      size={16}
                      color={colors.textMuted}
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        marginLeft: 6,
                        fontSize: 14,
                        color: colors.textSecondary,
                      }}
                    >
                      {city}
                      {neighborhood ? `, ${neighborhood}` : ""}
                    </Text>
                  </View>

                  {/* Salary */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: colors.text,
                      }}
                    >
                      {isFr ? "Salaire: " : "Salary: "}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                      }}
                    >
                      {formatSalary(salaryMin, salaryMax)}
                    </Text>
                  </View>

                  {/* Divider */}
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.border,
                      marginVertical: 16,
                    }}
                  />

                  {/* Description Preview */}
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: colors.textMuted,
                      marginBottom: 8,
                    }}
                  >
                    {isFr ? "DESCRIPTION" : "DESCRIPTION"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      lineHeight: 20,
                    }}
                    numberOfLines={4}
                  >
                    {description}
                  </Text>

                  {/* Skills */}
                  {skills.length > 0 ? (
                    <View style={{ marginTop: 16 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: colors.textMuted,
                          marginBottom: 8,
                        }}
                      >
                        {isFr ? "COMPETENCES" : "SKILLS"}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        {skills.map((skill) => (
                          <View
                            key={skill}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 6,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.08)"
                                : "#F3F4F6",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: colors.textSecondary,
                              }}
                            >
                              {skill}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Publish Button */}
                <Pressable
                  testID="publish-btn"
                  onPress={handlePublish}
                  disabled={publishing}
                  style={[
                    btnStyle,
                    { marginTop: 28 },
                    publishing ? { opacity: 0.7 } : null,
                  ]}
                >
                  {publishing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={btnTextStyle}>
                      {isFr ? "Publier l'offre" : "Publish job"}
                    </Text>
                  )}
                </Pressable>

                {/* Edit Button */}
                <Pressable
                  testID="edit-btn"
                  onPress={() => {
                    setDirection("back");
                    setStep(1);
                  }}
                  style={{
                    marginTop: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: colors.textSecondary,
                    }}
                  >
                    {isFr ? "Modifier les informations" : "Edit information"}
                  </Text>
                </Pressable>
              </Animated.View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Video Recorder Modal */}
      <Modal
        visible={showVideoRecorder}
        animationType="slide"
        onRequestClose={() => setShowVideoRecorder(false)}
      >
        <VideoRecorder
          maxDuration={30}
          onSave={handleVideoSave}
          onCancel={() => setShowVideoRecorder(false)}
        />
      </Modal>

      {/* Video Preview Modal */}
      <Modal
        visible={showVideoPreviewModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowVideoPreviewModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Pressable
            testID="close-preview-modal"
            onPress={() => setShowVideoPreviewModal(false)}
            style={{
              position: "absolute",
              top: 60,
              right: 20,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.2)",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <X size={24} color="#FFFFFF" />
          </Pressable>
          {jobVideoUri ? (
            <ExpoVideo
              source={{ uri: jobVideoUri }}
              style={{
                width: "100%",
                height: 400,
              }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping
              useNativeControls
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

// Dynamic style helpers
const getLabelStyle = (colors: any) => ({
  marginBottom: 6,
  fontSize: 13,
  fontWeight: "600" as const,
  color: colors.textSecondary,
});

const getInputStyle = (colors: any, isDark: boolean) => ({
  borderRadius: 12,
  borderWidth: 2,
  borderColor: colors.border,
  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB",
  paddingHorizontal: 14,
  paddingVertical: 13,
  fontSize: 15,
  color: colors.text,
});

const activeInputStyle = {
  borderColor: "#3BAD4E",
};

const getDropdownStyle = (colors: any, isDark: boolean) => ({
  flexDirection: "row" as const,
  alignItems: "center" as const,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: colors.border,
  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB",
  paddingHorizontal: 14,
  paddingVertical: 13,
});

const getPickerListStyle = (colors: any, isDark: boolean) => ({
  marginTop: 4,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
  overflow: "hidden" as const,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: isDark ? 0.3 : 0.06,
  shadowRadius: 8,
  elevation: 3,
});

const pickerItemStyle = {
  paddingHorizontal: 16,
  paddingVertical: 12,
};

const getInputRowStyle = (colors: any, isDark: boolean) => ({
  flexDirection: "row" as const,
  alignItems: "center" as const,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: colors.border,
  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB",
  overflow: "hidden" as const,
});

const btnStyle = {
  borderRadius: 14,
  paddingVertical: 16,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: "#3BAD4E",
};

const btnTextStyle = {
  fontSize: 16,
  fontWeight: "700" as const,
  color: "#FFFFFF",
};

const errorStyle = {
  marginTop: 4,
  fontSize: 12,
  color: "#EF4444",
};
