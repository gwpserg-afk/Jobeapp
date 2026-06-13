import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  FileText,
  ChevronRight,
  Lock,
  Users,
  Briefcase,
  BookOpen,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Clock,
} from "lucide-react-native";
import { useTheme, type ThemeColors } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { useUserWithProfile } from "@/lib/hooks/useUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/lib/toast";
import * as DocumentPicker from "expo-document-picker";
import { UserAvatar } from "@/components/UserAvatar";
import { USER_ME_QUERY_KEY } from "@/lib/hooks/useUser";
import { useVerificationStore } from "@/lib/verificationStore";

const NAVY = "#1B2F6E";
const GREEN = "#3BAD4E";

type PrivacyOption = "everyone" | "all_recruiters" | "applied_only";

const PRIVACY_OPTIONS: {
  key: PrivacyOption;
  frLabel: string;
  enLabel: string;
  zhLabel: string;
  Icon: typeof Users;
}[] = [
  { key: "everyone", frLabel: "Tout le monde", enLabel: "Everyone", zhLabel: "所有人", Icon: Users },
  { key: "all_recruiters", frLabel: "Tous les recruteurs", enLabel: "All Recruiters", zhLabel: "所有招聘者", Icon: Briefcase },
  { key: "applied_only", frLabel: "Recruteurs contactés", enLabel: "Applied Only", zhLabel: "仅申请的招聘者", Icon: Lock },
];

