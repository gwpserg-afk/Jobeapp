import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { MessageCircle, ArrowLeft, Send, ChevronRight, Languages, Check } from "lucide-react-native";
import { useLang } from "../../../lib/i18n";
import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/theme";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import { useUserWithProfile } from "@/lib/hooks/useUser";
import { DEMO_CONVERSATIONS, DEMO_USER_CANDIDATE, type DemoConversation } from "@/lib/demoData";
import { useDemoStore } from "@/lib/demoStore";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ["#1B2F6E","#3BAD4E","#E74C3C","#9B59B6","#E67E22","#16A085","#2980B9"];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? "#1B2F6E";
}

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "??";
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatLastTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 1) return `${Math.floor((now.getTime() - d.getTime()) / 60000)}m`;
  if (diffH < 24) return formatTime(dateStr);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function detectMsgLang(text: string): "fr" | "en" | "zh" {
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  const frScore = [
    /\b(je|tu|il|elle|nous|vous)\b/i,
    /\b(le|la|les|un|une|des)\b/i,
    /\b(est|sont|suis|avez)\b/i,
    /[àâäéèêëïîôùûüç]/i,
  ].filter((r) => r.test(text)).length;
  return frScore >= 2 ? "fr" : "en";
}

// ─── Chat View ────────────────────────────────────────────────────────────────

