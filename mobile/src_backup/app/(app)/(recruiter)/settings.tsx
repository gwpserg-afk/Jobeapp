import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Globe,
  MessageCircle,
  FileText,
  Eye,
  Lock,
  Moon,
  Phone,
  Sun,
  UserCheck,
  HelpCircle,
  LogOut,
  ChevronRight,
  User,
  Mail,
  CheckCircle,
  Briefcase,
} from "lucide-react-native";
import { useLang } from "@/lib/i18n";
import { useTheme, type ThemeColors } from "@/lib/theme";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import { USER_ME_QUERY_KEY } from "@/lib/hooks/useUser";
import { useInvalidateSession } from "@/lib/auth/use-session";
import { authClient } from "@/lib/auth/auth-client";
import { showToast } from "@/lib/toast";

// ─── Brand Colors ──────────────────────────────────────────────────────────────

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";

// ─── Types ─────────────────────────────────────────────────────────────────────

type NotifKey = "messages" | "applications" | "alerts" | "profileViews";

type UserMe = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ title, colors }: { title: string; colors: ThemeColors }) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 28,
        paddingBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <View
        style={{
          width: 3,
          height: 16,
          borderRadius: 2,
          backgroundColor: GREEN,
        }}
      />
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 1,
          color: colors.textSecondary,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
    </View>
  );
}

// ─── Card Container ────────────────────────────────────────────────────────────

function CardContainer({
  children,
  colors,
  isDark,
}: {
  children: React.ReactNode;
  colors: ThemeColors;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        borderRadius: 16,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

// ─── Info Row ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  colors,
  isDark,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colors: ThemeColors;
  isDark: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : colors.border,
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F0F4FF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 2 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ─── Notif Row ─────────────────────────────────────────────────────────────────

function NotifRow({
  icon,
  iconColor,
  label,
  sublabel,
  value,
  onToggle,
  colors,
  isDark,
  isLast,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  sublabel: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  colors: ThemeColors;
  isDark: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : colors.border,
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: iconColor + "1A",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
          {label}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
          {sublabel}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: GREEN }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.toggleBg}
      />
    </View>
  );
}

// ─── Action Row ────────────────────────────────────────────────────────────────

