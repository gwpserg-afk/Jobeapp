import { Tabs } from "expo-router";
import {
  Home,
  Search,
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

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const isDark = useTheme((s) => s.isDark);
  const t = useLang((s) => s.t);
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="candidate-custom-tab-bar"
      style={{
        backgroundColor: isDark ? "#0F1B3D" : "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: isDark ? "#2A3B6A" : "#E5E7EB",
        paddingBottom: insets.bottom,
        flexDirection: "row",
        alignItems: "stretch",
      }}
    >
      {state.routes.filter(route => !!descriptors[route.key].options.tabBarIcon).map((route) => {
        const { options } = descriptors[route.key];
        const routeIndex = state.routes.findIndex(r => r.key === route.key);
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
              adjustsFontSizeToFit={true}
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

export default function CandidateTabLayout() {
  const colors = useTheme((s) => s.colors);
  const t = useLang((s) => s.t);

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
          title: t("tab_home"),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Home size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("tab_search"),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Search size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: t("tab_jobs"),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Briefcase size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t("tab_messages"),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MessageCircle size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="promotions"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tab_profile"),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <UserCircle size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      {/* Hidden from tab bar */}
      <Tabs.Screen
        name="ai-assistant"
        options={{ href: null }}
      />
    </Tabs>
  );
}
