import { useState } from "react";
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
  Dimensions as RNDimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronDown,
  Building2,
  Eye,
  EyeOff,
  Check,
  Camera,
  CheckCircle,
} from "lucide-react-native";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeInLeft,
  FadeOutRight,
  FadeInDown,
} from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { useLang } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import { authClient } from "@/lib/auth/auth-client";
import { useInvalidateSession } from "@/lib/auth/use-session";
import { api } from "@/lib/api/api";
import { useTheme } from "@/lib/theme";

const SCREEN_WIDTH = RNDimensions.get("window").width;
const TOTAL_STEPS = 3;

// Sectors with English labels
const SECTORS = [
  { key: "technology", en: "Technology", fr: "Technologie" },
  { key: "finance", en: "Finance", fr: "Finance & Banque" },
  { key: "healthcare", en: "Healthcare", fr: "Santé" },
  { key: "education", en: "Education", fr: "Éducation" },
  { key: "retail", en: "Retail", fr: "Commerce" },
  { key: "manufacturing", en: "Manufacturing", fr: "Industrie" },
  { key: "construction", en: "Construction", fr: "Construction / BTP" },
  { key: "transport", en: "Transport", fr: "Transport & Logistique" },
  { key: "agriculture", en: "Agriculture", fr: "Agriculture" },
  { key: "services", en: "Services", fr: "Services" },
  { key: "other", en: "Other", fr: "Autre" },
];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "200+"];

type CountryCode = { flag: string; name: string; dialCode: string };

const COUNTRY_CODES: CountryCode[] = [
  { flag: "\u{1F1F8}\u{1F1F3}", name: "Sénégal", dialCode: "+221" },
  { flag: "\u{1F1E8}\u{1F1EE}", name: "Côte d'Ivoire", dialCode: "+225" },
  { flag: "\u{1F1F2}\u{1F1F1}", name: "Mali", dialCode: "+223" },
  { flag: "\u{1F1EC}\u{1F1F3}", name: "Guinée", dialCode: "+224" },
  { flag: "\u{1F1E8}\u{1F1F2}", name: "Cameroun", dialCode: "+237" },
  { flag: "\u{1F1E7}\u{1F1EF}", name: "Bénin", dialCode: "+229" },
  { flag: "\u{1F1E7}\u{1F1EB}", name: "Burkina Faso", dialCode: "+226" },
  { flag: "\u{1F1F3}\u{1F1EA}", name: "Niger", dialCode: "+227" },
  { flag: "\u{1F1F9}\u{1F1EC}", name: "Togo", dialCode: "+228" },
  { flag: "\u{1F1F2}\u{1F1E6}", name: "Maroc", dialCode: "+212" },
  { flag: "\u{1F1EB}\u{1F1F7}", name: "France", dialCode: "+33" },
  { flag: "\u{1F1E7}\u{1F1EA}", name: "Belgique", dialCode: "+32" },
  { flag: "\u{1F1FA}\u{1F1F8}", name: "USA/Canada", dialCode: "+1" },
  { flag: "\u{1F1EC}\u{1F1E7}", name: "UK", dialCode: "+44" },
  { flag: "\u{1F1E9}\u{1F1EA}", name: "Allemagne", dialCode: "+49" },
];

