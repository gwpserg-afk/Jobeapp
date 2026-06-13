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

const DEMO_PROMOTIONS: Promotion[] = [
  {
    id: "demo-promo-1",
    userId: "company-1",
    businessName: "Orange Sénégal",
    title: { fr: "Offre Spéciale PME — Internet Fibre", en: "Special SME Offer — Fibre Internet", zh: "中小企业特别优惠——光纤互联网" } as unknown as string,
    content: {
      fr: "Offre spéciale PME — Forfait Internet Fibre 50 Mbps à 45 000 FCFA/mois. Contactez notre service commercial dès aujourd'hui. 📡",
      en: "Special SME offer — 50 Mbps Fiber Internet package at 45,000 FCFA/month. Contact our sales team today. 📡",
      zh: "中小企业特别优惠——50 Mbps光纤互联网套餐，每月45,000 FCFA。今天就联系我们的销售团队。📡",
    } as unknown as string,
    imageUrl: null,
    websiteUrl: "https://www.orange.sn",
    durationDays: 30,
    creditCost: 10,
    expiresAt: "2026-04-30T23:59:59.000Z",
    createdAt: "2026-03-24T00:00:00.000Z",
    user: { id: "company-1", name: "Orange Sénégal", image: null },
    logoColor: DEMO_COMPANIES[0]?.logoColor ?? "#FF6600",
    logoInitials: DEMO_COMPANIES[0]?.logoInitials ?? "OS",
  } as Promotion & { logoColor: string; logoInitials: string },
  {
    id: "demo-promo-2",
    userId: "company-3",
    businessName: "Banque de l'Afrique de l'Ouest",
    title: { fr: "Compte Professionnel Gratuit", en: "Free Professional Account", zh: "免费专业账户" } as unknown as string,
    content: {
      fr: "Ouvrez votre compte professionnel en ligne en 5 minutes. Zéro frais de tenue de compte pendant le premier trimestre. 💳",
      en: "Open your professional account online in 5 minutes. Zero account maintenance fees for the first quarter. 💳",
      zh: "5分钟内在线开立您的专业账户。第一季度零账户管理费。💳",
    } as unknown as string,
    imageUrl: null,
    websiteUrl: "https://www.bao.sn",
    durationDays: 30,
    creditCost: 10,
    expiresAt: "2026-04-15T23:59:59.000Z",
    createdAt: "2026-03-24T00:00:00.000Z",
    user: { id: "company-3", name: "Banque de l'Afrique de l'Ouest", image: null },
    logoColor: DEMO_COMPANIES[2]?.logoColor ?? "#1B2F6E",
    logoInitials: DEMO_COMPANIES[2]?.logoInitials ?? "BAO",
  } as Promotion & { logoColor: string; logoInitials: string },
  {
    id: "demo-promo-3",
    userId: "company-2",
    businessName: "La Sénégalaise de l'Automobile",
    title: { fr: "Reprise Véhicule — Meilleur Prix", en: "Vehicle Trade-In — Best Price", zh: "旧车置换——最优价格" } as unknown as string,
    content: {
      fr: "Reprise de votre ancien véhicule au meilleur prix du marché ! Offre valable jusqu'à la fin du mois de mars 2026. 🚗",
      en: "Trade in your old vehicle at the best market price! Offer valid until the end of March 2026. 🚗",
      zh: "以市场最优价格换购您的旧车！优惠有效期至2026年3月底。🚗",
    } as unknown as string,
    imageUrl: null,
    websiteUrl: null,
    durationDays: 30,
    creditCost: 10,
    expiresAt: "2026-03-31T23:59:59.000Z",
    createdAt: "2026-03-24T00:00:00.000Z",
    user: { id: "company-2", name: "La Sénégalaise de l'Automobile", image: null },
    logoColor: DEMO_COMPANIES[1]?.logoColor ?? "#2C3E50",
    logoInitials: DEMO_COMPANIES[1]?.logoInitials ?? "SA",
  } as Promotion & { logoColor: string; logoInitials: string },
  {
    id: "demo-promo-4",
    userId: "company-4",
    businessName: "Sonatel",
    title: { fr: "Forfait Data 10 Go — Offre Spéciale", en: "10 GB Data Plan — Special Offer", zh: "10GB流量套餐——特别优惠" } as unknown as string,
    content: {
      fr: "Rechargez votre forfait data avec 10 Go à seulement 3 500 FCFA. Valable 30 jours. Composez *111# pour activer. 📱",
      en: "Top up your data plan with 10 GB for only 3,500 FCFA. Valid for 30 days. Dial *111# to activate. 📱",
      zh: "以仅3,500 FCFA充值10GB流量套餐。有效期30天。拨打*111#激活。📱",
    } as unknown as string,
    imageUrl: null,
    websiteUrl: "https://www.sonatel.sn",
    durationDays: 30,
    creditCost: 10,
    expiresAt: "2026-05-15T23:59:59.000Z",
    createdAt: "2026-03-24T00:00:00.000Z",
    user: { id: "company-4", name: "Sonatel", image: null },
    logoColor: "#E63946",
    logoInitials: "SN",
  } as Promotion & { logoColor: string; logoInitials: string },
  {
    id: "demo-promo-5",
    userId: "company-5",
    businessName: "CFAO Motors",
    title: { fr: "Financement Véhicule 0% Intérêt", en: "0% Interest Vehicle Financing", zh: "零利率汽车融资" } as unknown as string,
    content: {
      fr: "Financez votre nouveau véhicule sans intérêt pendant 12 mois. Toyota, Peugeot, Renault disponibles. Renseignez-vous en agence. 🚘",
      en: "Finance your new vehicle with 0% interest for 12 months. Toyota, Peugeot, Renault available. Visit your nearest branch. 🚘",
      zh: "12个月零利率融资购买新车。丰田、标致、雷诺均有现货。请到就近门店咨询。🚘",
    } as unknown as string,
    imageUrl: null,
    websiteUrl: null,
    durationDays: 21,
    creditCost: 10,
    expiresAt: "2026-04-10T23:59:59.000Z",
    createdAt: "2026-03-24T00:00:00.000Z",
    user: { id: "company-5", name: "CFAO Motors", image: null },
    logoColor: "#003087",
    logoInitials: "CM",
  } as Promotion & { logoColor: string; logoInitials: string },
  {
    id: "demo-promo-6",
    userId: "company-6",
    businessName: "TotalEnergies Sénégal",
    title: { fr: "Carte Carburant Entreprise — 5% de Remise", en: "Business Fuel Card — 5% Discount", zh: "企业燃油卡——9折优惠" } as unknown as string,
    content: {
      fr: "Optimisez les coûts carburant de votre flotte avec notre carte entreprise. 5% de remise immédiate sur chaque plein. Réseau de 80 stations. ⛽",
      en: "Optimize your fleet's fuel costs with our business card. 5% instant discount on every fill-up. Network of 80 stations. ⛽",
      zh: "使用企业卡优化车队燃油成本。每次加油立享9折优惠。覆盖80个加油站网络。⛽",
    } as unknown as string,
    imageUrl: null,
    websiteUrl: "https://totalenergies.sn",
    durationDays: 60,
    creditCost: 10,
    expiresAt: "2026-05-31T23:59:59.000Z",
    createdAt: "2026-03-24T00:00:00.000Z",
    user: { id: "company-6", name: "TotalEnergies Sénégal", image: null },
    logoColor: "#DA291C",
    logoInitials: "TE",
  } as Promotion & { logoColor: string; logoInitials: string },
];

