import { Tabs, useRouter } from "expo-router";
import { Home, Search, MessageCircle, User, Plus } from "lucide-react-native";
import { View, Pressable, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const ACCENT = "#3BAD4E";
const INACTIVE_LIGHT = "#9BA5BF";
const INACTIVE_DARK = "#6B7A99";

function TabItem({
  route,
  state,
  descriptors,
  navigation,
}: {
  route: any;
  state: any;
  descriptors: any;
  navigation: any;
}) {
  const { isDark, colors } = useTheme();
  const isFocused = state.index === state.routes.findIndex((r: any) => r.key === route.key);
  const { options } = descriptors[route.key];
  const label = typeof options.title === "string" ? options.title : route.name;
  const inactiveColor = isDark ? INACTIVE_DARK : INACTIVE_LIGHT;

  const onPress = () => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <Pressable
      testID={`tab-${route.name}`}
      onPress={onPress}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 }}
    >
      <View style={{ alignItems: "center", position: "relative" }}>
        {options.tabBarIcon?.({
          color: isFocused ? ACCENT : inactiveColor,
          size: 24,
          focused: isFocused,
        })}
        {isFocused && (
          <View
            style={{
              position: "absolute",
              bottom: -10,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: ACCENT,
            }}
          />
        )}
      </View>
      <Text
        style={{
          fontSize: 10,
          fontWeight: isFocused ? "700" : "500",
          color: isFocused ? ACCENT : inactiveColor,
          marginTop: 4,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const router = useRouter();

  const visibleRoutes = state.routes; // [index, discover, activity, profile]
  const firstHalf = visibleRoutes.slice(0, 2);
  const secondHalf = visibleRoutes.slice(2);

  return (
    <View
      testID="main-tab-bar"
      style={{
        flexDirection: "row",
        backgroundColor: isDark ? "#1E2C50" : "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: isDark ? "#2A3B6A" : "#EAF0F6",
        paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 8 : 12),
        paddingTop: 8,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: isDark ? 0.3 : 0.08,
        shadowRadius: 10,
        elevation: 16,
      }}
    >
      {firstHalf.map((route: any) => (
        <TabItem
          key={route.key}
          route={route}
          state={state}
          descriptors={descriptors}
          navigation={navigation}
        />
      ))}

      {/* Center FAB - create post / job */}
      <Pressable
        testID="tab-create-fab"
        onPress={() => router.push("/(app)/create-post" as never)}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: ACCENT,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: ACCENT,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.45,
            shadowRadius: 8,
            elevation: 8,
            marginBottom: 2,
          }}
        >
          <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      </Pressable>

      {secondHalf.map((route: any) => (
        <TabItem
          key={route.key}
          route={route}
          state={state}
          descriptors={descriptors}
          navigation={navigation}
        />
      ))}
    </View>
  );
}

export default function TabsLayout() {
  const t = useLang((s) => s.t);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
        name="discover"
        options={{
          title: t("tab_search"),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Search size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: t("tab_messages"),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MessageCircle size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tab_profile"),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <User size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