function ChatView({
  partnerId,
  partnerName,
  partnerImage,
  myId,
  demoConv,
  onBack,
}: {
  partnerId: string;
  partnerName: string;
  partnerImage: string | null;
  myId: string;
  demoConv: DemoConversation | null;
  onBack: () => void;
}) {
  const [text, setText] = useState("");
  const [localDemoMessages, setLocalDemoMessages] = useState<Message[]>([]);
  const lang = useLang((s) => s.lang);
  const t = useLang((s) => s.t);
  const activeLang: "en" | "fr" = lang === "fr" ? "fr" : "en";
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();
  const [translatedMsgs, setTranslatedMsgs] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  const addDemoSentMessage = useDemoStore((s) => s.addDemoSentMessage);
  const storedSentMessages = useDemoStore((s) => s.demoSentMessages[partnerId] ?? []);

  const { data: backendMessages = [], isLoading: backendLoading } = useQuery({
    queryKey: ["messages", partnerId],
    queryFn: () => api.get<Message[]>(`/api/messages/${partnerId}`),
    refetchInterval: 5000,
    enabled: !demoConv,
  });

  const demoMessages: Message[] = demoConv
    ? demoConv.messages.map((m) => ({
        id: m.id,
        senderId: m.senderId === "demo-me" ? myId : m.senderId,
        receiverId: m.senderId === "demo-me" ? partnerId : myId,
        content: m.content[activeLang],
        isRead: m.isRead,
        sentAt: m.sentAt,
      }))
    : [];

  // Persisted sent messages from store (survive navigation)
  const persistedSentMessages: Message[] = storedSentMessages.map((m: { id: string; content: string; sentAt: string }) => ({
    id: m.id,
    senderId: myId,
    receiverId: partnerId,
    content: m.content,
    isRead: true,
    sentAt: m.sentAt,
  }));

  const messages = demoConv
    ? [...demoMessages, ...persistedSentMessages, ...localDemoMessages]
    : [...backendMessages, ...localDemoMessages];
  const isLoading = demoConv ? false : backendLoading;

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
      api.post<{ translated: string }>("/api/messages/translate", { text: msgText, targetLang }),
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;

    const newMsg: Message = {
      id: `local-${Date.now()}`,
      senderId: myId,
      receiverId: partnerId,
      content: trimmed,
      isRead: false,
      sentAt: new Date().toISOString(),
    };
    setLocalDemoMessages((prev) => [...prev, newMsg]);
    setText("");

    if (demoConv) {
      // Persist to store so it survives navigation
      addDemoSentMessage(partnerId, { id: newMsg.id, content: trimmed, sentAt: newMsg.sentAt });
      // Remove from local (now in persistent store)
      setLocalDemoMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
    } else {
      // Also persist to backend for real conversations
      sendMutation.mutate(trimmed, {
        onSuccess: async () => {
          await queryClient.refetchQueries({ queryKey: ["messages", partnerId] });
          setLocalDemoMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
        },
        onError: () => {
          setLocalDemoMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
        },
      });
    }
  };

  const handleTranslate = async (msgId: string, msgText: string) => {
    if (translatedMsgs[msgId]) {
      setTranslatedMsgs((prev) => { const n = { ...prev }; delete n[msgId]; return n; });
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
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const avatarColor = getAvatarColor(partnerName);
  const initials = getInitials(partnerName);

  const renderMessage = useCallback(({ item: msg, index }: { item: Message; index: number }) => {
    const isMe = msg.senderId === myId;
    const prevMsg = messages[index - 1];
    const showDate = !prevMsg || formatDateLabel(prevMsg.sentAt) !== formatDateLabel(msg.sentAt);
    const msgLang = detectMsgLang(msg.content);
    const showTranslate = !isMe && msgLang !== lang;
    const isTranslated = !!translatedMsgs[msg.id];
    const isTranslating = translatingId === msg.id;
    const displayText = isTranslated ? (translatedMsgs[msg.id] ?? msg.content) : msg.content;

    return (
      <View>
        {showDate ? (
          <View style={{ alignItems: "center", marginVertical: 8 }}>
            <Text style={{
              fontSize: 11, color: colors.textMuted, fontWeight: "600",
              paddingHorizontal: 12, paddingVertical: 3,
              backgroundColor: colors.border, borderRadius: 10,
            }}>
              {formatDateLabel(msg.sentAt)}
            </Text>
          </View>
        ) : null}
        <View style={{ marginBottom: 4, alignItems: isMe ? "flex-end" : "flex-start" }}>
          <View style={{
            maxWidth: "78%", borderRadius: 16,
            padding: 10, paddingHorizontal: 14,
            backgroundColor: isMe ? colors.primary : colors.card,
            borderBottomRightRadius: isMe ? 4 : 16,
            borderBottomLeftRadius: isMe ? 16 : 4,
          }}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: isMe ? "#FFFFFF" : colors.text }}>
              {displayText}
            </Text>
            {isTranslated ? (
              <Text style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.5)" : colors.textMuted, marginTop: 2 }}>
                {t("msg_translated_label")}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 4, gap: 8 }}>
              {showTranslate ? (
                <Pressable
                  onPress={() => handleTranslate(msg.id, msg.content)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 3, opacity: isTranslating ? 0.5 : 1 }}
                >
                  <Languages size={11} color={isMe ? "rgba(255,255,255,0.7)" : colors.primary} strokeWidth={2} />
                  <Text style={{ fontSize: 10, fontWeight: "600", color: isMe ? "rgba(255,255,255,0.7)" : colors.primary }}>
                    {isTranslating ? t("msg_translating") : isTranslated ? t("msg_original") : t("msg_translate")}
                  </Text>
                </Pressable>
              ) : null}
              <Text style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.6)" : colors.textMuted }}>
                {formatTime(msg.sentAt)}
              </Text>
              {isMe ? (
                <Check size={11} color={msg.isRead ? "#60a5fa" : "rgba(255,255,255,0.5)"} strokeWidth={2.5} />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, myId, lang, colors, translatedMsgs, translatingId]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.card }}>
          <View style={{
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: 12, paddingVertical: 10,
            borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
          }}>
            <Pressable onPress={onBack} style={{
              width: 36, height: 36, borderRadius: 18,
              alignItems: "center", justifyContent: "center",
              backgroundColor: colors.background,
            }}>
              <ArrowLeft size={22} color={colors.primary} strokeWidth={2} />
            </Pressable>
            {partnerImage ? (
              <Image source={{ uri: partnerImage }} style={{ width: 38, height: 38, borderRadius: 19 }} />
            ) : (
              <View style={{
                width: 38, height: 38, borderRadius: 19,
                alignItems: "center", justifyContent: "center",
                backgroundColor: avatarColor + "22",
              }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: avatarColor }}>{initials}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{partnerName}</Text>
              <Text style={{ fontSize: 11, color: "#22c55e" }}>●  {lang === "fr" ? "En ligne" : lang === "zh" ? "在线" : "Online"}</Text>
            </View>
          </View>
        </SafeAreaView>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={colors.primary} />
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
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
                <Text style={{ fontSize: 14, color: colors.textMuted }}>
                  {lang === "fr" ? "Commencez la conversation..." : lang === "zh" ? "开始对话..." : "Start the conversation..."}
                </Text>
              </View>
            }
          />
        )}

        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{
            flexDirection: "row", alignItems: "flex-end",
            paddingHorizontal: 12, paddingVertical: 8, gap: 8,
          }}>
            <TextInput
              style={{
                flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
                fontSize: 14, maxHeight: 100, borderWidth: 1,
                backgroundColor: colors.background, color: colors.text, borderColor: colors.border,
              }}
              placeholder={t("msg_type_message")}
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
              selectionColor={colors.accent}
              cursorColor={colors.accent}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || sendMutation.isPending}
              style={{
                width: 40, height: 40, borderRadius: 20,
                alignItems: "center", justifyContent: "center",
                backgroundColor: colors.primary,
                opacity: !text.trim() || sendMutation.isPending ? 0.5 : 1,
              }}
            >
              <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Conversation Item ────────────────────────────────────────────────────────

