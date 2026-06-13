import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import { SESSION_QUERY_KEY } from "@/lib/auth/use-session";
import {
  Briefcase,
  Users,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  MapPin,
  Building2,
  Phone,
  User,
  CheckCircle2,
  Check,
} from "lucide-react-native";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeInLeft,
  FadeOutRight,
} from "react-native-reanimated";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { HeadlineSuggestInput } from "@/components/HeadlineSuggestInput";

type CountryCode = {
  flag: string;
  tKey: string;
  dialCode: string;
};

const COUNTRY_CODES: CountryCode[] = [
  { flag: "🇸🇳", tKey: "country_sn", dialCode: "+221" },
  { flag: "🇨🇮", tKey: "country_ci", dialCode: "+225" },
  { flag: "🇲🇱", tKey: "country_ml", dialCode: "+223" },
  { flag: "🇬🇳", tKey: "country_gn", dialCode: "+224" },
  { flag: "🇨🇲", tKey: "country_cm", dialCode: "+237" },
  { flag: "🇧🇯", tKey: "country_bj", dialCode: "+229" },
  { flag: "🇧🇫", tKey: "country_bf", dialCode: "+226" },
  { flag: "🇳🇪", tKey: "country_ne", dialCode: "+227" },
  { flag: "🇹🇬", tKey: "country_tg", dialCode: "+228" },
  { flag: "🇫🇷", tKey: "country_fr", dialCode: "+33" },
  { flag: "🇧🇪", tKey: "country_be", dialCode: "+32" },
];

const CITIES = [
  "Dakar",
  "Thies",
  "Saint-Louis",
  "Ziguinchor",
  "Kaolack",
  "Mbour",
  "Rufisque",
  "Touba",
  "Tambacounda",
  "Kolda",
  "Diourbel",
  "Louga",
  "Matam",
  "Fatick",
  "Kedougou",
  "Sedhiou",
  "Kaffrine",
];

const SECTORS: { tKey: string; value: string }[] = [
  { tKey: "sector_technology", value: "Technology" },
  { tKey: "sector_finance", value: "Finance" },
  { tKey: "sector_health", value: "Healthcare" },
  { tKey: "sector_education", value: "Education" },
  { tKey: "sector_trade", value: "Trade" },
  { tKey: "sector_construction", value: "Construction" },
  { tKey: "sector_agriculture", value: "Agriculture" },
  { tKey: "sector_hospitality", value: "Hospitality" },
  { tKey: "sector_transport", value: "Transport" },
  { tKey: "sector_energy", value: "Energy" },
  { tKey: "sector_telecom", value: "Telecommunications" },
  { tKey: "sector_media", value: "Media" },
  { tKey: "sector_legal", value: "Legal" },
  { tKey: "sector_ngo", value: "NGO" },
  { tKey: "sector_real_estate", value: "Real Estate" },
  { tKey: "sector_other", value: "Other" },
];

