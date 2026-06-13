import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Send,
  Mail,
  Phone,
  MessageCircle,
  Briefcase,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { useLang } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

type ChatMessage = {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
};

type ApiMessage = {
  role: "user" | "assistant";
  content: string;
};

// Typing dots animation component
function TypingDots({ color }: { color: string }) {
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  useEffect(() => {
    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.3, { duration: 300 })
      ),
      -1,
      false
    );
    dot2Opacity.value = withDelay(
      150,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.3, { duration: 300 })
        ),
        -1,
        false
      )
    );
    dot3Opacity.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.3, { duration: 300 })
        ),
        -1,
        false
      )
    );
  }, [dot1Opacity, dot2Opacity, dot3Opacity]);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));
  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  return (
    <View style={styles.typingDotsContainer}>
      <Animated.View
        style={[styles.typingDot, { backgroundColor: color }, dot1Style]}
      />
      <Animated.View
        style={[styles.typingDot, { backgroundColor: color }, dot2Style]}
      />
      <Animated.View
        style={[styles.typingDot, { backgroundColor: color }, dot3Style]}
      />
    </View>
  );
}

export default function SettingsHelpScreen() {
  const router = useRouter();
  const t = useLang((s) => s.t);
  const colors = useTheme((s) => s.colors);
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      content: t("help_chat_welcome"),
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isLoading]);

  async function handleSendMessage() {
    const trimmedText = inputText.trim();
    if (!trimmedText || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: trimmedText,
      role: "user",
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText("");
    setIsLoading(true);

    try {
      // Build conversation history for API
      const apiMessages: ApiMessage[] = updatedMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const json = await response.json();
      const assistantContent = json?.data?.message || t("help_chat_error");

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: assistantContent,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: t("help_chat_error"),
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEmailPress() {
    Linking.openURL("mailto:support@jobe.sn");
  }

  function handlePhonePress() {
    Linking.openURL("tel:+221770000000");
  }

  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerSafe: {
      backgroundColor: colors.card,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: colors.toggleBg,
    },
    headerTitle: {
      flex: 1,
      textAlign: "center" as const,
      fontSize: 17,
      fontWeight: "700" as const,
      color: colors.text,
    },
    sectionHeaderText: {
      fontSize: 11,
      fontWeight: "700" as const,
      color: colors.textMuted,
      letterSpacing: 0.8,
    },
    card: {
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: "hidden" as const,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    chatCard: {
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: "hidden" as const,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
      height: 340,
    },
    botAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginRight: 8,
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      borderBottomRightRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxWidth: "80%" as const,
    },
    aiBubble: {
      backgroundColor: colors.toggleBg,
      borderRadius: 16,
      borderBottomLeftRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxWidth: "75%" as const,
    },
    userBubbleText: {
      fontSize: 14,
      color: "#FFFFFF",
      lineHeight: 20,
    },
    aiBubbleText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    inputContainer: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    textInput: {
      flex: 1,
      backgroundColor: colors.toggleBg,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      maxHeight: 80,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    sendBtnDisabled: {
      opacity: 0.5,
    },
    contactRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    contactIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.toggleBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginRight: 12,
    },
    contactTextWrap: {
      flex: 1,
    },
    contactLabel: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 2,
    },
    contactValue: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.text,
    },
    itemSep: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 68,
    },
  };

  return (
    <View testID="settings-help-screen" style={dynamicStyles.container}>
      <SafeAreaView edges={["top"]} style={dynamicStyles.headerSafe}>
        <View style={dynamicStyles.header}>
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={dynamicStyles.backBtn}
          >
            <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={dynamicStyles.headerTitle}>{t("help_title")}</Text>
          <View style={dynamicStyles.backBtn} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* AI Chatbot Section */}
          <View style={styles.sectionHeader}>
            <MessageCircle
              size={14}
              color={colors.textMuted}
              strokeWidth={2}
              style={styles.sectionIcon}
            />
            <Text style={dynamicStyles.sectionHeaderText}>
              {t("help_chat_header")}
            </Text>
          </View>

          <View style={dynamicStyles.chatCard}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatMessages}
              contentContainerStyle={styles.chatMessagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubbleWrap,
                    message.role === "user"
                      ? styles.userBubbleWrap
                      : styles.aiBubbleWrap,
                  ]}
                >
                  {message.role === "assistant" ? (
                    <View style={styles.aiBubbleRow}>
                      <View style={dynamicStyles.botAvatar}>
                        <Briefcase size={14} color="#FFFFFF" strokeWidth={2} />
                      </View>
                      <View style={dynamicStyles.aiBubble}>
                        <Text style={dynamicStyles.aiBubbleText}>
                          {message.content}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={dynamicStyles.userBubble}>
                      <Text style={dynamicStyles.userBubbleText}>
                        {message.content}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              {isLoading ? (
                <View style={[styles.messageBubbleWrap, styles.aiBubbleWrap]}>
                  <View style={styles.aiBubbleRow}>
                    <View style={dynamicStyles.botAvatar}>
                      <Briefcase size={14} color="#FFFFFF" strokeWidth={2} />
                    </View>
                    <View style={dynamicStyles.aiBubble}>
                      <TypingDots color={colors.textMuted} />
                    </View>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={dynamicStyles.inputContainer}>
              <TextInput
                testID="chat-input"
                style={dynamicStyles.textInput}
                placeholder={t("help_chat_placeholder")}
                placeholderTextColor={colors.textMuted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
                blurOnSubmit={false}
                selectionColor={colors.accent}
                cursorColor={colors.accent}
              />
              <Pressable
                testID="send-button"
                onPress={handleSendMessage}
                style={[
                  dynamicStyles.sendBtn,
                  (!inputText.trim() || isLoading) &&
                    dynamicStyles.sendBtnDisabled,
                ]}
                disabled={!inputText.trim() || isLoading}
              >
                <Send size={18} color="#FFFFFF" strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          {/* Contact Section */}
          <View style={styles.sectionHeader}>
            <Text style={dynamicStyles.sectionHeaderText}>
              {t("help_contact_header")}
            </Text>
          </View>

          <View style={dynamicStyles.card}>
            <Pressable
              testID="contact-email"
              style={dynamicStyles.contactRow}
              onPress={handleEmailPress}
            >
              <View style={dynamicStyles.contactIconWrap}>
                <Mail size={20} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={dynamicStyles.contactTextWrap}>
                <Text style={dynamicStyles.contactLabel}>
                  {t("help_contact_email")}
                </Text>
                <Text style={dynamicStyles.contactValue}>support@jobe.sn</Text>
              </View>
            </Pressable>

            <View style={dynamicStyles.itemSep} />

            <Pressable
              testID="contact-phone"
              style={dynamicStyles.contactRow}
              onPress={handlePhonePress}
            >
              <View style={dynamicStyles.contactIconWrap}>
                <Phone size={20} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={dynamicStyles.contactTextWrap}>
                <Text style={dynamicStyles.contactLabel}>
                  {t("help_contact_phone")}
                </Text>
                <Text style={dynamicStyles.contactValue}>+221 77 000 00 00</Text>
              </View>
            </Pressable>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionIcon: {
    marginRight: 6,
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 12,
    gap: 8,
  },
  messageBubbleWrap: {
    width: "100%",
  },
  userBubbleWrap: {
    alignItems: "flex-end",
  },
  aiBubbleWrap: {
    alignItems: "flex-start",
  },
  aiBubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  typingDotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
