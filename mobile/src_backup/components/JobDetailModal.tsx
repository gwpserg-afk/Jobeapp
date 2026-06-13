import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  MapPin,
  CheckCircle2,
  Briefcase,
  Clock,
  Users,
  Eye,
  Zap,
  ChevronRight,
  Building2,
} from "lucide-react-native";
import type { TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import type { DemoJob } from "@/lib/demoData";
import { JOB_DESC_KEYS } from "@/lib/demoData";
import { useRouter } from "expo-router";

const GREEN = "#3BAD4E";

const CONTRACT_COLORS: Record<string, string> = {
  CDI: "#27AE60",
  CDD: "#3498DB",
  Stage: "#F39C12",
  Freelance: "#9B59B6",
};

const WORK_MODE_LABELS: Record<string, TranslationKey> = {
  onsite: "search_workmode_onsite",
  hybrid: "search_workmode_hybrid",
  remote: "search_workmode_remote",
};

interface JobDetailModalProps {
  visible: boolean;
  job: DemoJob | null;
  onClose: () => void;
  onApply: (job: DemoJob) => void;
  onSave: (job: DemoJob) => void;
  isSaved?: boolean;
  userCredits?: number;
}

function formatSalary(
  min?: number | null,
  max?: number | null,
  negotiable?: boolean,
  t?: (key: TranslationKey) => string
) {
  const negotiableText = t ? t("search_negotiable") : "Negotiable";
  if (negotiable || (!min && !max)) return negotiableText;
  const fmt = (n: number) => (n / 1000).toFixed(0) + "k FCFA";
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return fmt(min);
  if (max) return fmt(max);
  return negotiableText;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  visible,
  job,
  onClose,
  onApply,
  onSave,
  isSaved = false,
  userCredits,
}) => {
  const t = useLang((s) => s.t);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (!job) return null;

  const contractColor = CONTRACT_COLORS[job.contractType] ?? "#6B7280";
  const descKey = JOB_DESC_KEYS[job.id];
  const jobDescription = descKey ? t(descKey) : job.description;
  const workModeLabel = t(WORK_MODE_LABELS[job.workMode] ?? "search_work_mode_onsite");

  const handleCompanyPress = () => {
    onClose();
    setTimeout(() => {
      router.push({ pathname: "/company-profile", params: { companyId: job.company.id } } as never);
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="job-detail-modal"
    >
      {/* Full screen backdrop + content */}
      <View style={styles.fullScreen}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
          testID="modal-backdrop"
        />

        {/* Content container */}
        <View
          style={[
            styles.contentContainer,
            { backgroundColor: colors.background, paddingTop: insets.top },
          ]}
        >
          {/* Header with close button */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("home_job_details")}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="close-modal-button"
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Scrollable content */}
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            testID="job-detail-scroll"
          >
            {/* Company and basic info section */}
            <View style={[styles.section, { borderBottomColor: colors.border }]}>
              {/* Tappable company row → goes to company profile */}
              <TouchableOpacity
                style={[styles.companyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleCompanyPress}
                activeOpacity={0.75}
                testID="company-profile-link"
              >
                <View style={[styles.companyLogo, { backgroundColor: job.company.logoColor + "20" }]}>
                  <Text style={[styles.companyLogoText, { color: job.company.logoColor }]}>
                    {job.company.logoInitials}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.companyNameRow}>
                    <Text style={[styles.companyName, { color: colors.text }]}>
                      {job.company.companyName}
                    </Text>
                    {job.company.isVerified ? (
                      <CheckCircle2 size={14} color={GREEN} />
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600", marginTop: 2 }}>
                    {t("job_view_company")} →
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Contract badge */}
              <View style={[styles.contractBadge, { backgroundColor: contractColor + "20", marginBottom: 10 }]}>
                <Text style={[styles.contractBadgeText, { color: contractColor }]}>
                  {job.contractType}
                </Text>
              </View>

              {/* Job title */}
              <Text style={[styles.jobTitle, { color: colors.text }]}>
                {job.title}
              </Text>

              {/* Work mode and location */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <MapPin size={14} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {job.locationCity}
                    {job.locationNeighborhood ? `, ${job.locationNeighborhood}` : ""}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Briefcase size={14} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {workModeLabel}
                  </Text>
                </View>
              </View>

              {/* Salary */}
              <Text style={[styles.salary, { color: GREEN }]}>
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryNegotiable, t)}
              </Text>

              {/* Urgent badge if needed */}
              {job.isUrgent ? (
                <View
                  style={[
                    styles.urgentBadge,
                    { backgroundColor: colors.urgentBg },
                  ]}
                >
                  <Zap size={14} color={colors.urgentText} />
                  <Text style={[styles.urgentText, { color: colors.urgentText }]}>
                    URGENT
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Description section */}
            <View style={[styles.section, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("home_about_job")}
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {jobDescription}
              </Text>
            </View>

            {/* Required skills section */}
            {job.requiredSkills && job.requiredSkills.length > 0 ? (
              <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("home_required_skills")}
                </Text>
                <View style={styles.skillsContainer}>
                  {job.requiredSkills.map((skill, index) => (
                    <View
                      key={index}
                      style={[
                        styles.skillTag,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.skillText, { color: colors.text }]}>
                        {skill}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Stats section */}
            <View style={[styles.section, { borderBottomColor: colors.border }]}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Users size={16} color={colors.primary} />
                  <Text style={[styles.statCount, { color: colors.text }]}>
                    {job._count.applications}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                    {t("home_applicants")}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Eye size={16} color={colors.primary} />
                  <Text style={[styles.statCount, { color: colors.text }]}>
                    {job.viewCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                    {t("home_views")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Spacing for bottom buttons */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Action buttons - fixed at bottom */}
          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border, paddingBottom: insets.bottom || 12 },
            ]}
          >
            <View style={{ flex: 1, gap: 8 }}>
              {/* Credit cost note */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Zap size={12} color={colors.textMuted} />
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>1 credit per application</Text>
                </View>
                {userCredits !== undefined ? (
                  <Text style={{ fontSize: 11, color: userCredits <= 2 ? "#DC2626" : colors.textMuted, fontWeight: userCredits <= 2 ? "600" : "400" }}>
                    {userCredits} remaining
                  </Text>
                ) : null}
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: GREEN }]}
                  onPress={() => onApply(job)}
                  activeOpacity={0.8}
                  testID="apply-button"
                >
                  <Text style={styles.applyButtonText}>{t("home_apply_now")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor: isSaved ? GREEN + "20" : colors.card,
                      borderColor: isSaved ? GREEN : colors.border,
                    },
                  ]}
                  onPress={() => onSave(job)}
                  activeOpacity={0.8}
                  testID="save-button"
                >
                  <Text
                    style={[
                      styles.saveButtonText,
                      { color: isSaved ? GREEN : colors.text },
                    ]}
                  >
                    {isSaved ? t("home_saved") : t("home_save_job")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  contentContainer: {
    flex: 1,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  companyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  companyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  companyLogoText: {
    fontSize: 16,
    fontWeight: "800",
  },
  companyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  companyName: {
    fontSize: 14,
    fontWeight: "700",
  },
  contractBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  contractBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },
  metaRow: {
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  salary: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  urgentText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  statCount: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
