import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  UserCheck,
  CheckCheck,
  Send,
  Briefcase,
  UserPlus,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme";
import { useDemoStore } from "@/lib/demoStore";

const ACCENT = "#3BAD4E";
const NAVY = "#1B2F6E";

type ActivityTab = "messages" | "connections";


const CONNECTIONS = [
  { id: "c1", name: "Boubacar Ndiaye", title: "Ingénieur Systèmes", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&q=80", mutuals: 3, status: "pending", direction: "incoming", time: "2h" },
  { id: "c2", name: "Mariama Balde", title: "Consultante RH", avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=120&q=80", mutuals: 8, status: "pending", direction: "incoming", time: "1j" },
  { id: "c3", name: "Ibrahima Dieng", title: "Architecte Logiciel", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80", mutuals: 2, status: "accepted", direction: "outgoing", time: "3j" },
  { id: "c4", name: "Aminata Sow", title: "Développeuse Full-Stack", avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&q=80", mutuals: 12, status: "accepted", direction: "incoming", time: "5j" },
];

const APPLICATIONS = [
  { id: "a1", role: "Ingénieur Web", company: "Orange Sénégal", logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&q=80", status: "interview", updatedAt: "Aujourd'hui", name: "Aminata Sow", avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&q=80" },
  { id: "a2", role: "Data Analyst", company: "Wave Mobile", logo: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=80&q=80", status: "reviewing", updatedAt: "Hier", name: "Ousmane Ba", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80" },
  { id: "a3", role: "UX Designer", company: "Expresso", logo: undefined, status: "applied", updatedAt: "Lun", name: "Fatou Mbaye", avatar: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=80&q=80" },
  { id: "a4", role: "Chef de Projet", company: "Gainde 2000", logo: undefined, status: "rejected", updatedAt: "Sam", name: "Ibra Diallo", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  interview: { label: "Entretien", color: "#3BAD4E", bg: "#EBF5EC" },
  reviewing: { label: "En cours", color: "#2563EB", bg: "#EFF6FF" },
  applied: { label: "Envoyée", color: "#F97316", bg: "#FFF7ED" },
  rejected: { label: "Refusé", color: "#EF4444", bg: "#FFF0F0" },
};

type StoreConversation = {
  id: string;
  participant: { id: string; name: string; initials: string; avatarColor: string; isCompany: boolean };
  messages: { id: string; senderId: string; text: string; time: string; date: string }[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
};

function MessageRow({ conv, colors, isDark, index, onPress }: { conv: StoreConversation; colors: any; isDark: boolean; index: number; onPress: () => void }) {
  const hasUnread = conv.unreadCount > 0;
  const lastMsgIsMe = conv.messages.length > 0 && conv.messages[conv.messages.length - 1].senderId === "me";
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(index * 50)}>
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 13,
          backgroundColor: hasUnread ? (isDark ? "#1A2C50" : "#F0FDF4") : "transparent",
        }}>
        <View style={{ position: "relative" }}>
          <View style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: conv.participant.avatarColor,
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#FFF" }}>
              {conv.participant.initials}
            </Text>
          </View>
          <View style={{ position: "absolute", bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: ACCENT, borderWidth: 2, borderColor: colors.background }} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 15, fontWeight: hasUnread ? "700" : "600", color: colors.text }}>{conv.participant.name}</Text>
            <Text style={{ fontSize: 12, color: hasUnread ? ACCENT : colors.textMuted, fontWeight: hasUnread ? "600" : "400" }}>{conv.lastMessageTime}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3, gap: 4 }}>
            {lastMsgIsMe ? <CheckCheck size={13} color={ACCENT} strokeWidth={2.5} /> : null}
            <Text
              numberOfLines={1}
              style={{ fontSize: 13, color: hasUnread ? colors.text : colors.textSecondary, fontWeight: hasUnread ? "500" : "400", flex: 1 }}
            >
              {conv.lastMessage}
            </Text>
            {hasUnread ? (
              <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFF" }}>{conv.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function ConnectionRow({ conn, colors, isDark, index }: { conn: typeof CONNECTIONS[0]; colors: any; isDark: boolean; index: number }) {
  const [status, setStatus] = useState(conn.status);
  const isPending = status === "pending" && conn.direction === "incoming";

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(index * 60)}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 13,
      }}>
        <Image source={{ uri: conn.avatar }} style={{ width: 52, height: 52, borderRadius: 26 }} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{conn.name}</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }} numberOfLines={1}>{conn.title}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{conn.mutuals} connexion{conn.mutuals > 1 ? "s" : ""} en commun · {conn.time}</Text>
        </View>
        {isPending ? (
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Pressable
              onPress={() => setStatus("rejected")}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.toggleBg, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 18, color: colors.textMuted, lineHeight: 20 }}>×</Text>
            </Pressable>
            <Pressable
              onPress={() => setStatus("accepted")}
              style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFF" }}>Accepter</Text>
            </Pressable>
          </View>
        ) : status === "accepted" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, height: 32, borderRadius: 16, backgroundColor: "#EBF5EC" }}>
            <UserCheck size={13} color={ACCENT} strokeWidth={2.5} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: ACCENT }}>Connecté</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 10, height: 32, borderRadius: 16, backgroundColor: colors.toggleBg, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 12, fontWeight: "500", color: colors.textMuted }}>Refusé</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function ApplicationRow({ app, colors, isDark, index }: { app: typeof APPLICATIONS[0]; colors: any; isDark: boolean; index: number }) {
  const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.applied;
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(index * 60)}>
      <Pressable style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 13,
      }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", backgroundColor: colors.toggleBg, alignItems: "center", justifyContent: "center" }}>
          {app.logo ? (
            <Image source={{ uri: app.logo }} style={{ width: 52, height: 52 }} resizeMode="cover" />
          ) : (
            <Briefcase size={22} color={NAVY} strokeWidth={1.5} />
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{app.name}</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>{app.role} · {app.company}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{app.updatedAt}</Text>
        </View>
        <View style={{ backgroundColor: cfg.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: cfg.color }}>{cfg.label}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ActivityScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const demoAccountType = useDemoStore((s) => s.demoAccountType);
  const conversations = useDemoStore((s) => s.conversations);
  const isRecruiter = demoAccountType === "recruiter";

  const [activeTab, setActiveTab] = useState<ActivityTab>("messages");

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const pendingConnections = CONNECTIONS.filter((c) => c.status === "pending" && c.direction === "incoming").length;

  const secondTabLabel = isRecruiter ? "Candidatures" : "Connexions";
  const secondTabBadge = isRecruiter ? APPLICATIONS.filter((a) => a.status === "reviewing").length : pendingConnections;

  return (
    <View testID="activity-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.primary, letterSpacing: -0.5 }}>
              Activité
            </Text>
            <Pressable style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.card,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
            }}>
              <Send size={18} color={NAVY} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Tab switcher */}
          <View style={{
            flexDirection: "row",
            marginTop: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            {(["messages", "connections"] as ActivityTab[]).map((tab, i) => {
              const active = activeTab === tab;
              const label = tab === "messages" ? "Messages" : secondTabLabel;
              const badge = tab === "messages" ? totalUnread : secondTabBadge;
              return (
                <Pressable
                  key={tab}
                  testID={`activity-tab-${tab}`}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingBottom: 12,
                    marginRight: 24,
                    borderBottomWidth: 2.5,
                    borderBottomColor: active ? ACCENT : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: active ? "700" : "500", color: active ? colors.text : colors.textMuted }}>{label}</Text>
                  {badge > 0 ? (
                    <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: active ? ACCENT : colors.toggleBg, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: active ? "#FFF" : colors.textSecondary }}>{badge}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {activeTab === "messages" ? (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <MessageRow
                conv={item as StoreConversation}
                colors={colors}
                isDark={isDark}
                index={index}
                onPress={() => router.push({ pathname: "/(app)/chat", params: { conversationId: item.id } } as never)}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 6 }}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 80 }} />
            )}
          />
        ) : isRecruiter ? (
          <FlatList
            data={APPLICATIONS}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <ApplicationRow app={item} colors={colors} isDark={isDark} index={index} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 6 }}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 80 }} />
            )}
          />
        ) : (
          <>
            {pendingConnections > 0 ? (
              <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 4, padding: 12, backgroundColor: isDark ? "#1A2C50" : "#F0FDF4", borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <UserPlus size={16} color={ACCENT} strokeWidth={2} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: ACCENT }}>
                  {pendingConnections} demande{pendingConnections > 1 ? "s" : ""} de connexion en attente
                </Text>
              </View>
            ) : null}
            <FlatList
              data={CONNECTIONS}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => <ConnectionRow conn={item} colors={colors} isDark={isDark} index={index} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100, paddingTop: 6 }}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 80 }} />
              )}
            />
          </>
        )}
      </SafeAreaView>
    </View>
  );
}
