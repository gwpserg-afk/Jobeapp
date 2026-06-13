import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import {
  MessageCircle,
  ArrowLeft,
  Send,
  Languages,
  Check,
  Search,
  X,
  Edit,
} from "lucide-react-native";
import { useLang } from "../../../lib/i18n";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "@/lib/theme";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import { useUserWithProfile } from "@/lib/hooks/useUser";
import { useDebounce } from "@/lib/useDebounce";

// ─── Brand constants ──────────────────────────────────────────────────────────

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  userId: string;
  userName: string;
  userImage: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  sentAt: string;
}

interface CandidateSearchResult {
  id: string;
  fullName: string;
  headline: string | null;
  profilePhotoUrl: string | null;
  city: string;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_MY_ID = "recruiter-me";

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    userId: "demo-aminata",
    userName: "Aminata Diallo",
    userImage: null,
    lastMessage: "Bonjour, je suis intéressée par le poste de Comptable",
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    unreadCount: 2,
  },
  {
    userId: "demo-oumar",
    userName: "Oumar Ndiaye",
    userImage: null,
    lastMessage: "Merci pour votre réponse, je suis disponible pour un entretien",
    lastMessageAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    unreadCount: 1,
  },
  {
    userId: "demo-modou",
    userName: "Modou Gueye",
    userImage: null,
    lastMessage: "Bonjour, quand puis-je commencer ?",
    lastMessageAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
  },
];

