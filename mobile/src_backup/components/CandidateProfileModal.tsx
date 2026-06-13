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
import { X, MapPin, CheckCircle2 } from "lucide-react-native";
import type { TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useDemoStore } from "@/lib/demoStore";

const GREEN = "#3BAD4E";

export interface DemoCandidate {
  id: string;
  userId: string;
  fullName: string;
  headline: string;
  city: string;
  neighborhood?: string | null;
  availabilityStatus: "available" | "soon" | "not_available";
  initials: string;
  avatarColor: string;
  skills: {
    id: string;
    skillName: string;
    level: "beginner" | "intermediate" | "expert";
    verified: boolean;
  }[];
  bio: string;
  phone?: string;
  email?: string;
}

interface CandidateProfileModalProps {
  visible: boolean;
  candidate: DemoCandidate | null;
  onClose: () => void;
  onConnect: (candidate: DemoCandidate) => void;
  onMessage: (candidate: DemoCandidate) => void;
}

const getAvailabilityLabel = (
  status: "available" | "soon" | "not_available",
  t: (key: TranslationKey) => string
): string => {
  switch (status) {
    case "available":
      return t("connection_available");
    case "soon":
      return t("connection_available_soon");
    case "not_available":
      return t("connection_not_available");
    default:
      return status;
  }
};

const getAvailabilityColor = (status: "available" | "soon" | "not_available"): string => {
  switch (status) {
    case "available":
      return GREEN;
    case "soon":
      return "#F39C12";
    case "not_available":
      return "#9CA3AF";
    default:
      return "#9CA3AF";
  }
};

const getSkillLevelLabel = (
  level: "beginner" | "intermediate" | "expert",
  t: (key: TranslationKey) => string
): string => {
  switch (level) {
    case "beginner":
      return t("skill_beginner");
    case "intermediate":
      return t("skill_intermediate");
    case "expert":
      return t("skill_expert");
    default:
      return level;
  }
};

export const CandidateProfileModal: React.FC<CandidateProfileModalProps> = ({
  visible,
  candidate,
  onClose,
  onConnect,
  onMessage,
}) => {
  const t = useLang((s) => s.t);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const connections = useDemoStore((s) => s.connections);
  const isConnected = !!candidate && connections.some(
    (c) => c.candidate.id === candidate.id
  );

  if (!candidate) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="candidate-profile-modal"
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
            <Text style={[styles.headerTitle, { color: colors.primary }]}>
              {t("connection_profile")}
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
            testID="profile-scroll"
          >
            {/* Avatar and basic info */}
            <View style={styles.avatarSection}>
              <View
                style={[
                  styles.largeAvatar,
                  { backgroundColor: candidate.avatarColor },
                ]}
              >
                <Text style={styles.largeAvatarText}>{candidate.initials}</Text>
              </View>

              <Text style={[styles.name, { color: colors.text }]}>
                {candidate.fullName}
              </Text>
              <Text style={[styles.headline, { color: colors.textSecondary }]}>
                {candidate.headline}
              </Text>

              {/* Location and availability */}
              <View style={styles.locationRow}>
                <MapPin size={14} color={colors.textMuted} />
                <Text style={[styles.locationText, { color: colors.textMuted }]}>
                  {candidate.city}
                  {candidate.neighborhood ? `, ${candidate.neighborhood}` : null}
                </Text>
              </View>

              {/* Availability badge */}
              <View
                style={[
                  styles.availabilityBadge,
                  {
                    backgroundColor: `${getAvailabilityColor(candidate.availabilityStatus)}20`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.availabilityDot,
                    {
                      backgroundColor: getAvailabilityColor(
                        candidate.availabilityStatus
                      ),
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.availabilityText,
                    {
                      color: getAvailabilityColor(candidate.availabilityStatus),
                    },
                  ]}
                >
                  {getAvailabilityLabel(candidate.availabilityStatus, t)}
                </Text>
              </View>
            </View>

            {/* Bio section */}
            <View style={[styles.section, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                {t("connection_about")}
              </Text>
              <Text style={[styles.bioText, { color: colors.textSecondary }]}>
                {candidate.bio}
              </Text>
            </View>

            {/* Skills section */}
            {candidate.skills.length > 0 && (
              <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                  {t("connection_skills")}
                </Text>
                <View style={styles.skillsList}>
                  {candidate.skills.map((skill) => (
                    <View
                      key={skill.id}
                      style={[
                        styles.skillItem,
                        { backgroundColor: colors.card },
                      ]}
                    >
                      <View style={styles.skillContent}>
                        <Text style={[styles.skillName, { color: colors.primary }]}>
                          {skill.skillName}
                        </Text>
                        <Text
                          style={[
                            styles.skillLevel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {getSkillLevelLabel(skill.level, t)}
                        </Text>
                      </View>
                      {skill.verified ? (
                        <CheckCircle2 size={16} color={GREEN} />
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Contact info section */}
            {(candidate.email || candidate.phone) ? (
              <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                  {t("connection_contact")}
                </Text>
                <View style={styles.contactList}>
                  {candidate.email ? (
                    <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                      {candidate.email}
                    </Text>
                  ) : null}
                  {candidate.phone ? (
                    <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                      {candidate.phone}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Action buttons - fixed at bottom */}
          <View
            style={[
              styles.buttonContainer,
              { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom || 12 },
            ]}
          >
            <TouchableOpacity
              style={[styles.messageButton, { borderColor: colors.border }]}
              onPress={() => {
                onMessage(candidate);
                onClose();
              }}
              activeOpacity={0.7}
              testID={`send-message-button-${candidate.id}`}
            >
              <Text style={[styles.messageButtonText, { color: colors.primary }]}>
                {t("connection_send_message")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.connectButton, isConnected && { backgroundColor: colors.border }]}
              onPress={() => {
                if (!isConnected) {
                  onConnect(candidate);
                  onClose();
                }
              }}
              disabled={isConnected}
              activeOpacity={0.85}
              testID={`connect-button-${candidate.id}`}
            >
              <Text style={[styles.connectButtonText, isConnected && { color: colors.textMuted }]}>
                {isConnected ? "Request Sent" : t("connection_connect")}
              </Text>
            </TouchableOpacity>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  largeAvatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  headline: {
    fontSize: 14,
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: `${GREEN}20`,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: "600",
    color: GREEN,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 18,
  },
  skillsList: {
    gap: 10,
  },
  skillItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  skillContent: {
    flex: 1,
  },
  skillName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  skillLevel: {
    fontSize: 12,
  },
  contactList: {
    gap: 8,
  },
  contactText: {
    fontSize: 13,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  messageButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  connectButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
