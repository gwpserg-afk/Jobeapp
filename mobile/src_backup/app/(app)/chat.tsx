import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Send } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import { useDemoStore } from "@/lib/demoStore";

const ACCENT = "#3BAD4E";
const NAVY = "#1B2F6E";

type Message = {
  id: string;
  senderId: string;
  text: string;
  time: string;
  date: string;
};

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const conversations = useDemoStore((s) => s.conversations);
  const sendMessage = useDemoStore((s) => s.sendMessage);
  const markConversationRead = useDemoStore((s) => s.markConversationRead);

  const conversation = conversations.find((c) => c.id === conversationId);

  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (conversationId) {
      markConversationRead(conversationId);
    }
  }, [conversationId, markConversationRead]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !conversationId) return;
    sendMessage(conversationId, text);
    setInputText("");
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const messages: Message[] = conversation?.messages ?? [];

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === "me";
    const prevItem = index > 0 ? messages[index - 1] : null;
    const showDateSeparator = !prevItem || prevItem.date !== item.date;

    return (
      <View>
        {showDateSeparator ? (
          <View style={{ alignItems: "center", marginVertical: 12 }}>
            <View style={{
              backgroundColor: isDark ? "#1E2C50" : "#E5E9F2",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}>
              <Text style={{ fontSize: 12, color: isDark ? "#9BA5BF" : "#6B7280", fontWeight: "500" }}>
                {item.date}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{
          flexDirection: "row",
          justifyContent: isMe ? "flex-end" : "flex-start",
          marginHorizontal: 16,
          marginVertical: 3,
        }}>
          <View style={{ maxWidth: "75%" }}>
            <View style={{
              backgroundColor: isMe
                ? ACCENT
                : isDark ? "#1E2C50" : "#F0F4FF",
              borderRadius: 14,
              borderBottomRightRadius: isMe ? 4 : 14,
              borderBottomLeftRadius: isMe ? 14 : 4,
              paddingHorizontal: 13,
              paddingVertical: 9,
            }}>
              <Text style={{
                fontSize: 14,
                color: isMe ? "#FFFFFF" : (isDark ? "#E5E7EB" : "#1F2937"),
                lineHeight: 20,
              }}>
                {item.text}
              </Text>
            </View>
            <Text style={{
              fontSize: 11,
              color: isDark ? "#6B7280" : "#9CA3AF",
              marginTop: 3,
              textAlign: isMe ? "right" : "left",
            }}>
              {item.time}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!conversation) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textMuted }}>Conversation introuvable</Text>
      </View>
    );
  }

  const participant = conversation.participant;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          }}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
            </Pressable>

            {/* Avatar */}
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: participant.avatarColor,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFF" }}>
                {participant.initials}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }} numberOfLines={1}>
                {participant.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ACCENT }} />
                <Text style={{ fontSize: 12, color: ACCENT, fontWeight: "500" }}>En ligne</Text>
              </View>
            </View>
          </View>

          {/* Messages list */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          {/* Input bar */}
          <View style={{
            flexDirection: "row",
            alignItems: "flex-end",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            gap: 10,
          }}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Votre message..."
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              multiline
              style={{
                flex: 1,
                minHeight: 42,
                maxHeight: 120,
                backgroundColor: isDark ? "#1E2C50" : "#F0F4FF",
                borderRadius: 21,
                paddingHorizontal: 16,
                paddingTop: 11,
                paddingBottom: 11,
                fontSize: 14,
                color: colors.text,
                lineHeight: 20,
              }}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <Pressable
              onPress={handleSend}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: inputText.trim() ? ACCENT : (isDark ? "#1E2C50" : "#E5E9F2"),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send size={18} color={inputText.trim() ? "#FFF" : (isDark ? "#6B7280" : "#9CA3AF")} strokeWidth={2} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
