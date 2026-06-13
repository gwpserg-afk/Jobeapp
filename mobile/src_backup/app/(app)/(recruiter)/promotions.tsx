import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Linking,
  Image,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Plus, Megaphone, Clock, ExternalLink, Store } from "lucide-react-native";
import { router } from "expo-router";
import { api } from "@/lib/api/api";
import type { UserMe, Promotion } from "@/types";
import { USER_ME_QUERY_KEY } from "@/lib/hooks/useUser";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { DEMO_COMPANIES } from "@/lib/demoData";

// ─── Demo Promotions ──────────────────────────────────────────────────────────

type LocalizedContent = { fr: string; en: string; zh: string };

const DEMO_PROMOTIONS: (Promotion & { logoColor: string; logoInitials: string })[] = [
  {
    id: "demo-promo-1",
    userId: "company-1",
    businessName: "Orange Sénégal",
    title: "Offre Spéciale PME — Internet Fibre",
    content: { fr: "Offre spéciale PME — Forfait Internet Fibre 50 Mbps à 45 000 FCFA/mois. Contactez notre service commercial dès aujourd'hui. 📡", en: "Special SME offer — 50 Mbps Fiber Internet package at 45,000 FCFA/month. Contact our sales team today. 📡", zh: "中小企业特别优惠——50 Mbps光纤互联网套餐，每月45,000 FCFA。今天就联系我们的销售团队。📡" } as unknown as string,
    imageUrl: null,
    websiteUrl: "https://www.orange.sn",
    durationDays: 30,
    creditCost: 10,
    expiresAt: "2026-04-30T23:59:59.000Z",
    createdAt: "2026-03-24T00:00:00.000Z",
    user: { id: "company-1", name: "Orange Sénégal", image: null },
    logoColor: DEMO_COMPANIES[0]?.logoColor ?? "#FF6600",
    logoInitials: DEMO_COMPANIES[0]?.logoInitials ?? "OS",
  },
  {
    id: "demo-promo-2",
    userId: "company-3",
    businessName: "Banque de l'Afrique de l'Ouest",
    title: "Compte Professionnel Gratuit",
    content: { fr: "Ouvrez votre compte professionnel en ligne en 5 minutes. Zéro frais de tenue de compte pendant le premier trimestre. 💳", en: "Open your professional account online in 5 minutes. Zero account maintenance fees for the first quarter. 💳", zh: "5分钟内在线开立您的专业账户。第一季度零账户管理费。💳" } as unknown as string,
    imageUrl: null,
    websiteUrl: "https://www.bao.sn",
    durationDays: 30,
    creditCost: 10,
    expiresAt: "2026-04-15T23:59:59.000Z",
    createdAt: "2026-03-24T00:00:00.000Z",
    user: { id: "company-3", name: "Banque de l'Afrique de l'Ouest", image: null },
    logoColor: DEMO_COMPANIES[2]?.logoColor ?? "#1B2F6E",
    logoInitials: DEMO_COMPANIES[2]?.logoInitials ?? "BAO",
  },
  {
    id: "demo-promo-3",
    userId: "company-2",
    businessName: "La Sénégalaise de l'Automobile",
    title: "Reprise Véhicule — Meilleur Prix",
    content: { fr: "Reprise de votre ancien véhicule au meilleur prix du marché ! Offre valable jusqu'à la fin du mois de mars 2026. 🚗", en: "Trade in your old vehicle at the best market price! Offer valid until the end of March 2026. 🚗", zh: "以市场最优价格换购您的旧车！优惠有效期至2026年3月底。🚗" } as unknown as string,
    imageUrl: null,
    websiteUrl: null,
    durationDays: 30,
    creditCost: 10,
    expiresAt: "2026-03-31T23:59:59.000Z",
    createdAt: "2026-03-24T00:00:00.000Z",
    user: { id: "company-2", name: "La Sénégalaise de l'Automobile", image: null },
    logoColor: DEMO_COMPANIES[1]?.logoColor ?? "#2C3E50",
    logoInitials: DEMO_COMPANIES[1]?.logoInitials ?? "SA",
  },
];

function getLocalizedContent(content: string | LocalizedContent, lang: string): string {
  if (typeof content === "string") return content;
  return (content as LocalizedContent)[lang as keyof LocalizedContent] ?? content.fr;
}

function getDaysRemaining(expiresAt: string): number {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function AvatarImage({ uri, name, size = 40, logoColor, logoInitials }: { uri: string | null; name: string; size?: number; logoColor?: string; logoInitials?: string }) {
  const { colors } = useTheme();
  const [error, setError] = useState(false);

  if (uri && !error) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.toggleBg }}
        onError={() => setError(true)}
      />
    );
  }

  const bgColor = logoColor ?? "#F59E0B";
  const initials = logoInitials ?? getInitials(name);

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#FFFFFF", fontSize: size * 0.3, fontWeight: "700" }}>
        {initials}
      </Text>
    </View>
  );
}

type PromotionWithMeta = Promotion & { logoColor?: string; logoInitials?: string };

