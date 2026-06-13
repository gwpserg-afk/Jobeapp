import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ScrollView,
  Image,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bell,
  Bookmark,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  MapPin,
  Briefcase,
  Zap,
  TrendingUp,
  BadgeCheck,
  Send,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme";
import { useDemoStore } from "@/lib/demoStore";
import { useLang } from "@/lib/i18n";

const SCREEN_W = Dimensions.get("window").width;
const ACCENT = "#3BAD4E";
const NAVY = "#1B2F6E";

// Story data
const STORIES = [
  { id: "0", name: "Mon réseau", avatar: null, isOwn: true, hasNew: false },
  { id: "1", name: "Orange SN", avatar: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=120&q=80", hasNew: true },
  { id: "2", name: "Aminata S.", avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&q=80", hasNew: true },
  { id: "3", name: "Ousmane D.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80", hasNew: false },
  { id: "4", name: "Sonatel", avatar: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120&q=80", hasNew: true },
  { id: "5", name: "Fatou D.", avatar: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=120&q=80", hasNew: true },
  { id: "6", name: "Boubacar N.", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&q=80", hasNew: false },
  { id: "7", name: "Coris Bank", avatar: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=120&q=80", hasNew: true },
];

type JobCardData = {
  type: "job";
  id: string;
  title: string;
  company: string;
  location: string;
  contractType: "CDI" | "CDD" | "Stage" | "Freelance";
  salary: string;
  urgent: boolean;
  boosted: boolean;
  applicants: number;
  companyInitials: string;
  companyLogo?: string;
  verified: boolean;
};

type PostCardData = {
  type: "post";
  id: string;
  authorName: string;
  authorTitle: string;
  authorAvatar: string;
  timestamp: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  liked: boolean;
};

type FeedTab = "pour-vous" | "emplois";

const CONTRACT_COLORS: Record<string, string> = {
  CDI: "#3BAD4E",
  CDD: "#3B82F6",
  Stage: "#F59E0B",
  Freelance: "#8B5CF6",
};

const POSTS: PostCardData[] = [
  {
    type: "post",
    id: "post-thieb-1",
    authorName: "Mariama Diallo",
    authorTitle: "Traiteur Événementiel · Dakar",
    authorAvatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&q=80",
    timestamp: "1h",
    content: "✅ Mission accomplie ! 50 thiéboudienns servis pour le gala Air Sénégal à l'hôtel King Fahd. 6h de préparation, une équipe de 8 personnes, et des invités ravis. Merci à mon équipe pour ce travail magnifique ! 🍚🇸🇳 #Traiteur #Dakar #FoodPro",
    image: "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80",
    likes: 847,
    comments: 134,
    liked: false,
  },
  {
    type: "post",
    id: "post-orange-president",
    authorName: "Ibrahima Fall",
    authorTitle: "Directeur Régional · InTouch SA",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80",
    timestamp: "3h",
    content: "Honnoré d'avoir rencontré le PDG d'Orange Africa pour discuter de notre expansion en Afrique de l'Ouest. Les opportunités sont immenses — le numérique africain est en train d'exploser. Restons connectés ! 🤝🌍 #Business #Afrique #Networking",
    image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80",
    likes: 1243,
    comments: 198,
    liked: false,
  },
  {
    type: "post",
    id: "post-aminata-promo",
    authorName: "Aminata Sow",
    authorTitle: "Directrice Marketing Afrique de l'Ouest · Orange",
    authorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&q=80",
    timestamp: "5h",
    content: "Je suis profondément touchée et honorée d'annoncer ma promotion au poste de Directrice Marketing pour l'Afrique de l'Ouest chez Orange ! 🎉 Ce parcours de 8 ans m'a appris que la persévérance et la passion ouvrent toutes les portes. Merci à mon équipe, ma famille, et à tous ceux qui ont cru en moi. #Leadership #Femme #Sénégal",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80",
    likes: 2156,
    comments: 341,
    liked: true,
  },
  {
    type: "post",
    id: "post-dev-wave",
    authorName: "Ousmane Diallo",
    authorTitle: "Senior Mobile Engineer · Wave Mobile Money",
    authorAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&q=80",
    timestamp: "8h",
    content: "🚀 On vient de shipper Wave 2.0 ! 14 mois de travail, une équipe incroyable, et maintenant 3M+ utilisateurs en Sénégal, Côte d'Ivoire et Mali peuvent faire leurs paiements encore plus facilement. La fintech africaine est en train de changer des vies. Très fier de cette équipe ! 💙 #Wave #Fintech #Mobile",
    image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&q=80",
    likes: 567,
    comments: 89,
    liked: false,
  },
  {
    type: "post",
    id: "post-cisco-cert",
    authorName: "Boubacar Ndiaye",
    authorTitle: "Ingénieur Réseaux · Sonatel",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80",
    timestamp: "1j",
    content: "CERTIFIÉ CISCO CCNP ! 📡 Après 6 mois de préparation intensive en dehors des heures de travail, j'ai réussi l'examen avec 87%. C'est la preuve que la formation continue est possible même avec un emploi à temps plein. Si je l'ai fait, vous pouvez le faire ! Pour tous ceux qui veulent se lancer, n'hésitez pas à me contacter. #CCNP #Cisco #Networking #Sénégal",
    likes: 312,
    comments: 47,
    liked: false,
  },
  {
    type: "post",
    id: "post-chef-diallo",
    authorName: "Mamadou Kouyaté",
    authorTitle: "Chef Exécutif · King Fahd Palace Hotel",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80",
    timestamp: "2j",
    content: "Ce soir, l'honneur de préparer le dîner de gala pour le Ministre de l'Économie et ses invités au King Fahd Palace. 200 couverts, une cuisine fusion sénégalo-française, et une brigade de 22 chefs. La gastronomie africaine mérite sa place sur la scène internationale ! 👨‍🍳🌟 #Chef #Dakar #Gastronomie",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
    likes: 723,
    comments: 112,
    liked: false,
  },
  {
    type: "post",
    id: "p2",
    authorName: "Sonatel",
    authorTitle: "Entreprise · Télécommunications",
    authorAvatar: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120&q=80",
    timestamp: "4h",
    content: "🚀 Nous recrutons 15 ingénieurs réseaux pour accélérer notre déploiement 4G/5G au Sénégal et en Afrique de l'Ouest. Rejoignez l'aventure numérique africaine ! Postulez directement sur Jobé.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
    likes: 312,
    comments: 45,
    liked: true,
  },
  {
    type: "post",
    id: "p4",
    authorName: "Fatou Dieng",
    authorTitle: "Infirmière · Hôpital Principal de Dakar",
    authorAvatar: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=120&q=80",
    timestamp: "2j",
    content: "Diplômée en soins infirmiers après 4 ans d'études. Ce métier est une vocation. Ouverte à de nouvelles opportunités dans les cliniques privées de Dakar. 🏥 #Santé #Sénégal",
    likes: 203,
    comments: 34,
    liked: false,
  },
];

const JOBS: JobCardData[] = [
  {
    type: "job",
    id: "j1",
    title: "Développeur Mobile React Native",
    company: "Orange Digital Center",
    location: "Dakar, Almadies",
    contractType: "CDI",
    salary: "800k – 1.2M FCFA",
    urgent: true,
    boosted: false,
    applicants: 14,
    companyInitials: "ODC",
    companyLogo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&q=80",
    verified: true,
  },
  {
    type: "job",
    id: "j2",
    title: "Comptable Senior SYSCOHADA",
    company: "Coris Bank International",
    location: "Dakar, Plateau",
    contractType: "CDI",
    salary: "600k – 900k FCFA",
    urgent: false,
    boosted: true,
    applicants: 31,
    companyInitials: "CBI",
    companyLogo: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=80&q=80",
    verified: true,
  },
  {
    type: "job",
    id: "j3",
    title: "Chef de Projet Infrastructure",
    company: "Dakar-Dem Dikk",
    location: "Dakar, Rebeuss",
    contractType: "CDI",
    salary: "À négocier",
    urgent: false,
    boosted: false,
    applicants: 8,
    companyInitials: "DDD",
    verified: false,
  },
  {
    type: "job",
    id: "j4",
    title: "Commerciale B2B Télécoms",
    company: "Free Sénégal",
    location: "Dakar, Almadies",
    contractType: "CDD",
    salary: "300k + commissions",
    urgent: true,
    boosted: false,
    applicants: 22,
    companyInitials: "FS",
    companyLogo: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=80&q=80",
    verified: true,
  },
  {
    type: "job",
    id: "j5",
    title: "Responsable Logistique & Supply Chain",
    company: "CFAO Sénégal",
    location: "Dakar, Zone Industrielle",
    contractType: "CDI",
    salary: "700k – 1M FCFA",
    urgent: false,
    boosted: true,
    applicants: 19,
    companyInitials: "CFAO",
    verified: true,
  },
  {
    type: "job",
    id: "j6",
    title: "Designer UI/UX Senior",
    company: "InTouch SA",
    location: "Dakar, Mermoz",
    contractType: "CDI",
    salary: "500k – 750k FCFA",
    urgent: false,
    boosted: false,
    applicants: 11,
    companyInitials: "IT",
    verified: false,
  },
  {
    type: "job",
    id: "j7",
    title: "Stage Marketing Digital",
    company: "Wave Mobile Money",
    location: "Dakar, Fann",
    contractType: "Stage",
    salary: "150k FCFA / mois",
    urgent: false,
    boosted: true,
    applicants: 45,
    companyInitials: "WM",
    verified: true,
  },
];

// ---------- StoryItem ----------
function StoryItem({ story, onPress, isDark }: { story: typeof STORIES[0]; onPress: () => void; isDark: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ alignItems: "center", marginRight: 16, width: 64 }}
    >
      {/* Ring */}
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: 34,
          padding: 2.5,
          backgroundColor: story.hasNew ? "transparent" : isDark ? "#2A3B6A" : "#E5E7EB",
          borderWidth: story.hasNew ? 2.5 : 0,
          borderColor: story.hasNew ? ACCENT : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {story.isOwn ? (
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: isDark ? "#1E2C50" : "#EEF2FF",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: isDark ? "#3BAD4E" : NAVY,
              borderStyle: "dashed",
            }}
          >
            <Text style={{ fontSize: 26, fontWeight: "300", color: isDark ? ACCENT : NAVY, lineHeight: 30 }}>+</Text>
          </View>
        ) : story.avatar ? (
          <Image
            source={{ uri: story.avatar }}
            style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "#E5E7EB" }}
          />
        ) : (
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: NAVY,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#FFF" }}>
              {story.name.charAt(0)}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={{
          marginTop: 5,
          fontSize: 11,
          fontWeight: "500",
          color: isDark ? "#9BA5BF" : "#4B5563",
          textAlign: "center",
          maxWidth: 60,
        }}
        numberOfLines={1}
      >
        {story.name}
      </Text>
    </Pressable>
  );
}

// ---------- PostCard ----------
function PostCard({ item, isDark, colors, onLike }: { item: PostCardData; isDark: boolean; colors: any; onLike?: () => void }) {
  const [liked, setLiked] = useState(item.liked);
  const [likeCount, setLikeCount] = useState(item.likes);
  const [saved, setSaved] = useState(false);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleLike = () => {
    scale.value = withSpring(1.35, { damping: 5, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 8, stiffness: 300 });
    });
    setLiked(!liked);
    setLikeCount((c) => liked ? c - 1 : c + 1);
    onLike?.();
  };

  return (
    <View
      style={{
        backgroundColor: isDark ? "#111827" : "#FFFFFF",
        marginBottom: 1,
        borderBottomWidth: 0.5,
        borderBottomColor: isDark ? "#1F2937" : "#F1F5F9",
      }}
    >
      {/* Author row */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "#E5E7EB",
            overflow: "hidden",
            borderWidth: 2,
            borderColor: isDark ? "#1E2C50" : "#EEF2FF",
          }}
        >
          <Image source={{ uri: item.authorAvatar }} style={{ width: 48, height: 48 }} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#F9FAFB" : "#111827" }}>{item.authorName}</Text>
          <Text style={{ fontSize: 12, color: isDark ? "#6B7280" : "#9CA3AF", marginTop: 1 }} numberOfLines={1}>
            {item.authorTitle} · {item.timestamp}
          </Text>
        </View>
        <Pressable style={{ padding: 8 }} hitSlop={8}>
          <MoreHorizontal size={20} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Content text */}
      <Text
        style={{
          fontSize: 14,
          color: isDark ? "#E5E7EB" : "#1F2937",
          lineHeight: 22,
          paddingHorizontal: 16,
          paddingBottom: item.image ? 10 : 0,
        }}
        numberOfLines={3}
      >
        {item.content}
      </Text>

      {/* Image — edge to edge, 16:9 */}
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={{
            width: SCREEN_W,
            height: SCREEN_W * (9 / 16),
            backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
            marginTop: 10,
          }}
          resizeMode="cover"
        />
      ) : null}

      {/* Action row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 11,
          gap: 20,
        }}
      >
        {/* Like */}
        <Pressable onPress={handleLike} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Animated.View style={animStyle}>
            <Heart
              size={22}
              color={liked ? "#EF4444" : isDark ? "#6B7280" : "#9CA3AF"}
              fill={liked ? "#EF4444" : "none"}
              strokeWidth={2}
            />
          </Animated.View>
          <Text style={{ fontSize: 14, color: liked ? "#EF4444" : isDark ? "#6B7280" : "#9CA3AF", fontWeight: "600" }}>
            {likeCount}
          </Text>
        </Pressable>

        {/* Comment */}
        <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <MessageCircle size={22} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />
          <Text style={{ fontSize: 14, color: isDark ? "#6B7280" : "#9CA3AF", fontWeight: "600" }}>
            {item.comments}
          </Text>
        </Pressable>

        {/* Share */}
        <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Send size={20} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />
        </Pressable>

        {/* Spacer + Save */}
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setSaved(!saved)} hitSlop={8}>
          <Bookmark
            size={22}
            color={saved ? ACCENT : isDark ? "#6B7280" : "#9CA3AF"}
            fill={saved ? ACCENT : "none"}
            strokeWidth={2}
          />
        </Pressable>
      </View>
    </View>
  );
}

