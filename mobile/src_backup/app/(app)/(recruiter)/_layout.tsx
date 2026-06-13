import { Tabs } from "expo-router";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  MessageCircle,
  UserCircle,
} from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { View, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TAB_GREEN = "#3BAD4E";
const TAB_GRAY = "#777777";
// Only these 5 names appear in the bar; all others are hidden
const VISIBLE_TABS = ["index", "listings", "talents", "messages", "company"];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((r) => VISIBLE_TABS.includes(r.name));

  return (
    <View
      testID="recruiter-custom-tab-bar"
      style={{
        backgroundColor: isDark ? "#0F1B3D" : "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: isDark ? "#2A3B6A" : "#E5E7EB",
        paddingBottom: Math.max(insets.bottom, 8),
        flexDirection: "row",
        alignItems: "stretch",
      }}
    >
      {visibleRoutes.map((route) => {
        const { options } = descriptors[route.key];
        const routeIndex = state.routes.findIndex((r) => r.key === route.key);
        const isFocused = state.index === routeIndex;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params as Record<string, unknown> | undefined);
          }
        };

        const iconColor = isFocused ? TAB_GREEN : TAB_GRAY;
        const tabBarIcon = options.tabBarIcon;
        const label = typeof options.title === "string" ? options.title : route.name;

        return (
          <Pressable
            key={route.key}
            testID={`tab-${route.name}`}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 10,
              paddingBottom: 6,
              minHeight: 56,
            }}
          >
            {tabBarIcon
              ? tabBarIcon({ color: iconColor, size: 22, focused: isFocused })
              : null}
            <Text
              style={{
                fontSize: 10,
                fontWeight: isFocused ? "700" : "500",
                color: iconColor,
                marginTop: 3,
                textAlign: "center",
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function RecruiterTabLayout() {
  const lang = useLang((s) => s.lang);

  // Short labels guaranteed to fit on any screen size across all 3 languages
  const labels = {
    dashboard: lang === "zh" ? "首页" : lang === "en" ? "Dashboard" : "Dashboard",
    listings:  lang === "zh" ? "职位" : lang === "en" ? "My Jobs"   : "Mes offres",
    talents:   lang === "zh" ? "候选人" : lang === "en" ? "Candidates" : "Candidats",
    messages:  lang === "zh" ? "消息" : lang === "en" ? "Messages"  : "Messages",
    profile:   lang === "zh" ? "档案" : lang === "en" ? "Profile"   : "Profil",
  };

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: labels.dashboard,
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <LayoutDashboard size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: labels.listings,
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Briefcase size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="talents"
        options={{
          title: labels.talents,
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Users size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: labels.messages,
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MessageCircle size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="company"
        options={{
          title: labels.profile,
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <UserCircle size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      {/* Hidden from tab bar */}
      <Tabs.Screen
        name="promotions"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="ai-assistant"
        options={{ href: null }}
      />
      <Tabs.Screen name="post-job" options={{ href: null }} />
    </Tabs>
  );
}
