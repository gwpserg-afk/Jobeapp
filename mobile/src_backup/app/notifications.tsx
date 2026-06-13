import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  Briefcase,
  CheckCircle,
  Eye,
  MessageCircle,
  CheckCheck,
  Search,
  Star,
  Heart,
} from "lucide-react-native";
import { useDemoStore } from "../lib/demoStore";
import { useTheme, type ThemeColors } from "../lib/theme";
import { useLang, type TranslationKey } from "../lib/i18n";
import type { DemoNotification } from "../lib/demoData";

// Icon component mapping based on notification type
function getIconForType(
  type: string,
  color: string
): React.ReactNode {
  const iconProps = { size: 18, color, strokeWidth: 2 };
  switch (type) {
    case "message":
      return <MessageCircle {...iconProps} />;
    case "application_update":
      return <Briefcase {...iconProps} />;
    case "job_match":
      return <Search {...iconProps} />;
    case "profile_view":
      return <Eye {...iconProps} />;
    case "recommendation":
    case "skill_endorsement":
      return <Star {...iconProps} />;
    case "connection_request":
      return <CheckCircle {...iconProps} />;
    case "like":
      return <Star {...iconProps} />;
    default:
      return <Bell {...iconProps} />;
  }
}

// Type configuration with colors
const TYPE_CONFIG: Record<
  string,
  { color: string; bg: string }
> = {
  message: { color: "#0D9488", bg: "#F0FDFA" },
  application_update: { color: "#16A34A", bg: "#F0FDF4" },
  job_match: { color: "#2563EB", bg: "#EFF6FF" },
  profile_view: { color: "#7C3AED", bg: "#F5F3FF" },
  recommendation: { color: "#D97706", bg: "#FFFBEB" },
  skill_endorsement: { color: "#D97706", bg: "#FFFBEB" },
  connection_request: { color: "#EA580C", bg: "#FFF7ED" },
  like: { color: "#DB2777", bg: "#FDF2F8" },
};

// Helper to interpolate message params
function interpolateMessage(
  template: string,
  params: Record<string, string> | undefined,
  t: (key: TranslationKey) => string
): string {
  if (!params) return template;
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    // Check if the value is a translation key (starts with notif_status_)
    const translatedValue = value.startsWith("notif_status_")
      ? t(value as TranslationKey)
      : value;
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), translatedValue);
  }
  return result;
}

// Notification Row Component
function NotificationRow({
  notification,
  onPress,
  colors,
  lang,
  t,
}: {
  notification: DemoNotification;
  onPress: (notification: DemoNotification) => void;
  colors: ThemeColors;
  lang: string;
  t: (key: TranslationKey) => string;
}) {
  const cfg = TYPE_CONFIG[notification.type] ?? { color: "#6B7280", bg: "#F3F4F6" };
  const relTime = getRelativeTime(notification.createdAt, lang);

  // Get translated title and message (with fallback for old data format)
  const title = notification.titleKey
    ? t(notification.titleKey as TranslationKey)
    : (notification as any).title ?? "Notification";
  const messageTemplate = notification.messageKey
    ? t(notification.messageKey as TranslationKey)
    : (notification as any).message ?? "";
  const message = interpolateMessage(messageTemplate, notification.messageParams, t);

  return (
    <Pressable
      testID={`notification-${notification.id}`}
      onPress={() => onPress(notification)}
      style={[
        styles.notifRow,
        { backgroundColor: colors.card },
        !notification.isRead && { backgroundColor: colors.backgroundAlt },
      ]}
    >
      {/* Unread dot */}
      {!notification.isRead ? (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      ) : null}

      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
        {getIconForType(notification.type, cfg.color)}
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        <Text
          style={[
            styles.notifTitle,
            { color: colors.textSecondary },
            !notification.isRead && { color: colors.text, fontWeight: "700" },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={[styles.notifMessage, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {message}
        </Text>
        <Text style={[styles.notifTime, { color: colors.textMuted }]}>
          {relTime}
        </Text>
      </View>
    </Pressable>
  );
}

// Helper to get relative time
function getRelativeTime(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (lang === "en") {
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  } else {
    if (mins < 1) return "A l'instant";
    if (mins < 60) return `il y a ${mins}m`;
    if (hours < 24) return `il y a ${hours}h`;
    return `il y a ${days}j`;
  }
}

// Main Screen
export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const notifications = useDemoStore((s) => s.notifications);
  const markNotificationRead = useDemoStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useDemoStore((s) => s.markAllNotificationsRead);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handlePress = (notification: DemoNotification) => {
    // Mark as read
    markNotificationRead(notification.id);

    // Navigate based on notification type
    switch (notification.type) {
      case "message":
        router.push("/(app)/(candidate)/messages" as never);
        break;
      case "application_update":
        router.push("/(app)/(candidate)/applications" as never);
        break;
      case "job_match":
        if (notification.targetId) {
          router.push({
            pathname: "/job-detail",
            params: { jobId: notification.targetId },
          } as never);
        } else {
          router.push("/(app)/(candidate)/search" as never);
        }
        break;
      case "profile_view":
        router.push("/(app)/(candidate)/profile" as never);
        break;
      case "recommendation":
      case "skill_endorsement":
        router.push("/(app)/(candidate)/profile" as never);
        break;
      case "connection_request":
        router.push("/connections" as never);
        break;
      case "like":
        // Stay on notifications or go to feed
        router.back();
        break;
      default:
        // Just mark as read, stay on screen
        break;
    }
  };

  return (
    <View
      testID="notifications-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <SafeAreaView
        edges={["top"]}
        style={[styles.headerSafe, { backgroundColor: colors.card }]}
      >
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.border },
          ]}
        >
          {/* Back button */}
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.background }]}
          >
            <ArrowLeft size={22} color={colors.primary} strokeWidth={2} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.primary }]}>
              {t("notifications_title")}
            </Text>
            {unreadCount > 0 ? (
              <View style={[styles.headerBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.headerBadgeText}>{unreadCount}</Text>
              </View>
            ) : null}
          </View>

          {/* Mark all read */}
          {unreadCount > 0 ? (
            <Pressable
              testID="mark-all-read"
              onPress={markAllNotificationsRead}
              style={[styles.markAllBtn, { backgroundColor: colors.background }]}
            >
              <CheckCheck size={18} color={colors.primary} strokeWidth={2} />
            </Pressable>
          ) : (
            <View style={styles.markAllBtn} />
          )}
        </View>
      </SafeAreaView>

      {/* List */}
      <FlatList
        testID="notifications-list"
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            onPress={handlePress}
            colors={colors}
            lang={lang}
            t={t}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
        ListEmptyComponent={
          <View testID="notifications-empty" style={styles.emptyState}>
            <View
              style={[styles.emptyIconWrap, { backgroundColor: colors.background }]}
            >
              <Bell size={36} color={colors.textMuted} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.primary }]}>
              {t("notifications_empty")}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {t("notifications_empty_desc")}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSafe: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerBadge: {
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignItems: "center",
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  markAllBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 40,
    flexGrow: 1,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    left: 6,
    top: 18,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  notifMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
    fontWeight: "500",
  },
  separator: {
    height: 1,
    marginLeft: 70,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
