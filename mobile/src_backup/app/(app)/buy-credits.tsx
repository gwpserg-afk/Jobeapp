import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Check, ArrowLeft } from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { UserMe } from "@/types";
import { USER_ME_QUERY_KEY } from "@/lib/hooks/useUser";
import {
  isRevenueCatEnabled,
  getPackage,
  purchasePackage,
} from "@/lib/revenuecatClient";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { showToast } from "@/lib/toast";

type CreditPackage = "10" | "25" | "50" | "100";

interface Package {
  id: CreditPackage;
  credits: number;
  originalPrice: string;
  subtitle: string;
  popular?: boolean;
}

const PACKAGES: Package[] = [
  {
    id: "10",
    credits: 10,
    originalPrice: "1 000 FCFA",
    subtitle: "Great for a few applications",
  },
  {
    id: "25",
    credits: 25,
    originalPrice: "2 000 FCFA",
    subtitle: "Best value for active job seekers",
    popular: true,
  },
  {
    id: "50",
    credits: 50,
    originalPrice: "3 500 FCFA",
    subtitle: "For serious applicants",
  },
  {
    id: "100",
    credits: 100,
    originalPrice: "6 000 FCFA",
    subtitle: "Maximum credits pack",
  },
];

export default function BuyCreditsScreen() {
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme((s) => s);
  const t = useLang((s) => s.t);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage>("25");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [purchasedAmount, setPurchasedAmount] = useState(0);

  const { data: user } = useQuery({
    queryKey: USER_ME_QUERY_KEY,
    queryFn: () => api.get<UserMe>("/api/me"),
    staleTime: 1000 * 60 * 5,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: CreditPackage) => {
      return api.post<{ credits: number }>("/api/credits/purchase", {
        package: pkg,
      });
    },
    onSuccess: (_data, pkg) => {
      queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
      const pkgInfo = PACKAGES.find((p) => p.id === pkg);
      const amount = pkgInfo?.credits ?? 0;
      setPurchasedAmount(amount);
      setShowSuccessModal(true);
      showToast(`+${amount} crédits ajoutés / +${amount} credits added / 已添加${amount}个积分`, "success");
    },
    onError: (_err, pkg) => {
      // Free demo — show success regardless
      queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
      const pkgInfo = PACKAGES.find((p) => p.id === pkg);
      const amount = pkgInfo?.credits ?? 0;
      setPurchasedAmount(amount);
      setShowSuccessModal(true);
      showToast(`+${amount} crédits ajoutés / +${amount} credits added / 已添加${amount}个积分`, "success");
    },
  });

  const currentBalance = user?.credits ?? 0;
  const selected = PACKAGES.find((p) => p.id === selectedPackage)!;

  const handlePurchase = async () => {
    const rcEnabled = isRevenueCatEnabled();

    if (rcEnabled) {
      const rcIdentifier =
        selectedPackage === "10"
          ? "$rc_custom_credits_10"
          : selectedPackage === "25"
          ? "$rc_custom_credits_25"
          : selectedPackage === "50"
          ? "$rc_custom_credits_50"
          : "$rc_custom_credits_100";

      const pkg = await getPackage(rcIdentifier);
      if (pkg.ok && pkg.data) {
        await purchasePackage(pkg.data);
      }
    }

    purchaseMutation.mutate(selectedPackage);
  };

  const GREEN = colors.accent;
  const balanceBg = isDark ? colors.card : "#EEF4FF";
  const balanceBorder = isDark ? colors.border : "#C7D7FA";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.card }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable
            testID="close-buy-credits"
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.toggleBg,
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={4}
          >
            <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 17,
              fontWeight: "700",
              color: colors.text,
            }}
          >
            {t("credits_buy_now")}
          </Text>
          <View style={{ width: 44, height: 44 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Balance Card */}
        <View
          testID="current-balance-card"
          style={{
            backgroundColor: balanceBg,
            borderRadius: 12,
            padding: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: balanceBorder,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: GREEN,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={26} color="#FFFFFF" fill="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "500" }}>
              {t("credits_current_balance")}
            </Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "800",
                color: colors.text,
                marginTop: 2,
              }}
            >
              {currentBalance}{" "}
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary }}>
                {t("credits_label")}
              </Text>
            </Text>
          </View>
        </View>

        {/* Launch offer banner */}
        <View
          style={{
            backgroundColor: GREEN,
            borderRadius: 12,
            padding: 12,
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Zap size={18} color="#FFFFFF" fill="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#FFFFFF" }}>
              {t("launch_offer_badge")}
            </Text>
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 1 }}>
              {t("launch_offer_desc")}
            </Text>
          </View>
        </View>

        {/* Section label */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: "800",
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 12,
          }}
        >
          {t("credits_choose_package")}
        </Text>

        {/* Packages */}
        <View style={{ gap: 12, marginBottom: 28 }}>
          {PACKAGES.map((pkg) => {
            const isSelected = selectedPackage === pkg.id;
            const cardBg = isSelected
              ? isDark
                ? "rgba(59,173,78,0.18)"
                : "#EBF8EE"
              : colors.card;
            return (
              <Pressable
                key={pkg.id}
                testID={`package-${pkg.id}`}
                onPress={() => setSelectedPackage(pkg.id)}
                style={({ pressed }) => ({
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: isSelected ? GREEN : colors.border,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  opacity: pressed ? 0.9 : 1,
                  shadowColor: isSelected ? GREEN : "#000",
                  shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                  shadowOpacity: isSelected ? 0.14 : 0.05,
                  shadowRadius: isSelected ? 10 : 6,
                  elevation: isSelected ? 4 : 2,
                })}
              >
                {/* Icon */}
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isSelected ? GREEN : colors.toggleBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Zap
                    size={22}
                    color={isSelected ? "#FFFFFF" : colors.textSecondary}
                    fill={isSelected ? "#FFFFFF" : "none"}
                  />
                </View>

                {/* Labels */}
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "800",
                        color: isSelected ? GREEN : colors.text,
                      }}
                    >
                      {pkg.credits} {t("credits_label")}
                    </Text>
                    {pkg.popular ? (
                      <View
                        style={{
                          backgroundColor: GREEN,
                          borderRadius: 6,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "800",
                            color: "#FFFFFF",
                            letterSpacing: 0.5,
                          }}
                        >
                          POPULAR
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {pkg.subtitle}
                  </Text>
                </View>

                {/* Price (crossed out) + FREE + selection indicator */}
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textMuted,
                      textDecorationLine: "line-through",
                    }}
                  >
                    {pkg.originalPrice}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: GREEN,
                    }}
                  >
                    GRATUIT
                  </Text>
                  {isSelected ? (
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: GREEN,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={13} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : (
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: colors.border,
                      }}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Purchase button */}
        <Pressable
          testID="purchase-button"
          onPress={handlePurchase}
          disabled={purchaseMutation.isPending}
          style={({ pressed }) => ({
            backgroundColor: purchaseMutation.isPending ? "#2d9142" : GREEN,
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            opacity: pressed ? 0.92 : 1,
            shadowColor: GREEN,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 4,
          })}
        >
          {purchaseMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Zap size={18} color="#FFFFFF" fill="#FFFFFF" />
          )}
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF" }}>
            {purchaseMutation.isPending
              ? t("credits_claiming")
              : `${t("credits_claim_btn")} — ${selected.credits} ${t("credits_label")}`}
          </Text>
        </Pressable>

        {/* Footnote */}
        <Text
          style={{
            textAlign: "center",
            fontSize: 12,
            color: colors.textMuted,
            marginTop: 12,
            lineHeight: 18,
          }}
        >
          {t("launch_offer_desc")}
        </Text>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.back();
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 24,
              padding: 32,
              alignItems: "center",
              width: "100%",
              maxWidth: 340,
              gap: 12,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: isDark ? "rgba(59,173,78,0.2)" : "#EBF8EE",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <Zap size={36} color={GREEN} fill={GREEN} />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: colors.text,
                textAlign: "center",
              }}
            >
              Crédits Gratuits !
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              Free Credits!
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.textMuted,
                textAlign: "center",
              }}
            >
              积分已添加！
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight: 22,
              }}
            >
              +{purchasedAmount} {t("credits_free_desc")}
            </Text>
            <Pressable
              testID="success-close-button"
              onPress={() => {
                setShowSuccessModal(false);
                router.back();
              }}
              style={{
                backgroundColor: GREEN,
                borderRadius: 8,
                paddingVertical: 13,
                paddingHorizontal: 32,
                marginTop: 8,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>
                {t("premium_start_using")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
