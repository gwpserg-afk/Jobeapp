import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Rocket, Moon, Sun } from "lucide-react-native";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n, type Lang } from "@/lib/i18n";

const { width } = Dimensions.get("window");

const LANGS: { code: Lang; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "zh", label: "中" },
];

export default function Welcome() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const toggleTheme = useTheme((s) => s.toggle);
  const { lang, setLang } = useI18n();
  const t = useI18n((s) => s.t);

  const getStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(auth)/sign-up");
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={isDark ? ["#0C0C0E", "#0B0B0D", "#0A120E"] : ["#FFFFFF", "#FFFFFF", "#F4FBF6"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <SafeAreaView style={styles.safe}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleTheme();
            }}
            style={[
              styles.iconBtn,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
            hitSlop={8}
            testID="theme-toggle"
          >
            {isDark ? (
              <Sun size={20} color={colors.textPrimary} strokeWidth={2} />
            ) : (
              <Moon size={20} color={colors.textPrimary} strokeWidth={2} />
            )}
          </Pressable>

          <View style={[styles.langBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {LANGS.map((l) => {
              const on = lang === l.code;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setLang(l.code);
                  }}
                  style={[styles.langBtn, on && { backgroundColor: colors.navy }]}
                  testID={`lang-${l.code}`}
                >
                  <Text style={[styles.langText, { color: on ? "#fff" : colors.textMuted }]}>{l.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Center: text wordmark + tagline */}
        <View style={styles.center}>
          <Text style={styles.wordmark} allowFontScaling={false}>
            <Text style={{ color: colors.navy }}>Job</Text>
            <Text style={{ color: colors.primary }}>é</Text>
          </Text>
          <Text style={[styles.tagline, { color: colors.textMuted }]}>{t.tagline}</Text>
        </View>

        {/* Actions — single portal */}
        <View style={styles.actions}>
          <Pressable
            onPress={getStarted}
            style={[]}
            testID="cta-get-started"
          >
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              style={[styles.btn, { shadowColor: colors.primary }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Rocket size={20} color="#fff" strokeWidth={2.4} />
              <Text style={styles.btnText}>{t.joinPrimary}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.signinRow} onPress={() => router.push("/(auth)/sign-in")} testID="cta-signin">
            <Text style={[styles.signinText, { color: colors.textMuted }]}>
              {t.login}{" "}
              <Text style={{ color: colors.primary, fontWeight: fonts.weights.bold }}>{t.signin}</Text>
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: spacing.xl },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  langBox: {
    flexDirection: "row",
    borderRadius: radius.full,
    borderWidth: 1,
    padding: 4,
    gap: 2,
  },
  langBtn: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  langText: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold,
    letterSpacing: 0.4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    fontSize: Math.min(96, width * 0.26),
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -3,
  },
  tagline: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.medium,
    letterSpacing: 0.3,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  actions: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: radius.lg,
    paddingVertical: 19,
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  btnText: {
    color: "#fff",
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold,
    letterSpacing: 0.2,
  },
  pressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.92,
  },
  signinRow: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  signinText: {
    fontSize: fonts.sizes.base,
  },
});