function PromotionCard({ promotion }: { promotion: PromotionWithMeta }) {
  const { colors } = useTheme();
  const isDark = useTheme((s) => s.isDark);
  const lang = useLang((s) => s.lang);
  const daysRemaining = getDaysRemaining(promotion.expiresAt);
  const contentText = getLocalizedContent(promotion.content as string | LocalizedContent, lang);

  const handleVisitWebsite = useCallback(async () => {
    if (!promotion.websiteUrl) return;
    let url = promotion.websiteUrl;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  }, [promotion.websiteUrl]);

  const timeBg = daysRemaining <= 3
    ? (isDark ? "rgba(239,68,68,0.18)" : "#FEE2E2")
    : (isDark ? "rgba(245,158,11,0.18)" : "#FEF3C7");
  const timeColor = daysRemaining <= 3 ? "#DC2626" : "#D97706";

  return (
    <View
      testID={`promotion-card-${promotion.id}`}
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: isDark ? "rgba(245,158,11,0.2)" : "#FEF3C7",
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        overflow: "hidden",
      }}
    >
      {/* Accent bar */}
      <View style={{ height: 3, backgroundColor: "#F59E0B" }} />

      {/* Card Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <AvatarImage uri={promotion.user.image} name={promotion.businessName} size={42} logoColor={promotion.logoColor} logoInitials={promotion.logoInitials} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, letterSpacing: -0.2 }} numberOfLines={1}>
            {promotion.businessName}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }} numberOfLines={1}>
            {promotion.user.name}
          </Text>
        </View>
        <View style={{
          backgroundColor: isDark ? "rgba(245,158,11,0.18)" : "#FEF3C7",
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderWidth: 1,
          borderColor: isDark ? "rgba(245,158,11,0.3)" : "#FDE68A",
        }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: "#92400E", letterSpacing: 0.8 }}>
            SPONSORED
          </Text>
        </View>
      </View>

      {/* Card Body */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text, letterSpacing: -0.3, marginBottom: 8 }}>
          {promotion.title}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 12 }}>
          {contentText}
        </Text>
      </View>

      {/* Optional Image */}
      {promotion.imageUrl ? (
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Image
            source={{ uri: promotion.imageUrl }}
            style={{ width: "100%", height: 180, borderRadius: 10, backgroundColor: colors.toggleBg }}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {/* Card Footer */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingBottom: 14,
        paddingTop: promotion.imageUrl ? 0 : 4,
        gap: 8,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: timeBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, gap: 4 }}>
          <Clock size={12} color={timeColor} strokeWidth={2.5} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: timeColor }}>
            {daysRemaining === 0 ? "Expire aujourd'hui" : daysRemaining === 1 ? "1 jour restant" : `${daysRemaining} jours restants`}
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        {promotion.websiteUrl ? (
          <Pressable
            testID={`visit-website-${promotion.id}`}
            onPress={handleVisitWebsite}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: pressed ? "#D97706" : "#F59E0B",
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 8,
              minHeight: 36,
              gap: 5,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <ExternalLink size={13} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.1 }}>
              Visiter le site
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function EmptyState() {
  const { colors } = useTheme();
  const isDark = useTheme((s) => s.isDark);
  return (
    <View
      testID="promotions-empty-state"
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingTop: 60 }}
    >
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
        borderWidth: 2,
        borderColor: isDark ? "rgba(245,158,11,0.3)" : "#FDE68A",
      }}>
        <Store size={36} color="#F59E0B" strokeWidth={1.8} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 8, letterSpacing: -0.3 }}>
        Aucune promotion
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 }}>
        Les promotions et annonces sponsorisées apparaîtront ici. Revenez bientôt !
      </Text>
    </View>
  );
}

export default function PromotionsScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const { data: user } = useQuery({
    queryKey: USER_ME_QUERY_KEY,
    queryFn: () => api.get<UserMe>("/api/me"),
  });

  const { data: promotions, isLoading, isError, refetch } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => api.get<Promotion[]>("/api/promotions"),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const canPostPromotion = user?.accountType === "recruiter" && user?.isPremium === true;

  const renderItem = useCallback(({ item }: { item: PromotionWithMeta }) => <PromotionCard promotion={item} />, []);
  const keyExtractor = useCallback((item: PromotionWithMeta) => item.id, []);
  const realPromotions = promotions ?? [];
  const listData: PromotionWithMeta[] = [
    ...DEMO_PROMOTIONS,
    ...realPromotions.filter((r) => !DEMO_PROMOTIONS.some((d) => d.id === r.id)),
  ];

  return (
    <SafeAreaView testID="promotions-screen" edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
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
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
      }}>
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: "#F59E0B",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}>
          <Megaphone size={18} color="#FFFFFF" strokeWidth={2} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.primary, letterSpacing: -0.4 }}>
          Promotions
        </Text>
      </View>

      {/* Loading state */}
      {isLoading && listData.length === 0 ? (
        <View testID="promotions-loading" style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 14 }}>
            Chargement...
          </Text>
        </View>
      ) : isError ? (
        <View testID="promotions-error" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, textAlign: "center", marginBottom: 8 }}>
            Impossible de charger les promotions
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center" }}>
            Tirez vers le bas pour réessayer
          </Text>
        </View>
      ) : (
        <FlatList<PromotionWithMeta>
          testID="promotions-list"
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingTop: 16,
            paddingBottom: canPostPromotion ? 100 : 32,
            flexGrow: 1,
            backgroundColor: colors.background,
          }}
          style={{ backgroundColor: colors.background }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F59E0B"
              colors={["#F59E0B"]}
            />
          }
          ListEmptyComponent={<EmptyState />}
        />
      )}

      {/* FAB — Post Promotion (recruiter + premium only) */}
      {canPostPromotion ? (
        <Pressable
          testID="post-promotion-fab"
          onPress={() => router.push("/(app)/create-promotion" as never)}
          style={({ pressed }) => ({
            position: "absolute",
            bottom: 28,
            right: 20,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: pressed ? "#D97706" : "#F59E0B",
            borderRadius: 28,
            paddingHorizontal: 18,
            paddingVertical: 14,
            gap: 8,
            shadowColor: "#F59E0B",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.45,
            shadowRadius: 10,
            elevation: 8,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.1 }}>
            Publier une promo
          </Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}
