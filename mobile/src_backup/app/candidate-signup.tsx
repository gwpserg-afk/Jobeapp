import { useState, useRef, useEffect, useCallback } from "react";
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
  ArrowLeft,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronLeft,
  Check,
  Camera,
  User,
} from "lucide-react-native";
import Animated, { FadeInRight, FadeOutLeft, FadeInLeft, FadeOutRight } from "react-native-reanimated";
import { OtpInput } from "react-native-otp-entry";
import * as ImagePicker from "expo-image-picker";
import { useLang } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import { useDemoStore } from "@/lib/demoStore";
import { useTheme } from "@/lib/theme";
import { HeadlineSuggestInput } from "@/components/HeadlineSuggestInput";
import { authClient } from "@/lib/auth/auth-client";
import { useInvalidateSession } from "@/lib/auth/use-session";
import { api } from "@/lib/api/api";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

const SCREEN_WIDTH = RNDimensions.get("window").width;
const TOTAL_STEPS = 3;

type CountryCode = { flag: string; name: string; dialCode: string };

const COUNTRY_CODES: CountryCode[] = [
  { flag: "🇸🇳", name: "Sénégal", dialCode: "+221" },
  { flag: "🇨🇮", name: "Côte d'Ivoire", dialCode: "+225" },
  { flag: "🇲🇱", name: "Mali", dialCode: "+223" },
  { flag: "🇬🇳", name: "Guinée", dialCode: "+224" },
  { flag: "🇨🇲", name: "Cameroun", dialCode: "+237" },
  { flag: "🇧🇯", name: "Bénin", dialCode: "+229" },
  { flag: "🇧🇫", name: "Burkina Faso", dialCode: "+226" },
  { flag: "🇳🇪", name: "Niger", dialCode: "+227" },
  { flag: "🇹🇬", name: "Togo", dialCode: "+228" },
  { flag: "🇲🇦", name: "Maroc", dialCode: "+212" },
  { flag: "🇫🇷", name: "France", dialCode: "+33" },
  { flag: "🇧🇪", name: "Belgique", dialCode: "+32" },
  { flag: "🇺🇸", name: "USA/Canada", dialCode: "+1" },
  { flag: "🇬🇧", name: "UK", dialCode: "+44" },
  { flag: "🇩🇪", name: "Allemagne", dialCode: "+49" },
];

const CITIES = [
  "Dakar", "Thiès", "Saint-Louis", "Ziguinchor",
  "Kaolack", "Touba", "Mbour", "Rufisque", "Autre",
];

function maskPhone(dialCode: string, phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return `${dialCode} ${phone}`;
  const visible = digits.slice(-2);
  const masked = "*".repeat(digits.length - 2);
  return `${dialCode} ${masked}${visible}`;
}

/**
 * Converts a dial code + local phone number to E.164 format.
 * Strips all non-digit characters, removes leading trunk zero if present,
 * and deduplicates if the user typed the country code into the local field.
 * Examples:
 *   toE164("+221", "77 123 45 67")  → "+221771234567"
 *   toE164("+221", "0771234567")    → "+221771234567"
 *   toE164("+221", "+221771234567") → "+221771234567"
 */
function toE164(dialCode: string, localPhone: string): string {
  const countryDigits = dialCode.replace(/\D/g, ""); // e.g. "221"
  let digits = localPhone.replace(/\D/g, "");         // strip all non-digits

  // If the user typed the full number including country code, deduplicate
  if (digits.startsWith(countryDigits)) {
    digits = digits.slice(countryDigits.length);
  }

  // Strip a single leading 0 (trunk prefix used in local dialing)
  // e.g. Senegal: 0771234567 → 771234567; safe for most ECOWAS countries
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return `${dialCode}${digits}`;
}

