import { Tabs } from "expo-router";
import { View } from "react-native";
import { Home, Search, Plus, MessageCircle, User } from "lucide-react-native";
import { useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const colors = useTheme((s) => s.colors);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 16,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Home size={25} color={color} strokeWidth={focused ? 2.6 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Search size={25} color={color} strokeWidth={focused ? 2.6 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: () => (
            <View
              testID="tab-create"
              style={{
                width: 52,
                height: 38,
                borderRadius: 14,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: colors.primary,
                shadowOpacity: 0.45,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              <Plus size={24} color="#fff" strokeWidth={2.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <MessageCircle size={25} color={color} strokeWidth={focused ? 2.6 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <User size={25} color={color} strokeWidth={focused ? 2.6 : 2} />
          ),
        }}
      />
      {/* Jobs de-emphasized in the 100%-social pivot — keep the route, hide the tab */}
      <Tabs.Screen name="jobs" options={{ href: null }} />
    </Tabs>
  );
}
