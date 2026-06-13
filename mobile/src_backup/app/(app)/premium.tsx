import { View, Text, Pressable, ScrollView, StatusBar, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Crown,
  Sparkles,
  CreditCard,
  Eye,
  Check,
  X,
  Users,
  Zap,
  CheckCircle,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import {
  isRevenueCatEnabled,
  getPackage,
  purchasePackage,
} from "@/lib/revenuecatClient";

// Brand accent palette — fixed regardless of theme
const GOLD = "#F5A623";
const GOLD_DARK = "#E8950A";
const GOLD_LIGHT = "#FFC355";
const GREEN = "#3BAD4E";

const CONFETTI_COLORS = [GREEN, GOLD, "#FFFFFF", "#FF6B6B", "#4ECDC4", "#A78BFA", "#FB923C"];
const SCREEN_WIDTH = Dimensions.get("window").width;

// Pre-computed confetti data to avoid re-renders
const CONFETTI_DATA = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: (i * 37 + 11) % SCREEN_WIDTH,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 6 + (i % 6) * 1.5,
  isCircle: i % 3 !== 0,
  duration: 1200 + (i * 97) % 900,
  delay: (i * 67) % 600,
  driftX: ((i * 43) % 80) - 40,
}));

function ConfettiParticle({ item }: { item: typeof CONFETTI_DATA[0] }) {
  const translateY = useSharedValue(-30);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(item.delay, withTiming(1, { duration: 150 }));
    translateY.value = withDelay(
      item.delay,
      withTiming(680, { duration: item.duration, easing: Easing.in(Easing.quad) })
    );
    translateX.value = withDelay(
      item.delay,
      withTiming(item.driftX, { duration: item.duration })
    );
    rotate.value = withDelay(
      item.delay,
      withTiming(360 + (item.id * 53) % 360, { duration: item.duration })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: item.x + translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          position: "absolute",
          top: 0,
          left: 0,
          width: item.size,
          height: item.size,
          borderRadius: item.isCircle ? item.size / 2 : 2,
          backgroundColor: item.color,
        },
      ]}
    />
  );
}

function ConfettiContainer() {
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 700,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {CONFETTI_DATA.map((item) => (
        <ConfettiParticle key={item.id} item={item} />
      ))}
    </View>
  );
}

type Benefit = {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
};