function parseDate(val: string, lang: string): Date | null {
  const parts = val.split("/");
  if (parts.length !== 3) return null;
  let day: number, month: number;
  // French: DD/MM/YY(YY) — English/Chinese: MM/DD/YYYY
  if (lang === "fr") {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
  } else {
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
  }
  let year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  // Expand 2-digit years: 00–30 → 2000–2030, 31–99 → 1931–1999
  if (year >= 0 && year <= 99) {
    year = year <= 30 ? 2000 + year : 1900 + year;
  }

  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

function isAtLeast15(dob: string, lang: string): boolean {
  const d = parseDate(dob, lang);
  if (!d) return false;
  const now = new Date();
  const age = now.getFullYear() - d.getFullYear() -
    (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  return age >= 15;
}

export default function CandidateSignupScreen() {
  const router = useRouter();
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const { colors, isDark } = useTheme();
  const setDemoLoggedIn = useDemoStore((s) => s.setDemoLoggedIn);
  const setDemoProfile = useDemoStore((s) => s.setDemoProfile);

  // Dynamic styles based on theme
  const dynamicLabelStyle = {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.text,
  };

  const errorStyle = {
    marginTop: 5,
    fontSize: 12,
    color: colors.urgentText,
  };

  const dynamicInputStyle = {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
  };

  const dynamicPwRowStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  };

  const dynamicPhoneRowStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden" as const,
    height: 50,
  };

  const dynamicCountryBtnStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: "100%" as const,
    justifyContent: "center" as const,
  };

  const dynamicDropdownStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 13,
  };

  const dynamicPickerListStyle = {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 6,
  };

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  // Step 1
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("+221");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [dob, setDob] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2
  const [city, setCity] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [neighborhood, setNeighborhood] = useState("");

  const invalidateSession = useInvalidateSession();

  // Step 3 (formerly Step 4)
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const entering = direction === "forward" ? FadeInRight.duration(280) : FadeInLeft.duration(280);
  const exiting = direction === "forward" ? FadeOutLeft.duration(200) : FadeOutRight.duration(200);

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

  // Validation step 1
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = t("error_required");
    if (phone.trim().length < 6) errs.phone = t("error_phone_invalid");
    // Email is optional — only validate format if user typed something
    if (email.trim() && !email.includes("@")) errs.email = t("login_email_invalid");
    if (!password) errs.password = t("error_required");
    else if (password.length < 8) errs.password = t("error_password_min");
    if (!confirmPassword) errs.confirmPassword = t("error_required");
    else if (confirmPassword !== password) errs.confirmPassword = t("error_password_match");
    if (!dob.trim()) errs.dob = t("error_required");
    else if (!isAtLeast15(dob, lang)) errs.dob = t("signup_dob_error");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!city) errs.city = t("error_required");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStep1Continue = () => {
    if (validateStep1()) goNext();
  };

  const handleStep2Continue = () => {
    if (validateStep2()) goNext();
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    setFinishError(null);
    try {
      const fullPhone = toE164(dialCode, phone);
      // Use real email or synthetic phone-based email if none provided
      const accountEmail = email.trim() ? email.trim() : `${fullPhone.replace('+', '')}@phone.jobe.app`;

      // Create account with Better Auth
      const { error: signupError } = await authClient.signUp.email({
        email: accountEmail,
        password,
        name: fullName.trim(),
        data: {
          accountType: "candidate",
          phone: fullPhone,
          languagePreference: lang,
        },
      } as any);

      if (signupError) {
        const msg = (signupError as any)?.message ?? "";
        const isAlreadyExists = msg.toLowerCase().includes("already") || (signupError as any)?.code === "USER_ALREADY_EXISTS";
        const isNetwork = msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("connect") || msg === "";
        const errMsg = isAlreadyExists
          ? (lang === "zh" ? "该号码或邮箱已注册。" : lang === "fr" ? "Ce numéro ou cet email est déjà inscrit." : "This phone or email is already registered.")
          : isNetwork
          ? (lang === "zh" ? "无法连接到服务器，请检查您的网络连接。" : lang === "fr" ? "Connexion au serveur impossible. Vérifiez votre connexion." : "Unable to connect to server. Check your connection.")
          : (lang === "zh" ? "注册失败，请重试。" : lang === "fr" ? "Erreur lors de la création du compte. Réessayez." : "Failed to create account. Please try again.");
        setFinishError(errMsg);
        setFinishing(false);
        return;
      }

      // Create candidate profile via onboarding endpoint — non-blocking
      // If this fails, user can still proceed; profile can be completed later
      try {
        await api.post("/api/onboarding", {
          accountType: "candidate",
          fullName: fullName.trim(),
          city,
          headline: headline.trim(),
          phone: fullPhone,
          languagePreference: lang,
        });
      } catch {
        // Onboarding failed silently — user is already authenticated, proceed anyway
      }

      const firstName = fullName.trim().split(" ")[0] ?? fullName.trim();
      const welcome = lang === "zh"
        ? `欢迎来到 Jobé，${firstName}！`
        : lang === "fr"
        ? `Bienvenue sur Jobé, ${firstName} !`
        : `Welcome to Jobé, ${firstName}!`;
      showToast(welcome, "success");
      invalidateSession();
    } catch (err: any) {
      const isNetwork = err?.message?.toLowerCase().includes("network") || err?.message?.toLowerCase().includes("fetch") || err?.message?.toLowerCase().includes("connect");
      const errMsg = isNetwork
        ? (lang === "zh" ? "无法连接到服务器，请检查您的网络连接。" : lang === "fr" ? "Connexion au serveur impossible. Vérifiez votre connexion." : "Unable to connect to server. Check your connection.")
        : (lang === "zh" ? "发生错误，请重试。" : lang === "fr" ? "Une erreur est survenue. Veuillez réessayer." : "An error occurred. Please try again.");
      setFinishError(errMsg);
      setFinishing(false);
    }
  };

  const formatCountdown = (s: number) => {
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  return (
    <View testID="candidate-signup-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Progress bar */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingTop: 12 }}>
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
            <Text style={{ marginLeft: 12, fontSize: 13, color: colors.textMuted }}>
              {step}/{TOTAL_STEPS}
            </Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ─── STEP 1: Personal Info ─── */}
            {step === 1 ? (
              <Animated.View key="step-1" entering={entering} exiting={exiting} style={{ marginTop: 24 }}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: colors.primary }}>
                  {t("signup_candidate_title")}
                </Text>
                <Text style={{ marginTop: 6, fontSize: 14, color: colors.textSecondary }}>
                  {t("signup_candidate_subtitle")}
                </Text>

                {/* Full Name */}
                <View style={{ marginTop: 24 }}>
                  <Text style={dynamicLabelStyle}>{t("signup_fullname")}</Text>
                  <TextInput
                    testID="fullname-input"
                    value={fullName}
                    onChangeText={(v) => { setFullName(v); setErrors((e) => ({ ...e, fullName: "" })); }}
                    placeholder={t("signup_fullname_placeholder")}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    selectionColor={colors.accent}
                    cursorColor={colors.accent}
                    style={[dynamicInputStyle, fullName.length > 0 ? activeInputStyle : null]}
                  />
                  {errors.fullName ? <Text style={errorStyle}>{errors.fullName}</Text> : null}
                </View>

                {/* Phone */}
                <View style={{ marginTop: 16 }}>
                  <Text style={dynamicLabelStyle}>{t("signup_phone")}</Text>
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: phone.length > 0 ? colors.accent : colors.border,
                    backgroundColor: colors.card,
                    overflow: "hidden",
                    height: 52,
                  }}>
                    <Pressable
                      testID="country-code-picker"
                      onPress={() => setShowCountryPicker(true)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 14,
                        height: "100%",
                        justifyContent: "center",
                        borderRightWidth: 1,
                        borderRightColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 18, marginRight: 6 }}>
                        {COUNTRY_CODES.find((c) => c.dialCode === dialCode)?.flag ?? "🇸🇳"}
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.text, marginRight: 4 }}>{dialCode}</Text>
                      <ChevronDown size={13} color={colors.textSecondary} strokeWidth={2.5} />
                    </Pressable>
                    <TextInput
                      testID="phone-input"
                      value={phone}
                      onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: "" })); }}
                      placeholder={t("signup_phone_placeholder")}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      selectionColor={colors.accent}
                      cursorColor={colors.accent}
                      style={{ flex: 1, paddingHorizontal: 12, height: "100%", fontSize: 15, color: colors.text }}
                    />
                  </View>
                  {errors.phone ? <Text style={errorStyle}>{errors.phone}</Text> : null}
                </View>

                {/* Email (optional) */}
                <View style={{ marginTop: 16 }}>
                  <Text style={dynamicLabelStyle}>{t("signup_email_optional")}</Text>
                  <TextInput
                    testID="email-input"
                    value={email}
                    onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: "" })); }}
                    placeholder={t("signup_email_placeholder")}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    selectionColor={colors.accent}
                    cursorColor={colors.accent}
                    style={[dynamicInputStyle, email.length > 0 ? activeInputStyle : null]}
                  />
                  {errors.email ? <Text style={errorStyle}>{errors.email}</Text> : null}
                </View>

                {/* Password */}
                <View style={{ marginTop: 16 }}>
                  <Text style={dynamicLabelStyle}>{t("signup_password")}</Text>
                  <View style={[dynamicPwRowStyle, password.length > 0 ? activeInputStyle : null]}>
                    <TextInput
                      testID="password-input"
                      value={password}
                      onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: "" })); }}
                      placeholder={t("signup_password_placeholder")}
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      selectionColor={colors.accent}
                      cursorColor={colors.accent}
                      style={{ flex: 1, paddingVertical: 13, paddingLeft: 14, fontSize: 15, color: colors.text }}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: 12 }}>
                      {showPassword
                        ? <EyeOff size={20} color={colors.textMuted} strokeWidth={2} />
                        : <Eye size={20} color={colors.textMuted} strokeWidth={2} />}
                    </Pressable>
                  </View>
                  {errors.password ? <Text style={errorStyle}>{errors.password}</Text> : null}
                </View>

                {/* Confirm Password */}
                <View style={{ marginTop: 16 }}>
                  <Text style={dynamicLabelStyle}>{t("signup_confirm_password")}</Text>
                  <View style={[dynamicPwRowStyle, confirmPassword.length > 0 ? activeInputStyle : null]}>
                    <TextInput
                      testID="confirm-password-input"
                      value={confirmPassword}
                      onChangeText={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirmPassword: "" })); }}
                      placeholder={t("signup_confirm_placeholder")}
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showConfirm}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      selectionColor={colors.accent}
                      cursorColor={colors.accent}
                      style={{ flex: 1, paddingVertical: 13, paddingLeft: 14, fontSize: 15, color: colors.text }}
                    />
                    <Pressable onPress={() => setShowConfirm(!showConfirm)} style={{ paddingHorizontal: 12 }}>
                      {showConfirm
                        ? <EyeOff size={20} color={colors.textMuted} strokeWidth={2} />
                        : <Eye size={20} color={colors.textMuted} strokeWidth={2} />}
                    </Pressable>
                  </View>
                  {errors.confirmPassword ? <Text style={errorStyle}>{errors.confirmPassword}</Text> : null}
                </View>

                {/* Date of Birth */}
                <View style={{ marginTop: 16 }}>
                  <Text style={dynamicLabelStyle}>{t("signup_dob")}</Text>
                  <TextInput
                    testID="dob-input"
                    autoComplete="off"
                    textContentType="none"
                    value={dob}
                    onChangeText={(v) => {
                      const digits = v.replace(/\D/g, "");
                      let formatted = digits;
                      if (digits.length > 4) {
                        formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
                      } else if (digits.length > 2) {
                        formatted = digits.slice(0, 2) + "/" + digits.slice(2);
                      }
                      setDob(formatted);
                      setErrors((e) => ({ ...e, dob: "" }));
                    }}
                    placeholder={t("signup_dob_placeholder")}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={10}
                    selectionColor={colors.accent}
                    cursorColor={colors.accent}
                    style={[dynamicInputStyle, dob.length > 0 ? activeInputStyle : null]}
                  />
                  {errors.dob ? <Text style={errorStyle}>{errors.dob}</Text> : null}
                </View>

                {/* Continue */}
                <Pressable
                  testID="continue-btn"
                  onPress={handleStep1Continue}
                  style={[btnStyle, { marginTop: 28 }]}
                >
                  <Text style={btnTextStyle}>{t("signup_continue")}</Text>
                </Pressable>
              </Animated.View>
            ) : null}

            {/* ─── STEP 2: Location ─── */}
            {step === 2 ? (
              <Animated.View key="step-2" entering={entering} exiting={exiting} style={{ marginTop: 24 }}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: colors.primary }}>
                  {t("signup_step_location")}
                </Text>

                {/* City */}
                <View style={{ marginTop: 24 }}>
                  <Text style={dynamicLabelStyle}>{t("signup_city")}</Text>
                  <Pressable
                    testID="city-picker"
                    onPress={() => setShowCityPicker(!showCityPicker)}
                    style={[
                      dynamicDropdownStyle,
                      city.length > 0 ? activeInputStyle : null,
                    ]}
                  >
                    <Text style={{ flex: 1, fontSize: 15, color: city ? colors.text : colors.textMuted }}>
                      {city || t("signup_city_placeholder")}
                    </Text>
                    <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2} />
                  </Pressable>
                  {showCityPicker ? (
                    <View style={dynamicPickerListStyle}>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {CITIES.map((c) => (
                          <Pressable
                            key={c}
                            onPress={() => { setCity(c); setShowCityPicker(false); setErrors((e) => ({ ...e, city: "" })); }}
                            style={[
                              pickerItemStyle,
                              city === c ? { backgroundColor: isDark ? "rgba(59, 173, 78, 0.15)" : "#F0FDF0" } : null,
                            ]}
                          >
                            <Text style={{ fontSize: 14, color: city === c ? colors.accent : colors.text, fontWeight: city === c ? "600" : "400" }}>
                              {c}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                  {errors.city ? <Text style={errorStyle}>{errors.city}</Text> : null}
                </View>

                {/* Neighborhood (optional) */}
                <View style={{ marginTop: 16 }}>
                  <Text style={dynamicLabelStyle}>{t("signup_neighborhood")}</Text>
                  <TextInput
                    testID="neighborhood-input"
                    value={neighborhood}
                    onChangeText={setNeighborhood}
                    placeholder={t("signup_neighborhood_placeholder")}
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.accent}
                    cursorColor={colors.accent}
                    style={[dynamicInputStyle, neighborhood.length > 0 ? activeInputStyle : null]}
                  />
                </View>

                <Pressable
                  testID="continue-btn"
                  onPress={handleStep2Continue}
                  style={[btnStyle, { marginTop: 28 }]}
                >
                  <Text style={btnTextStyle}>{t("signup_continue")}</Text>
                </Pressable>
              </Animated.View>
            ) : null}

            {/* ─── STEP 3: Profile ─── */}
            {step === 3 ? (
              <Animated.View key="step-3" entering={entering} exiting={exiting} style={{ marginTop: 24 }}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: colors.primary }}>
                  {t("signup_step_profile")}
                </Text>

                {/* Profile photo */}
                <View style={{ marginTop: 28, alignItems: "center" }}>
                  <Pressable
                    testID="photo-picker"
                    onPress={handlePickPhoto}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      backgroundColor: colors.toggleBg,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: photoUri ? colors.accent : colors.border,
                      borderStyle: "dashed",
                    }}
                  >
                    {photoUri ? (
                      <Image
                        source={{ uri: photoUri }}
                        style={{ width: 96, height: 96, borderRadius: 48 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Camera size={36} color={colors.textMuted} strokeWidth={1.5} />
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
                        borderColor: colors.card,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 18, lineHeight: 20 }}>+</Text>
                    </View>
                  </Pressable>
                  <Text style={{ marginTop: 10, fontSize: 13, color: colors.textSecondary }}>
                    {t("signup_profile_photo_btn")}
                  </Text>
                </View>

                {/* Headline */}
                <View style={{ marginTop: 28 }}>
                  <Text style={dynamicLabelStyle}>{t("signup_headline")}</Text>
                  <HeadlineSuggestInput
                    testID="headline-input"
                    value={headline}
                    onChangeText={(v) => { setHeadline(v); setErrors((e) => ({ ...e, headline: "" })); }}
                    placeholder={t("signup_headline_placeholder")}
                    placeholderTextColor={colors.textMuted}
                    lang={lang}
                    colors={colors}
                    inputStyle={dynamicInputStyle}
                  />
                  {errors.headline ? <Text style={errorStyle}>{errors.headline}</Text> : null}
                </View>

                <Pressable
                  testID="finish-btn"
                  onPress={handleFinish}
                  disabled={finishing}
                  style={[btnStyle, { marginTop: 36, backgroundColor: finishing ? colors.border : colors.accent }]}
                >
                  {finishing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={btnTextStyle}>{t("signup_finish")}</Text>
                  )}
                </Pressable>

                {finishError ? (
                  <Text style={[errorStyle, { marginTop: 10, textAlign: "center" }]}>{finishError}</Text>
                ) : null}

                <Pressable
                  testID="skip-photo-btn"
                  onPress={handleFinish}
                  style={{ marginTop: 12, alignItems: "center", paddingVertical: 8 }}
                >
                  <Text style={{ fontSize: 14, color: colors.textMuted }}>{t("signup_profile_photo_skip")}</Text>
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
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 20,
              paddingBottom: 32,
              maxHeight: "75%",
            }}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 24, fontWeight: "700", color: colors.primary, paddingHorizontal: 24, marginBottom: 24 }}>
              {t("onboarding_country_code_title")}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 0 }}>
              {COUNTRY_CODES.map((country) => (
                <Pressable
                  key={country.dialCode}
                  onPress={() => { setDialCode(country.dialCode); setShowCountryPicker(false); }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    backgroundColor: dialCode === country.dialCode ? isDark ? "rgba(59, 173, 78, 0.15)" : "#F0FDF0" : colors.card,
                  }}
                >
                  <Text style={{ fontSize: 28, marginRight: 16 }}>{country.flag}</Text>
                  <Text style={{ flex: 1, fontSize: 16, color: colors.text, fontWeight: dialCode === country.dialCode ? "600" : "400" }}>
                    {country.name}
                  </Text>
                  <Text style={{ fontSize: 16, color: dialCode === country.dialCode ? colors.accent : colors.textSecondary, fontWeight: "600" }}>
                    {country.dialCode}
                  </Text>
                  {dialCode === country.dialCode ? <Check size={20} color={colors.accent} strokeWidth={2.5} style={{ marginLeft: 12 }} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// Shared styles (kept for compatibility)
const activeInputStyle = {
  borderColor: "#3BAD4E",
};

const pickerItemStyle = {
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
};

const btnStyle = {
  borderRadius: 16,
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

const errorStyleBase = {
  marginTop: 5,
  fontSize: 12,
};