function getInitials(name: string): string {
  if (!name.trim()) return "";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

function toE164(dialCode: string, localPhone: string): string {
  const countryDigits = dialCode.replace(/\D/g, "");
  let digits = localPhone.replace(/\D/g, "");
  if (digits.startsWith(countryDigits)) {
    digits = digits.slice(countryDigits.length);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return `${dialCode}${digits}`;
}

export default function RecruiterSignupScreen() {
  const router = useRouter();
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const { colors, isDark } = useTheme();

  const isFr = lang === "fr";

  const errorStyle = { marginTop: 4, fontSize: 12, color: colors.urgentText };

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  // Step 1: Company Info
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [sectorKey, setSectorKey] = useState("");
  const [showSectorPicker, setShowSectorPicker] = useState(false);
  const [companySize, setCompanySize] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [customSector, setCustomSector] = useState("");

  // Step 2: Personal Info
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("+221");
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Step 2 submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Step 3: finishing (onboarding call)
  const [finishing, setFinishing] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const invalidateSession = useInvalidateSession();

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
    if (!companyName.trim()) errs.companyName = t("error_required");
    if (!sector) errs.sector = t("error_required");
    if (sectorKey === "other" && !customSector.trim()) errs.customSector = t("error_required");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Validation Step 2
  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!email.trim() || !email.includes("@")) errs.email = t("error_required");
    if (!password) errs.password = t("error_required");
    else if (password.length < 8) errs.password = t("error_password_min");
    if (!confirmPassword) errs.confirmPassword = t("error_required");
    else if (confirmPassword !== password)
      errs.confirmPassword = t("error_password_match");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStep1Continue = () => {
    if (validateStep1()) goNext();
  };

  // Step 2: create account directly, then go to success step
  const handleStep2Continue = async () => {
    if (!validateStep2()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error: signupError } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: companyName.trim(),
        data: {
          accountType: "recruiter",
          languagePreference: lang,
          ...(phone.trim() ? { phone: toE164(dialCode, phone) } : {}),
        },
      } as any);

      if (signupError) {
        const msg = (signupError as any)?.message ?? "";
        const isAlreadyExists =
          msg.toLowerCase().includes("already") ||
          (signupError as any)?.code === "USER_ALREADY_EXISTS";
        const isNetwork =
          msg.toLowerCase().includes("network") ||
          msg.toLowerCase().includes("fetch") ||
          msg.toLowerCase().includes("connect") ||
          msg === "";
        setSubmitError(
          isAlreadyExists
            ? isFr
              ? "Cet email est déjà utilisé."
              : "This email is already registered."
            : isNetwork
            ? isFr
              ? "Connexion au serveur impossible. Vérifiez votre connexion."
              : "Unable to connect to server. Check your connection."
            : isFr
            ? "Erreur lors de la création du compte. Réessayez."
            : "Failed to create account. Please try again."
        );
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      goNext();
    } catch (err: any) {
      const isNetwork =
        err?.message?.toLowerCase().includes("network") ||
        err?.message?.toLowerCase().includes("fetch") ||
        err?.message?.toLowerCase().includes("connect");
      setSubmitError(
        isNetwork
          ? isFr
            ? "Connexion au serveur impossible. Vérifiez votre connexion."
            : "Unable to connect to server. Check your connection."
          : isFr
          ? "Une erreur est survenue. Veuillez réessayer."
          : "An error occurred. Please try again."
      );
      setSubmitting(false);
    }
  };

  const handlePickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleGoToDashboard = async () => {
    setFinishing(true);
    try {
      const primaryPhone = phone.trim() ? toE164(dialCode, phone) : undefined;

      // Onboarding is non-blocking — if it fails, user is already authenticated
      try {
        await api.post("/api/onboarding", {
          accountType: "recruiter",
          companyName: companyName.trim(),
          sector: sectorKey === "other" && customSector.trim() ? customSector.trim() : (sectorKey || "other"),
          contactName: companyName.trim(),
          languagePreference: lang,
          ...(primaryPhone ? { phone: primaryPhone } : {}),
        });
      } catch {
        // Onboarding failed silently — profile can be completed later
      }

      const name = companyName.trim();
      const welcome =
        lang === "zh"
          ? `欢迎来到 Jobé，${name}！`
          : isFr
          ? `Bienvenue sur Jobé, ${name} !`
          : `Welcome to Jobé, ${name}!`;
      showToast(welcome, "success");
      invalidateSession();
    } catch {
      setFinishing(false);
    }
  };

  const getSectorLabel = (key: string): string => {
    const found = SECTORS.find((s) => s.key === key);
    if (!found) return "";
    return isFr ? found.fr : found.en;
  };

  return (
    <View
      testID="recruiter-signup-screen"
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
            {step < 3 ? (
              <Pressable
                testID="back-button"
                onPress={goBack}
                style={{
                  marginRight: 12,
                  height: 44,
                  width: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 22,
                  backgroundColor: colors.card,
                }}
              >
                <ChevronLeft size={20} color={colors.text} strokeWidth={2.5} />
              </Pressable>
            ) : (
              <View style={{ width: 44, marginRight: 12 }} />
            )}
            <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: i < step ? colors.accent : colors.border,
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
            {/* ─── STEP 1: Company Info ─── */}
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
                        : colors.toggleBg,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Building2
                      size={22}
                      color={isDark ? colors.accent : colors.primary}
                      strokeWidth={2}
                    />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "800",
                        color: colors.primary,
                      }}
                    >
                      {isFr ? "Votre entreprise" : "Your company"}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>
                      {isFr ? "Recruteur" : "Recruiter"}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{ fontSize: 15, color: colors.textSecondary, marginTop: 4 }}
                >
                  {isFr
                    ? "Renseignez les informations de votre entreprise."
                    : "Enter your company information."}
                </Text>

                {/* Company Logo Upload */}
                <View style={{ marginTop: 28, alignItems: "center" }}>
                  <Pressable
                    testID="logo-picker"
                    onPress={handlePickLogo}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 20,
                      backgroundColor: colors.toggleBg,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: logoUri ? colors.accent : colors.border,
                      borderStyle: logoUri ? "solid" : "dashed",
                    }}
                  >
                    {logoUri ? (
                      <Image
                        source={{ uri: logoUri }}
                        style={{ width: 96, height: 96, borderRadius: 18 }}
                        resizeMode="cover"
                      />
                    ) : companyName.trim() ? (
                      <Text
                        style={{
                          fontSize: 32,
                          fontWeight: "700",
                          color: isDark ? colors.accent : colors.primary,
                        }}
                      >
                        {getInitials(companyName)}
                      </Text>
                    ) : (
                      <Camera
                        size={36}
                        color={colors.textMuted}
                        strokeWidth={1.5}
                      />
                    )}
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: colors.accent,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 2,
                        borderColor: colors.background,
                      }}
                    >
                      <Text
                        style={{ color: "#FFFFFF", fontSize: 18, lineHeight: 20 }}
                      >
                        +
                      </Text>
                    </View>
                  </Pressable>
                  <Text
                    style={{ marginTop: 10, fontSize: 13, color: colors.textMuted }}
                  >
                    {isFr ? "Logo (optionnel)" : "Logo (optional)"}
                  </Text>
                </View>

                {/* Company Name */}
                <View style={{ marginTop: 24 }}>
                  <Text style={getLabelStyle(colors)}>
                    {t("signup_company_name")}
                  </Text>
                  <TextInput
                    testID="company-name-input"
                    value={companyName}
                    onChangeText={(v) => {
                      setCompanyName(v);
                      setErrors((e) => ({ ...e, companyName: "" }));
                    }}
                    placeholder={t("signup_company_name_placeholder")}
                    placeholderTextColor={colors.textMuted}
                    autoComplete="organization"
                    textContentType="organizationName"
                    selectionColor={colors.accent}
                    cursorColor={colors.accent}
                    style={[
                      getInputStyle(colors, isDark),
                      companyName.length > 0 ? activeInputStyle : null,
                    ]}
                  />
                  {errors.companyName ? (
                    <Text style={errorStyle}>{errors.companyName}</Text>
                  ) : null}
                </View>

                {/* Sector */}
                <View style={{ marginTop: 16 }}>
                  <Text style={getLabelStyle(colors)}>{t("signup_sector")}</Text>
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
                      {sector || t("signup_sector_placeholder")}
                    </Text>
                    <ChevronDown
                      size={16}
                      color={colors.textMuted}
                      strokeWidth={2}
                    />
                  </Pressable>
                  {showSectorPicker ? (
                    <View style={getPickerListStyle(colors, isDark)}>
                      <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
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
                                  ? { backgroundColor: isDark ? "rgba(59, 173, 78, 0.15)" : "#F0FDF0" }
                                  : null,
                              ]}
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  color: isSelected ? colors.accent : colors.text,
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
                  {sectorKey === "other" ? (
                    <View style={{ marginTop: 10 }}>
                      <TextInput
                        testID="custom-sector-input"
                        value={customSector}
                        onChangeText={(v) => {
                          setCustomSector(v);
                          setErrors((e) => ({ ...e, customSector: "" }));
                        }}
                        placeholder={isFr ? "Précisez votre secteur *" : "Specify your sector *"}
                        placeholderTextColor={colors.textMuted}
                        autoComplete="off"
                        textContentType="none"
                        selectionColor={colors.accent}
                        cursorColor={colors.accent}
                        style={[
                          getInputStyle(colors, isDark),
                          customSector.length > 0 ? activeInputStyle : null,
                        ]}
                      />
                      {errors.customSector ? (
                        <Text style={errorStyle}>{errors.customSector}</Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                {/* Company Size */}
                <View style={{ marginTop: 16 }}>
                  <Text style={getLabelStyle(colors)}>
                    {t("signup_company_size")} ({isFr ? "Optionnel" : "Optional"})
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 6,
                    }}
                  >
                    {COMPANY_SIZES.map((size) => {
                      const isSelected = companySize === size;
                      return (
                        <Pressable
                          key={size}
                          onPress={() =>
                            setCompanySize(companySize === size ? "" : size)
                          }
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 20,
                            borderWidth: 2,
                            borderColor: isSelected ? colors.accent : colors.border,
                            backgroundColor: isSelected
                              ? isDark
                                ? "rgba(59, 173, 78, 0.15)"
                                : "#F0FDF0"
                              : isDark
                              ? "rgba(255,255,255,0.05)"
                              : colors.card,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: isSelected ? colors.accent : colors.textSecondary,
                            }}
                          >
                            {size} {isFr ? "employés" : "employees"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Continue */}
                <Pressable
                  testID="continue-btn-1"
                  onPress={handleStep1Continue}
                  style={[btnStyle, { marginTop: 32 }]}
                >
                  <Text style={btnTextStyle}>{t("signup_continue")}</Text>
                </Pressable>

              </Animated.View>
            ) : null}

            {/* ─── STEP 2: Recruiter Personal Info ─── */}
            {step === 2 ? (
              <Animated.View
                key="step-2"
                entering={entering}
                exiting={exiting}
                style={{ marginTop: 24 }}
              >
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    color: colors.primary,
                  }}
                >
                  {isFr ? "Vos informations" : "Your information"}
                </Text>
                <Text
                  style={{
                    marginTop: 6,
                    fontSize: 15,
                    color: colors.textSecondary,
                  }}
                >
                  {isFr
                    ? "Créez votre compte recruteur"
                    : "Create your recruiter account"}
                </Text>

                {/* Email */}
                <View style={{ marginTop: 16 }}>
                  <Text style={getLabelStyle(colors)}>
                    {t("signup_recruiter_email")}
                  </Text>
                  <TextInput
                    testID="email-input"
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      setErrors((e) => ({ ...e, email: "" }));
                    }}
                    placeholder={t("signup_recruiter_email_placeholder")}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    selectionColor={colors.accent}
                    cursorColor={colors.accent}
                    style={[
                      getInputStyle(colors, isDark),
                      email.length > 0 ? activeInputStyle : null,
                    ]}
                  />
                  {errors.email ? (
                    <Text style={errorStyle}>{errors.email}</Text>
                  ) : null}
                </View>

                {/* Password */}
                <View style={{ marginTop: 16 }}>
                  <Text style={getLabelStyle(colors)}>{t("signup_password")}</Text>
                  <View
                    style={[
                      getPwRowStyle(colors, isDark),
                      password.length > 0 ? activeInputStyle : null,
                    ]}
                  >
                    <TextInput
                      testID="password-input"
                      value={password}
                      onChangeText={(v) => {
                        setPassword(v);
                        setErrors((e) => ({ ...e, password: "" }));
                      }}
                      placeholder={t("signup_password_placeholder")}
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      selectionColor={colors.accent}
                      cursorColor={colors.accent}
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        paddingLeft: 14,
                        fontSize: 15,
                        color: colors.text,
                      }}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ paddingHorizontal: 12 }}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color={colors.textMuted} strokeWidth={2} />
                      ) : (
                        <Eye size={20} color={colors.textMuted} strokeWidth={2} />
                      )}
                    </Pressable>
                  </View>
                  {errors.password ? (
                    <Text style={errorStyle}>{errors.password}</Text>
                  ) : null}
                </View>

                {/* Confirm Password */}
                <View style={{ marginTop: 16 }}>
                  <Text style={getLabelStyle(colors)}>
                    {t("signup_confirm_password")}
                  </Text>
                  <View
                    style={[
                      getPwRowStyle(colors, isDark),
                      confirmPassword.length > 0 ? activeInputStyle : null,
                    ]}
                  >
                    <TextInput
                      testID="confirm-password-input"
                      value={confirmPassword}
                      onChangeText={(v) => {
                        setConfirmPassword(v);
                        setErrors((e) => ({ ...e, confirmPassword: "" }));
                      }}
                      placeholder={t("signup_confirm_placeholder")}
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showConfirm}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      selectionColor={colors.accent}
                      cursorColor={colors.accent}
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        paddingLeft: 14,
                        fontSize: 15,
                        color: colors.text,
                      }}
                    />
                    <Pressable
                      onPress={() => setShowConfirm(!showConfirm)}
                      style={{ paddingHorizontal: 12 }}
                    >
                      {showConfirm ? (
                        <EyeOff size={20} color={colors.textMuted} strokeWidth={2} />
                      ) : (
                        <Eye size={20} color={colors.textMuted} strokeWidth={2} />
                      )}
                    </Pressable>
                  </View>
                  {errors.confirmPassword ? (
                    <Text style={errorStyle}>{errors.confirmPassword}</Text>
                  ) : null}
                </View>

                {/* Phone (optional) */}
                <View style={{ marginTop: 16 }}>
                  <Text style={getLabelStyle(colors)}>
                    {isFr ? "Téléphone (Optionnel)" : "Phone (Optional)"}
                  </Text>
                  <View
                    style={[
                      getPhoneRowStyle(colors, isDark),
                      phone.length > 0 ? activeInputStyle : null,
                    ]}
                  >
                    <Pressable
                      testID="country-code-picker"
                      onPress={() => setShowCountryPicker(true)}
                      style={getCountryBtnStyle(colors)}
                    >
                      <Text style={{ fontSize: 16, marginRight: 4 }}>
                        {COUNTRY_CODES.find((c) => c.dialCode === dialCode)
                          ?.flag ?? "\u{1F1F8}\u{1F1F3}"}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.text,
                          marginRight: 2,
                        }}
                      >
                        {dialCode}
                      </Text>
                      <ChevronDown
                        size={13}
                        color={colors.textMuted}
                        strokeWidth={2.5}
                      />
                    </Pressable>
                    <TextInput
                      testID="phone-input"
                      value={phone}
                      onChangeText={setPhone}
                      placeholder={t("signup_phone_placeholder")}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      selectionColor={colors.accent}
                      cursorColor={colors.accent}
                      style={{
                        flex: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 14,
                        fontSize: 15,
                        color: colors.text,
                      }}
                    />
                  </View>
                </View>

                {/* Submit error */}
                {submitError ? (
                  <View
                    style={{
                      marginTop: 12,
                      borderRadius: 10,
                      backgroundColor: colors.urgentBg,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: colors.urgentText, textAlign: "center" }}>
                      {submitError}
                    </Text>
                  </View>
                ) : null}

                {/* Continue / Create Account */}
                <Pressable
                  testID="continue-btn-2"
                  onPress={handleStep2Continue}
                  disabled={submitting}
                  style={[btnStyle, { marginTop: 28, backgroundColor: submitting ? colors.border : "#3BAD4E" }]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={btnTextStyle}>
                      {isFr ? "Créer mon compte" : "Create my account"}
                    </Text>
                  )}
                </Pressable>
              </Animated.View>
            ) : null}

            {/* ─── STEP 3: Success ─── */}
            {step === 3 ? (
              <Animated.View
                key="step-3"
                entering={FadeInDown.duration(400)}
                style={{
                  marginTop: 60,
                  alignItems: "center",
                  paddingHorizontal: 16,
                }}
              >
                {/* Success Icon */}
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: isDark
                      ? "rgba(59, 173, 78, 0.2)"
                      : colors.toggleBg,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 28,
                  }}
                >
                  <CheckCircle size={56} color={colors.accent} strokeWidth={2} />
                </View>

                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: "800",
                    color: colors.primary,
                    textAlign: "center",
                    marginBottom: 12,
                  }}
                >
                  {isFr ? "Compte créé !" : "Account created!"}
                </Text>

                <Text
                  style={{
                    fontSize: 15,
                    color: colors.textSecondary,
                    textAlign: "center",
                    lineHeight: 22,
                    marginBottom: 8,
                  }}
                >
                  {isFr
                    ? `Bienvenue ! Votre compte recruteur pour ${companyName} est maintenant actif.`
                    : `Welcome! Your recruiter account for ${companyName} is now active.`}
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textMuted,
                    textAlign: "center",
                    marginBottom: 40,
                  }}
                >
                  {isFr
                    ? "Commencez à publier des offres et trouvez les meilleurs talents."
                    : "Start posting jobs and find the best talent."}
                </Text>

                {/* Go to Dashboard Button */}
                <Pressable
                  testID="go-to-dashboard-btn"
                  onPress={handleGoToDashboard}
                  disabled={finishing}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.accent,
                  }}
                >
                  {finishing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                      {isFr ? "Aller au tableau de bord" : "Go to my dashboard"}
                    </Text>
                  )}
                </Pressable>
              </Animated.View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Country Code Modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setShowCountryPicker(false)}
        >
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 16,
              paddingBottom: 32,
              maxHeight: "70%",
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
                alignSelf: "center",
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: colors.primary,
                paddingHorizontal: 20,
                marginBottom: 12,
              }}
            >
              {t("onboarding_country_code_title")}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {COUNTRY_CODES.map((country) => (
                <Pressable
                  key={country.dialCode}
                  onPress={() => {
                    setDialCode(country.dialCode);
                    setShowCountryPicker(false);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    backgroundColor:
                      dialCode === country.dialCode
                        ? isDark
                          ? "rgba(59, 173, 78, 0.15)"
                          : "#F0FDF0"
                        : pressed
                        ? isDark
                          ? "rgba(255,255,255,0.05)"
                          : colors.toggleBg
                        : "transparent",
                  })}
                >
                  <Text style={{ fontSize: 22, marginRight: 14 }}>
                    {country.flag}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: colors.text,
                      fontWeight: dialCode === country.dialCode ? "600" : "400",
                    }}
                  >
                    {country.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color:
                        dialCode === country.dialCode
                          ? colors.accent
                          : colors.textSecondary,
                      marginRight: dialCode === country.dialCode ? 8 : 0,
                      fontWeight: "500",
                    }}
                  >
                    {country.dialCode}
                  </Text>
                  {dialCode === country.dialCode ? (
                    <Check size={18} color={colors.accent} strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
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
  borderRadius: 14,
  borderWidth: 2,
  borderColor: colors.border,
  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.toggleBg,
  paddingHorizontal: 14,
  paddingVertical: 14,
  fontSize: 15,
  color: colors.text,
});

