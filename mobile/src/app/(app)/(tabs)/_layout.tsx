import { Tabs } from "expo-router";
import { useTheme, fonts } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { View, Text } from "react-native";

function TabIcon({ label, emoji, focused }: { label: string; emoji: string; focused: boolean }) {
  const colors = useTheme((s) => s.colors);
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
      <Text style={{
        fontSize: fonts.sizes.xs,
        color: focused ? colors.primary : colors.textMuted,
        fontWeight: focused ? fonts.weights.semibold : fonts.weights.regular,
      }}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const colors = useTheme((s) => s.colors);
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label={t.feed} emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label={t.jobs} emoji="💼" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label={t.messages} emoji="💬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label={t.profile} emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
