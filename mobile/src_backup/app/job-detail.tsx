import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  Platform,
  Linking,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Briefcase,
  Bookmark,
  BookmarkCheck,
  Building2,
  Users,
  Eye,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Play,
  X,
  Video,
} from "lucide-react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Video as ExpoVideo, ResizeMode } from "expo-av";
import { DEMO_JOBS, DEMO_CANDIDATES } from "../lib/demoData";
import { useDemoStore } from "../lib/demoStore";
import { showToast } from "../lib/toast";
import { useLang } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import {
  getFormattedDistanceFromUser,
  buildAppleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrl,
  getCityCoordinates,
} from "../lib/distance";

const GREEN = "#3BAD4E";

function formatSalary(min?: number | null, max?: number | null, negotiable?: boolean, negotiableLabel = "À négocier") {
  if (negotiable) return negotiableLabel;
  if (!min && !max) return negotiableLabel;
  const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA";
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `${fmt(min)}`;
  if (max) return `${fmt(max)}`;
  return negotiableLabel;
}

const CONTRACT_COLORS: Record<string, string> = {
  CDI: "#27AE60",
  CDD: "#3498DB",
  Stage: "#F39C12",
  Freelance: "#9B59B6",
};

function calculateSkillMatch(requiredSkills: string[], candidateSkills: { skillName: string }[]) {
  if (!requiredSkills.length) return 100;
  const candidateSkillNames = candidateSkills.map((s) => s.skillName.toLowerCase());
  const matched = requiredSkills.filter((s) => candidateSkillNames.includes(s.toLowerCase()));
  return Math.round((matched.length / requiredSkills.length) * 100);
}

