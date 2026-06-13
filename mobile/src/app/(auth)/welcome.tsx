import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n, type Lang } from "@/lib/i18n";

const { width, height } = Dimensions.get("window");

const LANGS: { code: Lang; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
];

export default function Welcome() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const { lang, setLang, t } = useI18n();

  return (
    <View style={styles.root}>
      {/* Full-screen gradient background */}
      <LinearGradient
        colors={isDark ? ["#0D0D0F", "#0D0D0F", "#0A1A10"] : ["#F7F7FA", "#F0F7F3"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Glow orb — bottom center */}
      <View style={[styles.glowOrb, { backgroundColor: colors.primary }]} />

      <SafeAreaView style={styles.safe}>
        {/* Language picker */}
        <View style={styles.langRow}>
          {LANGS.map((l) => (
            <TouchableOpacity
              key={l.code}
              onPress={() => setLang(l.code)}
              style={[
                styles.langBtn,
                lang === l.code && { backgroundColor: colors.primaryDim },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.langText,
                  { color: lang === l.code ? colors.primary : colors.textMuted },
                ]}
              >
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={
              isDark
                ? require("../../../assets/logo-dark.png")
                : require("../../../assets/logo-light.png")
            }
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Hero headline */}
        <View style={styles.heroWrap}>
          <Text style={[styles.headline, { color: colors.textPrimary }]}>
            {t.hero.split("\n")[0]}
          </Text>
          <Text style={[styles.headline, { color: colors.primary }]}>
            {t.hero.split("\n")[1]}
          </Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>{t.sub}</Text>
        </View>

        {/* CTAs */}
        <View style={styles.actions}>
          {/* Candidate — primary green */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/sign-in?type=candidate")}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              style={styles.btnPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.btnPrimaryText}>{t.candidate}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Recruiter — dark outlined */}
          <TouchableOpacity
            style={[styles.btnSecondary, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => router.push("/(auth)/sign-in?type=recruiter")}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSecondaryText, { color: colors.textPrimary }]}>
              {t.recruiter}
            </Text>
          </TouchableOpacity>

          {/* Sign in link */}
          <TouchableOpacity
            style={styles.signinRow}
            onPress={() => router.push("/(auth)/sign-in")}
            activeOpacity={0.7}
          >
            <Text style={[styles.signinText, { color: colors.textMuted }]}>
              {t.login}{" "}
              <Text style={{ color: colors.primary, fontWeight: fonts.weights.semibold }}>
                {t.signin}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: spacing.xl },
  glowOrb: {
    position: "absolute",
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    bottom: -width * 0.8,
    left: -width * 0.1,
    opacity: 0.06,
  },
  langRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  langText: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold,
    letterSpacing: 0.4,
  },
  logoWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: spacing.xxl,
  },
  logo: { width: width * 0.5, height: 52 },
  heroWrap: {
    paddingBottom: spacing.xxl + spacing.lg,
  },
  headline: {
    fontSize: 46,
    fontWeight: fonts.weights.heavy,
    lineHeight: 52,
    letterSpacing: -1,
  },
  sub: {
    fontSize: fonts.sizes.base,
    marginTop: spacing.md,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  btnPrimary: {
    borderRadius: radius.full,
    paddingVertical: 17,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold,
    letterSpacing: 0.2,
  },
  btnSecondary: {
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold,
  },
  signinRow: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  signinText: {
    fontSize: fonts.sizes.base,
  },
});
