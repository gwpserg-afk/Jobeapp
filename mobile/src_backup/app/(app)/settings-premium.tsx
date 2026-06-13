import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, Smartphone, CreditCard, Banknote } from "lucide-react-native";
import { useLang } from "../../lib/i18n";
import { showToast } from "../../lib/toast";
import { useTheme } from "@/lib/theme";
import { useDemoStore } from "@/lib/demoStore";

export default function SettingsPremiumScreen() {
  const router = useRouter();
  const { t } = useLang();
  const colors = useTheme((s) => s.colors);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const demoAccountType = useDemoStore((s) => s.demoAccountType);

  const isDark = useTheme((s) => s.isDark);

  const allPlans = [
    {
      id: "candidate",
      title: t("premium_plan_candidate_title"),
      price: t("premium_plan_candidate_price"),
      features: [
        t("premium_plan_candidate_f1"),
        t("premium_plan_candidate_f2"),
        t("premium_plan_candidate_f3"),
      ],
      accent: "#1B2F6E",
    },
    {
      id: "recruiter",
      title: t("premium_plan_recruiter_title"),
      price: t("premium_plan_recruiter_price"),
      features: [
        t("premium_plan_recruiter_f1"),
        t("premium_plan_recruiter_f2"),
        t("premium_plan_recruiter_f3"),
      ],
      accent: "#D97706",
    },
  ];

  // Show only the relevant plan based on account type
  const plans = allPlans.filter((plan) => plan.id === demoAccountType);

  const paymentMethods = [
    { id: "wave", name: "Wave", icon: Smartphone, color: "#1DC9FF" },
    { id: "orange", name: "Orange Money", icon: Banknote, color: "#FF6600" },
    { id: "card", name: t("premium_payment_card"), icon: CreditCard, color: "#6366F1" },
  ];

  function handleChoose() {
    showToast(t("premium_payment_coming_soon"), "info");
  }

  function handlePaymentSelect(paymentId: string) {
    setSelectedPayment(paymentId);
    showToast(t("premium_coming_soon_label"), "info");
  }

  return (
    <View testID="settings-premium-screen" style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={["top"]} style={[styles.headerSafe, { backgroundColor: colors.card }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.background }]}
          >
            <ArrowLeft size={22} color={colors.primary} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>
            {t("premium_plan_header")}
          </Text>
          <View style={[styles.backBtn, { backgroundColor: "transparent" }]} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.currentPlanBadge, {
          backgroundColor: isDark ? "rgba(22, 163, 74, 0.15)" : "#F0FDF4",
          borderColor: isDark ? "rgba(22, 163, 74, 0.3)" : "#BBF7D0",
        }]}>
          <Text style={styles.currentPlanText}>
            {t("premium_current_free")}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, { color: colors.textMuted }]}>
            {t("premium_upgrade_section").toUpperCase()}
          </Text>
        </View>

        {plans.map((plan) => (
          <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.card, borderColor: plan.accent + "33" }]}>
            <View style={[styles.planHeader, { backgroundColor: plan.accent + (isDark ? "22" : "18") }]}>
              <Text style={[styles.planTitle, { color: isDark ? colors.text : plan.accent }]}>{plan.title}</Text>
              <Text style={[styles.planPrice, { color: isDark ? colors.text : plan.accent }]}>{plan.price}</Text>
            </View>
            <View style={styles.planBody}>
              {plan.features.map((feature: string, idx: number) => (
                <View key={idx} style={styles.featureRow}>
                  <View style={[styles.featureCheckWrap, { backgroundColor: plan.accent + (isDark ? "22" : "18") }]}>
                    <Check size={12} color={isDark ? colors.text : plan.accent} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                </View>
              ))}
              <Pressable
                testID={`choose-plan-${plan.id}`}
                onPress={handleChoose}
                style={[styles.chooseBtn, { backgroundColor: plan.accent }]}
              >
                <Text style={styles.chooseBtnText}>
                  {t("premium_choose_plan_btn")}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, { color: colors.textMuted }]}>
            {t("premium_payment_section").toUpperCase()}
          </Text>
        </View>

        <View style={[styles.paymentMethodsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {paymentMethods.map((method, index) => {
            const Icon = method.icon;
            const isSelected = selectedPayment === method.id;
            const isLast = index === paymentMethods.length - 1;

            return (
              <Pressable
                key={method.id}
                testID={`payment-method-${method.id}`}
                onPress={() => handlePaymentSelect(method.id)}
                style={[
                  styles.paymentMethodRow,
                  !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  isSelected && { backgroundColor: colors.background },
                ]}
              >
                <View style={[styles.paymentMethodIcon, { backgroundColor: method.color + "15" }]}>
                  <Icon size={20} color={method.color} strokeWidth={2} />
                </View>
                <Text style={[styles.paymentMethodName, { color: colors.text }]}>
                  {method.name}
                </Text>
                <View style={[
                  styles.paymentMethodRadio,
                  { borderColor: isSelected ? method.color : colors.border },
                  isSelected && { backgroundColor: method.color },
                ]}>
                  {isSelected ? <View style={styles.paymentMethodRadioInner} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSafe: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  currentPlanBadge: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  currentPlanText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16A34A",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  planCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  planHeader: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "800",
  },
  planBody: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  featureCheckWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    fontWeight: "500",
  },
  chooseBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  chooseBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  paymentMethodsCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  paymentMethodRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  paymentMethodName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  paymentMethodRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
});