const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "500+",
];

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const { colors, isDark } = useTheme();
  const preselectedType = type === "candidate" || type === "recruiter" ? type : null;
  const [step, setStep] = useState(preselectedType ? 2 : 1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);

  // Step 1
  const [accountType, setAccountType] = useState<"candidate" | "recruiter" | null>(preselectedType);

  // Step 2 - Candidate
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [headline, setHeadline] = useState("");

  // Step 2 - Recruiter
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [showSectorPicker, setShowSectorPicker] = useState(false);
  const [sizeRange, setSizeRange] = useState("");

  // Step 3
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("+221");
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const totalSteps = 3;

  const submitOnboarding = useMutation({
    mutationFn: async () => {
      const fullPhone = dialCode + phone.trim();
      const body =
        accountType === "candidate"
          ? { accountType, fullName, city, headline, phone: fullPhone }
          : { accountType, companyName, sector, sizeRange, phone: fullPhone };
      return api.post("/api/onboarding", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
      if (accountType === "recruiter") {
        router.replace("/(app)/(recruiter)");
      } else {
        router.replace("/(app)/(candidate)");
      }
    },
  });

  const goNext = () => {
    setDirection("forward");
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      submitOnboarding.mutate();
    }
  };

  const goBack = () => {
    setDirection("back");
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    if (step === 1) return accountType !== null;
    if (step === 2) {
      if (accountType === "candidate") return fullName.trim().length >= 2 && city.length > 0;
      return companyName.trim().length >= 2;
    }
    if (step === 3) return phone.trim().length >= 6;
    return false;
  };

  const entering = direction === "forward" ? FadeInRight.duration(300) : FadeInLeft.duration(300);
  const exiting = direction === "forward" ? FadeOutLeft.duration(200) : FadeOutRight.duration(200);

  return (
    <View testID="onboarding-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Step indicator */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16 }}>
            {step > 1 ? (
              <Pressable
                testID="onboarding-back"
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
              <View style={{ marginRight: 12, height: 44, width: 44 }} />
            )}

            <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
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
              {step}/{totalSteps}
            </Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Step 1: Account Type */}
            {step === 1 ? (
              <Animated.View key="step-1" entering={entering} style={{ marginTop: 32 }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: colors.primary }}>
                  {t("onboarding_welcome")}
                </Text>
                <Text style={{ marginTop: 8, fontSize: 15, color: colors.textSecondary }}>
                  {t("onboarding_choose_profile")}
                </Text>

                <Pressable
                  testID="type-candidate"
                  onPress={() => setAccountType("candidate")}
                  style={{
                    marginTop: 32,
                    borderRadius: 12,
                    borderWidth: 2,
                    padding: 20,
                    borderColor: accountType === "candidate" ? colors.accent : colors.border,
                    backgroundColor: accountType === "candidate" ? colors.toggleBg : colors.card,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        height: 56,
                        width: 56,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        backgroundColor: accountType === "candidate" ? colors.accent : colors.toggleBg,
                      }}
                    >
                      <Briefcase
                        size={26}
                        color={accountType === "candidate" ? "#FFFFFF" : colors.textMuted}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={{ marginLeft: 16, flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: "700", color: colors.primary }}>
                        {t("onboarding_candidate")}
                      </Text>
                      <Text style={{ marginTop: 2, fontSize: 13, color: colors.textSecondary }}>
                        {t("onboarding_candidate_desc")}
                      </Text>
                    </View>
                    {accountType === "candidate" ? (
                      <CheckCircle2 size={24} color={colors.accent} fill={colors.accent} strokeWidth={0} />
                    ) : null}
                  </View>
                </Pressable>

                <Pressable
                  testID="type-recruiter"
                  onPress={() => setAccountType("recruiter")}
                  style={{
                    marginTop: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    padding: 20,
                    borderColor: accountType === "recruiter" ? colors.accent : colors.border,
                    backgroundColor: accountType === "recruiter" ? colors.toggleBg : colors.card,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        height: 56,
                        width: 56,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        backgroundColor: accountType === "recruiter" ? colors.accent : colors.toggleBg,
                      }}
                    >
                      <Users
                        size={26}
                        color={accountType === "recruiter" ? "#FFFFFF" : colors.textMuted}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={{ marginLeft: 16, flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: "700", color: colors.primary }}>
                        {t("onboarding_recruiter")}
                      </Text>
                      <Text style={{ marginTop: 2, fontSize: 13, color: colors.textSecondary }}>
                        {t("onboarding_recruiter_desc")}
                      </Text>
                    </View>
                    {accountType === "recruiter" ? (
                      <CheckCircle2 size={24} color={colors.accent} fill={colors.accent} strokeWidth={0} />
                    ) : null}
                  </View>
                </Pressable>
              </Animated.View>
            ) : null}

            {/* Step 2: Profile Details — Candidate */}
            {step === 2 && accountType === "candidate" ? (
              <Animated.View key="step-2-candidate" entering={entering} style={{ marginTop: 32 }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: colors.primary }}>
                  {t("onboarding_your_profile")}
                </Text>
                <Text style={{ marginTop: 8, fontSize: 15, color: colors.textSecondary }}>
                  {t("onboarding_profile_visible")}
                </Text>

                {/* Full Name */}
                <View style={{ marginTop: 24 }}>
                  <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "600", color: colors.text }}>
                    {t("onboarding_full_name")}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: fullName.length > 0 ? colors.accent : colors.border,
                      backgroundColor: colors.toggleBg,
                      paddingHorizontal: 14,
                    }}
                  >
                    <User size={18} color={colors.textMuted} strokeWidth={2} />
                    <TextInput
                      testID="fullname-input"
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder={t("onboarding_full_name_placeholder")}
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="words"
                      selectionColor={colors.accent}
                      cursorColor={colors.accent}
                      style={{ flex: 1, marginLeft: 10, paddingVertical: 14, fontSize: 15, color: colors.text }}
                    />
                  </View>
                </View>

                {/* City */}
                <View style={{ marginTop: 16 }}>
                  <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "600", color: colors.text }}>
                    {t("onboarding_city")}
                  </Text>
                  <Pressable
                    testID="city-picker"
                    onPress={() => setShowCityPicker(!showCityPicker)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: city.length > 0 ? "#3BAD4E" : colors.border,
                      backgroundColor: colors.toggleBg,
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                    }}
                  >
                    <MapPin size={18} color={colors.textMuted} strokeWidth={2} />
                    <Text style={{ marginLeft: 10, flex: 1, fontSize: 15, color: city ? colors.text : colors.textMuted }}>
                      {city || t("onboarding_city_placeholder")}
                    </Text>
                    <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                  {showCityPicker ? (
                    <View
                      style={{
                        marginTop: 6,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        padding: 6,
                      }}
                    >
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {CITIES.map((c) => (
                          <Pressable
                            key={c}
                            onPress={() => { setCity(c); setShowCityPicker(false); }}
                            style={{
                              borderRadius: 10,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              backgroundColor: city === c ? (isDark ? "rgba(59, 173, 78, 0.15)" : "#F0FDF0") : "transparent",
                            }}
                          >
                            <Text style={{ fontSize: 14, color: city === c ? "#3BAD4E" : colors.text, fontWeight: city === c ? "600" : "400" }}>
                              {c}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>

                {/* Headline */}
                <View style={{ marginTop: 16 }}>
                  <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "600", color: colors.text }}>
                    {t("onboarding_headline")}
                  </Text>
                  <HeadlineSuggestInput
                    testID="headline-input"
                    value={headline}
                    onChangeText={setHeadline}
                    placeholder={t("onboarding_headline_placeholder")}
                    placeholderTextColor={colors.textMuted}
                    lang={lang}
                    colors={colors}
                    inputStyle={{
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: headline.length > 0 ? "#3BAD4E" : colors.border,
                      backgroundColor: colors.toggleBg,
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      fontSize: 15,
                      color: colors.text,
                    }}
                  />
                </View>
              </Animated.View>
            ) : null}

            {/* Step 2: Profile Details — Recruiter */}
            {step === 2 && accountType === "recruiter" ? (
              <Animated.View key="step-2-recruiter" entering={entering} style={{ marginTop: 32 }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: colors.primary }}>
                  {t("onboarding_company")}
                </Text>
                <Text style={{ marginTop: 8, fontSize: 15, color: colors.textSecondary }}>
                  {t("onboarding_company_visible")}
                </Text>

                {/* Company Name */}
                <View style={{ marginTop: 24 }}>
                  <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "600", color: colors.text }}>
                    {t("onboarding_company_name")}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: companyName.length > 0 ? "#3BAD4E" : colors.border,
                      backgroundColor: colors.toggleBg,
                      paddingHorizontal: 14,
                    }}
                  >
                    <Building2 size={18} color={colors.textMuted} strokeWidth={2} />
                    <TextInput
                      testID="company-name-input"
                      value={companyName}
                      onChangeText={setCompanyName}
                      placeholder={t("onboarding_company_name_placeholder")}
                      placeholderTextColor={colors.textMuted}
                      selectionColor={colors.accent}
                      cursorColor={colors.accent}
                      style={{ flex: 1, marginLeft: 10, paddingVertical: 14, fontSize: 15, color: colors.text }}
                    />
                  </View>
                </View>

                {/* Sector */}
                <View style={{ marginTop: 16 }}>
                  <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "600", color: colors.text }}>
                    {t("onboarding_sector")}
                  </Text>
                  <Pressable
                    testID="sector-picker"
                    onPress={() => setShowSectorPicker(!showSectorPicker)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: sector.length > 0 ? "#3BAD4E" : colors.border,
                      backgroundColor: colors.toggleBg,
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 15, color: sector ? colors.text : colors.textMuted }}>
                      {sector || t("onboarding_sector_placeholder")}
                    </Text>
                    <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                  {showSectorPicker ? (
                    <View
                      style={{
                        marginTop: 6,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        padding: 6,
                      }}
                    >
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {SECTORS.map((s) => (
                          <Pressable
                            key={s.value}
                            onPress={() => { setSector(s.value); setShowSectorPicker(false); }}
                            style={{
                              borderRadius: 10,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              backgroundColor: sector === s.value ? (isDark ? "rgba(59, 173, 78, 0.15)" : "#F0FDF0") : "transparent",
                            }}
                          >
                            <Text style={{ fontSize: 14, color: sector === s.value ? "#3BAD4E" : colors.text, fontWeight: sector === s.value ? "600" : "400" }}>
                              {t(s.tKey as Parameters<typeof t>[0])}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>

                {/* Company Size */}
                <View style={{ marginTop: 16 }}>
                  <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "600", color: colors.text }}>
                    {t("onboarding_company_size")}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {COMPANY_SIZES.map((size) => (
                      <Pressable
                        key={size}
                        onPress={() => setSizeRange(size)}
                        style={{
                          borderRadius: 12,
                          borderWidth: 2,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderColor: sizeRange === size ? "#3BAD4E" : colors.border,
                          backgroundColor: sizeRange === size ? (isDark ? "rgba(59, 173, 78, 0.15)" : "#F0FDF0") : colors.card,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "500", color: sizeRange === size ? "#3BAD4E" : colors.textSecondary }}>
                          {size} {t("onboarding_company_size_suffix")}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </Animated.View>
            ) : null}

            {/* Step 3: Phone */}
            {step === 3 ? (
              <Animated.View key="step-3" entering={entering} style={{ marginTop: 32 }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: colors.primary }}>
                  {t("onboarding_phone_title")}
                </Text>
                <Text style={{ marginTop: 8, fontSize: 15, color: colors.textSecondary }}>
                  {t("onboarding_phone_subtitle")}
                </Text>

                <View style={{ marginTop: 24 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: phone.length > 0 ? "#3BAD4E" : colors.border,
                      backgroundColor: colors.toggleBg,
                      overflow: "hidden",
                    }}
                  >
                    <Pressable
                      testID="country-code-picker"
                      onPress={() => setShowCountryPicker(true)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        borderRightWidth: 1,
                        borderRightColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 16, marginRight: 4 }}>
                        {COUNTRY_CODES.find((c) => c.dialCode === dialCode)?.flag ?? "🇸🇳"}
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.text, marginRight: 4 }}>{dialCode}</Text>
                      <ChevronDown size={14} color={colors.textMuted} strokeWidth={2.5} />
                    </Pressable>

                    <TextInput
                      testID="phone-input"
                      value={phone}
                      onChangeText={setPhone}
                      placeholder={t("onboarding_phone_placeholder")}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                      selectionColor={colors.accent}
                      cursorColor={colors.accent}
                      style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: colors.text }}
                    />
                  </View>
                </View>
              </Animated.View>
            ) : null}
          </ScrollView>

          {/* Bottom CTA */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingHorizontal: 16,
              paddingBottom: 16,
              paddingTop: 12,
            }}
          >
            <Pressable
              testID="onboarding-next"
              onPress={goNext}
              disabled={!canProceed() || submitOnboarding.isPending}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                paddingVertical: 14,
                backgroundColor: canProceed() ? "#3BAD4E" : colors.border,
              }}
            >
              {submitOnboarding.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                    {step === totalSteps ? t("onboarding_start") : t("onboarding_continue")}
                  </Text>
                  {step < totalSteps ? (
                    <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                  ) : null}
                </>
              )}
            </Pressable>
          </View>
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
              paddingBottom: 40,
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
                paddingHorizontal: 16,
                marginBottom: 12,
              }}
            >
              {t("onboarding_country_code_title")}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {COUNTRY_CODES.map((country) => (
                <Pressable
                  key={country.dialCode}
                  testID={`country-option-${country.dialCode}`}
                  onPress={() => {
                    setDialCode(country.dialCode);
                    setShowCountryPicker(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: dialCode === country.dialCode ? (isDark ? "rgba(59, 173, 78, 0.15)" : "#F0FDF0") : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 22, marginRight: 14 }}>{country.flag}</Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: colors.text,
                      fontWeight: dialCode === country.dialCode ? "600" : "400",
                    }}
                  >
                    {t(country.tKey as Parameters<typeof t>[0])}
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: dialCode === country.dialCode ? "#3BAD4E" : colors.textSecondary,
                      marginRight: dialCode === country.dialCode ? 8 : 0,
                      fontWeight: "500",
                    }}
                  >
                    {country.dialCode}
                  </Text>
                  {dialCode === country.dialCode ? (
                    <Check size={18} color="#3BAD4E" strokeWidth={2.5} />
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
