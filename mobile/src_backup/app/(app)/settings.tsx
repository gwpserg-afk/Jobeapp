import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Eye,
  Globe,
  BriefcaseBusiness,
  MessageCircle,
  Users,
  CheckCircle,
  Lock,
  UserCheck,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  User,
  Mail,
  Phone,
  Key,
  FileText,
  X,
  Save,
} from "lucide-react-native";
import { useDemoStore } from "../../lib/demoStore";
import { useLang } from "../../lib/i18n";
import { useTheme, ThemeColors } from "../../lib/theme";
import { authClient } from "@/lib/auth/auth-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import { USER_ME_QUERY_KEY } from "@/lib/hooks/useUser";

// ---- Types ----

type NotifKey = "messages" | "jobMatches" | "applicationUpdates" | "profileViews" | "connections";
type VisibilityOption = "public" | "recruiters" | "private";

// Brand colors
const ACCENT_GREEN = "#3BAD4E";

// ---- Sub-components ----

function SectionHeader({ title, colors }: { title: string; colors: ThemeColors }) {
  return (
    <View style={{
      paddingHorizontal: 16,
      paddingTop: 28,
      paddingBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    }}>
      <View style={{
        width: 3,
        height: 14,
        borderRadius: 2,
        backgroundColor: colors.accent,
      }} />
      <Text style={{
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        color: colors.textOnBg,
      }}>
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

function SettingRow({
  icon,
  iconBg,
  label,
  sublabel,
  right,
  labelColor,
  colors,
}: {
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  sublabel?: string;
  right: React.ReactNode;
  labelColor?: string;
  colors: ThemeColors;
}) {
  return (
    <View style={{
      paddingHorizontal: 16,
      paddingVertical: 12,
    }}>
      {/* Row 1: icon + label + right control */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
          backgroundColor: iconBg ?? colors.toggleBg,
        }}>
          {icon}
        </View>
        <Text style={{
          flex: 1,
          fontSize: 15,
          fontWeight: "600",
          color: labelColor ?? colors.text,
        }}>
          {label}
        </Text>
        {right}
      </View>
      {/* Row 2: description indented under label */}
      {sublabel ? (
        <Text style={{
          fontSize: 12,
          color: colors.textMuted,
          marginTop: 5,
          marginLeft: 50,
          lineHeight: 17,
        }}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  colors,
  showChevron,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  colors: ThemeColors;
  showChevron?: boolean;
  valueColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        minHeight: 56,
        paddingVertical: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
        backgroundColor: colors.toggleBg,
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 15,
          fontWeight: "600",
          color: colors.text,
        }}>
          {label}
        </Text>
      </View>
      {value ? (
        <Text style={{ fontSize: 13, color: valueColor ?? colors.textMuted, marginRight: showChevron ? 4 : 0 }}>
          {value}
        </Text>
      ) : null}
      {showChevron ? (
        <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
      ) : null}
    </Pressable>
  );
}

// Reusable card container
function CardContainer({ children, colors }: { children: React.ReactNode; colors: ThemeColors }) {
  return (
    <View style={{
      marginHorizontal: 16,
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      {children}
    </View>
  );
}

function Divider({ colors }: { colors: ThemeColors }) {
  return (
    <View style={{
      height: 1,
      marginLeft: 66,
      backgroundColor: colors.border,
    }} />
  );
}

// ---- Main Screen ----

export default function SettingsScreen() {
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const t = useLang((s) => s.t);
  const { colors, isDark, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  const notificationSettings = useDemoStore((s) => s.notificationSettings);
  const toggleNotificationSetting = useDemoStore((s) => s.toggleNotificationSetting);
  const visibilitySettings = useDemoStore((s) => s.visibilitySettings);
  const setVisibility = useDemoStore((s) => s.setVisibility);
  const demoUserName = useDemoStore((s) => s.demoUserName);
  const demoEmail = useDemoStore((s) => s.demoEmail);

  const isFr = lang === "fr";
  const isZh = lang === "zh";

  // Account info state
  const [accountName, setAccountName] = useState(demoUserName || "");
  const [accountEmail, setAccountEmail] = useState(demoEmail || "");
  const [accountPhone, setAccountPhone] = useState("");
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [tempName, setTempName] = useState(accountName);
  const [tempEmail, setTempEmail] = useState(accountEmail);
  const [tempPhone, setTempPhone] = useState(accountPhone);

  // Change password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Sign out confirmation state
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Identity verification query
  const { data: identityData } = useQuery({
    queryKey: ["identity-verify"],
    queryFn: () => api.get<{ status: string | null; isVerified: boolean }>("/api/identity-verify"),
    staleTime: 60000,
  });
  const identityStatus = identityData?.status ?? null;
  const phoneVerified = identityData?.isVerified ?? false;

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string }) =>
      api.put("/api/me", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
    },
  });

  // Text labels
  const txt = {
    settings: isFr ? "Parametres" : isZh ? "设置" : "Settings",
    language: isFr ? "Langue" : isZh ? "语言" : "Language",
    notifications: isFr ? "Notifications" : isZh ? "通知" : "Notifications",
    messages: isFr ? "Messages" : isZh ? "消息" : "Messages",
    messagesDesc: isFr ? "Nouveaux messages recus" : isZh ? "收到新消息" : "New messages received",
    jobAlerts: isFr ? "Alertes emploi" : isZh ? "职位提醒" : "Job alerts",
    jobAlertsDesc: isFr ? "Nouvelles offres correspondantes" : isZh ? "新匹配职位" : "New matching job listings",
    appUpdates: isFr ? "Mises a jour candidatures" : isZh ? "申请状态更新" : "Application updates",
    appUpdatesDesc: isFr ? "Changements de statut" : isZh ? "状态变更" : "Status changes",
    profileViews: isFr ? "Vues de profil" : isZh ? "资料浏览" : "Profile views",
    profileViewsDesc: isFr ? "Quand un recruteur consulte" : isZh ? "招聘方查看时" : "When a recruiter views",
    connectionReqs: isFr ? "Demandes de connexion" : isZh ? "连接请求" : "Connection requests",
    connectionReqsDesc: isFr ? "Nouvelles demandes recues" : isZh ? "收到新请求" : "New requests received",
    accountInfo: isFr ? "Informations du compte" : isZh ? "账号信息" : "Account Info",
    name: isFr ? "Nom" : isZh ? "姓名" : "Name",
    email: isFr ? "Email" : isZh ? "邮箱" : "Email",
    phone: isFr ? "Telephone" : isZh ? "电话" : "Phone",
    editAccount: isFr ? "Modifier" : isZh ? "编辑" : "Edit",
    saveChanges: isFr ? "Enregistrer" : isZh ? "保存更改" : "Save Changes",
    changePassword: isFr ? "Changer le mot de passe" : isZh ? "修改密码" : "Change Password",
    currentPassword: isFr ? "Mot de passe actuel" : isZh ? "当前密码" : "Current password",
    newPasswordLabel: isFr ? "Nouveau mot de passe" : isZh ? "新密码" : "New password",
    confirmPasswordLabel: isFr ? "Confirmer le mot de passe" : isZh ? "确认密码" : "Confirm password",
    changePasswordBtn: isFr ? "Changer" : isZh ? "修改" : "Change",
    otherSettings: isFr ? "Autres parametres" : isZh ? "其他设置" : "Other Settings",
    darkMode: isFr ? "Mode sombre" : isZh ? "深色模式" : "Dark Mode",
    darkModeDesc: isFr ? "Activer le theme sombre" : isZh ? "切换到深色主题" : "Switch to dark theme",
    profileVisibility: isFr ? "Visibilite du profil" : isZh ? "资料可见性" : "Profile Visibility",
    public: isFr ? "Public" : isZh ? "公开" : "Public",
    publicDesc: isFr ? "Visible par tous" : isZh ? "所有人可见" : "Visible to everyone",
    recruitersOnly: isFr ? "Recruteurs seulement" : isZh ? "仅招聘方" : "Recruiters only",
    recruitersOnlyDesc: isFr ? "Visible par les recruteurs" : isZh ? "仅招聘方可见" : "Visible to recruiters",
    private: isFr ? "Prive" : isZh ? "私密" : "Private",
    privateDesc: isFr ? "Profil masque" : isZh ? "资料已隐藏" : "Profile hidden",
    links: isFr ? "Liens" : isZh ? "链接" : "Links",
    privacyPolicy: isFr ? "Politique de confidentialite" : isZh ? "隐私政策" : "Privacy Policy",
    helpSupport: isFr ? "Aide & Support" : isZh ? "帮助与支持" : "Help & Support",
    signOut: isFr ? "Se deconnecter" : isZh ? "退出登录" : "Sign Out",
    signOutConfirm: isFr ? "Etes-vous sur de vouloir vous deconnecter ?" : isZh ? "您确定要退出登录吗？" : "Are you sure you want to sign out?",
    cancel: isFr ? "Annuler" : isZh ? "取消" : "Cancel",
    confirm: isFr ? "Confirmer" : isZh ? "确认" : "Confirm",
    passwordChanged: isFr ? "Mot de passe modifie" : isZh ? "密码已修改" : "Password changed",
    passwordChangedDesc: isFr ? "Votre mot de passe a ete modifie avec succes." : isZh ? "您的密码已成功修改。" : "Your password has been changed successfully.",
    passwordMismatch: isFr ? "Les mots de passe ne correspondent pas" : isZh ? "两次密码不一致" : "Passwords do not match",
    accountUpdated: isFr ? "Informations mises a jour" : isZh ? "账号信息已更新" : "Account updated",
    close: isFr ? "Fermer" : isZh ? "关闭" : "Close",
  };

  // Notification rows configuration — icon bg colors theme-aware
  const NOTIF_ROWS: { key: NotifKey; label: string; sublabel: string; Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>; color: string }[] = [
    {
      key: "messages",
      label: txt.messages,
      sublabel: txt.messagesDesc,
      Icon: MessageCircle,
      color: "#0D9488",
    },
    {
      key: "jobMatches",
      label: txt.jobAlerts,
      sublabel: txt.jobAlertsDesc,
      Icon: BriefcaseBusiness,
      color: "#2563EB",
    },
    {
      key: "applicationUpdates",
      label: txt.appUpdates,
      sublabel: txt.appUpdatesDesc,
      Icon: CheckCircle,
      color: ACCENT_GREEN,
    },
    {
      key: "profileViews",
      label: txt.profileViews,
      sublabel: txt.profileViewsDesc,
      Icon: Eye,
      color: "#7C3AED",
    },
    {
      key: "connections",
      label: txt.connectionReqs,
      sublabel: txt.connectionReqsDesc,
      Icon: Users,
      color: "#EA580C",
    },
  ];

  // Visibility options
  const VISIBILITY_OPTIONS: { value: VisibilityOption; label: string; desc: string; Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }> }[] = [
    {
      value: "public",
      label: txt.public,
      desc: txt.publicDesc,
      Icon: Globe,
    },
    {
      value: "recruiters",
      label: txt.recruitersOnly,
      desc: txt.recruitersOnlyDesc,
      Icon: UserCheck,
    },
    {
      value: "private",
      label: txt.private,
      desc: txt.privateDesc,
      Icon: Lock,
    },
  ];

  async function handleSaveAccount() {
    setAccountName(tempName);
    setAccountEmail(tempEmail);
    setAccountPhone(tempPhone);
    setShowAccountModal(false);
    try {
      await api.put("/api/me", { name: tempName });
    } catch (_) {
      // silently handled - local state already updated
    }
    queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
  }

  async function handleChangePassword() {
    if (!currentPassword.trim()) {
      Alert.alert(isFr ? "Mot de passe actuel requis" : isZh ? "需要当前密码" : "Current password required");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(txt.passwordMismatch);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(txt.passwordMismatch);
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post("/api/auth/change-password", { currentPassword, newPassword });
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert(txt.passwordChanged, txt.passwordChangedDesc);
    } catch (_) {
      Alert.alert(isFr ? "Erreur" : isZh ? "错误" : "Error", isFr ? "Impossible de changer le mot de passe" : isZh ? "无法修改密码" : "Could not change password");
    } finally {
      setPasswordLoading(false);
    }
  }

  function handleSignOut() {
    setShowSignOutModal(true);
  }

  async function confirmSignOut() {
    setShowSignOutModal(false);
    try {
      await authClient.signOut();
    } catch (_) {
      // ignore errors
    }
    router.replace("/welcome" as never);
  }

  return (
    <View testID="settings-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.background }}>
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(255,255,255,0.1)" : colors.border,
        }}>
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
          <Text style={{
            flex: 1,
            textAlign: "center",
            fontSize: 17,
            fontWeight: "700",
            color: colors.textOnBg,
          }}>
            {txt.settings}
          </Text>
          <View style={{ width: 36, height: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{ backgroundColor: colors.background }}
      >
        {/* ===== DARK MODE TOGGLE — prominent at the top ===== */}
        <View style={{
          marginHorizontal: 16,
          marginTop: 20,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
              backgroundColor: isDark ? colors.toggleBg : "#FEF3C7",
            }}>
              {isDark
                ? <Moon size={22} color="#818CF8" strokeWidth={2} />
                : <Sun size={22} color="#F59E0B" strokeWidth={2} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.text,
              }}>
                {txt.darkMode}
              </Text>
              <Text style={{
                fontSize: 13,
                marginTop: 2,
                color: colors.textMuted,
              }}>
                {txt.darkModeDesc}
              </Text>
            </View>
            <Switch
              testID="toggle-dark-mode"
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? "#FFFFFF" : "#FFFFFF"}
              ios_backgroundColor={colors.toggleBg}
            />
          </View>
        </View>

        {/* ===== LANGUAGE SECTION ===== */}
        <SectionHeader title={txt.language} colors={colors} />
        <CardContainer colors={colors}>
          <View style={{ padding: 12 }}>
            {(["fr", "en", "zh"] as const).map((l, idx) => {
              const isActive = lang === l;
              return (
                <Pressable
                  key={l}
                  testID={`lang-${l}`}
                  onPress={() => setLang(l)}
                  style={[
                    {
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 8,
                      backgroundColor: isActive ? "#3BAD4E" : colors.toggleBg,
                    },
                    idx < 2 && { marginBottom: 8 },
                  ]}
                >
                  <Globe size={16} color={isActive ? "#FFFFFF" : colors.textMuted} strokeWidth={2} />
                  <Text style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: isActive ? "#FFFFFF" : colors.textSecondary,
                  }}>
                    {l === "fr" ? "FR — Français" : l === "en" ? "EN — English" : "中文 — 简体"}
                  </Text>
                  {isActive ? (
                    <View style={{
                      marginLeft: "auto",
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <CheckCircle size={12} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </CardContainer>

        {/* ===== NOTIFICATIONS SECTION ===== */}
        <SectionHeader title={txt.notifications} colors={colors} />
        <CardContainer colors={colors}>
          {NOTIF_ROWS.map((row, idx) => {
            const isEnabled = notificationSettings[row.key];
            return (
              <View key={row.key}>
                <SettingRow
                  colors={colors}
                  icon={<row.Icon size={18} color={row.color} strokeWidth={2} />}
                  iconBg={colors.toggleBg}
                  label={row.label}
                  sublabel={row.sublabel}
                  right={
                    <Switch
                      testID={`toggle-${row.key}`}
                      value={isEnabled}
                      onValueChange={() => toggleNotificationSetting(row.key)}
                      trackColor={{ false: colors.border, true: ACCENT_GREEN }}
                      thumbColor="#FFFFFF"
                      ios_backgroundColor={colors.toggleBg}
                    />
                  }
                />
                {idx < NOTIF_ROWS.length - 1 ? <Divider colors={colors} /> : null}
              </View>
            );
          })}
        </CardContainer>

        {/* ===== ACCOUNT INFO SECTION ===== */}
        <SectionHeader title={txt.accountInfo} colors={colors} />
        <CardContainer colors={colors}>
          <SettingRow
            colors={colors}
            icon={<User size={18} color={colors.primary} strokeWidth={2} />}
            iconBg={isDark ? colors.toggleBg : "#EFF6FF"}
            label={txt.name}
            sublabel={accountName}
            right={null}
          />
          <Divider colors={colors} />
          <SettingRow
            colors={colors}
            icon={<Mail size={18} color="#7C3AED" strokeWidth={2} />}
            iconBg={isDark ? colors.toggleBg : "#F5F3FF"}
            label={txt.email}
            sublabel={accountEmail}
            right={null}
          />
          <Divider colors={colors} />
          <SettingRow
            colors={colors}
            icon={<Phone size={18} color={ACCENT_GREEN} strokeWidth={2} />}
            iconBg={isDark ? colors.toggleBg : "#F0FDF4"}
            label={txt.phone}
            sublabel={accountPhone}
            right={null}
          />
          <Divider colors={colors} />
          <Pressable
            testID="edit-account-btn"
            onPress={() => {
              setTempName(accountName);
              setTempEmail(accountEmail);
              setTempPhone(accountPhone);
              setShowAccountModal(true);
            }}
            style={({ pressed }) => ({
              paddingVertical: 16,
              paddingHorizontal: 16,
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{
              fontSize: 15,
              fontWeight: "700",
              color: colors.accent,
            }}>
              {txt.editAccount}
            </Text>
          </Pressable>
        </CardContainer>

        {/* ===== CHANGE PASSWORD SECTION ===== */}
        <SectionHeader title={txt.changePassword} colors={colors} />
        <CardContainer colors={colors}>
          <Pressable
            testID="change-password-btn"
            onPress={() => setShowPasswordModal(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <SettingRow
              colors={colors}
              icon={<Key size={18} color="#DC2626" strokeWidth={2} />}
              iconBg={isDark ? colors.toggleBg : "#FEF2F2"}
              label={txt.changePassword}
              right={<ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />}
            />
          </Pressable>
        </CardContainer>

        {/* ===== IDENTITY VERIFICATION ===== */}
        <SectionHeader title={t("settings_verify_identity")} colors={colors} />
        <CardContainer colors={colors}>
          <Pressable
            onPress={() => { if (identityStatus !== "verified") router.push("/verify-identity" as never); }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <SettingRow
              colors={colors}
              icon={<Shield size={18} color={colors.accent} strokeWidth={2} />}
              iconBg={colors.toggleBg}
              label={t("settings_verify_identity")}
              right={
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ fontSize: 13, color: identityStatus === "pending" ? "#F59E0B" : identityStatus === "verified" ? ACCENT_GREEN : colors.textMuted }}>
                    {identityStatus === "pending" ? t("settings_verify_pending") : identityStatus === "verified" ? t("settings_verified") : t("settings_verify_now")}
                  </Text>
                  {identityStatus !== "verified" ? <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} /> : null}
                </View>
              }
            />
          </Pressable>
          <Divider colors={colors} />
          <Pressable
            onPress={() => { if (!phoneVerified) router.push("/verify-phone" as never); }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <SettingRow
              colors={colors}
              icon={<Phone size={18} color={colors.accent} strokeWidth={2} />}
              iconBg={colors.toggleBg}
              label={t("settings_verify_phone")}
              right={
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ fontSize: 13, color: phoneVerified ? ACCENT_GREEN : colors.textMuted }}>
                    {phoneVerified ? t("settings_verified") : t("settings_verify_now")}
                  </Text>
                  {!phoneVerified ? <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} /> : null}
                </View>
              }
            />
          </Pressable>
        </CardContainer>

        {/* ===== PROFILE VISIBILITY ===== */}
        <SectionHeader title={txt.profileVisibility} colors={colors} />
        <CardContainer colors={colors}>
          <View style={{ paddingVertical: 8 }}>
            {VISIBILITY_OPTIONS.map((opt, idx) => {
              const isSelected = visibilitySettings === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  testID={`visibility-${opt.value}`}
                  onPress={() => setVisibility(opt.value)}
                  style={({ pressed }) => ([
                    {
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      opacity: pressed ? 0.7 : 1,
                    },
                    isSelected && { backgroundColor: isDark ? "rgba(59,173,78,0.08)" : "#F0FDF4" },
                  ])}
                >
                  {/* Row 1: icon + label + radio */}
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                      backgroundColor: isSelected ? colors.accent : colors.toggleBg,
                    }}>
                      <opt.Icon size={16} color={isSelected ? "#FFFFFF" : colors.textMuted} strokeWidth={2} />
                    </View>
                    <Text style={{
                      flex: 1,
                      fontSize: 15,
                      fontWeight: "600",
                      color: isSelected ? colors.accent : colors.text,
                    }}>
                      {opt.label}
                    </Text>
                    <View style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      alignItems: "center",
                      justifyContent: "center",
                      borderColor: isSelected ? colors.accent : colors.border,
                    }}>
                      {isSelected ? (
                        <View style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: colors.accent,
                        }} />
                      ) : null}
                    </View>
                  </View>
                  {/* Row 2: description indented under label */}
                  <Text style={{
                    fontSize: 12,
                    color: colors.textMuted,
                    marginTop: 5,
                    marginLeft: 50,
                    lineHeight: 17,
                  }}>
                    {opt.desc}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </CardContainer>

        {/* ===== LINKS SECTION ===== */}
        <SectionHeader title={txt.links} colors={colors} />
        <CardContainer colors={colors}>
          <Pressable
            testID="privacy-policy-btn"
            onPress={() => router.push("/privacy-policy" as never)}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <SettingRow
              colors={colors}
              icon={<FileText size={18} color="#0D9488" strokeWidth={2} />}
              iconBg={isDark ? colors.toggleBg : "#F0FDFA"}
              label={txt.privacyPolicy}
              right={<ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />}
            />
          </Pressable>
          <Divider colors={colors} />
          <Pressable
            testID="help-support-btn"
            onPress={() => router.push("/settings-help" as never)}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <SettingRow
              colors={colors}
              icon={<HelpCircle size={18} color={colors.primary} strokeWidth={2} />}
              iconBg={isDark ? colors.toggleBg : "#EFF6FF"}
              label={txt.helpSupport}
              right={<ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />}
            />
          </Pressable>
        </CardContainer>

        {/* ===== SIGN OUT — standalone danger button ===== */}
        <View style={{ marginHorizontal: 16, marginTop: 28 }}>
          <Pressable
            testID="sign-out-btn"
            onPress={handleSignOut}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              backgroundColor: isDark ? "rgba(220,38,38,0.15)" : "#FEF2F2",
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: isDark ? "rgba(220,38,38,0.4)" : "#FCA5A5",
              paddingVertical: 16,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <LogOut size={20} color="#DC2626" strokeWidth={2.5} />
            <Text style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#DC2626",
              letterSpacing: -0.2,
              lineHeight: 20,
            }}>
              {txt.signOut}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Account Edit Modal */}
      <Modal
        visible={showAccountModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}>
          <View style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 40,
            backgroundColor: colors.card,
          }}>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.text,
              }}>
                {txt.accountInfo}
              </Text>
              <Pressable
                onPress={() => setShowAccountModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.toggleBg,
                }}
              >
                <X size={20} color={colors.text} strokeWidth={2} />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
              {[
                { label: txt.name, value: tempName, setter: setTempName, testID: "account-name-input", keyboardType: "default" as const, autoCapitalize: "words" as const },
                { label: txt.email, value: tempEmail, setter: setTempEmail, testID: "account-email-input", keyboardType: "email-address" as const, autoCapitalize: "none" as const },
                { label: txt.phone, value: tempPhone, setter: setTempPhone, testID: "account-phone-input", keyboardType: "phone-pad" as const, autoCapitalize: "none" as const },
              ].map((field, idx) => (
                <View key={field.testID}>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: "600",
                    marginBottom: 6,
                    marginTop: idx === 0 ? 8 : 14,
                    color: colors.textSecondary,
                  }}>
                    {field.label}
                  </Text>
                  <TextInput
                    testID={field.testID}
                    style={{
                      height: 48,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      fontSize: 15,
                      borderWidth: 1,
                      backgroundColor: colors.toggleBg,
                      color: colors.text,
                      borderColor: colors.border,
                    }}
                    value={field.value}
                    onChangeText={field.setter}
                    keyboardType={field.keyboardType}
                    autoCapitalize={field.autoCapitalize}
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.accent}
                    cursorColor={colors.accent}
                  />
                </View>
              ))}
            </View>

            <Pressable
              testID="save-account-btn"
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginHorizontal: 20,
                marginTop: 24,
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: colors.primary,
                gap: 8,
                opacity: pressed || updateProfileMutation.isPending ? 0.7 : 1,
              })}
              onPress={() => { void handleSaveAccount(); }}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Save size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>
                    {txt.saveChanges}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}>
          <View style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 40,
            backgroundColor: colors.card,
          }}>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.text,
              }}>
                {txt.changePassword}
              </Text>
              <Pressable
                onPress={() => setShowPasswordModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.toggleBg,
                }}
              >
                <X size={20} color={colors.text} strokeWidth={2} />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
              {[
                { label: txt.currentPassword, value: currentPassword, setter: setCurrentPassword, testID: "current-password-input" },
                { label: txt.newPasswordLabel, value: newPassword, setter: setNewPassword, testID: "new-password-input" },
                { label: txt.confirmPasswordLabel, value: confirmPassword, setter: setConfirmPassword, testID: "confirm-password-input" },
              ].map((field, idx) => (
                <View key={field.testID}>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: "600",
                    marginBottom: 6,
                    marginTop: idx === 0 ? 8 : 14,
                    color: colors.textSecondary,
                  }}>
                    {field.label}
                  </Text>
                  <TextInput
                    testID={field.testID}
                    style={{
                      height: 48,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      fontSize: 15,
                      borderWidth: 1,
                      backgroundColor: colors.toggleBg,
                      color: colors.text,
                      borderColor: colors.border,
                    }}
                    value={field.value}
                    onChangeText={field.setter}
                    secureTextEntry
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.accent}
                    cursorColor={colors.accent}
                  />
                </View>
              ))}
            </View>

            <Pressable
              testID="submit-password-btn"
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginHorizontal: 20,
                marginTop: 24,
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: colors.primary,
                gap: 8,
                opacity: pressed || passwordLoading ? 0.7 : 1,
              })}
              onPress={() => { void handleChangePassword(); }}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Key size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>
                    {txt.changePasswordBtn}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={showSignOutModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}>
          <View style={{
            width: "100%",
            borderRadius: 24,
            padding: 28,
            alignItems: "center",
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: isDark ? "rgba(220,38,38,0.2)" : "#FEF2F2",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              borderWidth: 1,
              borderColor: isDark ? "rgba(220,38,38,0.4)" : "#FECACA",
            }}>
              <LogOut size={30} color="#DC2626" strokeWidth={2} />
            </View>
            <Text style={{
              fontSize: 19,
              fontWeight: "800",
              marginBottom: 8,
              textAlign: "center",
              color: colors.text,
            }}>
              {t("sign_out_confirm_title")}
            </Text>
            <Text style={{
              fontSize: 14,
              textAlign: "center",
              marginBottom: 28,
              lineHeight: 20,
              color: colors.textMuted,
            }}>
              {t("sign_out_confirm_message")}
            </Text>
            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <Pressable
                testID="sign-out-cancel-btn"
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 15,
                  borderRadius: 14,
                  alignItems: "center",
                  backgroundColor: colors.toggleBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                })}
                onPress={() => setShowSignOutModal(false)}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  {t("sign_out_cancel")}
                </Text>
              </Pressable>
              <Pressable
                testID="sign-out-confirm-btn"
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 15,
                  borderRadius: 14,
                  alignItems: "center",
                  backgroundColor: "#DC2626",
                  opacity: pressed ? 0.8 : 1,
                })}
                onPress={() => { void confirmSignOut(); }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>
                  {t("sign_out_confirm")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
