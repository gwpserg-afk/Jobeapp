// v4 — light + dark, logo-ready
import { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  Dimensions,
  Platform,
  Image,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useLang } from "@/lib/i18n";
import { useDemoStore } from "@/lib/demoStore";

const { width: W, height: H } = Dimensions.get("window");
const ACCENT = "#3BAD4E";
const NAVY = "#1B2F6E";
const DARK_BG = "#060B18";
const LIGHT_BG = "#F5F7FF";

// Try to load logo — falls back to wordmark if not saved yet
let LOGO_SOURCE: any = null;
try {
  LOGO_SOURCE = require("../../assets/logo.png");
} catch {
  LOGO_SOURCE = null;
}

function GlowOrb({
  x, y, size, color, delay, opacity = 0.35,
}: {
  x: number; y: number; size: number; color: string; delay: number; opacity?: number;
}) {
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withDelay(
      delay * 1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 5000 + delay * 800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 5000 + delay * 800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(drift.value, [0, 1], [0, -20]) },
      { scale: interpolate(drift.value, [0, 1], [1, 1.07]) },
    ],
    opacity: interpolate(drift.value, [0, 0.5, 1], [opacity * 0.6, opacity, opacity * 0.6]),
  }));

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }, style]}
    />
  );
}

const PROOF_AVATARS = [
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80",
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=80&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=80&q=80",
];

