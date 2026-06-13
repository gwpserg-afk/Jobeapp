import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Megaphone,
  Crown,
  Clock,
  Zap,
  Globe,
  Tag,
  FileText,
  Building2,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { UserMe, Promotion } from "@/types";
import { USER_ME_QUERY_KEY } from "@/lib/hooks/useUser";
import { useTheme } from "@/lib/theme";

type DurationOption = 3 | 7 | 14 | 30;

interface DurationConfig {
  days: DurationOption;
  credits: number;
  label: string;
}

const DURATION_OPTIONS: DurationConfig[] = [
  { days: 3, credits: 5, label: "3 days" },
  { days: 7, credits: 10, label: "7 days" },
  { days: 14, credits: 18, label: "14 days" },
  { days: 30, credits: 30, label: "30 days" },
];

export default function CreatePromotionScreen() {
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();

  const [businessName, setBusinessName] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(7);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPremiumRequired, setShowPremiumRequired] = useState(false);

  const titleRef = useRef<TextInput>(null);
  const contentRef = useRef<TextInput>(null);
  const imageUrlRef = useRef<TextInput>(null);
  const websiteUrlRef = useRef<TextInput>(null);

  const { data: user } = useQuery({
    queryKey: USER_ME_QUERY_KEY,
    queryFn: () => api.get<UserMe>("/api/me"),
    staleTime: 1000 * 60 * 5,
  });

  const currentCredits = user?.credits ?? 0;
  const isPremium = user?.isPremium ?? false;

  const selectedConfig = DURATION_OPTIONS.find(
    (d) => d.days === selectedDuration
  )!;
  const creditCost = selectedConfig.credits;

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Promotion>("/api/promotions", {
        businessName,
        title,
        content,
        imageUrl: imageUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        durationDays: selectedDuration,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      router.back();
    },
    onError: (error: any) => {
      const code = error?.code ?? error?.body?.error?.code ?? null;
      const message =
        error?.message ?? error?.body?.error?.message ?? "Something went wrong. Please try again.";

      if (code === "PREMIUM_REQUIRED") {
        setShowPremiumRequired(true);
        setErrorMessage(null);
      } else if (code === "NO_CREDITS") {
        setErrorMessage("You don't have enough credits. Please purchase more credits to continue.");
      } else {
        setErrorMessage(message);
      }
    },
  });

  const handleSubmit = () => {
    setErrorMessage(null);
    setShowPremiumRequired(false);

    if (!businessName.trim()) {
      setErrorMessage("Business name is required.");
      return;
    }
    if (!title.trim()) {
      setErrorMessage("Promotion title is required.");
      return;
    }
    if (!content.trim()) {
      setErrorMessage("Description is required.");
      return;
    }

    mutation.mutate();
  };

  // Premium locked state
  if (!isPremium || showPremiumRequired) {
    return (
      <View testID="create-promotion-screen" style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.card }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#FEF3C7",
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "#FEF3C7",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Megaphone size={18} color="#D97706" />
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 19,
                fontWeight: "800",
                color: colors.text,
                letterSpacing: -0.3,
              }}
            >
              Create Promotion
            </Text>
            <Pressable
              testID="close-button"
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: colors.toggleBg,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <X size={17} color={colors.textSecondary} />
            </Pressable>
          </View>
        </SafeAreaView>

        <View
          testID="premium-locked-state"
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: isDark ? "#2A2000" : "#FFFBEB",
              borderWidth: 3,
              borderColor: isDark ? "#5A4500" : "#FDE68A",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Crown size={42} color="#D97706" />
          </View>

          <Text
            style={{
              fontSize: 26,
              fontWeight: "800",
              color: colors.text,
              textAlign: "center",
              marginBottom: 12,
              letterSpacing: -0.5,
            }}
          >
            Premium Required
          </Text>

          <Text
            style={{
              fontSize: 15,
              color: colors.textSecondary,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 32,
              maxWidth: 280,
            }}
          >
            Creating promotions is a premium feature. Upgrade to Premium to
            showcase your business to thousands of job seekers.
          </Text>

          <Pressable
            testID="get-premium-button"
            onPress={() => router.push("/(app)/premium")}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#B45309" : "#D97706",
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 40,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              shadowColor: "#D97706",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 6,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Crown size={18} color="#FFFFFF" />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: "#FFFFFF",
                letterSpacing: 0.2,
              }}
            >
              Get Premium
            </Text>
          </Pressable>

          <Pressable
            testID="cancel-button"
            onPress={() => router.back()}
            style={({ pressed }) => ({
              marginTop: 14,
              paddingVertical: 10,
              paddingHorizontal: 20,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600" }}>
              Maybe later
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View testID="create-promotion-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.card }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#FEF3C7",
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: "#FEF3C7",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Megaphone size={18} color="#D97706" />
          </View>
          <Text
            style={{
              flex: 1,
              fontSize: 19,
              fontWeight: "800",
              color: colors.text,
              letterSpacing: -0.3,
            }}
          >
            Create Promotion
          </Text>
          <Pressable
            testID="close-button"
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: colors.toggleBg,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <X size={17} color={colors.textSecondary} />
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Business Name */}
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <Building2 size={14} color="#D97706" />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Business Name{" "}
                <Text style={{ color: "#EF4444" }}>*</Text>
              </Text>
            </View>
            <TextInput
              testID="business-name-input"
              value={businessName}
              onChangeText={(t) => {
                if (t.length <= 100) setBusinessName(t);
              }}
              placeholder="e.g. Acme Corp, The Coffee Place..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="next"
              onSubmitEditing={() => titleRef.current?.focus()}
              style={{
                backgroundColor: colors.toggleBg,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: businessName.length > 0 ? "#FDE68A" : colors.border,
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                color: colors.text,
              }}
            />
            <Text
              style={{
                fontSize: 11,
                color: colors.textMuted,
                textAlign: "right",
                marginTop: 4,
              }}
            >
              {businessName.length}/100
            </Text>
          </View>

          {/* Promotion Title */}
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <Tag size={14} color="#D97706" />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Promotion Title{" "}
                <Text style={{ color: "#EF4444" }}>*</Text>
              </Text>
            </View>
            <TextInput
              testID="promotion-title-input"
              ref={titleRef}
              value={title}
              onChangeText={(t) => {
                if (t.length <= 150) setTitle(t);
              }}
              placeholder="e.g. 20% off all services this month!"
              placeholderTextColor={colors.textMuted}
              returnKeyType="next"
              onSubmitEditing={() => contentRef.current?.focus()}
              style={{
                backgroundColor: colors.toggleBg,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: title.length > 0 ? "#FDE68A" : colors.border,
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                color: colors.text,
              }}
            />
            <Text
              style={{
                fontSize: 11,
                color: colors.textMuted,
                textAlign: "right",
                marginTop: 4,
              }}
            >
              {title.length}/150
            </Text>
          </View>

          {/* Description */}
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <FileText size={14} color="#D97706" />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Description{" "}
                <Text style={{ color: "#EF4444" }}>*</Text>
              </Text>
            </View>
            <TextInput
              testID="description-input"
              ref={contentRef}
              value={content}
              onChangeText={(t) => {
                if (t.length <= 1000) setContent(t);
              }}
              placeholder="Describe your promotion in detail..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{
                backgroundColor: colors.toggleBg,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: content.length > 0 ? "#FDE68A" : colors.border,
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                color: colors.text,
                minHeight: 120,
              }}
            />
            <Text
              style={{
                fontSize: 11,
                color: colors.textMuted,
                textAlign: "right",
                marginTop: 4,
              }}
            >
              {content.length}/1000
            </Text>
          </View>

          {/* Image URL */}
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <Zap size={14} color={colors.textMuted} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Image URL{" "}
                <Text style={{ color: colors.textMuted, fontWeight: "400", fontSize: 11 }}>
                  (optional)
                </Text>
              </Text>
            </View>
            <TextInput
              testID="image-url-input"
              ref={imageUrlRef}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="next"
              onSubmitEditing={() => websiteUrlRef.current?.focus()}
              style={{
                backgroundColor: colors.toggleBg,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: imageUrl.length > 0 ? "#FDE68A" : colors.border,
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                color: colors.text,
              }}
            />
          </View>

          {/* Website URL */}
          <View style={{ marginBottom: 28 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <Globe size={14} color={colors.textMuted} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Website URL{" "}
                <Text style={{ color: colors.textMuted, fontWeight: "400", fontSize: 11 }}>
                  (optional)
                </Text>
              </Text>
            </View>
            <TextInput
              testID="website-url-input"
              ref={websiteUrlRef}
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              placeholder="https://yourbusiness.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="done"
              style={{
                backgroundColor: colors.toggleBg,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: websiteUrl.length > 0 ? "#FDE68A" : colors.border,
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                color: colors.text,
              }}
            />
          </View>

          {/* Duration Selector */}
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <Clock size={14} color="#D97706" />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Duration
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 10, paddingRight: 4 }}
            >
              {DURATION_OPTIONS.map((option) => {
                const isSelected = selectedDuration === option.days;
                return (
                  <Pressable
                    key={option.days}
                    testID={`duration-option-${option.days}`}
                    onPress={() => setSelectedDuration(option.days)}
                    style={({ pressed }) => ({
                      borderRadius: 14,
                      borderWidth: 2,
                      borderColor: isSelected ? "#D97706" : colors.border,
                      backgroundColor: isSelected ? (isDark ? "#2A2000" : "#FFFBEB") : colors.toggleBg,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      alignItems: "center",
                      minWidth: 90,
                      opacity: pressed ? 0.85 : 1,
                      shadowColor: isSelected ? "#D97706" : "#000",
                      shadowOffset: { width: 0, height: isSelected ? 3 : 1 },
                      shadowOpacity: isSelected ? 0.2 : 0.05,
                      shadowRadius: isSelected ? 8 : 3,
                      elevation: isSelected ? 3 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: isSelected ? "#92400E" : colors.text,
                        marginBottom: 2,
                      }}
                    >
                      {option.label}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 3,
                        backgroundColor: isSelected ? "#FDE68A" : colors.border,
                        borderRadius: 8,
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                        marginTop: 4,
                      }}
                    >
                      <Zap
                        size={10}
                        color={isSelected ? "#92400E" : colors.textSecondary}
                        fill={isSelected ? "#92400E" : "none"}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: isSelected ? "#92400E" : colors.textSecondary,
                        }}
                      >
                        {option.credits} credits
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Credit Cost Summary Card */}
          <View
            testID="credit-cost-card"
            style={{
              backgroundColor: isDark ? "#2A2000" : "#FFFBEB",
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: isDark ? "#5A4500" : "#FDE68A",
              padding: 20,
              alignItems: "center",
              marginBottom: 24,
              shadowColor: "#D97706",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 14,
                alignSelf: "flex-start",
              }}
            >
              <Zap size={15} color="#D97706" fill="#D97706" />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "800",
                  color: "#92400E",
                  textTransform: "uppercase",
                  letterSpacing: 0.7,
                }}
              >
                Credit Cost
              </Text>
            </View>

            <Text
              style={{
                fontSize: 48,
                fontWeight: "900",
                color: "#92400E",
                lineHeight: 52,
                letterSpacing: -1,
              }}
            >
              {creditCost}
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#D97706",
                marginBottom: 4,
              }}
            >
              credits
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#92400E",
                opacity: 0.7,
                marginBottom: 16,
              }}
            >
              for {selectedDuration} days of promotion
            </Text>

            <View
              style={{
                width: "100%",
                height: 1,
                backgroundColor: "#FDE68A",
                marginBottom: 14,
              }}
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <Text style={{ fontSize: 13, color: "#92400E", fontWeight: "500" }}>
                Your balance
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Zap size={13} color={currentCredits >= creditCost ? "#D97706" : "#EF4444"} fill={currentCredits >= creditCost ? "#D97706" : "#EF4444"} />
                <Text
                  testID="credit-balance"
                  style={{
                    fontSize: 15,
                    fontWeight: "800",
                    color: currentCredits >= creditCost ? "#92400E" : "#EF4444",
                  }}
                >
                  {currentCredits} credits
                </Text>
              </View>
            </View>

            {currentCredits < creditCost ? (
              <View
                style={{
                  marginTop: 12,
                  backgroundColor: "#FEF2F2",
                  borderRadius: 10,
                  padding: 10,
                  width: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 12, color: "#DC2626", flex: 1, lineHeight: 16 }}>
                  Not enough credits. You need {creditCost - currentCredits} more.{" "}
                  <Text
                    testID="buy-more-credits-link"
                    onPress={() => router.push("/(app)/buy-credits")}
                    style={{ fontWeight: "700", textDecorationLine: "underline" }}
                  >
                    Buy more
                  </Text>
                </Text>
              </View>
            ) : null}
          </View>

          {/* Error message */}
          {errorMessage ? (
            <View
              testID="error-message"
              style={{
                backgroundColor: "#FEF2F2",
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#FCA5A5",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 13, color: "#DC2626", flex: 1, lineHeight: 18 }}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <Pressable
            testID="post-promotion-button"
            onPress={handleSubmit}
            disabled={mutation.isPending}
            style={({ pressed }) => ({
              backgroundColor: mutation.isPending ? "#FCD34D" : "#D97706",
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              opacity: pressed ? 0.9 : 1,
              shadowColor: "#D97706",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 6,
            })}
          >
            {mutation.isPending ? (
              <ActivityIndicator testID="submit-loading" size="small" color="#FFFFFF" />
            ) : (
              <Megaphone size={18} color="#FFFFFF" />
            )}
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: "#FFFFFF",
                letterSpacing: 0.2,
              }}
            >
              {mutation.isPending ? "Posting..." : "Post Promotion"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
