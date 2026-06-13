import {
  View,
  Text,
  FlatList,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useSegments } from "expo-router";
import {
  ArrowLeft,
  UserCheck,
  UserX,
  MapPin,
  Users,
  Clock,
  ChevronRight,
  MessageCircle,
} from "lucide-react-native";
import { useDemoStore } from "../lib/demoStore";
import { useTheme } from "../lib/theme";
import { useLang } from "../lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

type Connection = {
  id: string;
  candidate: {
    id: string;
    fullName: string;
    headline: string;
    city: string;
    initials: string;
    avatarColor: string;
    availabilityStatus: string;
    neighborhood?: string | null;
  };
  status: string;
};

// ─── Connection Card ──────────────────────────────────────────────────────────

function ConnectionCard({
  connection,
  onAccept,
  onDecline,
  onPress,
  onMessage,
}: {
  connection: Connection;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onPress?: () => void;
  onMessage?: () => void;
}) {
  const colors = useTheme((s) => s.colors);
  const { t } = useLang();
  const candidate = connection.candidate;
  const isPending = connection.status === "pending_received";
  const isSent = connection.status === "pending_sent";
  const isAccepted = connection.status === "accepted";

  return (
    <Pressable
      testID={`connection-card-${connection.id}`}
      onPress={isSent ? undefined : onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: isPending ? 1.5 : 0,
        borderColor: isPending ? colors.border : "transparent",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
        opacity: isSent ? 0.6 : 1,
      }}
    >
      {/* Avatar */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: candidate.avatarColor + "20",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "800", color: candidate.avatarColor }}>
          {candidate.initials}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }} numberOfLines={1}>
          {candidate.fullName}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
          {candidate.headline}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
          <MapPin size={11} color={colors.textMuted} strokeWidth={2} />
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{candidate.city}</Text>
          {candidate.availabilityStatus === "available" ? (
            <>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#3BAD4E", marginLeft: 4 }} />
              <Text style={{ fontSize: 11, color: "#3BAD4E", fontWeight: "600" }}>{t("connections_available_label")}</Text>
            </>
          ) : null}
        </View>
      </View>

      {/* Actions */}
      <View style={{ alignItems: "center", justifyContent: "center", gap: 8 }}>
        {isPending ? (
          <>
            <Pressable
              testID={`accept-${connection.id}`}
              onPress={() => onAccept?.(connection.id)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#3BAD4E",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserCheck size={14} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <Pressable
              testID={`decline-${connection.id}`}
              onPress={() => onDecline?.(connection.id)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserX size={14} color={colors.textSecondary} strokeWidth={2.5} />
            </Pressable>
          </>
        ) : isSent ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Clock size={12} color={colors.textSecondary} strokeWidth={2} />
            <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "600" }}>{t("connections_sent_label")}</Text>
          </View>
        ) : isAccepted ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <UserCheck size={13} color="#3BAD4E" strokeWidth={2.5} />
            <Pressable
              testID={`message-${connection.id}`}
              onPress={(e) => {
                e.stopPropagation();
                onMessage?.();
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#1B2F6E",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageCircle size={14} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionDivider({ title, count }: { title: string; count: number }) {
  const colors = useTheme((s) => s.colors);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.6 }}>
        {title.toUpperCase()}
      </Text>
      <View
        style={{
          backgroundColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 6,
          paddingVertical: 1,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textSecondary }}>{count}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ConnectionsScreen() {
  const router = useRouter();
  const segments = useSegments();
  const isRecruiter = segments.some((s) => s === "(recruiter)");
  const colors = useTheme((s) => s.colors);
  const { t } = useLang();
  const connections = useDemoStore((s) => s.connections);
  const acceptConnection = useDemoStore((s) => s.acceptConnection);
  const declineConnection = useDemoStore((s) => s.declineConnection);

  const pending = connections.filter((c) => c.status === "pending_received");
  const accepted = connections.filter((c) => c.status === "accepted");
  const sent = connections.filter((c) => c.status === "pending_sent");

  type ListItem =
    | { type: "divider"; title: string; count: number; key: string }
    | { type: "connection"; data: Connection; key: string };

  const listData: ListItem[] = [];

  // Accepted first, then pending, then sent
  if (accepted.length > 0) {
    listData.push({ type: "divider", title: t("connections_section_accepted"), count: accepted.length, key: "div-accepted" });
    accepted.forEach((c) => listData.push({ type: "connection", data: c as Connection, key: c.id }));
  }

  if (pending.length > 0) {
    listData.push({ type: "divider", title: t("connections_section_pending"), count: pending.length, key: "div-pending" });
    pending.forEach((c) => listData.push({ type: "connection", data: c as Connection, key: c.id }));
  }

  if (sent.length > 0) {
    listData.push({ type: "divider", title: t("connections_section_sent"), count: sent.length, key: "div-sent" });
    sent.forEach((c) => listData.push({ type: "connection", data: c as Connection, key: c.id }));
  }

  return (
    <View testID="connections-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.card }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.background,
            }}
          >
            <ArrowLeft size={22} color={colors.primary} strokeWidth={2} />
          </Pressable>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.primary }}>{t("connections_screen_title")}</Text>
            {pending.length > 0 ? (
              <View
                style={{
                  backgroundColor: "#E74C3C",
                  borderRadius: 10,
                  minWidth: 20,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>{pending.length}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      {/* List */}
      <FlatList
        testID="connections-list"
        data={listData}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          if (item.type === "divider") {
            return <SectionDivider title={item.title} count={item.count} />;
          }
          return (
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <ConnectionCard
                connection={item.data}
                onAccept={acceptConnection}
                onDecline={declineConnection}
                onPress={() =>
                  router.push({
                    pathname: "/candidate-detail",
                    params: { candidateId: item.data.candidate.id, connectionId: item.data.id },
                  } as never)
                }
                onMessage={() =>
                  router.push({
                    pathname: isRecruiter ? "/(app)/(recruiter)/messages" : "/(app)/(candidate)/messages",
                    params: { openUserId: item.data.candidate.id, openUserName: item.data.candidate.fullName },
                  } as never)
                }
              />
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 8, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View
            testID="connections-empty"
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 40,
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: colors.background,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Users size={36} color={colors.textMuted} strokeWidth={1.5} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{t("connections_empty_title")}</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 8, textAlign: "center", paddingHorizontal: 20 }}>
              {t("connections_empty_desc")}
            </Text>
          </View>
        }
      />
    </View>
  );
}