// ─── Helper: get localized content ────────────────────────────────────────────

type LocalizedContent = { fr: string; en: string; zh: string };

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
  const [error, setError] = useState(false);
  const colors = useTheme((s) => s.colors);

  if (uri && !error) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.placeholder,
        }}
        onError={() => setError(true)}
      />
    );
  }

  const bg = logoColor ?? "#F59E0B";
  const initials = logoInitials ?? getInitials(name);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontSize: size * 0.35, fontWeight: "700" }}>
        {initials}
      </Text>
    </View>
  );
}

function PromotionCard({ promotion }: { promotion: Promotion }) {
  const colors = useTheme((s) => s.colors);
  const lang = useLang((s) => s.lang);
  const daysRemaining = getDaysRemaining(promotion.expiresAt);
  const demoExtra = promotion as Promotion & { logoColor?: string; logoInitials?: string };

  const localizedContent = getLocalizedContent(promotion.content as string | LocalizedContent, lang);
  const localizedTitle = getLocalizedContent(promotion.title as string | LocalizedContent, lang);

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

  const daysLabel =
    daysRemaining === 0
      ? lang === "fr" ? "Expire aujourd'hui" : lang === "zh" ? "今天到期" : "Expires today"
      : daysRemaining === 1
      ? lang === "fr" ? "1 jour restant" : lang === "zh" ? "剩余1天" : "1 day left"
      : lang === "fr" ? `${daysRemaining} jours restants` : lang === "zh" ? `剩余${daysRemaining}天` : `${daysRemaining} days left`;

  return (
    <View
      testID={`promotion-card-${promotion.id}`}
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        overflow: "hidden",
      }}
    >
      {/* Card Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <AvatarImage
          uri={promotion.user.image}
          name={promotion.businessName}
          size={42}
          logoColor={demoExtra.logoColor}
          logoInitials={demoExtra.logoInitials}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: colors.text,
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {promotion.businessName}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              marginTop: 1,
            }}
            numberOfLines={1}
          >
            {promotion.user.name}
          </Text>
        </View>

        {/* SPONSORED badge */}
        <View
          style={{
            backgroundColor: "#FEF3C7",
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: "#FDE68A",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "800",
              color: "#92400E",
              letterSpacing: 0.8,
            }}
          >
            SPONSORED
          </Text>
        </View>
      </View>

      {/* Card Body */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: colors.text,
            letterSpacing: -0.3,
            marginBottom: 8,
          }}
        >
          {localizedTitle}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 20,
            marginBottom: 12,
          }}
        >
          {localizedContent}
        </Text>
      </View>

      {/* Optional Image */}
      {promotion.imageUrl ? (
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Image
            source={{ uri: promotion.imageUrl }}
            style={{
              width: "100%",
              height: 180,
              borderRadius: 10,
              backgroundColor: colors.placeholder,
            }}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {/* Card Footer */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingBottom: 14,
          paddingTop: promotion.imageUrl ? 0 : 4,
          gap: 8,
        }}
      >
        {/* Days remaining pill */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: daysRemaining <= 3 ? "#FEE2E2" : "#FEF3C7",
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 5,
            gap: 4,
          }}
        >
          <Clock
            size={12}
            color={daysRemaining <= 3 ? "#DC2626" : "#D97706"}
            strokeWidth={2.5}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: daysRemaining <= 3 ? "#DC2626" : "#92400E",
            }}
          >
            {daysLabel}
          </Text>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Visit Website button */}
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
              paddingVertical: 7,
              gap: 5,
              opacity: pressed ? 0.9 : 1,
              minHeight: 44,
            })}
          >
            <ExternalLink size={13} color="#FFFFFF" strokeWidth={2.5} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#FFFFFF",
                letterSpacing: 0.1,
              }}
            >
              {lang === "fr" ? "Visiter" : lang === "zh" ? "访问" : "Visit"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function EmptyState() {
  const colors = useTheme((s) => s.colors);
  const lang = useLang((s) => s.lang);
  const isFr = lang === "fr";
  const isZh = lang === "zh";
  return (
    <View
      testID="promotions-empty-state"
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        paddingTop: 60,
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.placeholder,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          borderWidth: 2,
          borderColor: colors.border,
        }}
      >
        <Store size={36} color={colors.textMuted} strokeWidth={1.8} />
      </View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: colors.text,
          textAlign: "center",
          marginBottom: 8,
          letterSpacing: -0.3,
        }}
      >
        {isFr ? "Aucune promotion" : isZh ? "暂无推广" : "No promotions yet"}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        {isFr
          ? "Les promotions commerciales apparaîtront ici. Revenez bientôt !"
          : isZh
          ? "商业推广将在此显示，请稍后回来查看！"
          : "Business promotions will appear here. Check back soon!"}
      </Text>
    </View>
  );
}

