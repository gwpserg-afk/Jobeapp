import {
  View,
  Text,
  FlatList,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Award,
  Bell,
  BookmarkCheck,
  Briefcase,
  Calendar,
  CheckCircle,
  Download,
  Eye,
  MessageCircle,
  CheckCheck,
  Search,
  Send,
  Star,
  TrendingUp,
  XCircle,
} from "lucide-react-native";
import { useDemoStore } from "../../lib/demoStore";
import { useTheme, type ThemeColors } from "../../lib/theme";
import { useLang, type TranslationKey } from "../../lib/i18n";
import type { DemoNotification } from "../../lib/demoData";

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
    case "new_application":
      return <Briefcase {...iconProps} />;
    case "job_match":
      return <Search {...iconProps} />;
    case "profile_view":
      return <Eye {...iconProps} />;
    case "candidate_profile_view":
      return <Eye {...iconProps} />;
    case "candidate_accepted":
      return <CheckCircle {...iconProps} />;
    case "recommendation":
    case "skill_endorsement":
      return <Star {...iconProps} />;
    case "connection_request":
      return <CheckCircle {...iconProps} />;
    case "like":
      return <Star {...iconProps} />;
    case "interview_scheduled":
      return <Calendar {...iconProps} />;
    case "interview_confirmed":
      return <Calendar {...iconProps} />;
    case "application_shortlisted":
      return <Award {...iconProps} />;
    case "offer_received":
      return <CheckCircle {...iconProps} />;
    case "saved_by_recruiter":
      return <BookmarkCheck {...iconProps} />;
    case "cv_viewed":
      return <Download {...iconProps} />;
    case "candidate_withdrew":
      return <XCircle {...iconProps} />;
    case "job_milestone":
      return <TrendingUp {...iconProps} />;
    case "shortlist":
      return <Star {...iconProps} />;
    case "offer_sent":
      return <Send {...iconProps} />;
    default:
      return <Bell {...iconProps} />;
  }
}