function ConversationItem({ conv, onPress }: { conv: Conversation; onPress: () => void }) {
  const { colors } = useTheme();
  const avatarColor = getAvatarColor(conv.userName);
  const initials = getInitials(conv.userName);
  const hasUnread = conv.unreadCount > 0;

  return (
    <Pressable
      testID={`conversation-${conv.userId}`}
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.card }}
    >
      {conv.userImage ? (
        <Image source={{ uri: conv.userImage }} style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }} />
      ) : (
        <View style={{
          width: 50, height: 50, borderRadius: 25,
          alignItems: "center", justifyContent: "center",
          marginRight: 12, backgroundColor: avatarColor + "22",
        }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: avatarColor }}>{initials}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <Text style={{ fontSize: 15, fontWeight: hasUnread ? "800" : "600", color: colors.text }}>
            {conv.userName}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>
            {formatLastTime(conv.lastMessageAt)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ flex: 1, fontSize: 13, marginRight: 6, color: hasUnread ? colors.textSecondary : colors.textMuted, fontWeight: hasUnread ? "600" : "400" }} numberOfLines={1}>
            {conv.lastMessage}
          </Text>
          {hasUnread ? (
            <View style={{ borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 2, alignItems: "center", backgroundColor: colors.primary }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>{conv.unreadCount}</Text>
            </View>
          ) : (
            <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CandidateMessagesScreen() {
  const t = useLang((s) => s.t);
  const { colors } = useTheme();
  const rawParams = useLocalSearchParams<{ conversationId?: string; openUserId?: string; openUserName?: string }>();
  const conversationId = Array.isArray(rawParams.conversationId) ? rawParams.conversationId[0] ?? undefined : rawParams.conversationId;
  const openUserId = Array.isArray(rawParams.openUserId) ? rawParams.openUserId[0] ?? undefined : rawParams.openUserId;
  const openUserName = Array.isArray(rawParams.openUserName) ? rawParams.openUserName[0] ?? undefined : rawParams.openUserName;
  const { user } = useUserWithProfile();
  // In demo mode there's no real authenticated user — fall back to demo identity
  const myId = user?.id ?? DEMO_USER_CANDIDATE.id;
  const queryClient = useQueryClient();

  const [activePartnerId, setActivePartnerId] = useState<string | null>(openUserId ?? conversationId ?? null);
  const [activePartnerName, setActivePartnerName] = useState<string>(openUserName ?? "");
  const [activePartnerImage, setActivePartnerImage] = useState<string | null>(null);
  const [activeDemoConv, setActiveDemoConv] = useState<DemoConversation | null>(null);

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<Conversation[]>("/api/messages"),
    refetchInterval: 10000,
  });

  const lang = useLang((s) => s.lang);
  const activeLang: "en" | "fr" = lang === "fr" ? "fr" : "en";

  // Merge real conversations with demo ones (demo shown only if no real convos)
  const demoAsConversations: Conversation[] = DEMO_CONVERSATIONS.map((d) => ({
    userId: d.userId,
    userName: d.userName,
    userImage: d.userImage,
    lastMessage: d.lastMessage[activeLang],
    lastMessageAt: d.lastMessageAt,
    unreadCount: d.unreadCount,
  }));

  const mergedConversations: Conversation[] =
    conversations.length > 0
      ? conversations
      : demoAsConversations;

  const openConversation = (conv: Conversation) => {
    const demo = DEMO_CONVERSATIONS.find((d) => d.userId === conv.userId);
    setActivePartnerId(conv.userId);
    setActivePartnerName(conv.userName);
    setActivePartnerImage(conv.userImage);
    setActiveDemoConv(demo ?? null);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const found = conversations.find((c) => c.userId === conversationId);
      if (found) {
        setActivePartnerName(found.userName);
        setActivePartnerImage(found.userImage);
      }
    }
  }, [conversationId, conversations]);

  // Open conversation directly when navigated with openUserId param
  useEffect(() => {
    if (!openUserId) return;
    const name = openUserName ?? openUserId;
    // Check if there's a demo conversation for this user
    const demoConv = DEMO_CONVERSATIONS.find((d) => d.userId === openUserId);
    if (demoConv) {
      setActivePartnerId(demoConv.userId);
      setActivePartnerName(demoConv.userName);
      setActivePartnerImage(demoConv.userImage);
      setActiveDemoConv(demoConv);
    } else {
      // Check real conversations
      const realConv = mergedConversations.find((c) => c.userId === openUserId);
      if (realConv) {
        openConversation(realConv);
      } else {
        // Open a new empty thread for this user
        setActivePartnerId(openUserId);
        setActivePartnerName(name);
        setActivePartnerImage(null);
        setActiveDemoConv(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openUserId]);

  if (activePartnerId) {
    return (
      <ChatView
        partnerId={activePartnerId}
        partnerName={activePartnerName || activePartnerId}
        partnerImage={activePartnerImage}
        myId={myId}
        demoConv={activeDemoConv}
        onBack={() => {
          setActivePartnerId(null);
          setActiveDemoConv(null);
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }}
      />
    );
  }

  const totalUnread = mergedConversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <View testID="candidate-messages-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.card }}>
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 20, paddingVertical: 12,
          borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8,
        }}>
          <Text style={{ fontSize: 21, fontWeight: "800", color: colors.text }}>
            {t("messages_title")}
          </Text>
          {totalUnread > 0 ? (
            <View style={{ borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, alignItems: "center", backgroundColor: colors.primary }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>{totalUnread}</Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          testID="conversations-list"
          data={mergedConversations}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <ConversationItem conv={item} onPress={() => openConversation(item)} />
          )}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, marginLeft: 78, backgroundColor: colors.border }} />
          )}
          ListEmptyComponent={
            <View testID="messages-empty" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 32, gap: 8 }}>
              <MessageCircle size={40} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                {t("messages_empty")}
              </Text>
              <Text style={{ fontSize: 13, textAlign: "center", color: colors.textMuted }}>
                {t("messages_empty_desc")}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
