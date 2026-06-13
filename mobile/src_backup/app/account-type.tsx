import { View, Text, Pressable, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import { useEffect } from "react";
import { User, Building2, ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";

export default function AccountTypeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const t = useLang((s) => s.t);

  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(16);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    titleY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right", "bottom"]}>

        {/* Back button */}
        <Pressable
          testID="back-button"
          onPress={() => router.back()}
          style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, alignSelf: "flex-start" }}
        >
          <ChevronLeft size={28} color={colors.text} strokeWidth={2} />
        </Pressable>

        {/* Title */}
        <Animated.View style={[titleStyle, { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }]}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.5, marginBottom: 8 }}>
            {t("signup_candidate_title")}
          </Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary, lineHeight: 22 }}>
            {t("onboarding_choose_profile")}
          </Text>
        </Animated.View>

        {/* Options */}
        <View style={{ flex: 1, paddingHorizontal: 24, gap: 16 }}>

          {/* Particulier */}
          <Animated.View entering={FadeInDown.delay(100).duration(400).easing(Easing.out(Easing.cubic))}>
            <Pressable
              testID="account-type-particulier"
              onPress={() => router.push("/candidate-signup" as never)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.card : colors.background,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: colors.primary,
                padding: 24,
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <User size={26} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 4 }}>
                  {t("onboarding_candidate")}
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
                  {t("onboarding_candidate_desc")}
                </Text>
              </View>
            </Pressable>
          </Animated.View>

          {/* Entreprise */}
          <Animated.View entering={FadeInDown.delay(200).duration(400).easing(Easing.out(Easing.cubic))}>
            <Pressable
              testID="account-type-entreprise"
              onPress={() => router.push("/recruiter-signup" as never)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.card : colors.background,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: colors.accent,
                padding: 24,
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Building2 size={26} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 4 }}>
                  {t("onboarding_recruiter")}
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
                  {t("onboarding_recruiter_desc")}
                </Text>
              </View>
            </Pressable>
          </Animated.View>

        </View>

      </SafeAreaView>
    </View>
  );
}