const DEMO_MESSAGES: Record<string, Message[]> = {
  "demo-aminata": [
    { id: "da1", senderId: "demo-aminata", receiverId: DEMO_MY_ID, content: "Bonjour, je suis intéressée par le poste de Comptable Sénior", isRead: true, sentAt: new Date(Date.now() - 2 * 3600000 - 3 * 60000).toISOString() },
    { id: "da2", senderId: DEMO_MY_ID, receiverId: "demo-aminata", content: "Bonjour Aminata, merci pour votre candidature. Votre profil est très intéressant", isRead: true, sentAt: new Date(Date.now() - 2 * 3600000 - 2 * 60000).toISOString() },
    { id: "da3", senderId: "demo-aminata", receiverId: DEMO_MY_ID, content: "Merci beaucoup, je suis disponible pour un entretien quand vous voulez", isRead: true, sentAt: new Date(Date.now() - 2 * 3600000 - 60000).toISOString() },
    { id: "da4", senderId: DEMO_MY_ID, receiverId: "demo-aminata", content: "Parfait, pouvez-vous venir lundi à 10h ?", isRead: false, sentAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  ],
  "demo-oumar": [
    { id: "do1", senderId: "demo-oumar", receiverId: DEMO_MY_ID, content: "Bonjour, j'ai postulé pour le poste de Développeur Web Full-Stack", isRead: true, sentAt: new Date(Date.now() - 5 * 3600000 - 3 * 60000).toISOString() },
    { id: "do2", senderId: DEMO_MY_ID, receiverId: "demo-oumar", content: "Bonjour Oumar, nous avons bien reçu votre candidature", isRead: true, sentAt: new Date(Date.now() - 5 * 3600000 - 2 * 60000).toISOString() },
    { id: "do3", senderId: "demo-oumar", receiverId: DEMO_MY_ID, content: "Merci pour votre réponse, je suis disponible pour un entretien", isRead: true, sentAt: new Date(Date.now() - 5 * 3600000 - 60000).toISOString() },
    { id: "do4", senderId: DEMO_MY_ID, receiverId: "demo-oumar", content: "Nous reviendrons vers vous très prochainement", isRead: false, sentAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  ],
  "demo-modou": [
    { id: "dm1", senderId: "demo-modou", receiverId: DEMO_MY_ID, content: "Bonjour, quand puis-je commencer ?", isRead: true, sentAt: new Date(Date.now() - 26 * 3600000 - 3 * 60000).toISOString() },
    { id: "dm2", senderId: DEMO_MY_ID, receiverId: "demo-modou", content: "Bonjour Modou, votre dossier est en cours d'examen", isRead: true, sentAt: new Date(Date.now() - 26 * 3600000 - 2 * 60000).toISOString() },
    { id: "dm3", senderId: "demo-modou", receiverId: DEMO_MY_ID, content: "D'accord merci, j'attends votre retour", isRead: true, sentAt: new Date(Date.now() - 26 * 3600000 - 60000).toISOString() },
    { id: "dm4", senderId: DEMO_MY_ID, receiverId: "demo-modou", content: "Nous vous contacterons dans les prochains jours", isRead: true, sentAt: new Date(Date.now() - 26 * 3600000).toISOString() },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#1B2F6E", "#3BAD4E", "#E74C3C", "#9B59B6",
  "#E67E22", "#16A085", "#2980B9", "#E91E63",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? NAVY;
}

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "??";
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(dateStr: string, t: (k: import("@/lib/i18n").TranslationKey) => string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return t("recruiter_today");
  if (d.toDateString() === yesterday.toDateString()) return t("recruiter_yesterday");
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatLastTime(dateStr: string, t: (k: import("@/lib/i18n").TranslationKey) => string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 1) return `${Math.floor((now.getTime() - d.getTime()) / 60000)}m`;
  if (diffH < 24) return formatTime(dateStr);
  if (diffH < 48) return t("recruiter_yesterday");
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function detectMsgLang(text: string): "fr" | "en" | "zh" {
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  const frScore = [
    /\b(je|tu|il|elle|nous|vous)\b/i,
    /\b(le|la|les|un|une|des)\b/i,
    /[àâäéèêëïîôùûüç]/i,
  ].filter((r) => r.test(text)).length;
  return frScore >= 2 ? "fr" : "en";
}

// ─── NewConversationModal ─────────────────────────────────────────────────────

function NewConversationModal({
  visible,
  onClose,
  onSelect,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string, name: string) => void;
  isDark: boolean;
}) {
  const t = useLang((s) => s.t);
  const [query, setQuery] = useState<string>("");
  const debouncedQuery = useDebounce(query, 300);

  const navyText = isDark ? "#F5F5F5" : NAVY;
  const cardBg = isDark ? "#1E2C50" : "#FFFFFF";
  const pageBg = isDark ? "#0F1B3D" : "#F5F7FA";
  const borderColor = isDark ? "#2A3B6A" : "#E5E7EB";
  const inputBg = isDark ? "#243260" : "#F3F4F6";

  const { data: searchData, isLoading: isSearching } = useQuery({
    queryKey: ["candidate-search", debouncedQuery],
    queryFn: () =>
      api.get<{ candidates: CandidateSearchResult[]; pagination: unknown }>(
        `/api/candidates/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`
      ),
    enabled: debouncedQuery.length >= 2,
  });

  const candidates = searchData?.candidates ?? [];

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const handleSelect = (candidate: CandidateSearchResult) => {
    setQuery("");
    onSelect(candidate.id, candidate.fullName);
  };

  return (
    <Modal
      testID="new-conversation-modal"
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
        onPress={handleClose}
      >
        <Pressable
          style={{
            backgroundColor: pageBg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "80%",
            minHeight: 300,
          }}
          onPress={() => {}}
        >
          {/* Modal header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: borderColor,
            }}
          >
            <Text style={{ flex: 1, fontSize: 17, fontWeight: "700", color: navyText }}>
              {t("msg_new_conversation")}
            </Text>
            <Pressable
              testID="close-new-conversation-modal"
              onPress={handleClose}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed
                  ? isDark ? "#243260" : "#E5E7EB"
                  : isDark ? "#1E2C50" : "#F3F4F6",
              })}
            >
              <X size={16} color={isDark ? "#9BA5BF" : "#6B7280"} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Search input */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: inputBg,
              borderRadius: 24,
              marginHorizontal: 16,
              marginVertical: 12,
              paddingHorizontal: 14,
              height: 44,
              gap: 8,
            }}
          >
            <Search size={16} color={isDark ? "#9BA5BF" : "#9CA3AF"} strokeWidth={2} />
            <TextInput
              testID="new-conversation-search-input"
              value={query}
              onChangeText={setQuery}
              placeholder={t("msg_search_candidate")}
              placeholderTextColor={isDark ? "#9BA5BF" : "#9CA3AF"}
              style={{
                flex: 1,
                fontSize: 14,
                color: isDark ? "#F5F5F5" : "#111827",
                height: 44,
              }}
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => setQuery("")}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: isDark ? "#2A3B6A" : "#D1D5DB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={11} color={isDark ? "#9BA5BF" : "#6B7280"} strokeWidth={2.5} />
              </Pressable>
            ) : null}
          </View>

          {/* Results */}
          {isSearching ? (
            <View style={{ padding: 32, alignItems: "center" }}>
              <ActivityIndicator color={NAVY} />
            </View>
          ) : debouncedQuery.length >= 2 && candidates.length === 0 ? (
            <View style={{ padding: 32, alignItems: "center" }}>
              <Text style={{ fontSize: 14, color: isDark ? "#9BA5BF" : "#6B7280" }}>
                {t("msg_no_candidates_found")}
              </Text>
            </View>
          ) : (
            <FlatList
              testID="candidate-search-results"
              data={candidates}
              keyExtractor={(item) => item.id}
              style={{ backgroundColor: pageBg }}
              contentContainerStyle={{ paddingBottom: 32 }}
              renderItem={({ item }) => {
                const avatarColor = getAvatarColor(item.fullName);
                const initials = getInitials(item.fullName);
                return (
                  <Pressable
                    testID={`candidate-result-${item.id}`}
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      backgroundColor: pressed
                        ? isDark ? "#243260" : "#F8FAFF"
                        : "transparent",
                      gap: 12,
                    })}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: avatarColor,
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#FFFFFF" }}>
                        {initials}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ fontSize: 15, fontWeight: "600", color: navyText }}
                        numberOfLines={1}
                      >
                        {item.fullName}
                      </Text>
                      {item.headline ? (
                        <Text
                          style={{ fontSize: 12, color: isDark ? "#9BA5BF" : "#6B7280", marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {item.headline}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── ChatView ─────────────────────────────────────────────────────────────────

function ChatView({
  partnerId,
  partnerName,
  myId,
  demoMessages,
  onBack,
  isDark,
}: {
  partnerId: string;
  partnerName: string;
  myId: string;
  demoMessages?: Message[];
  onBack: () => void;
  isDark: boolean;
}) {
  const isDemo = demoMessages !== undefined;
  const [text, setText] = useState<string>("");
  const [localSentMessages, setLocalSentMessages] = useState<Message[]>([]);
  const lang = useLang((s) => s.lang);
  const t = useLang((s) => s.t);
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();
  const [translatedMsgs, setTranslatedMsgs] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  const navyText = isDark ? "#F5F5F5" : NAVY;
  const cardBg = isDark ? "#1E2C50" : "#FFFFFF";
  const pageBg = isDark ? "#0F1B3D" : "#F5F7FA";
  const borderColor = isDark ? "#2A3B6A" : "#E5E7EB";
  const inputBg = isDark ? "#243260" : "#F3F4F6";
  const avatarColor = getAvatarColor(partnerName);
  const initials = getInitials(partnerName);

  const { data: apiMessages = [], isLoading } = useQuery({
    queryKey: ["messages", partnerId],
    queryFn: () => api.get<Message[]>(`/api/messages/${partnerId}`),
    refetchInterval: 5000,
    enabled: !isDemo,
  });

  const messages: Message[] = useMemo(() => {
    if (isDemo) {
      const all = [...(demoMessages ?? []), ...localSentMessages];
      return all.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    }
    return apiMessages;
  }, [isDemo, demoMessages, localSentMessages, apiMessages]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post("/api/messages", { receiverId: partnerId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", partnerId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const translateMutation = useMutation({
    mutationFn: ({ msgText, targetLang }: { msgText: string; targetLang: string }) =>
      api.post<{ translated: string }>("/api/messages/translate", {
        text: msgText,
        targetLang,
      }),
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (isDemo) {
      const newMsg: Message = {
        id: "demo-sent-" + Date.now(),
        senderId: DEMO_MY_ID,
        receiverId: partnerId,
        content: trimmed,
        isRead: false,
        sentAt: new Date().toISOString(),
      };
      setLocalSentMessages((prev) => [...prev, newMsg]);
      setText("");
      return;
    }
    if (sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
    setText("");
  };

  const handleTranslate = async (msgId: string, msgText: string) => {
    if (translatedMsgs[msgId]) {
      setTranslatedMsgs((prev) => {
        const n = { ...prev };
        delete n[msgId];
        return n;
      });
      return;
    }
    setTranslatingId(msgId);
    try {
      const result = await translateMutation.mutateAsync({ msgText, targetLang: lang });
      setTranslatedMsgs((prev) => ({ ...prev, [msgId]: result.translated }));
    } finally {
      setTranslatingId(null);
    }
  };

  useEffect(() => {
    if (messages.length > 0)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const effectiveMyId = isDemo ? DEMO_MY_ID : myId;

  const renderMessage = useCallback(
    ({ item: msg, index }: { item: Message; index: number }) => {
      const isMe = msg.senderId === effectiveMyId;
      const prevMsg = messages[index - 1];
      const showDate =
        !prevMsg || formatDateLabel(prevMsg.sentAt, t) !== formatDateLabel(msg.sentAt, t);
      const msgLang = detectMsgLang(msg.content);
      const showTranslate = !isMe && msgLang !== lang;
      const isTranslated = !!translatedMsgs[msg.id];
      const displayText = isTranslated
        ? (translatedMsgs[msg.id] ?? msg.content)
        : msg.content;

      return (
        <View>
          {showDate ? (
            <View style={{ alignItems: "center", marginVertical: 8 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: isDark ? "#9BA5BF" : "#6B7280",
                  fontWeight: "600",
                  paddingHorizontal: 12,
                  paddingVertical: 3,
                  backgroundColor: isDark ? "#243260" : "#E5E7EB",
                  borderRadius: 10,
                }}
              >
                {formatDateLabel(msg.sentAt, t)}
              </Text>
            </View>
          ) : null}
          <View
            style={{
              marginBottom: 4,
              alignItems: isMe ? "flex-end" : "flex-start",
            }}
          >
            <View
              style={{
                maxWidth: "78%",
                borderRadius: 16,
                padding: 10,
                paddingHorizontal: 14,
                backgroundColor: isMe ? GREEN : cardBg,
                borderBottomRightRadius: isMe ? 4 : 16,
                borderBottomLeftRadius: isMe ? 16 : 4,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: isMe ? "#FFFFFF" : navyText,
                }}
              >
                {displayText}
              </Text>
              {isTranslated ? (
                <Text
                  style={{
                    fontSize: 10,
                    color: isMe ? "rgba(255,255,255,0.5)" : isDark ? "#9BA5BF" : "#6B7280",
                    marginTop: 2,
                  }}
                >
                  {t("msg_translated_label")}
                </Text>
              ) : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  marginTop: 4,
                  gap: 8,
                }}
              >
                {showTranslate ? (
                  <Pressable
                    onPress={() => handleTranslate(msg.id, msg.content)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      opacity: translatingId === msg.id ? 0.5 : 1,
                    }}
                  >
                    <Languages
                      size={11}
                      color={isMe ? "rgba(255,255,255,0.7)" : GREEN}
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "600",
                        color: isMe ? "rgba(255,255,255,0.7)" : GREEN,
                      }}
                    >
                      {translatingId === msg.id
                        ? t("msg_translating")
                        : isTranslated
                        ? t("msg_original")
                        : t("msg_translate")}
                    </Text>
                  </Pressable>
                ) : null}
                <Text
                  style={{
                    fontSize: 10,
                    color: isMe ? "rgba(255,255,255,0.6)" : isDark ? "#9BA5BF" : "#6B7280",
                  }}
                >
                  {formatTime(msg.sentAt)}
                </Text>
                {isMe ? (
                  <Check
                    size={11}
                    color={msg.isRead ? "#60a5fa" : "rgba(255,255,255,0.5)"}
                    strokeWidth={2.5}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, effectiveMyId, lang, isDark, translatedMsgs, translatingId]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={{ flex: 1, backgroundColor: pageBg }}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: cardBg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: borderColor,
              gap: 12,
            }}
          >
            <Pressable
              testID="chat-back-button"
              onPress={onBack}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed
                  ? isDark ? "#243260" : "#EEF2FF"
                  : isDark ? "#1E2C50" : "#F0F4FF",
              })}
            >
              <ArrowLeft size={20} color={NAVY} strokeWidth={2.5} />
            </Pressable>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: avatarColor,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#FFFFFF" }}>
                {initials}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: navyText }}>
                {partnerName}
              </Text>
              <Text style={{ fontSize: 11, color: GREEN, fontWeight: "600" }}>
                ● {t("recruiter_online")}
              </Text>
            </View>
          </View>
        </SafeAreaView>

        {isLoading && !isDemo ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={NAVY} size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingTop: 80,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: isDark ? "#1E2C50" : "#EEF2FF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <MessageCircle size={28} color={NAVY} strokeWidth={1.5} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: navyText }}>
                  {t("msg_start_conversation")}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: isDark ? "#9BA5BF" : "#6B7280",
                    textAlign: "center",
                  }}
                >
                  {t("msg_send_first_to")} {partnerName}
                </Text>
              </View>
            }
          />
        )}

        <SafeAreaView
          edges={["bottom"]}
          style={{
            backgroundColor: cardBg,
            borderTopWidth: 1,
            borderTopColor: borderColor,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 8,
            }}
          >
            <TextInput
              testID="chat-message-input"
              style={{
                flex: 1,
                borderRadius: 22,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 14,
                maxHeight: 100,
                borderWidth: 1,
                backgroundColor: inputBg,
                color: isDark ? "#F5F5F5" : "#111827",
                borderColor: borderColor,
              }}
              placeholder={t("msg_type_message")}
              placeholderTextColor={isDark ? "#9BA5BF" : "#9CA3AF"}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <Pressable
              testID="chat-send-button"
              onPress={handleSend}
              disabled={!text.trim() || (!isDemo && sendMutation.isPending)}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? "#2E9940" : GREEN,
                opacity: !text.trim() || (!isDemo && sendMutation.isPending) ? 0.5 : 1,
              })}
            >
              <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── ConversationRow ──────────────────────────────────────────────────────────

