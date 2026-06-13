import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  UserCheck,
  X,
  Globe,
} from "lucide-react-native";
import { useState } from "react";
import { useDemoStore } from "../../lib/demoStore";
import { DEMO_CANDIDATES } from "../../lib/demoData";
import { useTheme } from "../../lib/theme";
import { useLang } from "../../lib/i18n";

export default function CandidateDetailScreen() {
  const router = useRouter();
  const { connectionId } = useLocalSearchParams<{ connectionId: string }>();
  const { colors } = useTheme();
  const lang = useLang((s) => s.lang);
  const isFr = lang === "fr";
  const isZh = lang === "zh";
  const insets = useSafeAreaInsets();
  const [isTranslated, setIsTranslated] = useState<boolean>(false);

  const connections = useDemoStore((s) => s.connections);
  const acceptConnection = useDemoStore((s) => s.acceptConnection);
  const declineConnection = useDemoStore((s) => s.declineConnection);

  const connection = connections.find((c) => c.id === connectionId);
  const candidate = connection?.candidate;
  const fullCandidate = DEMO_CANDIDATES.find((c) => c.id === candidate?.id);

  if (!candidate) {
    return (
      <View testID="candidate-not-found" style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Safe area top */}
        <View style={{ height: insets.top, backgroundColor: colors.card }} />
        {/* Header */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.background,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={22} color={colors.primary} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 16, color: colors.textMuted, fontWeight: "600" }}>
            {isFr ? "Candidat introuvable" : isZh ? "未找到求职者" : "Candidate not found"}
          </Text>
        </View>
      </View>
    );
  }

  const isPending = connection?.status === "pending_received";
  const isSent = connection?.status === "pending_sent";
  const isAccepted = connection?.status === "accepted";

  return (
    <View testID="candidate-detail-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Safe area top */}
      <View style={{ height: insets.top, backgroundColor: colors.card }} />

      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
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
            backgroundColor: colors.background,
          }}
        >
          <ArrowLeft size={22} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text style={{
          flex: 1,
          textAlign: "center",
          fontSize: 17,
          fontWeight: "700",
          color: colors.primary,
        }} numberOfLines={1}>
          {isFr ? "Candidat" : isZh ? "求职者" : "Candidate"}
        </Text>
        <View style={{ width: 36, height: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Card */}
        <View style={{
          margin: 16,
          backgroundColor: colors.card,
          borderRadius: 20,
          padding: 20,
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }}>
          {/* Avatar */}
          <View style={{
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            borderWidth: 4,
            borderColor: colors.card,
          }}>
            <Text style={{ fontSize: 32, fontWeight: "800", color: "#FFFFFF" }}>
              {candidate.initials}
            </Text>
          </View>

          {/* Name */}
          <Text style={{
            fontSize: 20,
            fontWeight: "800",
            color: colors.text,
            textAlign: "center",
            marginBottom: 6,
          }}>
            {candidate.fullName}
          </Text>

          {/* Headline */}
          <Text style={{
            fontSize: 14,
            color: colors.primary,
            fontWeight: "600",
            marginBottom: 8,
            textAlign: "center",
          }}>
            {candidate.headline}
          </Text>

          {/* Location */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            marginBottom: 20,
          }}>
            <MapPin size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={{ fontSize: 13, color: colors.textMuted }}>
              {candidate.city}
            </Text>
          </View>

          {/* Action Buttons */}
          {isPending ? (
            <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
              <Pressable
                testID="accept-button"
                onPress={() => acceptConnection(connection!.id)}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                }}
              >
                <UserCheck size={16} color="#FFFFFF" strokeWidth={2} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                  {isFr ? "Accepter" : isZh ? "接受" : "Accept"}
                </Text>
              </Pressable>
              <Pressable
                testID="decline-button"
                onPress={() => declineConnection(connection!.id)}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.background,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                }}
              >
                <X size={16} color={colors.text} strokeWidth={2} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                  {isFr ? "Refuser" : isZh ? "拒绝" : "Decline"}
                </Text>
              </Pressable>
            </View>
          ) : isSent ? (
            <View style={{
              width: "100%",
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: colors.background,
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: colors.border,
            }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textMuted }}>
                {isFr ? "Demande envoyee" : isZh ? "请求已发送" : "Request sent"}
              </Text>
            </View>
          ) : isAccepted ? (
            <Pressable
              testID="message-button"
              onPress={() => router.push({
                pathname: "/(app)/(recruiter)/messages",
                params: { openUserId: candidate.id, openUserName: candidate.fullName },
              } as never)}
              style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: colors.primary,
              }}
            >
              <MessageCircle size={16} color="#FFFFFF" strokeWidth={2} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                {isFr ? "Envoyer un message" : isZh ? "发送消息" : "Send message"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Status Badge */}
        <View style={{
          marginHorizontal: 16,
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: 14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 1,
        }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary, marginBottom: 10 }}>
            {isFr ? "Statut" : isZh ? "状态" : "Status"}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            {candidate.availabilityStatus}
          </Text>
        </View>

        {/* About / Bio section */}
        {(fullCandidate?.bioFr || fullCandidate?.bioEn) ? (
          <View style={{
            marginHorizontal: 16,
            marginTop: 12,
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 14,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>
                {isFr ? "À propos" : isZh ? "关于" : "About"}
              </Text>
              <Pressable
                onPress={() => setIsTranslated((prev) => !prev)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Globe size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>
                  {isTranslated
                    ? (isFr ? "Voir l'original" : isZh ? "查看原文" : "Show original")
                    : (isFr ? "Traduire" : isZh ? "翻译" : "Translate")}
                </Text>
              </Pressable>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
              {isTranslated
                ? (fullCandidate?.bioEn ?? fullCandidate?.bioFr ?? "")
                : (fullCandidate?.bioFr ?? fullCandidate?.bioEn ?? "")}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