function BenefitRow({ benefit, index, textColor, textMuted, borderColor }: {
  benefit: Benefit;
  index: number;
  textColor: string;
  textMuted: string;
  borderColor: string;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 70).springify()}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 13,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: borderColor,
      }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          backgroundColor: benefit.highlight
            ? "rgba(245,166,35,0.18)"
            : "rgba(255,255,255,0.08)",
          borderWidth: 1,
          borderColor: benefit.highlight
            ? "rgba(245,166,35,0.35)"
            : "rgba(255,255,255,0.12)",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {benefit.icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: benefit.highlight ? GOLD_LIGHT : textColor,
            letterSpacing: -0.2,
          }}
        >
          {benefit.title}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: textMuted,
            marginTop: 2,
            lineHeight: 17,
          }}
        >
          {benefit.description}
        </Text>
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: benefit.highlight
            ? "rgba(245,166,35,0.2)"
            : "rgba(255,255,255,0.08)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Check size={13} color={benefit.highlight ? GOLD : textMuted} strokeWidth={3} />
      </View>
    </Animated.View>
  );
}

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const [subscribed, setSubscribed] = useState(false);

  // Theme-aware gradient — deep navy in dark mode, soft navy-to-blue in light mode
  const BG_TOP = isDark ? "#0C1A3A" : "#1B2F6E";
  const BG_MID = isDark ? "#0A1020" : "#243D82";
  const BG_BOT = isDark ? "#050810" : "#1B2F6E";

  // Theme-aware card surfaces
  const CARD_BG = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)";
  const CARD_BORDER = isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.20)";

  // On this screen the background is always dark/navy so text is always white-ish
  const TEXT_PRIMARY = "#FFFFFF";
  const TEXT_MUTED = "rgba(255,255,255,0.50)";
  const BORDER_SUBTLE = "rgba(255,255,255,0.07)";

  // Localized "free" label — one language only
  const freeLabel = lang === "fr" ? "GRATUIT" : "FREE";

  // Localized welcome heading for success screen
  const welcomeHeading =
    lang === "fr"
      ? `Bienvenue dans Jobé Premium !`
      : lang === "zh"
      ? `欢迎使用 Jobé 高级版！`
      : `Welcome to Jobé Premium!`;

  const checkScale = useSharedValue(0);
  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const subscribeMutation = useMutation({
    mutationFn: () => api.post<void>("/api/subscription/subscribe"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      checkScale.value = withSequence(
        withSpring(1.2, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      setSubscribed(true);
    },
    onError: () => {
      // Free demo — show success regardless
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      checkScale.value = withSequence(
        withSpring(1.2, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      setSubscribed(true);
    },
  });

  const handleSubscribe = async () => {
    const rcEnabled = isRevenueCatEnabled();
    if (rcEnabled) {
      const pkg = await getPackage("$rc_monthly");
      if (pkg.ok && pkg.data) {
        await purchasePackage(pkg.data);
      }
    }
    subscribeMutation.mutate();
  };

  const handleDismiss = () => {
    router.back();
  };

  const benefits: Benefit[] = [
    {
      icon: <Crown size={22} color={GOLD} strokeWidth={2} />,
      title: t("premium_benefit_badge"),
      description: t("premium_benefit_badge_desc"),
      highlight: true,
    },
    {
      icon: <Sparkles size={22} color={GOLD} strokeWidth={2} />,
      title: t("premium_benefit_search"),
      description: t("premium_benefit_search_desc"),
      highlight: true,
    },
    {
      icon: <Zap size={22} color="rgba(255,255,255,0.7)" strokeWidth={2} />,
      title: t("premium_benefit_credits"),
      description: t("premium_benefit_credits_desc"),
    },
    {
      icon: <Eye size={22} color="rgba(255,255,255,0.7)" strokeWidth={2} />,
      title: t("premium_benefit_views"),
      description: t("premium_benefit_views_desc"),
    },
    {
      icon: <Users size={22} color="rgba(255,255,255,0.7)" strokeWidth={2} />,
      title: t("premium_benefit_count"),
      description: t("premium_benefit_count_desc"),
    },
    {
      icon: <CreditCard size={22} color="rgba(255,255,255,0.7)" strokeWidth={2} />,
      title: t("premium_benefit_support"),
      description: t("premium_benefit_support_desc"),
    },
  ];

  if (subscribed) {
    return (
      <LinearGradient
        colors={[BG_TOP, BG_MID, BG_BOT]}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      >
        <StatusBar barStyle="light-content" backgroundColor={BG_TOP} />
        <ConfettiContainer />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 32,
          }}
        >
          <Animated.View entering={FadeInUp.springify()} style={{ alignItems: "center", width: "100%" }}>
            {/* Green checkmark animation */}
            <Animated.View style={[checkAnimStyle, { marginBottom: 32 }]}>
              <View style={{ alignItems: "center" }}>
                <View
                  style={{
                    position: "absolute",
                    width: 130,
                    height: 130,
                    borderRadius: 65,
                    backgroundColor: "rgba(59,173,78,0.15)",
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    width: 108,
                    height: 108,
                    borderRadius: 54,
                    borderWidth: 1,
                    borderColor: "rgba(59,173,78,0.30)",
                  }}
                />
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    backgroundColor: GREEN,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: GREEN,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.55,
                    shadowRadius: 24,
                    elevation: 16,
                  }}
                >
                  <CheckCircle size={48} color="#FFFFFF" strokeWidth={2} />
                </View>
              </View>
            </Animated.View>

            {/* Single-language welcome heading */}
            <Text
              style={{
                fontSize: 26,
                fontWeight: "800",
                color: TEXT_PRIMARY,
                textAlign: "center",
                letterSpacing: -0.6,
                marginBottom: 16,
              }}
            >
              {welcomeHeading}
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: TEXT_MUTED,
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 44,
                maxWidth: 280,
              }}
            >
              {t("premium_welcome_desc")}
            </Text>

            <Pressable
              testID="premium-success-done-button"
              onPress={handleDismiss}
              style={({ pressed }) => ({
                opacity: pressed ? 0.85 : 1,
                width: "100%",
              })}
            >
              <LinearGradient
                colors={[GREEN, "#2d9142"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 18,
                  paddingVertical: 18,
                  alignItems: "center",
                  shadowColor: GREEN,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.45,
                  shadowRadius: 18,
                  elevation: 12,
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.2 }}>
                  {t("premium_start_using")}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[BG_TOP, BG_MID, BG_BOT]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor={BG_TOP} />

      {/* Dismiss button */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 14,
          right: 18,
          zIndex: 10,
        }}
      >
        <Pressable
          testID="premium-dismiss-button"
          onPress={handleDismiss}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.10)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <X size={18} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView
        testID="premium-screen"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 28,
          paddingBottom: insets.bottom + 36,
          paddingHorizontal: 24,
        }}
      >
        {/* Crown badge */}
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={{ alignItems: "center", marginBottom: 28, marginTop: 8 }}
        >
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <View
              style={{
                position: "absolute",
                width: 118,
                height: 118,
                borderRadius: 59,
                backgroundColor: "rgba(245,166,35,0.08)",
              }}
            />
            <View
              style={{
                position: "absolute",
                width: 104,
                height: 104,
                borderRadius: 52,
                borderWidth: 1,
                borderColor: "rgba(245,166,35,0.22)",
              }}
            />
            <LinearGradient
              colors={[GOLD_LIGHT, GOLD, GOLD_DARK]}
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: GOLD,
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.55,
                shadowRadius: 22,
                elevation: 14,
              }}
            >
              <Crown size={42} color="#FFFFFF" strokeWidth={2} />
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View
          entering={FadeInDown.delay(60).springify()}
          style={{ alignItems: "center", marginBottom: 10 }}
        >
          <Text
            style={{
              fontSize: 36,
              fontWeight: "800",
              color: TEXT_PRIMARY,
              textAlign: "center",
              letterSpacing: -1,
            }}
          >
            Job<Text style={{ color: GOLD }}>é</Text>
            {" "}Premium
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={{ alignItems: "center", marginBottom: 32 }}
        >
          <Text
            style={{
              fontSize: 15,
              color: TEXT_MUTED,
              textAlign: "center",
              lineHeight: 22,
              maxWidth: 290,
            }}
          >
            {t("premium_subtitle")}
          </Text>
        </Animated.View>

        {/* Benefits card */}
        <Animated.View
          entering={FadeInDown.delay(140).springify()}
          style={{
            backgroundColor: CARD_BG,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            paddingHorizontal: 18,
            paddingTop: 4,
            paddingBottom: 8,
            marginBottom: 28,
          }}
        >
          <View style={{
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: BORDER_SUBTLE,
            marginBottom: 4,
          }}>
            <Text style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.2,
              color: "rgba(255,255,255,0.35)",
            }}>
              {t("premium_everything_included")}
            </Text>
          </View>
          {benefits.map((benefit, index) => (
            <BenefitRow
              key={benefit.title}
              benefit={benefit}
              index={index}
              textColor={TEXT_PRIMARY}
              textMuted={TEXT_MUTED}
              borderColor={BORDER_SUBTLE}
            />
          ))}
        </Animated.View>

        {/* Pricing — FREE with crossed out price */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={{ alignItems: "center", marginBottom: 24 }}
        >
          {/* Launch offer badge */}
          <View
            style={{
              backgroundColor: GREEN,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 6,
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 }}>
              {t("launch_offer_badge")}
            </Text>
          </View>

          {/* Crossed out price + localized FREE */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <Text
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,0.30)",
                fontWeight: "500",
                textDecorationLine: "line-through",
              }}
            >
              2 500 FCFA/mois
            </Text>
            <Text
              style={{
                fontSize: 36,
                fontWeight: "800",
                color: GREEN,
                letterSpacing: -1,
              }}
            >
              {freeLabel}
            </Text>
          </View>

          {/* Annual crossed out */}
          <Text
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.30)",
              textDecorationLine: "line-through",
              marginBottom: 10,
            }}
          >
            25 000 FCFA/an
          </Text>

          {/* Launch desc */}
          <Text
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.45)",
              textAlign: "center",
              lineHeight: 18,
              maxWidth: 260,
            }}
          >
            {t("launch_offer_desc")}
          </Text>
        </Animated.View>

        {/* CTA button */}
        <Animated.View entering={FadeInDown.delay(260).springify()}>
          <Pressable
            testID="start-premium-button"
            onPress={handleSubscribe}
            disabled={subscribeMutation.isPending}
            style={({ pressed }) => ({
              opacity: pressed || subscribeMutation.isPending ? 0.85 : 1,
              marginBottom: 14,
            })}
          >
            <LinearGradient
              colors={[GREEN, "#2d9142"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 18,
                paddingVertical: 20,
                alignItems: "center",
                shadowColor: GREEN,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.45,
                shadowRadius: 20,
                elevation: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {!subscribeMutation.isPending ? (
                  <Crown size={20} color="#FFFFFF" strokeWidth={2.5} />
                ) : null}
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: "#FFFFFF",
                    letterSpacing: -0.3,
                  }}
                >
                  {subscribeMutation.isPending ? "Activating..." : t("subscribe_free_btn")}
                </Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Maybe later */}
          <Pressable
            testID="premium-maybe-later-button"
            onPress={handleDismiss}
            style={({ pressed }) => ({
              alignItems: "center",
              paddingVertical: 14,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 14,
                color: TEXT_MUTED,
                fontWeight: "500",
              }}
            >
              {t("premium_cancel_later")}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}