function ActivityPill({ isDark }: { isDark: boolean }) {
  const scale = useSharedValue(0.96);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }),
        withTiming(0.97, { duration: 1800, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      true
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: isDark ? "rgba(59,173,78,0.12)" : "rgba(59,173,78,0.08)",
        borderWidth: 1,
        borderColor: "rgba(59,173,78,0.3)",
        borderRadius: 100,
        paddingHorizontal: 14,
        paddingVertical: 8,
      }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT }} />
        <Text style={{
          fontSize: 12,
          fontWeight: "600",
          color: ACCENT,
          letterSpacing: 0.2,
        }}>
          Aminata vient d'être recrutée chez Orange SN
        </Text>
      </View>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const setDemoLoggedIn = useDemoStore((s) => s.setDemoLoggedIn);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const logoY = useSharedValue(40);
  const logoOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const btnOpacity = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 900, easing: ease }));
    logoY.value = withDelay(100, withTiming(0, { duration: 900, easing: ease }));
    contentOpacity.value = withDelay(500, withTiming(1, { duration: 800 }));
    btnOpacity.value = withDelay(900, withTiming(1, { duration: 700 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const btnStyle = useAnimatedStyle(() => ({ opacity: btnOpacity.value }));

  const bg = isDark ? DARK_BG : LIGHT_BG;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={bg}
      />

      {/* Background gradient */}
      {isDark ? (
        <>
          <LinearGradient
            colors={["#0A1428", "#060B18", "#040810"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <GlowOrb x={-60}     y={H * 0.06}  size={280} color="#1B3F8F" delay={0}   opacity={0.5} />
          <GlowOrb x={W * 0.5} y={-40}       size={320} color="#0A2040" delay={1.5} opacity={0.55} />
          <GlowOrb x={-30}     y={H * 0.44}  size={220} color="#1A5C29" delay={0.8} opacity={0.38} />
          <GlowOrb x={W * 0.6} y={H * 0.55}  size={240} color="#0F3060" delay={2}   opacity={0.4} />
          <GlowOrb x={W * 0.7} y={H * 0.12}  size={160} color="#3BAD4E" delay={1}   opacity={0.1} />
          {/* dot grid */}
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04 }}>
            {Array.from({ length: 18 }).map((_, row) =>
              Array.from({ length: 9 }).map((_, col) => (
                <View
                  key={`${row}-${col}`}
                  style={{
                    position: "absolute",
                    width: 1.5, height: 1.5,
                    borderRadius: 1,
                    backgroundColor: "#FFFFFF",
                    left: col * (W / 8),
                    top: row * (H / 17),
                  }}
                />
              ))
            )}
          </View>
        </>
      ) : (
        <LinearGradient
          colors={["#EEF2FF", "#F5F7FF", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      {/* Bottom gradient fade */}
      <LinearGradient
        colors={["transparent", isDark ? "rgba(6,11,24,0.9)" : "rgba(245,247,255,0.95)"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 180 }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>

        {/* Top bar */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 8,
        }}>
          <View style={{
            flexDirection: "row",
            backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.07)",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(27,47,110,0.1)",
            padding: 3,
            gap: 2,
          }}>
            {(["fr", "en", "zh"] as const).map((l) => (
              <Pressable
                key={l}
                onPress={() => setLang(l)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 14,
                  backgroundColor: lang === l
                    ? (isDark ? "rgba(255,255,255,0.14)" : "rgba(27,47,110,0.12)")
                    : "transparent",
                }}
              >
                <Text style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: lang === l
                    ? (isDark ? "#FFFFFF" : NAVY)
                    : (isDark ? "rgba(255,255,255,0.35)" : "rgba(27,47,110,0.35)"),
                  letterSpacing: 0.5,
                }}>
                  {l === "zh" ? "中文" : l.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            backgroundColor: isDark ? "rgba(59,173,78,0.1)" : "rgba(59,173,78,0.08)",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(59,173,78,0.25)",
          }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: ACCENT, letterSpacing: 1.2 }}>
              {lang === "en" ? "FREE BETA" : lang === "zh" ? "免费测试版" : "BÊTA GRATUIT"}
            </Text>
          </View>
        </View>

        {/* Hero */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>

          {/* Live badge */}
          <Animated.View style={[contentStyle, { marginBottom: 28 }]}>
            <ActivityPill isDark={isDark} />
          </Animated.View>

          {/* Logo / Wordmark */}
          <Animated.View style={[logoStyle, { alignItems: "center" }]}>
            {LOGO_SOURCE ? (
              <Image
                source={LOGO_SOURCE}
                style={{ width: 200, height: 80 }}
                resizeMode="contain"
              />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                {/* Hat icon placeholder */}
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: NAVY,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: ACCENT,
                  shadowOpacity: isDark ? 0.4 : 0.2,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                }}>
                  <View style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: ACCENT,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 22, lineHeight: 28 }}>✓</Text>
                  </View>
                </View>
                {/* Text wordmark */}
                <View>
                  <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                    <Text style={{
                      fontSize: 56,
                      fontWeight: "900",
                      fontStyle: "italic",
                      color: isDark ? "#FFFFFF" : NAVY,
                      letterSpacing: -3,
                      lineHeight: 60,
                    }}>Job</Text>
                    <Text style={{
                      fontSize: 56,
                      fontWeight: "900",
                      fontStyle: "italic",
                      color: ACCENT,
                      letterSpacing: -3,
                      lineHeight: 60,
                    }}>é</Text>
                  </View>
                  <View style={{
                    width: 36, height: 2.5,
                    borderRadius: 2,
                    backgroundColor: ACCENT,
                    alignSelf: "flex-end",
                    marginTop: 2,
                  }} />
                </View>
              </View>
            )}
          </Animated.View>

          {/* Headline */}
          <Animated.View style={[contentStyle, { marginTop: 24, alignItems: "center", paddingHorizontal: 8 }]}>
            <Text style={{
              fontSize: 20,
              fontWeight: "700",
              color: isDark ? "#FFFFFF" : NAVY,
              textAlign: "center",
              lineHeight: 28,
              letterSpacing: -0.3,
            }}>
              {lang === "en" ? "The professional network for" : lang === "zh" ? "西非职场社交网络" : "Le réseau professionnel"}{"\n"}
              <Text style={{ color: ACCENT }}>
                {lang === "en" ? "West Africa" : lang === "zh" ? "立即加入" : "d'Afrique de l'Ouest"}
              </Text>
            </Text>
            <Text style={{
              fontSize: 13,
              color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)",
              textAlign: "center",
              marginTop: 8,
            }}>
              {lang === "en" ? "Jobs · Network · Feed · Messages" : lang === "zh" ? "职位 · 人脉 · 动态 · 消息" : "Emplois · Réseau · Posts · Messages"}
            </Text>
          </Animated.View>

          {/* Glass feature card */}
          <Animated.View style={[contentStyle, { marginTop: 28, width: "100%" }]}>
            <View style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(27,47,110,0.08)",
              borderRadius: 20,
              padding: 16,
              gap: 12,
            }}>
              {(lang === "en" ? [
                { icon: "💼", text: "5,000+ active job listings" },
                { icon: "🤝", text: "Connect with top professionals" },
                { icon: "📸", text: "Share your achievements on the social feed" },
              ] : lang === "zh" ? [
                { icon: "💼", text: "5,000+ 个活跃职位" },
                { icon: "🤝", text: "与顶尖专业人士建立联系" },
                { icon: "📸", text: "在社交动态分享您的成就" },
              ] : [
                { icon: "💼", text: "5 000+ offres d'emploi actives" },
                { icon: "🤝", text: "Connectez-vous aux meilleurs pros" },
                { icon: "📸", text: "Partagez vos succès sur le fil social" },
              ]).map(({ icon, text }) => (
                <View key={text} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    backgroundColor: isDark ? "rgba(59,173,78,0.12)" : "rgba(59,173,78,0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(59,173,78,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 17 }}>{icon}</Text>
                  </View>
                  <Text style={{
                    flex: 1,
                    fontSize: 13,
                    color: isDark ? "rgba(255,255,255,0.75)" : NAVY,
                    fontWeight: "500",
                  }}>
                    {text}
                  </Text>
                  <View style={{
                    width: 6, height: 6,
                    borderRadius: 3,
                    backgroundColor: ACCENT,
                    opacity: 0.5,
                  }} />
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Avatar proof row */}
          <Animated.View style={[contentStyle, { marginTop: 20, flexDirection: "row", alignItems: "center", gap: 10 }]}>
            <View style={{ flexDirection: "row" }}>
              {PROOF_AVATARS.map((uri, i) => (
                <View
                  key={i}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    borderWidth: 2,
                    borderColor: isDark ? DARK_BG : LIGHT_BG,
                    overflow: "hidden",
                    marginLeft: i === 0 ? 0 : -9,
                    zIndex: PROOF_AVATARS.length - i,
                    backgroundColor: NAVY,
                  }}
                >
                  <Image source={{ uri }} style={{ width: 30, height: 30 }} />
                </View>
              ))}
            </View>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT }} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: isDark ? "#FFFFFF" : NAVY }}>
                  {lang === "en" ? "10,000+ professionals" : lang === "zh" ? "10,000+ 专业人士" : "10 000+ professionnels"}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)", marginTop: 1 }}>
                {lang === "en" ? "join every month" : lang === "zh" ? "每月加入" : "rejoignent chaque mois"}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Bottom CTAs */}
        <Animated.View style={[btnStyle, {
          paddingHorizontal: 24,
          paddingBottom: Platform.OS === "android" ? 24 : 8,
          gap: 11,
        }]}>
          {/* Stats */}
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.6)",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.08)",
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginBottom: 2,
          }}>
            {(lang === "en" ? [
              { num: "10K+", lbl: "Members" },
              { num: "2K+", lbl: "Companies" },
              { num: "5K+", lbl: "Jobs" },
            ] : lang === "zh" ? [
              { num: "10K+", lbl: "会员" },
              { num: "2K+", lbl: "企业" },
              { num: "5K+", lbl: "职位" },
            ] : [
              { num: "10K+", lbl: "Membres" },
              { num: "2K+", lbl: "Entreprises" },
              { num: "5K+", lbl: "Offres" },
            ]).map(({ num, lbl }, i) => (
              <View key={lbl} style={{ alignItems: "center", flex: 1 }}>
                {i > 0 && (
                  <View style={{
                    position: "absolute", left: 0, top: 4, bottom: 4,
                    width: 1,
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(27,47,110,0.1)",
                  }} />
                )}
                <Text style={{ fontSize: 19, fontWeight: "800", color: isDark ? "#FFFFFF" : NAVY }}>{num}</Text>
                <Text style={{ fontSize: 10, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(27,47,110,0.45)", marginTop: 2 }}>{lbl}</Text>
              </View>
            ))}
          </View>

          {/* Sign in */}
          <Pressable
            testID="login-button"
            onPress={() => router.push("/sign-in" as never)}
            style={({ pressed }) => ({
              backgroundColor: ACCENT,
              borderRadius: 16,
              height: 54,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.88 : 1,
              shadowColor: ACCENT,
              shadowOpacity: 0.45,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 7 },
              elevation: 10,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.2 }}>
              {lang === "en" ? "Sign in" : lang === "zh" ? "登录" : "Se connecter"}
            </Text>
          </Pressable>

          {/* Sign up */}
          <Pressable
            testID="signup-link"
            onPress={() => router.push("/signup" as never)}
            style={({ pressed }) => ({
              borderWidth: 1.5,
              borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(27,47,110,0.18)",
              borderRadius: 16,
              height: 54,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed
                ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(27,47,110,0.04)")
                : "transparent",
            })}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: "700",
              color: isDark ? "rgba(255,255,255,0.85)" : NAVY,
            }}>
              {lang === "en" ? "Create account · Free" : lang === "zh" ? "创建账号 · 免费" : "Créer un compte · Gratuit"}
            </Text>
          </Pressable>

          {/* Demo mode separator */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 2 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.08)" }} />
            <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.28)" : "rgba(27,47,110,0.4)", fontWeight: "500" }}>
              {lang === "en" ? "or" : lang === "zh" ? "或" : "ou"}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(27,47,110,0.08)" }} />
          </View>

          {/* Demo entry button */}
          <Pressable
            testID="demo-button"
            onPress={() => setDemoLoggedIn(true, "candidate", "Aminata Sow")}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              borderRadius: 16,
              height: 48,
              backgroundColor: isDark
                ? (pressed ? "rgba(59,173,78,0.18)" : "rgba(59,173,78,0.1)")
                : (pressed ? "rgba(59,173,78,0.1)" : "rgba(59,173,78,0.07)"),
              borderWidth: 1,
              borderColor: isDark ? "rgba(59,173,78,0.25)" : "rgba(59,173,78,0.2)",
            })}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT }} />
            <Text style={{
              fontSize: 14,
              fontWeight: "600",
              color: ACCENT,
              letterSpacing: 0.1,
            }}>
              {lang === "en" ? "Explore the app · Demo mode" : lang === "zh" ? "探索应用 · 演示模式" : "Explorer l'app · Mode démo"}
            </Text>
          </Pressable>

          <Text style={{
            fontSize: 11,
            textAlign: "center",
            color: isDark ? "rgba(255,255,255,0.22)" : "rgba(27,47,110,0.35)",
            lineHeight: 16,
            marginTop: 2,
          }}>
            {lang === "en" ? "By continuing, you agree to our " : lang === "zh" ? "继续即表示您同意我们的" : "En continuant, vous acceptez nos "}
            <Text style={{
              color: isDark ? "rgba(255,255,255,0.42)" : NAVY,
              textDecorationLine: "underline",
            }}>
              {lang === "en" ? "Terms of Use" : lang === "zh" ? "使用条款" : "Conditions d'utilisation"}
            </Text>
          </Text>
        </Animated.View>

      </SafeAreaView>
    </View>
  );
}