const activeInputStyle = {
  borderColor: "#3BAD4E",
};

const getDropdownStyle = (colors: any, isDark: boolean) => ({
  flexDirection: "row" as const,
  alignItems: "center" as const,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: colors.border,
  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.toggleBg,
  paddingHorizontal: 14,
  paddingVertical: 14,
});

const getPickerListStyle = (colors: any, isDark: boolean) => ({
  marginTop: 4,
  borderRadius: 14,
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

const getPwRowStyle = (colors: any, isDark: boolean) => ({
  flexDirection: "row" as const,
  alignItems: "center" as const,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: colors.border,
  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.toggleBg,
});

const getPhoneRowStyle = (colors: any, isDark: boolean) => ({
  flexDirection: "row" as const,
  alignItems: "center" as const,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: colors.border,
  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.toggleBg,
  overflow: "hidden" as const,
});

const getCountryBtnStyle = (colors: any) => ({
  flexDirection: "row" as const,
  alignItems: "center" as const,
  paddingHorizontal: 12,
  paddingVertical: 14,
  borderRightWidth: 1,
  borderRightColor: colors.border,
});

const btnStyle = {
  borderRadius: 14,
  height: 52,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: "#3BAD4E",
};

const btnTextStyle = {
  fontSize: 16,
  fontWeight: "700" as const,
  color: "#FFFFFF",
};