// Type configuration: icon color only (bg is theme-adaptive)
const TYPE_ICON_COLOR: Record<string, string> = {
  message: "#1B2F6E",
  application_update: "#3BAD4E",
  new_application: "#3BAD4E",
  job_match: "#1B2F6E",
  profile_view: "#1B2F6E",
  candidate_profile_view: "#1B2F6E",
  candidate_accepted: "#3BAD4E",
  recommendation: "#F59E0B",
  skill_endorsement: "#F59E0B",
  connection_request: "#F59E0B",
  like: "#3BAD4E",
  interview_scheduled: "#1B2F6E",
  interview_confirmed: "#1B2F6E",
  application_shortlisted: "#3BAD4E",
  offer_received: "#3BAD4E",
  saved_by_recruiter: "#F59E0B",
  cv_viewed: "#1B2F6E",
  candidate_withdrew: "#EF4444",
  job_milestone: "#3BAD4E",
  shortlist: "#F59E0B",
  offer_sent: "#3BAD4E",
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
  isDark,
  lang,
  t,
}: {
  notification: DemoNotification;
  onPress: (notification: DemoNotification) => void;
  colors: ThemeColors;
  isDark: boolean;
  lang: string;
  t: (key: TranslationKey) => string;
}) {
  const iconColor = TYPE_ICON_COLOR[notification.type] ?? "#6B7280";
  // Icon bg is subtle tint that works in both modes
  const iconBg = isDark ? "rgba(255,255,255,0.1)" : colors.toggleBg;
  const relTime = getRelativeTime(notification.createdAt, lang);

  // Get translated title and message (with fallback for old data format)
  const title = notification.titleKey
    ? t(notification.titleKey as TranslationKey)
    : (notification as { title?: string }).title ?? "Notification";
  const messageTemplate = notification.messageKey
    ? t(notification.messageKey as TranslationKey)
    : (notification as { message?: string }).message ?? "";
  const message = interpolateMessage(messageTemplate, notification.messageParams, t);

  return (
    <Pressable
      testID={`notification-${notification.id}`}
      onPress={() => onPress(notification)}
      style={({ pressed }) => ([
        {
          paddingHorizontal: 16,
          paddingVertical: 20,
          position: "relative",
          backgroundColor: colors.card,
          opacity: pressed ? 0.85 : 1,
        },
        !notification.isRead && { backgroundColor: colors.backgroundAlt },
      ])}
    >
      {/* Unread dot */}
      {!notification.isRead ? (
        <View style={{
          position: "absolute",
          left: 6,
          top: 22,
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: colors.accent,
        }} />
      ) : null}

      {/* Row 1: Icon + Title + Time */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
          flexShrink: 0,
          backgroundColor: iconBg,
        }}>
          {getIconForType(notification.type, iconColor)}
        </View>

        <Text
          style={[
            {
              flex: 1,
              fontSize: 14,
              fontWeight: "600",
              color: colors.textSecondary,
            },
            !notification.isRead && { color: colors.text, fontWeight: "700" },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Text style={{
          fontSize: 11,
          fontWeight: "500",
          color: colors.textMuted,
          marginLeft: 8,
          flexShrink: 0,
        }}>
          {relTime}
        </Text>
      </View>

      {/* Row 2: Description indented to align with title */}
      {message ? (
        <Text
          style={{
            fontSize: 13,
            lineHeight: 19,
            color: colors.textSecondary,
            marginTop: 5,
            marginLeft: 48,
          }}
          numberOfLines={2}
        >
          {message}
        </Text>
      ) : null}
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
  const { colors, isDark } = useTheme((s) => s);
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const demoAccountType = useDemoStore((s) => s.demoAccountType);
  const candidateNotifications = useDemoStore((s) => s.notifications);
  const recruiterNotifications = useDemoStore((s) => s.recruiterNotifications);
  const markNotificationRead = useDemoStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useDemoStore((s) => s.markAllNotificationsRead);

  // Use account-type-specific notifications
  const notifications = demoAccountType === "recruiter" ? recruiterNotifications : candidateNotifications;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handlePress = (notification: DemoNotification) => {
    // Mark as read
    markNotificationRead(notification.id);

    // Navigate based on notification type
    switch (notification.type) {
      case "message":
        // If targetId exists, navigate directly to that conversation
        if (notification.targetId) {
          router.push({
            pathname: "/(app)/(candidate)/messages",
            params: { conversationId: notification.targetId },
          } as never);
        } else {
          router.push("/(app)/(candidate)/messages" as never);
        }
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
      case "new_application":
        // Recruiter notification: navigate to applications
        if (notification.targetId) {
          router.push({
            pathname: "/(app)/(recruiter)/listings",
            params: { applicationId: notification.targetId },
          } as never);
        } else {
          router.push("/(app)/(recruiter)/listings" as never);
        }
        break;
      case "candidate_accepted":
        // Recruiter notification: navigate to application details
        if (notification.targetId) {
          router.push({
            pathname: "/(app)/(recruiter)/listings",
            params: { applicationId: notification.targetId },
          } as never);
        } else {
          router.push("/(app)/(recruiter)/listings" as never);
        }
        break;
      case "candidate_profile_view":
        // Recruiter notification: navigate to talents/candidates
        if (notification.targetId) {
          router.push({
            pathname: "/(app)/(recruiter)/talents",
            params: { candidateId: notification.targetId },
          } as never);
        } else {
          router.push("/(app)/(recruiter)/talents" as never);
        }
        break;
      case "interview_scheduled":
        router.push("/(app)/(recruiter)/listings" as never);
        break;
      case "candidate_withdrew":
        router.push("/(app)/(recruiter)/listings" as never);
        break;
      case "job_milestone":
        router.push("/(app)/(recruiter)/listings" as never);
        break;
      case "shortlist":
        router.push("/(app)/(recruiter)/talents" as never);
        break;
      case "offer_sent":
        router.push("/(app)/(recruiter)/listings" as never);
        break;
      case "interview_confirmed":
        router.push("/(app)/(candidate)/applications" as never);
        break;
      case "application_shortlisted":
        router.push("/(app)/(candidate)/applications" as never);
        break;
      case "offer_received":
        router.push("/(app)/(candidate)/applications" as never);
        break;
      case "saved_by_recruiter":
        router.push("/(app)/(candidate)/profile" as never);
        break;
      case "cv_viewed":
        router.push("/(app)/(candidate)/profile" as never);
        break;
      default:
        // Just mark as read, stay on screen
        break;
    }
  };

  return (
    <View
      testID="notifications-screen"
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SafeAreaView
        edges={["top"]}
        style={{ backgroundColor: colors.card }}
      >
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
          {/* Back button */}
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.toggleBg,
            }}
          >
            <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
          </Pressable>

          <View style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}>
            <Text style={{
              fontSize: 17,
              fontWeight: "700",
              color: colors.text,
            }}>
              {t("notifications_title")}
            </Text>
            {unreadCount > 0 ? (
              <View style={{
                borderRadius: 10,
                minWidth: 20,
                paddingHorizontal: 6,
                paddingVertical: 1,
                alignItems: "center",
                backgroundColor: colors.accent,
              }}>
                <Text style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: "#FFFFFF",
                }}>
                  {unreadCount}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Mark all read */}
          {unreadCount > 0 ? (
            <Pressable
              testID="mark-all-read"
              onPress={markAllNotificationsRead}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.toggleBg,
              }}
            >
              <CheckCheck size={18} color={colors.accent} strokeWidth={2} />
            </Pressable>
          ) : (
            <View style={{
              width: 44,
              height: 44,
            }} />
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
            isDark={isDark}
            lang={lang}
            t={t}
          />
        )}
        contentContainerStyle={{
          paddingVertical: 8,
          paddingBottom: 40,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={{ height: 6, backgroundColor: colors.background }} />
        )}
        ListEmptyComponent={
          <View testID="notifications-empty" style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 80,
            paddingHorizontal: 32,
          }}>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EEF4FF",
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "#C7D7FA",
              }}
            >
              <Bell size={40} color={colors.textMuted} strokeWidth={1.5} />
            </View>
            <Text style={{
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 8,
              color: colors.text,
              textAlign: "center",
            }}>
              {t("notifications_empty")}
            </Text>
            <Text style={{
              fontSize: 14,
              textAlign: "center",
              color: colors.textMuted,
              lineHeight: 20,
            }}>
              {t("notifications_empty_desc")}
            </Text>
          </View>
        }
      />
    </View>
  );
}