function ConversationRow({
  conv,
  onPress,
  isDark,
  navyText,
  t,
}: {
  conv: Conversation;
  onPress: () => void;
  isDark: boolean;
  navyText: string;
  t: (k: import("@/lib/i18n").TranslationKey) => string;
}) {
  const avatarColor = getAvatarColor(conv.userName);
  const initials = getInitials(conv.userName);
  const hasUnread = conv.unreadCount > 0;
  const cardBg = isDark ? "#1E2C50" : "#FFFFFF";

  return (
    <Pressable
      testID={`conversation-${conv.userId}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        height: 72,
        backgroundColor: pressed
          ? isDark ? "#243260" : "#F8FAFF"
          : cardBg,
        gap: 12,
      })}
    >
      {/* Avatar */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: avatarColor,
          flexShrink: 0,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF" }}>
          {initials}
        </Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: hasUnread ? "700" : "600",
              color: navyText,
              flex: 1,
              marginRight: 8,
            }}
            numberOfLines={1}
          >
            {conv.userName}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: hasUnread ? GREEN : isDark ? "#9BA5BF" : "#9CA3AF",
              fontWeight: hasUnread ? "600" : "400",
              flexShrink: 0,
            }}
          >
            {formatLastTime(conv.lastMessageAt, t)}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              color: hasUnread
                ? isDark ? "#C8D0E0" : "#374151"
                : isDark ? "#9BA5BF" : "#9CA3AF",
              fontWeight: hasUnread ? "500" : "400",
              marginRight: 8,
            }}
            numberOfLines={1}
          >
            {conv.lastMessage}
          </Text>
          {hasUnread ? (
            <View
              style={{
                borderRadius: 10,
                minWidth: 20,
                paddingHorizontal: 6,
                paddingVertical: 2,
                alignItems: "center",
                backgroundColor: GREEN,
                flexShrink: 0,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>
                {conv.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RecruiterMessagesScreen() {
  const t = useLang((s) => s.t);
  const { isDark } = useTheme();
  const rawParams = useLocalSearchParams<{
    conversationId?: string;
    openUserId?: string;
    openUserName?: string;
  }>();
  const conversationId = Array.isArray(rawParams.conversationId)
    ? rawParams.conversationId[0] ?? undefined
    : rawParams.conversationId;
  const openUserId = Array.isArray(rawParams.openUserId)
    ? rawParams.openUserId[0] ?? undefined
    : rawParams.openUserId;
  const openUserName = Array.isArray(rawParams.openUserName)
    ? rawParams.openUserName[0] ?? undefined
    : rawParams.openUserName;
  const { user } = useUserWithProfile();
  // Fall back to demo ID when there's no authenticated user (demo mode)
  const myId = user?.id ?? DEMO_MY_ID;
  const queryClient = useQueryClient();

  const navyText = isDark ? "#F5F5F5" : NAVY;
  const pageBg = isDark ? "#0F1B3D" : "#F5F7FA";
  const cardBg = isDark ? "#1E2C50" : "#FFFFFF";
  const searchBg = isDark ? "#243260" : "#EDEDF0";
  const borderColor = isDark ? "#2A3B6A" : "#E5E7EB";

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activePartnerId, setActivePartnerId] = useState<string | null>(
    openUserId ?? conversationId ?? null
  );
  const [activePartnerName, setActivePartnerName] = useState<string>(openUserName ?? "");
  const [showNewConvModal, setShowNewConvModal] = useState<boolean>(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    data: conversations = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<Conversation[]>("/api/messages"),
    refetchInterval: 10000,
  });

  // Merge real + demo: show demo when API returns < 3 results
  const mergedConversations = useMemo<Conversation[]>(() => {
    if (conversations.length >= 3) return conversations;
    const realIds = new Set(conversations.map((c) => c.userId));
    const fill = DEMO_CONVERSATIONS.filter((d) => !realIds.has(d.userId));
    return [...conversations, ...fill];
  }, [conversations]);

  // Filter by search
  const filteredConversations = useMemo<Conversation[]>(() => {
    if (!debouncedSearch.trim()) return mergedConversations;
    const q = debouncedSearch.toLowerCase();
    return mergedConversations.filter(
      (c) =>
        c.userName.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
    );
  }, [mergedConversations, debouncedSearch]);

  const openConversation = (conv: Conversation) => {
    setActivePartnerId(conv.userId);
    setActivePartnerName(conv.userName);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const found = conversations.find((c) => c.userId === conversationId);
      if (found) {
        setActivePartnerName(found.userName);
      }
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    if (!openUserId) return;
    const realConv = conversations.find((c) => c.userId === openUserId);
    if (realConv) {
      setActivePartnerId(realConv.userId);
      setActivePartnerName(realConv.userName);
    } else {
      setActivePartnerId(openUserId);
      setActivePartnerName(openUserName ?? openUserId ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openUserId]);

  if (activePartnerId) {
    const isDemo = activePartnerId.startsWith("demo-");
    return (
      <ChatView
        partnerId={activePartnerId}
        partnerName={activePartnerName || activePartnerId}
        myId={myId}
        demoMessages={isDemo ? (DEMO_MESSAGES[activePartnerId] ?? []) : undefined}
        onBack={() => {
          setActivePartnerId(null);
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }}
        isDark={isDark}
      />
    );
  }

  const totalUnread = mergedConversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <View testID="recruiter-messages-screen" style={{ flex: 1, backgroundColor: pageBg }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={cardBg}
      />

      <NewConversationModal
        visible={showNewConvModal}
        onClose={() => setShowNewConvModal(false)}
        onSelect={(id, name) => {
          setShowNewConvModal(false);
          setActivePartnerId(id);
          setActivePartnerName(name);
        }}
        isDark={isDark}
      />

      <SafeAreaView edges={["top"]} style={{ backgroundColor: cardBg }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: navyText,
                letterSpacing: -0.5,
                flex: 1,
              }}
            >
              {t("messages_title")}
            </Text>
            {totalUnread > 0 ? (
              <View
                style={{
                  borderRadius: 12,
                  minWidth: 24,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  alignItems: "center",
                  backgroundColor: GREEN,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>
                  {totalUnread}
                </Text>
              </View>
            ) : null}
            <Pressable
              testID="compose-button"
              onPress={() => setShowNewConvModal(true)}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? "#2E9940" : GREEN,
              })}
            >
              <Edit size={18} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Search bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: searchBg,
              borderRadius: 24,
              paddingHorizontal: 14,
              height: 48,
              gap: 8,
            }}
          >
            <Search size={16} color={isDark ? "#9BA5BF" : "#9CA3AF"} strokeWidth={2} />
            <TextInput
              testID="messages-search-input"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("recruiter_search_conversation_placeholder")}
              placeholderTextColor={isDark ? "#9BA5BF" : "#9CA3AF"}
              style={{
                flex: 1,
                fontSize: 14,
                color: isDark ? "#F5F5F5" : "#111827",
                height: 48,
              }}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 ? (
              <Pressable
                testID="clear-messages-search"
                onPress={() => setSearchQuery("")}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: isDark ? "#2A3B6A" : "#D1D5DB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={11} color={isDark ? "#9BA5BF" : "#6B7280"} strokeWidth={2.5} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={NAVY} size="large" />
        </View>
      ) : (
        <FlatList
          testID="conversations-list"
          data={filteredConversations}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <ConversationRow
              conv={item}
              onPress={() => openConversation(item)}
              isDark={isDark}
              navyText={navyText}
              t={t}
            />
          )}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          style={{ backgroundColor: pageBg }}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: 1,
                marginLeft: 76,
                marginRight: 0,
                backgroundColor: isDark ? "#2A3B6A" : "#F0F2F5",
              }}
            />
          )}
          ListHeaderComponent={
            filteredConversations.length > 0 ? (
              <View style={{ backgroundColor: cardBg, marginBottom: 8 }} />
            ) : null
          }
          ListEmptyComponent={
            <View
              testID="messages-empty"
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 80,
                paddingHorizontal: 32,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: isDark ? "#1E2C50" : "#EEF2FF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <MessageCircle size={30} color={NAVY} strokeWidth={1.5} />
              </View>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: navyText, textAlign: "center" }}
              >
                {searchQuery ? t("msg_no_results") : t("msg_no_messages")}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  textAlign: "center",
                  color: isDark ? "#9BA5BF" : "#6B7280",
                  marginTop: 6,
                  lineHeight: 18,
                }}
              >
                {searchQuery
                  ? t("msg_try_other_keywords")
                  : t("messages_empty_desc")}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
