import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import { useLang } from "@/lib/i18n";
import { useTheme, type ThemeColors } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { pickImage, pickSquareImage } from "@/lib/file-picker";
import { uploadFile } from "@/lib/upload";
import {
  Building2,
  Globe,
  MapPin,
  Users,
  BadgeCheck,
  Edit3,
  Plus,
  X,
  Settings,
  Briefcase,
  ChevronRight,
  ThumbsUp,
  MessageCircle,
  CheckCircle,
  Camera,
} from "lucide-react-native";
import { DEMO_COMPANIES, DEMO_COMPANY_POSTS } from "@/lib/demoData";

// Demo active job listings for company profile popup
const DEMO_ACTIVE_LISTINGS = [
  { id: "demo-job-1", title: { fr: "Développeur React Native", en: "React Native Developer", zh: "React Native 开发工程师" } },
  { id: "demo-job-2", title: { fr: "Comptable Senior", en: "Senior Accountant", zh: "高级会计师" } },
];

// ─── Brand Colors ─────────────────────────────────────────────────────────────

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";
const GOLD = "#F59E0B";

// ─── Trilingual Helper ────────────────────────────────────────────────────────

function tl(lang: string, fr: string, en: string, zh: string): string {
  if (lang === "en") return en;
  if (lang === "zh") return zh;
  return fr;
}

// Parse a potentially multilingual description string (stored as JSON or raw)
function parseDescription(raw: string | null, lang: string): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed[lang] ?? parsed["en"] ?? parsed["fr"] ?? raw;
    }
  } catch {
    // not JSON, return as-is
  }
  return raw;
}

function parseEditDescription(raw: string | null | undefined): { fr: string; en: string; zh: string } {
  if (!raw) return { fr: "", en: "", zh: "" };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return { fr: parsed.fr ?? "", en: parsed.en ?? "", zh: parsed.zh ?? "" };
    }
  } catch { /* not JSON */ }
  return { fr: raw, en: "", zh: "" }; // legacy: put raw text in fr field
}

// ─── Types ───────────────────────────────────────────────────────────────────

type TeamMember = {
  id: string;
  name: string;
  role: string | null;
  photoUrl: string | null;
  order: number;
  isPinned?: boolean;
  linkedUserId?: string | null;
};

type DemoTeamMember = {
  id: string;
  candidateId: string;
  name: string;
  role: string;
  avatarUri: string;
  initials: string;
  avatarColor: string;
};

type CompanyPost = {
  id: string;
  companyId: string;
  userId: string;
  content: string;
  contentFr: string;
  contentEn: string;
  contentZh: string;
  likes: number;
  comments: number;
  createdAt: string;
  user: { name: string; image: string | null; isVerified: boolean };
};

type CompanyData = {
  id: string;
  userId: string;
  companyName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  sector: string | null;
  sizeRange: string | null;
  description: string | null;
  website: string | null;
  contactName: string | null;
  location: string | null;
  isVerified: boolean;
  teamMembers: TeamMember[];
  jobListings: { id: string; title: string }[];
};

type EditForm = {
  companyName: string;
  sector: string;
  sizeRange: string;
  description: string;
  website: string;
  contactName: string;
  location: string;
  bannerUrl: string;
  logoUrl: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SIZE_OPTIONS = ["1-10", "11-50", "51-200", "200+"];

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRelativeTime(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));
  if (lang === "zh") {
    if (days >= 1) return `${days}天前`;
    if (hours >= 1) return `${hours}小时前`;
    return `${minutes}分钟前`;
  } else if (lang === "en") {
    if (days >= 1) return `${days}d ago`;
    if (hours >= 1) return `${hours}h ago`;
    return `${minutes}m ago`;
  } else {
    if (days >= 1) return `${days}j`;
    if (hours >= 1) return `${hours}h`;
    return `${minutes}min`;
  }
}

function getPostContent(post: CompanyPost, lang: string): string {
  if (lang === "en") return post.contentEn || post.content;
  if (lang === "zh") return post.contentZh || post.content;
  return post.contentFr || post.content;
}

// ─── Team Member Avatar ───────────────────────────────────────────────────────

function TeamMemberAvatar({
  uri,
  initials,
  avatarColor,
  size,
}: {
  uri: string | null;
  initials: string;
  avatarColor: string;
  size: number;
}) {
  const [error, setError] = useState<boolean>(false);
  if (uri && !error) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setError(true)}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: avatarColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontSize: size * 0.32, fontWeight: "700" }}>
        {initials}
      </Text>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  action,
  navyText,
  sectionLabelColor,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  navyText: string;
  sectionLabelColor: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: navyText, letterSpacing: 0 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 11, color: sectionLabelColor, marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ?? null}
    </View>
  );
}

