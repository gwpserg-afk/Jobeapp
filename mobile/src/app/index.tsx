import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { View, Image, ActivityIndicator, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { authClient } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

const { width } = Dimensions.get("window");

export default function Index() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const timedOut = useRef(false);
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);

  useEffect(() => {
    const t = setTimeout(() => {
      if (timedOut.current) return;
      timedOut.current = true;
      router.replace("/(auth)/welcome");
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (timedOut.current) return;
    timedOut.current = true;
    if (session?.user) {
      router.replace("/(app)/(tabs)/");
    } else {
      router.replace("/(auth)/welcome");
    }
  }, [session, isPending]);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={isDark ? ["#0D0D0F", "#0A1A10"] : ["#F7F7FA", "#F0F7F3"]}
        style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 32 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={{
          width: width * 0.6,
          height: width * 0.6,
          borderRadius: width * 0.3,
          backgroundColor: colors.primary,
          position: "absolute",
          bottom: -width * 0.45,
          opacity: 0.06,
        }} />
        <Image
          source={isDark
            ? require("../../assets/logo-dark.png")
            : require("../../assets/logo-light.png")
          }
          style={{ width: 180, height: 60 }}
          resizeMode="contain"
        />
        <ActivityIndicator color={colors.primary} size="small" />
      </LinearGradient>
    </View>
  );
}