function PrivacySelector({
  value,
  onChange,
  lang,
  colors,
}: {
  value: PrivacyOption;
  onChange: (v: PrivacyOption) => void;
  lang: string;
  colors: ThemeColors;
}) {
  const isFr = lang === "fr";
  return (
    <View style={{ marginTop: 12 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: colors.textMuted,
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {isFr ? "Qui peut voir cela ?" : lang === "zh" ? "谁可以看到这个？" : "Who can see this?"}
      </Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {PRIVACY_OPTIONS.map((opt) => {
          const selected = value === opt.key;
          const label =
            lang === "fr" ? opt.frLabel : lang === "zh" ? opt.zhLabel : opt.enLabel;
          const IconComp = opt.Icon;
          return (
            <Pressable
              key={opt.key}
              onPress={() => {
                onChange(opt.key);
                showToast(
                  isFr ? "Paramètre de confidentialité mis à jour" : "Privacy updated"
                );
              }}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 4,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: selected ? GREEN : colors.border,
                backgroundColor: selected ? GREEN + "15" : colors.background,
              }}
            >
              <IconComp
                size={14}
                color={selected ? GREEN : colors.textMuted}
                strokeWidth={2}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: selected ? "700" : "500",
                  color: selected ? GREEN : colors.textMuted,
                  marginTop: 4,
                  textAlign: "center",
                }}
                numberOfLines={2}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLang();
  const lang = useLang((s) => s.lang);
  const isFr = lang === "fr";
  const { user, profile } = useUserWithProfile();
  const queryClient = useQueryClient();

  const [bio, setBio] = useState(profile?.bio ?? "");
  const [cvPrivacy, setCvPrivacy] = useState<PrivacyOption>("all_recruiters");

  useEffect(() => {
    if (profile?.bio) setBio(profile.bio);
  }, [profile]);

  const verificationStatus = useVerificationStore((s) => s.status);
  const isIdVerified = verificationStatus === "verified";
  const isIdPending = verificationStatus === "pending";
  const isPhoneVerified = !!(user as any)?.phoneVerified || !!(profile as any)?.phoneVerified;

  const displayName = user?.name ?? "User";
  const displayPhotoUri =
    user?.image ?? (profile as any)?.profilePhotoUrl ?? null;
  const cvUrl = (profile as any)?.cvUrl ?? null;

  const hasPhoto = !!(
    (profile as any)?.profilePhotoUrl || user?.image
  );
  const hasBio = !!(bio && bio.length > 10);
  const hasCv = !!cvUrl;
  const hasSkills = !!(
    (profile as any)?.skills && ((profile as any).skills as unknown[]).length > 0
  );
  const completionPct =
    (hasPhoto ? 20 : 0) +
    (hasBio ? 25 : 0) +
    (hasSkills ? 25 : 0) +
    (hasCv ? 30 : 0);

  const saveBioMutation = useMutation({
    mutationFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bio }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
      showToast(
        isFr ? "À propos sauvegardé" : lang === "zh" ? "简介已保存" : "About saved"
      );
    },
    onError: () =>
      showToast(isFr ? "Erreur lors de la sauvegarde" : "Save failed"),
  });

  const uploadCvMutation = useMutation({
    mutationFn: async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) throw new Error("cancelled");
      const asset = result.assets[0];
      const { uploadFile } = await import("@/lib/upload");
      const uploaded = await uploadFile(
        asset.uri,
        asset.name,
        asset.mimeType ?? "application/pdf"
      );
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${baseUrl}/api/profile/cv`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cvUrl: uploaded.url, cvFileId: uploaded.id }),
      });
      if (!res.ok) throw new Error("Failed to save CV");
      return uploaded.url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
      showToast(
        isFr
          ? "CV téléchargé avec succès"
          : lang === "zh"
          ? "简历上传成功"
          : "CV uploaded successfully"
      );
    },
    onError: (err: Error) => {
      if (err?.message !== "cancelled")
        showToast(isFr ? "Échec du téléchargement" : "Upload failed");
    },
  });

  const cardStyle = {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID="complete-profile-screen">
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.background }}>
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
            onPress={() => router.back()}
            style={{ marginRight: 12, padding: 4 }}
            hitSlop={8}
            testID="back-button"
          >
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
          <Text
            style={{ flex: 1, fontSize: 18, fontWeight: "700", color: colors.text }}
          >
            {isFr
              ? "Compléter le profil"
              : lang === "zh"
              ? "完善档案"
              : "Complete Your Profile"}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: "800", color: GREEN }}>
            {completionPct}%
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Progress bar */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 8,
          }}
        >
          <View
            style={{
              height: 8,
              backgroundColor: isDark ? colors.border : "#E8EDF5",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 8,
                width: `${completionPct}%`,
                backgroundColor: GREEN,
                borderRadius: 4,
              }}
            />
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
            {isFr
              ? `${completionPct}% de votre profil est complété`
              : lang === "zh"
              ? `已完成 ${completionPct}%`
              : `${completionPct}% of your profile is complete`}
          </Text>
        </View>

        {/* Profile Photo */}
        <View style={cardStyle}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {hasPhoto ? (
                <CheckCircle2 size={16} color={GREEN} />
              ) : (
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: colors.border,
                  }}
                />
              )}
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                {isFr ? "Photo de profil" : lang === "zh" ? "头像" : "Profile Photo"}
              </Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "700", color: GREEN }}>+20%</Text>
          </View>
          <Pressable
            onPress={() => router.push("/edit-profile" as never)}
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: hasPhoto ? GREEN : colors.border,
              }}
            >
              <UserAvatar
                name={displayName}
                imageUrl={displayPhotoUri}
                size={60}
                backgroundColor={NAVY}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                {hasPhoto
                  ? isFr
                    ? "Photo ajoutée — appuyez pour modifier"
                    : lang === "zh"
                    ? "已添加照片 — 点击修改"
                    : "Photo added — tap to change"
                  : isFr
                  ? "Ajoutez une photo pour que les recruteurs vous reconnaissent"
                  : lang === "zh"
                  ? "添加照片让招聘者认识你"
                  : "Add a photo so recruiters can recognize you"}
              </Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* About / Bio */}
        <View style={cardStyle}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {hasBio ? (
                <CheckCircle2 size={16} color={GREEN} />
              ) : (
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: colors.border,
                  }}
                />
              )}
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                {isFr ? "À propos" : lang === "zh" ? "关于" : "About"}
              </Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "700", color: GREEN }}>+25%</Text>
          </View>
          <TextInput
            testID="bio-input"
            value={bio}
            onChangeText={setBio}
            placeholder={
              isFr
                ? "Parlez de vous, de votre expérience, de vos objectifs..."
                : lang === "zh"
                ? "介绍一下自己、您的经历和目标..."
                : "Tell recruiters about yourself, your experience, your goals..."
            }
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              color: colors.text,
              minHeight: 100,
              textAlignVertical: "top",
              borderWidth: 1,
              borderColor: colors.border,
              lineHeight: 22,
            }}
          />
          <Pressable
            testID="save-bio-button"
            onPress={() => saveBioMutation.mutate()}
            disabled={saveBioMutation.isPending || !bio.trim()}
            style={{
              marginTop: 10,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: "center",
              backgroundColor: bio.trim() ? GREEN : colors.border,
            }}
          >
            {saveBioMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: bio.trim() ? "#fff" : colors.textMuted,
                }}
              >
                {isFr ? "Sauvegarder" : lang === "zh" ? "保存" : "Save"}
              </Text>
            )}
          </Pressable>
        </View>

        {/* CV / Resume */}
        <View style={cardStyle}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {hasCv ? (
                <CheckCircle2 size={16} color={GREEN} />
              ) : (
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: colors.border,
                  }}
                />
              )}
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                {isFr ? "CV / Résumé" : lang === "zh" ? "简历" : "CV / Resume"}
              </Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "700", color: GREEN }}>+30%</Text>
          </View>
          {cvUrl ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 12,
                backgroundColor: GREEN + "12",
                borderRadius: 10,
                marginBottom: 10,
              }}
            >
              <FileText size={20} color={GREEN} />
              <Text
                style={{ flex: 1, fontSize: 13, color: GREEN, fontWeight: "600" }}
              >
                {isFr
                  ? "CV téléchargé"
                  : lang === "zh"
                  ? "简历已上传"
                  : "CV Uploaded"}
              </Text>
              <CheckCircle2 size={16} color={GREEN} />
            </View>
          ) : null}
          <Pressable
            testID="upload-cv-button"
            onPress={() => uploadCvMutation.mutate()}
            disabled={uploadCvMutation.isPending}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 12,
              borderRadius: 10,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: colors.border,
            }}
          >
            {uploadCvMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <>
                <FileText size={16} color={colors.textMuted} />
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}
                >
                  {cvUrl
                    ? isFr
                      ? "Remplacer le CV (PDF)"
                      : lang === "zh"
                      ? "替换简历 (PDF)"
                      : "Replace CV (PDF)"
                    : isFr
                    ? "Télécharger CV (PDF)"
                    : lang === "zh"
                    ? "上传简历 (PDF)"
                    : "Upload CV (PDF)"}
                </Text>
              </>
            )}
          </Pressable>
          <PrivacySelector
            value={cvPrivacy}
            onChange={setCvPrivacy}
            lang={lang}
            colors={colors}
          />
        </View>

        {/* Skills */}
        <View style={cardStyle}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {hasSkills ? (
                <CheckCircle2 size={16} color={GREEN} />
              ) : (
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: colors.border,
                  }}
                />
              )}
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                {isFr ? "Compétences" : lang === "zh" ? "技能" : "Skills"}
              </Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "700", color: GREEN }}>+25%</Text>
          </View>
          <Pressable
            testID="manage-skills-button"
            onPress={() => router.push("/edit-profile" as never)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <BookOpen size={16} color={colors.textMuted} />
            <Text
              style={{ flex: 1, fontSize: 13, color: colors.textSecondary }}
            >
              {isFr
                ? "Gérer vos compétences dans Modifier le profil"
                : lang === "zh"
                ? "在编辑资料中管理技能"
                : "Manage your skills in Edit Profile"}
            </Text>
            <ChevronRight size={14} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Verify Your Identity */}
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
            {isFr ? "Vérification" : lang === "zh" ? "验证" : "Verify Your Identity"}
          </Text>

          {/* Phone Verification */}
          <Pressable
            testID="verify-phone-button"
            onPress={() => router.push("/(app)/verify-phone" as never)}
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: isPhoneVerified ? GREEN + "40" : colors.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              marginBottom: 10,
            }}
          >
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: isPhoneVerified ? GREEN + "18" : colors.background,
              borderWidth: 1,
              borderColor: isPhoneVerified ? GREEN + "40" : colors.border,
              alignItems: "center", justifyContent: "center",
            }}>
              <Phone size={20} color={isPhoneVerified ? GREEN : colors.textMuted} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                {isFr ? "Numéro de téléphone" : lang === "zh" ? "手机号码" : "Phone Number"}
              </Text>
              <Text style={{ fontSize: 12, color: isPhoneVerified ? GREEN : colors.textMuted, marginTop: 2, fontWeight: isPhoneVerified ? "600" : "400" }}>
                {isPhoneVerified
                  ? (isFr ? "Vérifié" : lang === "zh" ? "已验证" : "Verified")
                  : (isFr ? "Ajoutez votre numéro pour plus de sécurité" : lang === "zh" ? "添加手机号以提高安全性" : "Add your number for extra security")}
              </Text>
            </View>
            {isPhoneVerified
              ? <CheckCircle2 size={20} color={GREEN} />
              : <ChevronRight size={18} color={colors.textMuted} />}
          </Pressable>

          {/* ID Verification */}
          <Pressable
            testID="verify-id-button"
            onPress={() => router.push("/(app)/verify-identity" as never)}
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: isIdVerified ? GREEN + "40" : isIdPending ? "#F59E0B40" : colors.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: isIdVerified ? GREEN + "18" : isIdPending ? "#F59E0B18" : colors.background,
              borderWidth: 1,
              borderColor: isIdVerified ? GREEN + "40" : isIdPending ? "#F59E0B40" : colors.border,
              alignItems: "center", justifyContent: "center",
            }}>
              <ShieldCheck size={20} color={isIdVerified ? GREEN : isIdPending ? "#F59E0B" : colors.textMuted} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                {isFr ? "Pièce d'identité" : lang === "zh" ? "身份证件" : "ID Verification"}
              </Text>
              <Text style={{ fontSize: 12, marginTop: 2, fontWeight: isIdVerified || isIdPending ? "600" : "400",
                color: isIdVerified ? GREEN : isIdPending ? "#F59E0B" : colors.textMuted }}>
                {isIdVerified
                  ? (isFr ? "Identité vérifiée" : lang === "zh" ? "身份已验证" : "Identity verified")
                  : isIdPending
                  ? (isFr ? "En cours d'examen..." : lang === "zh" ? "审核中..." : "Under review...")
                  : (isFr ? "Téléchargez recto/verso de votre pièce d'identité" : lang === "zh" ? "上传身份证正反面" : "Upload front & back of your ID")}
              </Text>
            </View>
            {isIdVerified
              ? <CheckCircle2 size={20} color={GREEN} />
              : isIdPending
              ? <Clock size={18} color="#F59E0B" />
              : <ChevronRight size={18} color={colors.textMuted} />}
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