// --- 4-step Application Wizard ---
function ApplicationWizard({
  job,
  onClose,
  onSuccess,
}: {
  job: (typeof DEMO_JOBS)[0];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [coverMessage, setCoverMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const addApplication = useDemoStore((s) => s.addApplication);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useLang();
  const maxChars = 280;

  const candidate = DEMO_CANDIDATES[0];

  const handleSubmit = () => {
    addApplication(job.id, coverMessage);
    setSubmitted(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 6,
    }).start();
    setTimeout(() => {
      onSuccess();
    }, 2000);
  };

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <CheckCircle2 size={64} color={GREEN} />
        </Animated.View>
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text, textAlign: "center" }}>
          {t("job_apply_success")}
        </Text>
        <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: "center", lineHeight: 22 }}>
          {t("job_apply_notif_desc").replace("{company}", job.company.companyName)}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: insets.top + 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>{t("job_apply_wizard_title")}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600" }}>{step}/4</Text>
      </View>

      {/* Step dots */}
      <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 20, paddingVertical: 12 }}>
        {[1, 2, 3, 4].map((s) => (
          <View
            key={s}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: s <= step ? GREEN : colors.border,
            }}
          />
        ))}
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={{ paddingVertical: 20, gap: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>{t("job_apply_your_profile")}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: -8 }}>
              {t("job_apply_confirm_info")}
            </Text>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              backgroundColor: colors.card,
              borderRadius: 14,
              padding: 16,
            }}>
              <View style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: candidate.avatarColor,
              }}>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>{candidate.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{candidate.fullName}</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{candidate.headline}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {candidate.city}, {candidate.neighborhood}
                </Text>
              </View>
            </View>
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{t("job_apply_matching_skills")}</Text>
              {job.requiredSkills.map((skill) => {
                const match = candidate.skills.some(
                  (s) => s.skillName.toLowerCase() === skill.toLowerCase()
                );
                return (
                  <View key={skill} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 size={16} color={match ? GREEN : colors.textMuted} />
                    <Text style={{ fontSize: 14, flex: 1, color: match ? colors.text : colors.textSecondary }}>
                      {skill}
                    </Text>
                    {match ? (
                      <Text style={{
                        fontSize: 11,
                        color: GREEN,
                        fontWeight: "600",
                        backgroundColor: isDark ? "rgba(59, 173, 78, 0.15)" : "#E8F8ED",
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}>
                        {t("job_apply_match_label")}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={{ paddingVertical: 20, gap: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>{t("job_apply_motivation")}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: -8 }}>
              {t("job_apply_motivation_desc")}
            </Text>
            <TextInput
              style={{
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: colors.text,
                minHeight: 140,
                backgroundColor: colors.card,
              }}
              multiline
              numberOfLines={6}
              placeholder={t("job_apply_motivation_placeholder")}
              placeholderTextColor={colors.textMuted}
              value={coverMessage}
              onChangeText={(t) => setCoverMessage(t.slice(0, maxChars))}
              textAlignVertical="top"
            />
            <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "right", marginTop: -8 }}>
              {coverMessage.length}/{maxChars}
            </Text>
          </View>
        )}

        {step === 3 && (
          <View style={{ paddingVertical: 20, gap: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>{t("job_apply_cv_title")}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: -8 }}>
              {t("job_apply_cv_desc")}
            </Text>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              backgroundColor: colors.card,
              borderRadius: 14,
              padding: 16,
            }}>
              <Briefcase size={32} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>CV_Moussa_Diallo.pdf</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  Mis a jour il y a 2 jours - 245 Ko
                </Text>
              </View>
              <CheckCircle2 size={20} color={GREEN} />
            </View>
            <TouchableOpacity style={{
              borderWidth: 1.5,
              borderColor: colors.border,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
            }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: "600" }}>{t("job_apply_change_cv")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={{ paddingVertical: 20, gap: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>{t("job_apply_confirm_title")}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: -8 }}>
              {t("job_apply_confirm_desc")}
            </Text>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              backgroundColor: colors.card,
              borderRadius: 14,
              padding: 16,
            }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: job.company.logoColor + "20",
              }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: job.company.logoColor }}>
                  {job.company.logoInitials}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{job.title}</Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>{job.company.companyName}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {job.locationCity}{job.locationNeighborhood ? `, ${job.locationNeighborhood}` : ""}
                </Text>
              </View>
            </View>
            {coverMessage.length > 0 ? (
              <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>{t("job_apply_your_message")}</Text>
                <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }} numberOfLines={3}>
                  {coverMessage}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 12,
      }}>
        {step > 1 ? (
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 14,
              justifyContent: "center",
              borderWidth: 1.5,
              borderColor: colors.border,
              borderRadius: 12,
            }}
            onPress={() => setStep((s) => s - 1)}
          >
            <ArrowLeft size={18} color={colors.text} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{t("job_apply_back")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {step < 4 ? (
          <TouchableOpacity
            style={{
              flex: 2,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: colors.primary,
              paddingVertical: 14,
              borderRadius: 12,
              justifyContent: "center",
            }}
            onPress={() => setStep((s) => s + 1)}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{t("job_apply_next")}</Text>
            <ChevronRight size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={{
              flex: 2,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: GREEN,
              paddingVertical: 14,
              borderRadius: 12,
              justifyContent: "center",
            }}
            onPress={handleSubmit}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{t("job_apply_send")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// --- Main Job Detail Screen ---
export default function JobDetailScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const savedJobIds = useDemoStore((s) => s.savedJobIds);
  const toggleSaveJob = useDemoStore((s) => s.toggleSaveJob);
  const applications = useDemoStore((s) => s.applications);
  const getJobVideoUri = useDemoStore((s) => s.getJobVideoUri);
  const { t } = useLang();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const job = DEMO_JOBS.find((j) => j.id === jobId) ?? DEMO_JOBS[0];
  const jobVideoUri = getJobVideoUri(job.id);
  const isSaved = savedJobIds.has(job.id);
  const alreadyApplied = applications.some((a) => a.jobId === job.id);
  const matchPct = calculateSkillMatch(job.requiredSkills, DEMO_CANDIDATES[0].skills);
  const contractColor = CONTRACT_COLORS[job.contractType] ?? "#6B7280";

  const handleSave = () => {
    toggleSaveJob(job.id);
    showToast(isSaved ? t("job_save_removed") : t("job_save_added"), isSaved ? "info" : "success");
  };

  const handleApplySuccess = () => {
    setShowWizard(false);
    showToast(t("job_apply_sent_success"), "success");
    router.replace("/(app)/(candidate)/applications" as never);
  };

  // Get coordinates for the job location
  const jobCoordinates = getCityCoordinates(job.locationCity);

  const handleGetDirections = () => {
    if (!jobCoordinates) return;
    const url = Platform.select({
      ios: buildAppleMapsDirectionsUrl(
        jobCoordinates.latitude,
        jobCoordinates.longitude,
        job.company.companyName
      ),
      default: buildGoogleMapsDirectionsUrl(
        jobCoordinates.latitude,
        jobCoordinates.longitude
      ),
    });
    Linking.openURL(url);
  };

  if (showWizard) {
    return (
      <Modal visible animationType="slide" onRequestClose={() => setShowWizard(false)}>
        <ApplicationWizard
          job={job}
          onClose={() => setShowWizard(false)}
          onSuccess={handleApplySuccess}
        />
      </Modal>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Safe area top spacer */}
      <View style={{ height: insets.top, backgroundColor: colors.background }} />

      {/* Header */}
      <View style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            padding: 8,
            backgroundColor: colors.card,
            borderRadius: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={{
            padding: 8,
            backgroundColor: colors.card,
            borderRadius: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          {isSaved ? (
            <BookmarkCheck size={22} color={GREEN} />
          ) : (
            <Bookmark size={22} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Company + Title */}
        <View style={{
          backgroundColor: colors.card,
          marginHorizontal: 16,
          borderRadius: 20,
          padding: 20,
          marginBottom: 12,
          gap: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <TouchableOpacity
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "flex-start",
              backgroundColor: job.company.logoColor + "20",
            }}
            onPress={() => router.push({ pathname: "/company-profile", params: { companyId: job.companyId } } as never)}
          >
            <Text style={{ fontSize: 22, fontWeight: "800", color: job.company.logoColor }}>
              {job.company.logoInitials}
            </Text>
          </TouchableOpacity>
          {job.isUrgent ? (
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: colors.urgentBg,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
              alignSelf: "flex-start",
            }}>
              <AlertCircle size={12} color={colors.urgentText} />
              <Text style={{ fontSize: 11, color: colors.urgentText, fontWeight: "700" }}>URGENT</Text>
            </View>
          ) : null}
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text, lineHeight: 28 }}>{job.title}</Text>
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/company-profile", params: { companyId: job.companyId } } as never)}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 15, color: colors.textSecondary, fontWeight: "500" }}>{job.company.companyName}</Text>
              {job.company.isVerified ? (
                <CheckCircle2 size={14} color={GREEN} style={{ marginLeft: 4 }} />
              ) : null}
              <ChevronRight size={14} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Match bar */}
          <View style={{ marginTop: 4, gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{t("job_profile_match")}</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: matchPct >= 70 ? GREEN : "#F39C12" }}>
                {matchPct}%
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" }}>
              <View style={{
                height: 6,
                borderRadius: 3,
                width: `${matchPct}%` as any,
                backgroundColor: matchPct >= 70 ? GREEN : "#F39C12",
              }} />
            </View>
          </View>
        </View>

        {/* Video Preview Section */}
        {jobVideoUri ? (
          <Pressable
            testID="job-video-preview"
            onPress={() => setShowVideoModal(true)}
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: colors.card,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View style={{ height: 180, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
              <ExpoVideo
                source={{ uri: jobVideoUri }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isMuted
              />
              <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "rgba(0,0,0,0.6)",
                justifyContent: "center",
                alignItems: "center",
              }}>
                <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </View>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              backgroundColor: isDark ? "rgba(59, 173, 78, 0.15)" : "#F0FDF0",
            }}>
              <Video size={18} color={GREEN} strokeWidth={2} />
              <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: "600", color: GREEN }}>
                {t("job_video_preview")}
              </Text>
              <Text style={{ marginLeft: "auto", fontSize: 13, color: colors.textSecondary }}>
                {t("profile_play_video")}
              </Text>
              <Play size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
            </View>
          </Pressable>
        ) : null}

        {/* Quick info chips */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: contractColor + "15",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
          }}>
            <Briefcase size={13} color={contractColor} />
            <Text style={{ fontSize: 12, color: contractColor, fontWeight: "500" }}>{job.contractType}</Text>
          </View>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: colors.card,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 1,
          }}>
            <MapPin size={13} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "500" }}>
              {job.locationCity}{job.locationNeighborhood ? `, ${job.locationNeighborhood}` : ""}
            </Text>
          </View>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: colors.card,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 1,
          }}>
            <Users size={13} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "500" }}>{t("job_applicants_count").replace("{n}", String(job._count.applications))}</Text>
          </View>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: colors.card,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 1,
          }}>
            <Eye size={13} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "500" }}>{t("job_views_count").replace("{n}", String(job.viewCount))}</Text>
          </View>
        </View>

        {/* Salary */}
        <View style={{
          backgroundColor: colors.card,
          marginHorizontal: 16,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          gap: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 1,
        }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{t("job_salary_section")}</Text>
          <Text style={{ fontSize: 18, fontWeight: "800", color: GREEN }}>
            {formatSalary(job.salaryMin, job.salaryMax, job.salaryNegotiable, t("job_salary_negotiable_label"))}
          </Text>
        </View>

        {/* Description */}
        <View style={{
          backgroundColor: colors.card,
          marginHorizontal: 16,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          gap: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 1,
        }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{t("job_description_section")}</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>{job.description}</Text>
        </View>

        {/* Required skills */}
        <View style={{
          backgroundColor: colors.card,
          marginHorizontal: 16,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          gap: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 1,
        }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{t("job_skills_section")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {job.requiredSkills.map((skill) => {
              const hasSkill = DEMO_CANDIDATES[0].skills.some(
                (s) => s.skillName.toLowerCase() === skill.toLowerCase()
              );
              return (
                <View
                  key={skill}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: hasSkill ? (isDark ? "rgba(59, 173, 78, 0.15)" : "#E8F8ED") : colors.toggleBg,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    borderWidth: hasSkill ? 1 : 0,
                    borderColor: hasSkill ? GREEN : "transparent",
                  }}
                >
                  {hasSkill ? <CheckCircle2 size={12} color={GREEN} /> : null}
                  <Text style={{ fontSize: 13, fontWeight: "500", color: hasSkill ? GREEN : colors.textSecondary }}>
                    {skill}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Company card */}
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            backgroundColor: colors.card,
            marginHorizontal: 16,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 1,
          }}
          onPress={() => router.push({ pathname: "/company-profile", params: { companyId: job.companyId } } as never)}
        >
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: job.company.logoColor + "20",
          }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: job.company.logoColor }}>
              {job.company.logoInitials}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{job.company.companyName}</Text>
            <Text style={{ fontSize: 12, color: GREEN, marginTop: 2 }}>{t("job_view_company")}</Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Location Map Section */}
        {jobCoordinates ? (
          <View style={{
            backgroundColor: colors.card,
            marginHorizontal: 16,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            gap: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 1,
          }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{t("job_location")}</Text>
            <View style={{ borderRadius: 12, overflow: "hidden", marginTop: 4 }}>
              <MapView
                provider={Platform.OS === "ios" ? undefined : PROVIDER_DEFAULT}
                style={{ width: "100%", height: 160, borderRadius: 12 }}
                initialRegion={{
                  latitude: jobCoordinates.latitude,
                  longitude: jobCoordinates.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: jobCoordinates.latitude,
                    longitude: jobCoordinates.longitude,
                  }}
                  title={job.company.companyName}
                  description={`${job.locationCity}${job.locationNeighborhood ? `, ${job.locationNeighborhood}` : ""}`}
                />
              </MapView>
            </View>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 12,
                marginTop: 4,
                backgroundColor: isDark ? "rgba(59, 173, 78, 0.15)" : "#E8F8ED",
                borderRadius: 10,
              }}
              onPress={handleGetDirections}
            >
              <Navigation size={16} color={colors.accent} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.accent }}>
                {t("job_get_directions")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Apply button */}
      <View style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}>
        {alreadyApplied ? (
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: isDark ? "rgba(59, 173, 78, 0.15)" : "#E8F8ED",
            paddingVertical: 16,
            borderRadius: 14,
          }}>
            <CheckCircle2 size={18} color={GREEN} />
            <Text style={{ fontSize: 17, fontWeight: "700", color: GREEN }}>{t("job_already_applied")}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={{ backgroundColor: GREEN, paddingVertical: 16, borderRadius: 14, alignItems: "center" }}
            onPress={() => setShowWizard(true)}
          >
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#fff" }}>{t("job_apply_now_btn")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Video Preview Modal */}
      <Modal
        visible={showVideoModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowVideoModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" }}>
          <Pressable
            testID="close-video-modal"
            onPress={() => setShowVideoModal(false)}
            style={{
              position: "absolute",
              top: insets.top + 12,
              right: 20,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.2)",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <X size={24} color="#FFFFFF" />
          </Pressable>
          {jobVideoUri ? (
            <ExpoVideo
              source={{ uri: jobVideoUri }}
              style={{ width: "100%", height: 400 }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping
              useNativeControls
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