export default function PromotionsScreen() {
  const colors = useTheme((s) => s.colors);
  const lang = useLang((s) => s.lang);
  const [refreshing, setRefreshing] = useState(false);

  const { data: user } = useQuery({
    queryKey: USER_ME_QUERY_KEY,
    queryFn: () => api.get<UserMe>("/api/me"),
  });

  const {
    data: realPromotions,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => api.get<Promotion[]>("/api/promotions"),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const canPostPromotion =
    user?.accountType === "recruiter" && user?.isPremium === true;

  // Merge demo promotions with real ones (demo first, then any real ones not already shown)
  const allPromotions: Promotion[] = [
    ...DEMO_PROMOTIONS,
    ...(realPromotions ?? []).filter(
      (r) => !DEMO_PROMOTIONS.some((d) => d.id === r.id)
    ),
  ];

  const renderItem = useCallback(
    ({ item }: { item: Promotion }) => <PromotionCard promotion={item} />,
    []
  );

  const keyExtractor = useCallback((item: Promotion) => item.id, []);

  return (
    <SafeAreaView
      testID="promotions-screen"
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: "#F59E0B",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Megaphone size={18} color="#FFFFFF" strokeWidth={2} />
        </View>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: colors.text,
            letterSpacing: -0.4,
          }}
        >
          Promotions
        </Text>
      </View>

      {/* Loading state */}
      {isLoading && allPromotions.length === 0 ? (
        <View
          testID="promotions-loading"
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : (
        <FlatList<Promotion>
          testID="promotions-list"
          data={allPromotions}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingTop: 16,
            paddingBottom: canPostPromotion ? 100 : 32,
            flexGrow: 1,
          }}
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
          onPress={() => router.push("/(app)/create-promotion" as any)}
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
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#FFFFFF",
              letterSpacing: 0.1,
            }}
          >
            {lang === "fr" ? "Publier" : lang === "zh" ? "发布" : "Post"}
          </Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}