function ActionRow({
  icon,
  label,
  onPress,
  colors,
  isDark,
  isLast,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  colors: ThemeColors;
  isDark: boolean;
  isLast?: boolean;
  iconColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : colors.border,
        gap: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: iconColor ? iconColor + "1A" : isDark ? "rgba(255,255,255,0.08)" : "#F0F4FF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: colors.text }}>
        {label}
      </Text>
      <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
    </Pressable>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function RecruiterSettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const toggleTheme = useTheme((s) => s.toggleTheme);
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const invalidateSession = useInvalidateSession();

  const [showSignOutModal, setShowSignOutModal] = useState<boolean>(false);
  const [notifs, setNotifs] = useState<Record<NotifKey, boolean>>({
    messages: true,
    applications: true,
    alerts: false,
    profileViews: false,
  });

  const { data: userMe } = useQuery<UserMe>({
    queryKey: USER_ME_QUERY_KEY,
    queryFn: () => api.get<UserMe>("/api/me"),
    staleTime: 1000 * 60 * 5,
  });

  const navyText = isDark ? "#F5F5F5" : NAVY;
  const cardBg = isDark ? "#1E2C50" : "#FFFFFF";

  async function confirmSignOut() {
    setShowSignOutModal(false);
    try {
      await authClient.signOut();
      invalidateSession();
    } catch (_) {
      // ignore
    }
    router.replace("/welcome" as never);
  }

  function handleComingSoon() {
    showToast(t("recruiter_settings_coming_soon"), "info");
  }

  const notifRows: {
    key: NotifKey;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    iconColor: string;
  }[] = [
    {
      key: "messages",
      label: t("recruiter_settings_notif_messages"),
      sublabel: t("recruiter_settings_notif_messages_sub"),
      icon: <MessageCircle size={18} color="#0D9488" strokeWidth={2} />,
      iconColor: "#0D9488",
    },
    {
      key: "applications",
      label: t("recruiter_settings_notif_applications"),
      sublabel: t("recruiter_settings_notif_applications_sub"),
      icon: <FileText size={18} color="#2563EB" strokeWidth={2} />,
      iconColor: "#2563EB",
    },
    {
      key: "alerts",
      label: t("recruiter_settings_notif_alerts"),
      sublabel: t("recruiter_settings_notif_alerts_sub"),
      icon: <Briefcase size={18} color={GREEN} strokeWidth={2} />,
      iconColor: GREEN,
    },
    {
      key: "profileViews",
      label: t("recruiter_settings_notif_profile_views"),
      sublabel: t("recruiter_settings_notif_profile_views_sub"),
      icon: <Eye size={18} color="#7C3AED" strokeWidth={2} />,
      iconColor: "#7C3AED",
    },
  ];

  return (
    <View testID="recruiter-settings-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "rgba(255,255,255,0.1)" : colors.border,
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
              backgroundColor: isDark ? "rgba(255,255,255,0.1)" : colors.toggleBg,
            }}
          >
            <ArrowLeft size={22} color={colors.textOnBg} strokeWidth={2} />
          </Pressable>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 17,
              fontWeight: "700",
              color: colors.textOnBg,
            }}
          >
            {t("recruiter_settings_title")}
          </Text>
          <View style={{ width: 36, height: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        style={{ backgroundColor: colors.background }}
      >
        {/* ===== ACCOUNT INFORMATION ===== */}
        <SectionHeader title={t("recruiter_settings_account")} colors={colors} />
        <CardContainer colors={colors} isDark={isDark}>
          <InfoRow
            icon={<User size={18} color={NAVY} strokeWidth={2} />}
            label={t("recruiter_settings_name")}
            value={userMe?.name ?? "—"}
            colors={colors}
            isDark={isDark}
          />
          <InfoRow
            icon={<Mail size={18} color={NAVY} strokeWidth={2} />}
            label={t("recruiter_settings_email")}
            value={userMe?.email ?? "—"}
            colors={colors}
            isDark={isDark}
          />
          {userMe?.phone ? (
            <InfoRow
              icon={<Phone size={18} color={NAVY} strokeWidth={2} />}
              label={t("recruiter_settings_phone")}
              value={userMe.phone}
              colors={colors}
              isDark={isDark}
            />
          ) : null}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Pressable
              testID="edit-profile-button"
              onPress={() => router.push("/(app)/(recruiter)/company" as never)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#35A347" : GREEN,
                borderRadius: 12,
                paddingVertical: 13,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>
                {t("recruiter_settings_edit_profile")}
              </Text>
            </Pressable>
          </View>
        </CardContainer>

        {/* ===== APPEARANCE ===== */}
        <SectionHeader title={t("recruiter_settings_appearance")} colors={colors} />
        <CardContainer colors={colors} isDark={isDark}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
              gap: 12,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: isDark ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isDark
                ? <Moon size={18} color="#8B5CF6" strokeWidth={2} />
                : <Sun size={18} color="#8B5CF6" strokeWidth={2} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                {t("recruiter_settings_dark_mode")}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                {isDark ? t("recruiter_settings_dark_mode_on") : t("recruiter_settings_dark_mode_off")}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: "#8B5CF6" }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.toggleBg}
            />
          </View>
        </CardContainer>

        {/* ===== LANGUAGE ===== */}
        <SectionHeader title={t("recruiter_settings_language")} colors={colors} />
        <CardContainer colors={colors} isDark={isDark}>
          <View style={{ padding: 12, gap: 8 }}>
            {(["fr", "en", "zh"] as const).map((l) => {
              const isActive = lang === l;
              return (
                <Pressable
                  key={l}
                  testID={`lang-${l}`}
                  onPress={() => setLang(l)}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: isActive ? GREEN : colors.toggleBg,
                  }}
                >
                  <Globe size={16} color={isActive ? "#FFFFFF" : colors.textMuted} strokeWidth={2} />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontWeight: "700",
                      color: isActive ? "#FFFFFF" : colors.textSecondary,
                    }}
                  >
                    {l === "fr" ? "FR — Français" : l === "en" ? "EN — English" : "中文 — 简体"}
                  </Text>
                  {isActive ? (
                    <CheckCircle size={16} color="#FFFFFF" strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </CardContainer>

        {/* ===== NOTIFICATIONS ===== */}
        <SectionHeader title={t("recruiter_settings_notifications")} colors={colors} />
        <CardContainer colors={colors} isDark={isDark}>
          {notifRows.map((row, idx) => (
            <NotifRow
              key={row.key}
              icon={row.icon}
              iconColor={row.iconColor}
              label={row.label}
              sublabel={row.sublabel}
              value={notifs[row.key]}
              onToggle={(v) => setNotifs((prev) => ({ ...prev, [row.key]: v }))}
              colors={colors}
              isDark={isDark}
              isLast={idx === notifRows.length - 1}
            />
          ))}
        </CardContainer>

        {/* ===== SECURITY ===== */}
        <SectionHeader title={t("recruiter_settings_security")} colors={colors} />
        <CardContainer colors={colors} isDark={isDark}>
          <ActionRow
            icon={<Lock size={18} color="#F59E0B" strokeWidth={2} />}
            iconColor="#F59E0B"
            label={t("recruiter_settings_change_password")}
            onPress={handleComingSoon}
            colors={colors}
            isDark={isDark}
          />
          <ActionRow
            icon={<UserCheck size={18} color="#2563EB" strokeWidth={2} />}
            iconColor="#2563EB"
            label={t("recruiter_settings_identity_verify")}
            onPress={handleComingSoon}
            colors={colors}
            isDark={isDark}
          />
          <ActionRow
            icon={<Phone size={18} color="#0D9488" strokeWidth={2} />}
            iconColor="#0D9488"
            label={t("recruiter_settings_phone_verify")}
            onPress={handleComingSoon}
            colors={colors}
            isDark={isDark}
            isLast
          />
        </CardContainer>

        {/* ===== LINKS ===== */}
        <SectionHeader title={t("recruiter_settings_links")} colors={colors} />
        <CardContainer colors={colors} isDark={isDark}>
          <ActionRow
            icon={<FileText size={18} color="#6B7280" strokeWidth={2} />}
            label={t("recruiter_settings_privacy")}
            onPress={handleComingSoon}
            colors={colors}
            isDark={isDark}
          />
          <ActionRow
            icon={<HelpCircle size={18} color="#6B7280" strokeWidth={2} />}
            label={t("recruiter_settings_help")}
            onPress={handleComingSoon}
            colors={colors}
            isDark={isDark}
            isLast
          />
        </CardContainer>

        {/* ===== SIGN OUT ===== */}
        <View style={{ marginTop: 28, marginHorizontal: 16, marginBottom: 8 }}>
          <Pressable
            testID="sign-out-button"
            onPress={() => setShowSignOutModal(true)}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#DC2626" : "#EF4444",
              borderRadius: 14,
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: pressed ? 0.9 : 1,
              shadowColor: "#EF4444",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            })}
          >
            <LogOut size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              {t("recruiter_settings_signout")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ===== SIGN OUT MODAL ===== */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 20,
              padding: 28,
              width: "100%",
              maxWidth: 320,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "rgba(239,68,68,0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <LogOut size={26} color="#EF4444" strokeWidth={2} />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: navyText,
                marginBottom: 8,
                textAlign: "center",
                letterSpacing: -0.3,
              }}
            >
              {t("recruiter_settings_signout_title")}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: isDark ? "#9BA5BF" : "#6B7280",
                marginBottom: 24,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              {t("recruiter_settings_signout_msg")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
              <Pressable
                testID="cancel-signout"
                onPress={() => setShowSignOutModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 10,
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F0F2F8",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: navyText }}>
                  {t("recruiter_settings_cancel")}
                </Text>
              </Pressable>
              <Pressable
                testID="confirm-signout"
                onPress={confirmSignOut}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 10,
                  backgroundColor: "#EF4444",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>
                  {t("recruiter_settings_confirm_signout")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