// ─── Company Post Card ────────────────────────────────────────────────────────

function CompanyPostCard({
  post,
  logoColor,
  logoInitials,
  lang,
  cardBg,
  navyText,
  sectionLabelColor,
  isDark,
}: {
  post: CompanyPost;
  logoColor: string;
  logoInitials: string;
  lang: string;
  cardBg: string;
  navyText: string;
  sectionLabelColor: string;
  isDark: boolean;
}) {
  const content = getPostContent(post, lang);
  const timeAgo = formatRelativeTime(post.createdAt, lang);
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#E8EBF2";

  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor,
        marginBottom: 10,
        overflow: "hidden",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", padding: 14, paddingBottom: 10, gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: logoColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "800" }}>
            {logoInitials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: navyText }}
              numberOfLines={1}
            >
              {post.user.name}
            </Text>
            {post.user.isVerified ? (
              <CheckCircle size={13} color={GREEN} strokeWidth={2.5} />
            ) : null}
          </View>
          <Text style={{ fontSize: 11, color: sectionLabelColor }}>{timeAgo}</Text>
        </View>
      </View>
      <Text
        style={{
          fontSize: 14,
          color: navyText,
          lineHeight: 21,
          paddingHorizontal: 14,
          paddingBottom: 12,
          opacity: 0.85,
        }}
      >
        {content}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingBottom: 12,
          gap: 16,
          borderTopWidth: 1,
          borderTopColor: borderColor,
          paddingTop: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <ThumbsUp size={14} color={sectionLabelColor} strokeWidth={2} />
          <Text style={{ fontSize: 13, color: sectionLabelColor, fontWeight: "600" }}>
            {post.likes}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <MessageCircle size={14} color={sectionLabelColor} strokeWidth={2} />
          <Text style={{ fontSize: 13, color: sectionLabelColor, fontWeight: "600" }}>
            {post.comments}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({
  visible,
  company,
  onClose,
  onSave,
  isSaving,
  lang,
  colors,
  isDark,
}: {
  visible: boolean;
  company: CompanyData | undefined;
  onClose: () => void;
  onSave: (form: EditForm) => void;
  isSaving: boolean;
  lang: string;
  colors: ThemeColors;
  isDark: boolean;
}) {
  const [form, setForm] = useState<EditForm>({
    companyName: company?.companyName ?? "",
    sector: company?.sector ?? "",
    sizeRange: company?.sizeRange ?? "",
    description: company?.description ?? "",
    website: company?.website ?? "",
    contactName: company?.contactName ?? "",
    location: company?.location ?? "",
    bannerUrl: company?.bannerUrl ?? "",
    logoUrl: company?.logoUrl ?? "",
  });

  const [descTab, setDescTab] = useState<"fr" | "en" | "zh">("fr");
  const initDesc = parseEditDescription(company?.description);
  const [descFr, setDescFr] = useState<string>(initDesc.fr);
  const [descEn, setDescEn] = useState<string>(initDesc.en);
  const [descZh, setDescZh] = useState<string>(initDesc.zh);

  const [lastCompanyId, setLastCompanyId] = useState<string | undefined>(undefined);
  if (visible && company && company.id !== lastCompanyId) {
    setLastCompanyId(company.id);
    const parsed = parseEditDescription(company.description);
    setDescFr(parsed.fr);
    setDescEn(parsed.en);
    setDescZh(parsed.zh);
    setForm({
      companyName: company.companyName ?? "",
      sector: company.sector ?? "",
      sizeRange: company.sizeRange ?? "",
      description: company.description ?? "",
      website: company.website ?? "",
      contactName: company.contactName ?? "",
      location: company.location ?? "",
      bannerUrl: company.bannerUrl ?? "",
      logoUrl: company.logoUrl ?? "",
    });
  }

  const fr = lang === "fr";

  const [isUploadingBanner, setIsUploadingBanner] = useState<boolean>(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [localBannerUri, setLocalBannerUri] = useState<string | null>(null);
  const [localLogoUri, setLocalLogoUri] = useState<string | null>(null);

  async function handlePickBanner() {
    const file = await pickImage();
    if (!file) return;
    setLocalBannerUri(file.uri);
    setIsUploadingBanner(true);
    try {
      const result = await uploadFile(file.uri, file.filename, file.mimeType);
      setForm((f) => ({ ...f, bannerUrl: result.url }));
    } catch (e) {
      setLocalBannerUri(null);
    } finally {
      setIsUploadingBanner(false);
    }
  }

  async function handlePickLogo() {
    const file = await pickSquareImage();
    if (!file) return;
    setLocalLogoUri(file.uri);
    setIsUploadingLogo(true);
    try {
      const result = await uploadFile(file.uri, file.filename, file.mimeType);
      setForm((f) => ({ ...f, logoUrl: result.url }));
    } catch (e) {
      setLocalLogoUri(null);
    } finally {
      setIsUploadingLogo(false);
    }
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    marginTop: 6,
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginTop: 14,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "85%",
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
              {fr ? "Modifier le profil" : "Edit Profile"}
            </Text>
            <Pressable
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.toggleBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo upload */}
            <Text style={labelStyle}>{fr ? "Logo de l'entreprise" : "Company Logo"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16, marginTop: 8 }}>
              <Pressable
                testID="edit-logo-upload"
                onPress={handlePickLogo}
                disabled={isUploadingLogo}
                style={({ pressed }) => ({
                  width: 72, height: 72, borderRadius: 20,
                  overflow: "hidden",
                  borderWidth: 2,
                  borderStyle: (localLogoUri || form.logoUrl) ? "solid" : "dashed",
                  borderColor: isUploadingLogo ? NAVY : colors.border,
                  backgroundColor: pressed ? (isDark ? "#1A2540" : "#F0F4FF") : (isDark ? "#243260" : "#F0F4FF"),
                  alignItems: "center", justifyContent: "center",
                })}
              >
                {(localLogoUri || form.logoUrl) ? (
                  <Image
                    source={{ uri: localLogoUri ?? form.logoUrl }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : isUploadingLogo ? (
                  <ActivityIndicator color={NAVY} size="small" />
                ) : (
                  <Camera size={20} color={NAVY} strokeWidth={1.8} />
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 2 }}>
                  {fr ? "Photo de profil" : "Profile Photo"}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, lineHeight: 16 }}>
                  {fr ? "Appuyez sur le logo pour changer" : "Tap the logo to change"}
                </Text>
              </View>
            </View>

            <Text style={labelStyle}>
              {fr ? "Nom de l'entreprise *" : "Company Name *"}
            </Text>
            <TextInput
              testID="edit-company-name"
              style={inputStyle}
              value={form.companyName}
              onChangeText={(v) => setForm((f) => ({ ...f, companyName: v }))}
              placeholder={fr ? "Nom de l'entreprise" : "Company name"}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={labelStyle}>{fr ? "Secteur" : "Sector"}</Text>
            <TextInput
              testID="edit-sector"
              style={inputStyle}
              value={form.sector}
              onChangeText={(v) => setForm((f) => ({ ...f, sector: v }))}
              placeholder={fr ? "ex: Technologie, Finance..." : "e.g. Technology, Finance..."}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={labelStyle}>{fr ? "Taille de l'entreprise" : "Company Size"}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {SIZE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  testID={`size-option-${opt}`}
                  onPress={() => setForm((f) => ({ ...f, sizeRange: opt }))}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: form.sizeRange === opt ? colors.accent : colors.border,
                    backgroundColor: form.sizeRange === opt ? colors.toggleBg : colors.background,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: form.sizeRange === opt ? colors.primary : colors.textSecondary,
                    }}
                  >
                    {opt} {fr ? "employés" : "employees"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={labelStyle}>{fr ? "Description" : "Description"}</Text>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 8, marginBottom: 4 }}>
              {(["fr", "en", "zh"] as const).map((tabLang) => (
                <Pressable
                  key={tabLang}
                  onPress={() => setDescTab(tabLang)}
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    borderRadius: 6,
                    backgroundColor: descTab === tabLang ? NAVY : "transparent",
                    borderWidth: 1,
                    borderColor: descTab === tabLang ? NAVY : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: descTab === tabLang ? "#FFFFFF" : colors.textSecondary }}>
                    {tabLang === "fr" ? "FR" : tabLang === "en" ? "EN" : "中文"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              testID="edit-description"
              style={[inputStyle, { minHeight: 96, textAlignVertical: "top" }]}
              value={descTab === "fr" ? descFr : descTab === "en" ? descEn : descZh}
              onChangeText={(v) => {
                if (descTab === "fr") setDescFr(v);
                else if (descTab === "en") setDescEn(v);
                else setDescZh(v);
              }}
              placeholder={fr ? "Présentez votre entreprise..." : "Describe your company..."}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />

            <Text style={labelStyle}>{fr ? "Site web" : "Website"}</Text>
            <TextInput
              testID="edit-website"
              style={inputStyle}
              value={form.website}
              onChangeText={(v) => setForm((f) => ({ ...f, website: v }))}
              placeholder="https://example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={labelStyle}>{fr ? "Image de bannière" : "Banner Image"}</Text>
            <Pressable
              testID="edit-banner-upload"
              onPress={handlePickBanner}
              disabled={isUploadingBanner}
              style={({ pressed }) => ({
                height: 120,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 2,
                borderStyle: (localBannerUri || form.bannerUrl) ? "solid" : "dashed",
                borderColor: isUploadingBanner ? NAVY : colors.border,
                backgroundColor: pressed ? (isDark ? "#1A2540" : "#F0F4FF") : (isDark ? "#1A2540" : "#F8FAFF"),
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
                marginTop: 6,
              })}
            >
              {(localBannerUri || form.bannerUrl) ? (
                <Image
                  source={{ uri: localBannerUri ?? form.bannerUrl }}
                  style={{ width: "100%", height: "100%", borderRadius: 10 }}
                  resizeMode="cover"
                />
              ) : null}
              {isUploadingBanner ? (
                <View style={{
                  position: "absolute" as const,
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.45)",
                  alignItems: "center", justifyContent: "center", borderRadius: 10,
                }}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={{ color: "#FFFFFF", fontSize: 12, marginTop: 6, fontWeight: "600" }}>
                    {fr ? "Envoi en cours..." : "Uploading..."}
                  </Text>
                </View>
              ) : (!(localBannerUri || form.bannerUrl)) ? (
                <View style={{ alignItems: "center", gap: 8 }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#E8EEFF",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Camera size={22} color={NAVY} strokeWidth={1.8} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#9BA5BF" : "#6B7280" }}>
                    {fr ? "Appuyer pour choisir une photo" : "Tap to choose a photo"}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    {fr ? "Format 16:9 recommandé" : "16:9 ratio recommended"}
                  </Text>
                </View>
              ) : (
                <View style={{
                  position: "absolute" as const, bottom: 8, right: 8,
                  backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8,
                  paddingHorizontal: 8, paddingVertical: 4,
                  flexDirection: "row", alignItems: "center", gap: 4,
                }}>
                  <Camera size={12} color="#FFFFFF" strokeWidth={2} />
                  <Text style={{ fontSize: 11, color: "#FFFFFF", fontWeight: "600" }}>
                    {fr ? "Changer" : "Change"}
                  </Text>
                </View>
              )}
            </Pressable>

            <Text style={labelStyle}>{fr ? "Nom du contact" : "Contact Name"}</Text>
            <TextInput
              testID="edit-contact-name"
              style={inputStyle}
              value={form.contactName}
              onChangeText={(v) => setForm((f) => ({ ...f, contactName: v }))}
              placeholder={fr ? "Votre nom" : "Your name"}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={labelStyle}>{fr ? "Localisation" : "Location"}</Text>
            <TextInput
              testID="edit-location"
              style={inputStyle}
              value={form.location}
              onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
              placeholder={fr ? "ex: Dakar, Sénégal" : "e.g. Dakar, Senegal"}
              placeholderTextColor={colors.textMuted}
            />

            <Pressable
              testID="save-profile-button"
              onPress={() => {
                if (form.companyName.trim()) onSave({ ...form, description: JSON.stringify({ fr: descFr, en: descEn, zh: descZh }) });
              }}
              disabled={isSaving || !form.companyName.trim()}
              style={{
                marginTop: 24,
                backgroundColor:
                  isSaving || !form.companyName.trim() ? colors.border : GREEN,
                borderRadius: 10,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                  {fr ? "Enregistrer" : "Save Changes"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add Team Member Modal ────────────────────────────────────────────────────

function AddMemberModal({
  visible,
  onClose,
  onAdd,
  isAdding,
  lang,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, role: string, linkedUserId?: string) => void;
  isAdding: boolean;
  lang: string;
  colors: ThemeColors;
}) {
  const [name, setName] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [linkedUserId, setLinkedUserId] = useState<string>("");
  const t = useLang((s) => s.t);
  const fr = lang === "fr";

  const handleAdd = () => {
    if (name.trim()) {
      onAdd(name.trim(), role.trim(), linkedUserId.trim() || undefined);
      setName("");
      setRole("");
      setLinkedUserId("");
    }
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    marginTop: 6,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
              {fr ? "Ajouter un membre" : "Add Team Member"}
            </Text>
            <Pressable
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.toggleBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={{ padding: 20, paddingBottom: 36 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.textSecondary,
              }}
            >
              {fr ? "Nom *" : "Name *"}
            </Text>
            <TextInput
              testID="add-member-name"
              style={inputStyle}
              value={name}
              onChangeText={setName}
              placeholder={fr ? "Prénom et nom" : "Full name"}
              placeholderTextColor={colors.textMuted}
            />

            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.textSecondary,
                marginTop: 14,
              }}
            >
              {fr ? "Rôle / Titre" : "Role / Title"}
            </Text>
            <TextInput
              testID="add-member-role"
              style={inputStyle}
              value={role}
              onChangeText={setRole}
              placeholder={fr ? "ex: Développeur, RH..." : "e.g. Developer, HR..."}
              placeholderTextColor={colors.textMuted}
            />

            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.textSecondary,
                marginTop: 14,
              }}
            >
              {t("team_link_profile")}
            </Text>
            <TextInput
              testID="add-member-linked-user-id"
              style={inputStyle}
              value={linkedUserId}
              onChangeText={setLinkedUserId}
              placeholder="User ID (optionnel)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />

            <Pressable
              testID="add-member-button"
              onPress={handleAdd}
              disabled={isAdding || !name.trim()}
              style={{
                marginTop: 20,
                backgroundColor: isAdding || !name.trim() ? colors.textMuted : GREEN,
                borderRadius: 10,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isAdding ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                  {fr ? "Ajouter" : "Add Member"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CompanyProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const { colors, isDark } = useTheme();

  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);
  const [showListingsModal, setShowListingsModal] = useState<boolean>(false);

  // Theme-aware color tokens
  const navyText = isDark ? "#F5F5F5" : NAVY;
  const cardBg = isDark ? "#1E2C50" : "#FFFFFF";
  const pageBg = isDark ? "#0F1B3D" : "#F5F7FA";
  const sectionLabelColor = isDark ? "#9BA5BF" : "#6B7280";
  const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "#E8EBF2";

  // ─── Queries ───────────────────────────────────────────────────────────────

  const {
    data: company,
    isLoading,
  } = useQuery<CompanyData>({
    queryKey: ["company-profile"],
    queryFn: () => api.get<CompanyData>("/api/company"),
    retry: 1,
  });

  const companyId = company?.id;
  const { data: backendPosts } = useQuery<CompanyPost[]>({
    queryKey: ["company-posts-own", companyId],
    queryFn: () => api.get<CompanyPost[]>(`/api/company/${companyId}/posts`),
    enabled: !!companyId,
  });

  const { data: jobsData } = useQuery({
    queryKey: ["jobs-mine"],
    queryFn: () => api.get<{ jobs: { id: string; title: string; isActive: boolean }[] }>("/api/jobs/mine"),
    enabled: !isLoading,
  });

  const { data: appsData } = useQuery({
    queryKey: ["applications"],
    queryFn: () => api.get<{ pagination: { total: number } }>("/api/applications"),
    enabled: !isLoading,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const updateCompany = useMutation({
    mutationFn: (data: EditForm) => api.put<CompanyData>("/api/company", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-profile"] });
      setShowEditModal(false);
    },
  });

  const addMember = useMutation({
    mutationFn: ({ name, role, linkedUserId }: { name: string; role: string; linkedUserId?: string }) =>
      api.post("/api/company/team-members", { name, role, ...(linkedUserId ? { linkedUserId } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-profile"] });
      setShowAddMemberModal(false);
    },
  });

  const pinMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const base = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${base}/api/company/team-members/${memberId}/pin`, {
        method: "PATCH",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed");
      return json.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-profile"] }),
    onError: (err: Error) => {
      showToast(
        err.message === "Maximum 3 members can be pinned"
          ? t("team_max_pinned")
          : "Failed to update"
      );
    },
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/api/company/team-members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-profile"] });
    },
  });

  // ─── Demo / Real data resolution ──────────────────────────────────────────

  const demoCompany = DEMO_COMPANIES[0];
  const useDemo = !company;

  const displayName = useDemo ? demoCompany.companyName : company!.companyName;
  const displaySector = useDemo ? demoCompany.sector : (company?.sector ?? null);
  const displayLocation = useDemo ? demoCompany.city : (company?.location ?? null);
  const displayIsVerified = useDemo ? demoCompany.isVerified : (company?.isVerified ?? false);
  const displayDescription = useDemo
    ? (lang === "en" ? demoCompany.descriptionEn : lang === "zh" ? demoCompany.descriptionZh : demoCompany.descriptionFr)
    : parseDescription(company?.description ?? null, lang);
  const logoColor = useDemo ? demoCompany.logoColor : "#1B2F6E";
  const logoInitials = useDemo ? demoCompany.logoInitials : getInitials(displayName);

  const apiTeamMembers: TeamMember[] = useDemo
    ? []
    : (company?.teamMembers ?? []).slice().sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (a.order ?? 999) - (b.order ?? 999);
      });
  const demoTeamMembers: DemoTeamMember[] = demoCompany.teamMembers as DemoTeamMember[];
  const showDemoTeam = useDemo || apiTeamMembers.length === 0;
  const teamMembersToShow = showDemoTeam ? demoTeamMembers : [];

  // Demo has 2 active jobs (demo-job-1, demo-job-2); demo-job-3 is inactive
  const DEMO_ACTIVE_JOBS_COUNT = 2;
  const DEMO_APPLICATIONS_COUNT = 10;

  const activeJobs = useDemo
    ? DEMO_ACTIVE_JOBS_COUNT
    : (jobsData?.jobs?.filter((j) => j.isActive).length ?? company?.jobListings?.length ?? DEMO_ACTIVE_JOBS_COUNT);
  const applications = useDemo
    ? DEMO_APPLICATIONS_COUNT
    : (appsData?.pagination?.total ?? DEMO_APPLICATIONS_COUNT);
  const teamSize = teamMembersToShow.length;

  const activeListingsForModal = useDemo
    ? DEMO_ACTIVE_LISTINGS
    : (jobsData?.jobs?.filter((j) => j.isActive).map((j) => ({
        id: j.id,
        title: { fr: j.title, en: j.title, zh: j.title },
      })) ?? DEMO_ACTIVE_LISTINGS);

  const demoPosts = DEMO_COMPANY_POSTS.filter((p) => p.companyId === "company-1");
  const realPosts: CompanyPost[] = backendPosts ?? [];
  // When the recruiter has a real company, show only their real posts (not demo posts)
  const allPosts: CompanyPost[] = realPosts.length > 0 ? realPosts : (useDemo ? demoPosts : []);

  const jobListings = useDemo ? [] : (company?.jobListings ?? []);

  // ─── JSX ───────────────────────────────────────────────────────────────────

  return (
    <View
      testID="company-profile-screen"
      style={{ flex: 1, backgroundColor: pageBg }}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        testID="company-scroll"
        style={{ flex: 1, backgroundColor: pageBg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Banner + Header ── */}
        <SafeAreaView edges={["top"]} style={{ backgroundColor: NAVY }}>
          <View
            style={{
              height: 140,
              backgroundColor: NAVY,
              justifyContent: "flex-start",
              paddingTop: 12,
              paddingHorizontal: 20,
            }}
          >
            {/* Top row with edit + settings buttons */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Pressable
                testID="edit-profile-button"
                onPress={() => setShowEditModal(true)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Edit3 size={16} color="#FFFFFF" strokeWidth={2} />
              </Pressable>
              <Pressable
                testID="settings-button"
                onPress={() => router.push("/(app)/(recruiter)/settings" as never)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Settings size={16} color="#FFFFFF" strokeWidth={2} />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>

        {/* ── Logo Circle (overlapping banner) ── */}
        <View style={{ backgroundColor: pageBg }}>
          <View style={{ marginTop: -36, marginLeft: 20, marginBottom: 12 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: logoColor,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: "#FFFFFF",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800" }}>
                {logoInitials}
              </Text>
            </View>
          </View>

          {/* Company name + meta */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: navyText, letterSpacing: -0.5 }} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
              {displaySector ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Building2 size={12} color={sectionLabelColor} strokeWidth={2} />
                  <Text style={{ fontSize: 13, color: sectionLabelColor }}>{displaySector}</Text>
                </View>
              ) : null}
              {displayLocation ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <MapPin size={12} color={sectionLabelColor} strokeWidth={2} />
                  <Text style={{ fontSize: 13, color: sectionLabelColor }}>{displayLocation}</Text>
                </View>
              ) : null}
            </View>
            {displayIsVerified ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: GOLD,
                  alignSelf: "flex-start",
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  marginTop: 8,
                }}
              >
                <BadgeCheck size={11} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>
                  {tl(lang, "Vérifié", "Verified", "已认证")}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Stats Row ── */}
        {isLoading ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={NAVY} />
          </View>
        ) : (
          <>
            <View
              style={{
                flexDirection: "row",
                marginHorizontal: 16,
                marginBottom: 16,
                backgroundColor: cardBg,
                borderRadius: 16,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              {/* Stat cell */}
              {[
                {
                  value: activeJobs,
                  label: tl(lang, "Offres actives", "Active Jobs", "职位"),
                  onPress: () => setShowListingsModal(true),
                },
                {
                  value: applications,
                  label: tl(lang, "Candidatures", "Applications", "申请"),
                  onPress: undefined as (() => void) | undefined,
                },
                {
                  value: teamSize,
                  label: tl(lang, "Équipe", "Team", "团队"),
                  onPress: undefined as (() => void) | undefined,
                },
                {
                  value: realPosts.length,
                  label: tl(lang, "Publications", "Posts", "帖子"),
                  onPress: undefined as (() => void) | undefined,
                },
              ].map((stat, idx) => (
                <Pressable
                  key={idx}
                  testID={`stat-cell-${idx}`}
                  onPress={stat.onPress}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 16,
                    borderRightWidth: idx < 3 ? 1 : 0,
                    borderRightColor: dividerColor,
                    opacity: (pressed && stat.onPress) ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 24, fontWeight: "800", color: navyText, letterSpacing: -0.5 }}>
                    {stat.value}
                  </Text>
                  <Text style={{ fontSize: 11, color: sectionLabelColor, marginTop: 2, textAlign: "center" }}>
                    {stat.label}
                  </Text>
                  {stat.onPress ? (
                    <Text style={{ fontSize: 10, color: GREEN, marginTop: 2, fontWeight: "600" }}>
                      {tl(lang, "Voir", "View", "查看")}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>

            {/* ── About Section ── */}
            {displayDescription ? (
              <View
                style={{
                  marginHorizontal: 16,
                  marginBottom: 16,
                  backgroundColor: cardBg,
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}
              >
                <SectionHeader
                  title={tl(lang, "À propos", "About", "关于")}
                  navyText={navyText}
                  sectionLabelColor={sectionLabelColor}
                />
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    color: sectionLabelColor,
                  }}
                  numberOfLines={4}
                >
                  {displayDescription}
                </Text>
              </View>
            ) : null}

            {/* ── Team Section ── */}
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 16,
                backgroundColor: cardBg,
                borderRadius: 16,
                padding: 16,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <SectionHeader
                title={tl(lang, "Notre équipe", "Our Team", "我们的团队")}
                navyText={navyText}
                sectionLabelColor={sectionLabelColor}
                action={
                  <Pressable
                    testID="add-member-trigger"
                    onPress={() => setShowAddMemberModal(true)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      borderWidth: 1.5,
                      borderColor: NAVY,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Plus size={13} color={navyText} strokeWidth={2.5} />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: navyText }}>
                      {tl(lang, "Ajouter", "Add", "添加")}
                    </Text>
                  </Pressable>
                }
              />

              {/* API team members */}
              {apiTeamMembers.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
                >
                  {apiTeamMembers.map((member) => (
                    <View
                      key={member.id}
                      testID={`team-member-${member.id}`}
                      style={{
                        width: 120,
                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F5F7FA",
                        borderRadius: 12,
                        padding: 12,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: member.isPinned ? GOLD : dividerColor,
                      }}
                    >
                      <Pressable
                        testID={`remove-member-${member.id}`}
                        onPress={() => removeMember.mutate(member.id)}
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: "rgba(239,68,68,0.12)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <X size={10} color="#EF4444" strokeWidth={2.5} />
                      </Pressable>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: NAVY,
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
                          {getInitials(member.name)}
                        </Text>
                      </View>
                      <Text
                        style={{ fontSize: 13, fontWeight: "700", color: navyText, textAlign: "center" }}
                        numberOfLines={1}
                      >
                        {member.name}
                      </Text>
                      {member.role ? (
                        <Text
                          style={{ fontSize: 11, color: sectionLabelColor, textAlign: "center", marginTop: 2 }}
                          numberOfLines={2}
                        >
                          {member.role}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </ScrollView>
              ) : showDemoTeam && teamMembersToShow.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
                >
                  {teamMembersToShow.map((member) => (
                    <View
                      key={member.id}
                      testID={`team-member-demo-${member.id}`}
                      style={{
                        width: 120,
                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F5F7FA",
                        borderRadius: 12,
                        padding: 12,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: dividerColor,
                      }}
                    >
                      <TeamMemberAvatar
                        uri={member.avatarUri}
                        initials={member.initials}
                        avatarColor={member.avatarColor}
                        size={44}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: navyText,
                          textAlign: "center",
                          marginTop: 8,
                        }}
                        numberOfLines={1}
                      >
                        {member.name}
                      </Text>
                      <Text
                        style={{ fontSize: 11, color: sectionLabelColor, textAlign: "center", marginTop: 2 }}
                        numberOfLines={2}
                      >
                        {member.role}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 16 }}>
                  <Text style={{ fontSize: 13, color: sectionLabelColor, textAlign: "center" }}>
                    {tl(lang, "Aucun membre ajouté.", "No team members yet.", "暂无团队成员。")}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Active Listings Section ── */}
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 16,
                backgroundColor: cardBg,
                borderRadius: 16,
                padding: 16,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <SectionHeader
                title={tl(lang, "Nos offres actives", "Active Listings", "职位列表")}
                navyText={navyText}
                sectionLabelColor={sectionLabelColor}
              />
              {jobListings.length > 0 ? (
                jobListings.map((job, idx) => (
                  <View
                    key={job.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: dividerColor,
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: isDark ? "rgba(27,47,110,0.3)" : "#EEF1FA",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Briefcase size={16} color={NAVY} strokeWidth={2} />
                    </View>
                    <Text
                      style={{ flex: 1, fontSize: 14, fontWeight: "600", color: navyText }}
                      numberOfLines={1}
                    >
                      {job.title}
                    </Text>
                    <ChevronRight size={16} color={sectionLabelColor} />
                  </View>
                ))
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 16 }}>
                  <Text style={{ fontSize: 13, color: sectionLabelColor, textAlign: "center" }}>
                    {tl(lang, "Aucune offre active", "No active listings", "暂无职位")}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Publications Section ── */}
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 16,
                backgroundColor: cardBg,
                borderRadius: 16,
                padding: 16,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <SectionHeader
                title={tl(lang, "Publications", "Posts", "动态")}
                navyText={navyText}
                sectionLabelColor={sectionLabelColor}
                action={
                  <Pressable
                    testID="new-post-button"
                    onPress={() => router.push("/(app)/create-post" as never)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      backgroundColor: pressed ? "#2e9a43" : GREEN,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Plus size={13} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>
                      {tl(lang, "Publication", "Post", "发布")}
                    </Text>
                  </Pressable>
                }
              />

              {allPosts.length > 0 ? (
                allPosts.map((post) => (
                  <CompanyPostCard
                    key={post.id}
                    post={post}
                    logoColor={logoColor}
                    logoInitials={logoInitials}
                    lang={lang}
                    cardBg={isDark ? "rgba(255,255,255,0.04)" : "#F5F7FA"}
                    navyText={navyText}
                    sectionLabelColor={sectionLabelColor}
                    isDark={isDark}
                  />
                ))
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 16 }}>
                  <Text style={{ fontSize: 13, color: sectionLabelColor, textAlign: "center" }}>
                    {tl(lang, "Aucune publication.", "No posts yet.", "暂无动态。")}
                  </Text>
                </View>
              )}
            </View>

          </>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditModal}
        company={company}
        onClose={() => setShowEditModal(false)}
        onSave={(form) => updateCompany.mutate(form)}
        isSaving={updateCompany.isPending}
        lang={lang}
        colors={colors}
        isDark={isDark}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        visible={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onAdd={(name, role, linkedUserId) => addMember.mutate({ name, role, linkedUserId })}
        isAdding={addMember.isPending}
        lang={lang}
        colors={colors}
      />

      {/* Active Listings Modal */}
      <Modal
        visible={showListingsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowListingsModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          onPress={() => setShowListingsModal(false)}
        />
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "60%",
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 12 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: navyText }}>
              {tl(lang, "Offres actives", "Active Listings", "在招职位")}
            </Text>
            <Pressable
              onPress={() => setShowListingsModal(false)}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.toggleBg, alignItems: "center", justifyContent: "center" }}
            >
              <X size={16} color={sectionLabelColor} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 32 }}>
            {activeListingsForModal.map((job, idx) => (
              <View
                key={job.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: dividerColor,
                  gap: 12,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? "rgba(27,47,110,0.3)" : "#EEF1FA", alignItems: "center", justifyContent: "center" }}>
                  <Briefcase size={16} color={NAVY} strokeWidth={2} />
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: navyText }}>
                  {lang === "zh" ? job.title.zh : lang === "en" ? job.title.en : job.title.fr}
                </Text>
                <ChevronRight size={16} color={sectionLabelColor} />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
