import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Switch, ScrollView, Linking, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft, Moon, Globe, Shield, FileText, LogOut, ChevronRight,
  Bell, Heart, MessageCircle, UserPlus, Lock, Eye, UserX, User as UserIcon,
  BadgeCheck, HelpCircle, Mail, Star, Info, Trash2, ScrollText,
} from "lucide-react-native";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const APP_VERSION = "1.0.0 (pré-lancement)";
const CONTACT_EMAIL = "hello@jobeapp.com";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useTheme((s) => s.colors);
  const isDark = useTheme((s) => s.isDark);
  const toggleTheme = useTheme((s) => s.toggle);
  const { t, lang, setLang } = useI18n();

  // Local preference toggles (UI-ready; wire to backend prefs later)
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushFollowers, setPushFollowers] = useState(true);
  const [pushMessages, setPushMessages] = useState(true);
  const [pushActivity, setPushActivity] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [activityStatus, setActivityStatus] = useState(true);

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function logout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await authClient.signOut();
    router.replace("/(auth)/welcome");
  }

  async function deleteAccount() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setDeleting(true);
    try {
      await api.delete("/api/me");
      await authClient.signOut();
      router.replace("/(auth)/welcome");
    } catch {
      setDeleting(false);
      setShowDelete(false);
    }
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>{children}</View>
    </View>
  );

  const Row = ({
    icon, label, onPress, right, last, danger, testID,
  }: {
    icon: React.ReactNode; label: string; onPress?: () => void; right?: React.ReactNode; last?: boolean; danger?: boolean; testID?: string;
  }) => (
    <Pressable
      onPress={onPress ? () => { Haptics.selectionAsync(); onPress(); } : undefined}
      style={[styles.row, !last && styles.rowBorder, !last && { borderBottomColor: colors.border }]}
      testID={testID}
    >
      {icon}
      <Text style={[styles.rowLabel, { color: danger ? colors.error : colors.textPrimary }, danger && { fontWeight: fonts.weights.bold }]}>{label}</Text>
      {right ?? (onPress ? <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} /> : null)}
    </Pressable>
  );

  const toggle = (v: boolean, set: (b: boolean) => void, disabled?: boolean) => (
    <Switch
      value={v}
      disabled={disabled}
      onValueChange={() => { Haptics.selectionAsync(); set(!v); }}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor="#fff"
      style={disabled ? { opacity: 0.4 } : undefined}
    />
  );

  const soonBadge = (
    <View style={[styles.badge, { backgroundColor: colors.bgElevated }]}>
      <Text style={[styles.badgeText, { color: colors.textMuted }]}>{t.set_soon}</Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10} testID="settings-back">
            <ArrowLeft size={24} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t.set_title}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          {/* Account */}
          <Section title={t.set_account}>
            <Row icon={<UserIcon size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_edit_profile} onPress={() => router.push("/(app)/edit-profile")} testID="set-edit-profile" />
            <Row icon={<UserX size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_blocked} onPress={() => router.push("/(app)/blocked")} testID="set-blocked" />
            <Row icon={<BadgeCheck size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_verify} right={soonBadge} last />
          </Section>

          {/* Notifications */}
          <Section title={t.set_notifications}>
            <Row icon={<Bell size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_push} right={toggle(pushEnabled, setPushEnabled)} />
            <Row icon={<UserPlus size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_push_followers} right={toggle(pushFollowers, setPushFollowers, !pushEnabled)} />
            <Row icon={<MessageCircle size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_push_messages} right={toggle(pushMessages, setPushMessages, !pushEnabled)} />
            <Row icon={<Heart size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_push_activity} right={toggle(pushActivity, setPushActivity, !pushEnabled)} last />
          </Section>

          {/* Privacy */}
          <Section title={t.set_privacy_section}>
            <Row icon={<Lock size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_private_account} right={toggle(privateAccount, setPrivateAccount)} />
            <Row icon={<Eye size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_activity_status} right={toggle(activityStatus, setActivityStatus)} last />
          </Section>

          {/* Appearance */}
          <Section title={t.set_appearance}>
            <Row icon={<Moon size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_theme} right={toggle(isDark, () => toggleTheme())} last />
          </Section>

          {/* Language */}
          <Section title={t.set_language}>
            <View style={[styles.row, { paddingVertical: 15 }]}>
              <Globe size={19} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t.set_language}</Text>
              <View style={[styles.langBox, { backgroundColor: colors.bgElevated }]}>
                {(["fr", "en", "zh"] as const).map((l) => (
                  <Pressable key={l} onPress={() => { Haptics.selectionAsync(); setLang(l); }} style={[styles.langChip, lang === l && { backgroundColor: colors.primary }]}>
                    <Text style={[styles.langChipText, { color: lang === l ? "#fff" : colors.textMuted }]}>{l === "fr" ? "FR" : l === "en" ? "EN" : "中"}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Section>

          {/* Support */}
          <Section title={t.set_support}>
            <Row icon={<HelpCircle size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_help} onPress={() => Linking.openURL("https://jobeapp.com")} />
            <Row icon={<Mail size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_contact} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} />
            <Row icon={<Shield size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_safety} onPress={() => Linking.openURL("https://jobeapp.com")} />
            <Row icon={<FileText size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_privacy} onPress={() => Linking.openURL("https://jobeapp.com")} />
            <Row icon={<ScrollText size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_terms} onPress={() => Linking.openURL("https://jobeapp.com")} last />
          </Section>

          {/* About */}
          <Section title={t.set_about}>
            <Row icon={<Star size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_rate} onPress={() => Linking.openURL("https://jobeapp.com")} />
            <Row icon={<Info size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.set_version} right={<Text style={[styles.versionText, { color: colors.textMuted }]}>{APP_VERSION}</Text>} last />
          </Section>

          {/* Danger */}
          <Section title="">
            <Row icon={<LogOut size={19} color={colors.textSecondary} strokeWidth={2} />} label={t.logout} onPress={logout} right={<View />} testID="settings-logout" />
            <Row icon={<Trash2 size={19} color={colors.error} strokeWidth={2} />} label={t.set_delete} danger onPress={() => setShowDelete(true)} right={<View />} last testID="settings-delete" />
          </Section>
        </ScrollView>
      </SafeAreaView>

      {/* Delete confirmation modal */}
      <Modal visible={showDelete} transparent animationType="fade" onRequestClose={() => setShowDelete(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !deleting && setShowDelete(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.bgCard }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalIcon, { backgroundColor: colors.error + "22" }]}>
              <Trash2 size={26} color={colors.error} strokeWidth={2} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t.set_delete_title}</Text>
            <Text style={[styles.modalMsg, { color: colors.textSecondary }]}>{t.set_delete_msg}</Text>
            <Pressable onPress={deleteAccount} disabled={deleting} style={[styles.modalBtn, { backgroundColor: colors.error }, deleting && { opacity: 0.6 }]} testID="confirm-delete">
              {deleting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalBtnText}>{t.set_delete_confirm}</Text>}
            </Pressable>
            <Pressable onPress={() => setShowDelete(false)} disabled={deleting} style={styles.modalCancel}>
              <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>{t.mod_cancel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1 },
  title: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  sectionTitle: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold, letterSpacing: 1, textTransform: "uppercase", marginBottom: spacing.sm, marginLeft: 4 },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 13, minHeight: 52 },
  rowBorder: { borderBottomWidth: 1 },
  rowLabel: { flex: 1, fontSize: fonts.sizes.base, fontWeight: fonts.weights.medium },
  langBox: { flexDirection: "row", borderRadius: radius.full, padding: 3, gap: 2 },
  langChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full },
  langChipText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold },
  versionText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modalCard: { width: "100%", maxWidth: 340, borderRadius: radius.xl, padding: spacing.xl, alignItems: "center" },
  modalIcon: { width: 56, height: 56, borderRadius: radius.full, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  modalTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, marginBottom: spacing.sm, textAlign: "center" },
  modalMsg: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.regular, textAlign: "center", lineHeight: 21, marginBottom: spacing.xl },
  modalBtn: { width: "100%", height: 52, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  modalBtnText: { color: "#fff", fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  modalCancel: { marginTop: spacing.md, paddingVertical: spacing.sm },
  modalCancelText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
});
