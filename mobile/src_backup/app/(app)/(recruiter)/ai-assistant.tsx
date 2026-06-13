import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { Sparkles, Bot, ArrowUp } from "lucide-react-native";
import { api } from "@/lib/api/api";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

function getQuickSuggestions(lang: string): string[] {
  if (lang === "zh") return [
    "如何写一份有效的招聘广告？",
    "评估候选人的技巧",
    "如何提升职位曝光度？",
    "吸引更多候选人的小贴士",
  ];
  if (lang === "en") return [
    "How to write an effective job posting?",
    "Tips for evaluating candidates",
    "How does job boosting work?",
    "Tips to attract more candidates",
  ];
  return [
    "Comment rédiger une offre d'emploi efficace ?",
    "Conseils pour évaluer un candidat",
    "Comment fonctionne le boost d'annonce ?",
    "Astuces pour attirer plus de candidats",
  ];
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/#{1,6}\s/g, "");
}

function TypingIndicator({ cardBg, dotColor, botBg, botIconColor }: { cardBg: string; dotColor: string; botBg: string; botIconColor: string }) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const animateDot = (sv: SharedValue<number>) => {
      sv.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    };
    const t1 = setTimeout(() => animateDot(dot1), 0);
    const t2 = setTimeout(() => animateDot(dot2), 200);
    const t3 = setTimeout(() => animateDot(dot3), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      dot1.value = 0;
      dot2.value = 0;
      dot3.value = 0;
    };
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: 0.3 + dot1.value * 0.7, transform: [{ translateY: -dot1.value * 4 }] }));
  const s2 = useAnimatedStyle(() => ({ opacity: 0.3 + dot2.value * 0.7, transform: [{ translateY: -dot2.value * 4 }] }));
  const s3 = useAnimatedStyle(() => ({ opacity: 0.3 + dot3.value * 0.7, transform: [{ translateY: -dot3.value * 4 }] }));

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 16, paddingHorizontal: 16, gap: 8 }} testID="typing-indicator">
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: botBg, alignItems: "center", justifyContent: "center" }}>
        <Bot size={16} color={botIconColor} strokeWidth={2} />
      </View>
      <View style={{ backgroundColor: cardBg, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}>
        <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }, s1]} />
        <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }, s2]} />
        <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }, s3]} />
      </View>
    </View>
  );
}

function MessageBubble({ message, userBubbleBg, assistantBubbleBg, assistantTextColor, botBg, botIconColor, timestampColor }: {
  message: Message;
  userBubbleBg: string;
  assistantBubbleBg: string;
  assistantTextColor: string;
  botBg: string;
  botIconColor: string;
  timestampColor: string;
}) {
  const isUser = message.role === "user";
  return (
    <View style={{ flexDirection: isUser ? "row-reverse" : "row", alignItems: "flex-end", marginBottom: 12, paddingHorizontal: 16, gap: 8 }}>
      {!isUser && (
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: botBg, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Bot size={16} color={botIconColor} strokeWidth={2} />
        </View>
      )}
      <View style={{ maxWidth: "75%", alignItems: isUser ? "flex-end" : "flex-start" }}>
        <View style={{
          backgroundColor: isUser ? userBubbleBg : assistantBubbleBg,
          borderRadius: 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
          borderBottomRightRadius: isUser ? 4 : 18,
          paddingHorizontal: 14,
          paddingVertical: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isUser ? 0 : 0.08,
          shadowRadius: 4,
          elevation: isUser ? 0 : 2,
        }}>
          <Text style={{ color: isUser ? "#FFFFFF" : assistantTextColor, fontSize: 15, lineHeight: 22, letterSpacing: 0.1 }}>
            {stripMarkdown(message.content)}
          </Text>
        </View>
        <Text style={{ color: timestampColor, fontSize: 11, marginTop: 4, marginHorizontal: 4 }}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}

export default function AiAssistantScreen() {
  const { colors } = useTheme();
  const isDark = useTheme((s) => s.isDark);
  const lang = useLang((s) => s.lang);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  // Theme-aware colors
  const userBubbleBg = colors.primary;
  const assistantBubbleBg = colors.card;
  const assistantTextColor = colors.text;
  const inputBg = colors.toggleBg;
  const dotColor = colors.textMuted;
  const botBg = colors.primary;
  const botIconColor = colors.card;

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInputText("");
      setIsLoading(true);

      const conversationHistory = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const result = await api.post<{ message: string }>("/api/chat", {
          messages: conversationHistory,
        });

        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result?.message ?? "Je suis là pour vous aider.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        const errorMsg: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Désolé, je n'ai pas pu me connecter. Veuillez réessayer.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading]
  );

  const handleSend = useCallback(() => { sendMessage(inputText); }, [sendMessage, inputText]);
  const handleSuggestion = useCallback((text: string) => { sendMessage(text); }, [sendMessage]);
  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble
        message={item}
        userBubbleBg={userBubbleBg}
        assistantBubbleBg={assistantBubbleBg}
        assistantTextColor={assistantTextColor}
        botBg={botBg}
        botIconColor={botIconColor}
        timestampColor={colors.textSecondary}
      />
    ),
    [assistantBubbleBg, assistantTextColor, botBg, botIconColor, colors.textSecondary]
  );
  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="ai-assistant-screen"
    >
      <StatusBar
        barStyle={colors.statusBarStyle === "dark" ? "dark-content" : "light-content"}
        backgroundColor={colors.card}
      />

      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
      }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Sparkles size={20} color="#FFFFFF" strokeWidth={2} />
        </View>
        <View>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.primary, letterSpacing: -0.3 }}>
            Assistant IA
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
            Propulsé par l'IA
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 8, backgroundColor: colors.background }}
          style={{ backgroundColor: colors.background }}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          testID="messages-list"
          ListHeaderComponent={
            messages.length === 0 ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                <View style={{ alignItems: "center", paddingTop: 32, paddingBottom: 40 }}>
                  <View style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 6,
                  }}>
                    <Sparkles size={32} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 8, letterSpacing: -0.3 }}>
                    Bonjour !
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20, maxWidth: 260 }}>
                    Je suis votre assistant IA pour vous aider dans le recrutement sur Jobé.
                  </Text>
                </View>

                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                  Suggestions
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={{ gap: 8 }}
                  testID="suggestion-chips"
                >
                  {getQuickSuggestions(lang).map((suggestion: string) => (
                    <Pressable
                      key={suggestion}
                      onPress={() => handleSuggestion(suggestion)}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? colors.backgroundAlt : colors.card,
                        borderWidth: 1.5,
                        borderColor: colors.border,
                        borderRadius: 999,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        minHeight: 44,
                        flexShrink: 0,
                        alignItems: "center",
                        justifyContent: "center",
                      })}
                      testID={`suggestion-chip-${suggestion}`}
                    >
                      <Text style={{ fontSize: 13, color: colors.text, fontWeight: "500" }}>
                        {suggestion}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null
          }
          ListFooterComponent={isLoading ? <TypingIndicator cardBg={assistantBubbleBg} dotColor={dotColor} botBg={colors.primary} botIconColor={colors.card} /> : null}
        />

        {/* Input bar */}
        <View style={{
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: 10,
        }}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Posez votre question..."
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              flex: 1,
              backgroundColor: inputBg,
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 10,
              fontSize: 15,
              color: colors.text,
              maxHeight: 120,
              lineHeight: 20,
            }}
            testID="message-input"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: !inputText.trim() || isLoading ? colors.border : "#3BAD4E",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
              flexShrink: 0,
            })}
            testID="send-button"
          >
            <ArrowUp size={20} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