// ---------- JobCard ----------
function JobCard({ item, isDark, colors }: { item: JobCardData; isDark: boolean; colors: any }) {
  const [saved, setSaved] = useState(false);
  const contractColor = CONTRACT_COLORS[item.contractType] ?? ACCENT;
  const t = useLang((s) => s.t);

  return (
    <View
      style={{
        backgroundColor: isDark ? "#111827" : "#FFFFFF",
        borderRadius: 16,
        marginHorizontal: 14,
        marginVertical: 7,
        borderWidth: 1,
        borderColor: isDark ? "#1F2937" : "#E5E7EB",
        overflow: "hidden",
        padding: 16,
      }}
    >
      {/* Top row: logo + info + save */}
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {/* Company logo */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: isDark ? "#1E2C50" : "#EEF2FF",
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          {item.companyLogo ? (
            <Image source={{ uri: item.companyLogo }} style={{ width: 52, height: 52 }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: "800", color: NAVY }}>{item.companyInitials}</Text>
          )}
        </View>

        {/* Company + location */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#D1D5DB" : "#374151" }}>
              {item.company}
            </Text>
            {item.verified ? (
              <BadgeCheck size={15} color={ACCENT} strokeWidth={2.5} />
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3, gap: 3 }}>
            <MapPin size={11} color={isDark ? "#6B7280" : "#9CA3AF"} strokeWidth={2} />
            <Text style={{ fontSize: 12, color: isDark ? "#6B7280" : "#9CA3AF" }}>{item.location}</Text>
          </View>
        </View>

        {/* Save */}
        <Pressable onPress={() => setSaved(!saved)} style={{ padding: 4, marginTop: -2 }} hitSlop={8}>
          <Bookmark
            size={20}
            color={saved ? ACCENT : isDark ? "#6B7280" : "#9CA3AF"}
            fill={saved ? ACCENT : "none"}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {/* Job title */}
      <Text
        style={{
          fontSize: 17,
          fontWeight: "700",
          color: isDark ? "#F9FAFB" : "#111827",
          marginTop: 12,
          lineHeight: 23,
        }}
        numberOfLines={2}
      >
        {item.title}
      </Text>

      {/* Tags row */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
        {/* Contract type */}
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: `${contractColor}1A`,
            borderWidth: 1,
            borderColor: `${contractColor}40`,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: contractColor }}>{item.contractType}</Text>
        </View>

        {/* Salary */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
            borderWidth: 1,
            borderColor: isDark ? "#374151" : "#E5E7EB",
          }}
        >
          <Briefcase size={11} color={isDark ? "#9CA3AF" : "#6B7280"} strokeWidth={2} />
          <Text style={{ fontSize: 12, color: isDark ? "#9CA3AF" : "#6B7280", fontWeight: "600" }}>{item.salary}</Text>
        </View>

        {/* Urgent badge */}
        {item.urgent ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: "#FEF2F2",
              borderWidth: 1,
              borderColor: "#FECACA",
            }}
          >
            <Zap size={10} color="#EF4444" strokeWidth={2.5} fill="#EF4444" />
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#EF4444" }}>URGENT</Text>
          </View>
        ) : null}

        {/* Boosted badge */}
        {item.boosted ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: "#F5F3FF",
              borderWidth: 1,
              borderColor: "#DDD6FE",
            }}
          >
            <TrendingUp size={10} color="#7C3AED" strokeWidth={2.5} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#7C3AED" }}>{t("feed_job_boosted")}</Text>
          </View>
        ) : null}
      </View>

      {/* Applicants + Apply row */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14 }}>
        <Text style={{ flex: 1, fontSize: 12, color: isDark ? "#6B7280" : "#9CA3AF" }}>
          {item.applicants} {t("home_candidates")}
        </Text>
        <Pressable
          style={{
            backgroundColor: ACCENT,
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 24,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>{t("home_apply_now")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const toggleLike = useDemoStore((s) => s.toggleLike);
  const t = useLang((s) => s.t);

  const [activeTab, setActiveTab] = useState<FeedTab>("pour-vous");

  const headerBg = isDark ? "#0F172A" : "#FFFFFF";
  const bg = isDark ? "#0F172A" : "#F8FAFC";

  const renderPost = useCallback(({ item, index }: { item: PostCardData; index: number }) => (
    <Animated.View entering={FadeInDown.duration(350).delay(index * 50)}>
      <PostCard item={item} isDark={isDark} colors={colors} onLike={() => toggleLike(item.id)} />
    </Animated.View>
  ), [isDark, colors, toggleLike]);

  const renderJob = useCallback(({ item, index }: { item: JobCardData; index: number }) => (
    <Animated.View entering={FadeInDown.duration(350).delay(index * 60)}>
      <JobCard item={item} isDark={isDark} colors={colors} />
    </Animated.View>
  ), [isDark, colors]);

  // Shared header: stories + tabs
  const ListHeader = useCallback(() => (
    <View style={{ backgroundColor: bg }}>
      {/* Stories */}
      <View
        style={{
          backgroundColor: headerBg,
          borderBottomWidth: 0.5,
          borderBottomColor: isDark ? "#1F2937" : "#E5E7EB",
          paddingTop: 10,
          paddingBottom: 12,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, paddingRight: 8 }}
          style={{ flexGrow: 0 }}
        >
          {STORIES.map((story) => (
            <StoryItem key={story.id} story={story} onPress={() => {}} isDark={isDark} />
          ))}
        </ScrollView>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: headerBg,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#1F2937" : "#E5E7EB",
          paddingHorizontal: 20,
        }}
      >
        {(["pour-vous", "emplois"] as FeedTab[]).map((tab) => {
          const active = activeTab === tab;
          const label = tab === "pour-vous" ? t("feed_tab_for_you") : t("feed_tab_jobs");
          return (
            <Pressable
              key={tab}
              testID={`feed-tab-${tab}`}
              onPress={() => setActiveTab(tab)}
              style={{
                paddingVertical: 13,
                marginRight: 28,
                borderBottomWidth: 2.5,
                borderBottomColor: active ? ACCENT : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: active ? "700" : "500",
                  color: active ? (isDark ? "#F9FAFB" : "#111827") : isDark ? "#6B7280" : "#9CA3AF",
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  ), [activeTab, isDark, headerBg, bg]);

  return (
    <View testID="home-screen" style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={headerBg}
      />

      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: headerBg }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 0.5,
            borderBottomColor: isDark ? "#1F2937" : "#E5E7EB",
          }}
        >
          {/* Jobé wordmark */}
          <View style={{ flex: 1, flexDirection: "row", alignItems: "baseline" }}>
            <Text
              style={{
                fontSize: 30,
                fontWeight: "800",
                fontStyle: "italic",
                color: isDark ? "#E0E7FF" : NAVY,
                letterSpacing: -1,
              }}
            >
              Job
            </Text>
            <Text
              style={{
                fontSize: 30,
                fontWeight: "800",
                fontStyle: "italic",
                color: ACCENT,
                letterSpacing: -1,
              }}
            >
              é
            </Text>
          </View>

          {/* Right icons */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              testID="notifications-button"
              onPress={() => router.push("/(app)/notifications" as never)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? "#1E2C50" : "#F0F4FF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell size={21} color={isDark ? "#9BA5BF" : NAVY} strokeWidth={2} />
            </Pressable>

            <Pressable
              testID="messages-button"
              onPress={() => router.push("/(app)/(tabs)/activity" as never)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? "#1E2C50" : "#F0F4FF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageCircle size={21} color={isDark ? "#9BA5BF" : NAVY} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* Feed — switch between tabs */}
      {activeTab === "pour-vous" ? (
        <FlatList
          testID="feed-list-posts"
          key="posts"
          data={POSTS}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          ListHeaderComponent={<ListHeader />}
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={8}
        />
      ) : (
        <FlatList
          testID="feed-list-jobs"
          key="jobs"
          data={JOBS}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          ListHeaderComponent={<ListHeader />}
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={4}
          windowSize={8}
        />
      )}
    </View>
  );
}
