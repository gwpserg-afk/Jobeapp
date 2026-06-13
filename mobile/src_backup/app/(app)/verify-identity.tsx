import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  Clock,
  Camera,
  Upload,
  ChevronRight,
  RefreshCw,
  FileText,
} from "lucide-react-native";
import { useState, useRef, useEffect } from "react";
import { useTheme, type ThemeColors } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { uploadFile } from "@/lib/upload";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GREEN = "#3BAD4E";

interface VerifyStatus {
  status: string | null;
  createdAt: string | null;
  isVerified: boolean;
}

interface PhotoState {
  uri: string;
  name: string;
  mime: string;
}

// Step indices: 0 = front, 1 = back, 2 = review
type Step = 0 | 1 | 2;

export default function VerifyIdentityScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme((s) => s);
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const isFr = lang === "fr";
  const isZh = lang === "zh";
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>(0);
  const [frontPhoto, setFrontPhoto] = useState<PhotoState | null>(null);
  const [backPhoto, setBackPhoto] = useState<PhotoState | null>(null);
  const [uploading, setUploading] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateToStep = (newStep: Step) => {
    const direction = newStep > step ? 1 : -1;
    slideAnim.setValue(direction * SCREEN_WIDTH);
    setStep(newStep);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  };

  const { data, isLoading } = useQuery({
    queryKey: ["identity-verify"],
    queryFn: () => api.get<VerifyStatus>("/api/identity-verify"),
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: {
      nationalIdNumber: string;
      nationalIdPhotoUrl?: string;
      nationalIdBackPhotoUrl?: string;
    }) => api.post("/api/identity-verify", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-verify"] });
    },
    onError: (error: unknown) => {
      const code = (error as { response?: { data?: { error?: { code?: string } } } })?.response
        ?.data?.error?.code;
      if (code === "ALREADY_PENDING") {
        Alert.alert(
          isFr ? "Déjà soumis" : isZh ? "已提交" : "Already submitted",
          isFr
            ? "Votre demande est déjà en attente de vérification."
            : isZh
            ? "您的申请已在审核中。"
            : "Your request is already pending review."
        );
      } else {
        Alert.alert(
          isFr ? "Erreur" : isZh ? "错误" : "Error",
          isFr ? "Une erreur est survenue." : isZh ? "发生了错误。" : "Something went wrong."
        );
      }
    },
  });

  const status = data?.status;
  const isVerified = data?.isVerified ?? false;

  const launchCamera = async (side: "front" | "back") => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const photo: PhotoState = {
        uri: asset.uri,
        name: `id-${side}-${Date.now()}.jpg`,
        mime: asset.mimeType ?? "image/jpeg",
      };
      if (side === "front") {
        setFrontPhoto(photo);
      } else {
        setBackPhoto(photo);
      }
    }
  };

  const launchGallery = async (side: "front" | "back") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const photo: PhotoState = {
        uri: asset.uri,
        name: asset.fileName ?? `id-${side}-${Date.now()}.jpg`,
        mime: asset.mimeType ?? "image/jpeg",
      };
      if (side === "front") {
        setFrontPhoto(photo);
      } else {
        setBackPhoto(photo);
      }
    }
  };

  const launchDocument = async (side: "front" | "back") => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const photo: PhotoState = {
        uri: asset.uri,
        name: asset.name ?? `id-${side}-${Date.now()}`,
        mime: asset.mimeType ?? "application/pdf",
      };
      if (side === "front") {
        setFrontPhoto(photo);
      } else {
        setBackPhoto(photo);
      }
    }
  };

  const handleSubmit = async () => {
    if (!frontPhoto || !backPhoto) return;

    try {
      setUploading(true);
      const [frontResult, backResult] = await Promise.all([
        uploadFile(frontPhoto.uri, frontPhoto.name, frontPhoto.mime),
        uploadFile(backPhoto.uri, backPhoto.name, backPhoto.mime),
      ]);

      submitMutation.mutate({
        nationalIdNumber: `ID-${Date.now()}`,
        nationalIdPhotoUrl: frontResult.url,
        nationalIdBackPhotoUrl: backResult.url,
      });
    } catch {
      Alert.alert(
        isFr ? "Échec du téléchargement" : isZh ? "上传失败" : "Upload failed",
        isFr
          ? "Impossible de télécharger vos photos. Veuillez réessayer."
          : isZh
          ? "无法上传您的照片，请重试。"
          : "Could not upload your photos. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const isBusy = uploading || submitMutation.isPending;

  const stepLabels = isFr
    ? ["Recto de la pièce", "Verso de la pièce", "Vérification"]
    : isZh
    ? ["正面", "背面", "确认"]
    : ["Front of ID", "Back of ID", "Review"];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID="verify-identity-screen">
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
            gap: 12,
          }}
        >
          <Pressable
            testID="back-button"
            onPress={() => {
              if (!isLoading && !isVerified && status !== "pending" && step > 0) {
                animateToStep((step - 1) as Step);
              } else {
                router.back();
              }
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.toggleBg,
            }}
          >
            <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>
            {t("settings_verify_identity")}
          </Text>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.accent} testID="loading-indicator" />
        </View>
      ) : isVerified ? (
        <VerifiedState colors={colors} isDark={isDark} isFr={isFr} isZh={isZh} />
      ) : status === "pending" ? (
        <PendingState colors={colors} isDark={isDark} isFr={isFr} isZh={isZh} />
      ) : (
        <View style={{ flex: 1 }}>
          {/* Progress bar */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 8,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor:
                      i <= step
                        ? GREEN
                        : isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.1)",
                  }}
                />
              ))}
            </View>
            <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "500" }}>
              {isFr
                ? `Étape ${step + 1} sur 3 — ${stepLabels[step]}`
                : isZh
                ? `第 ${step + 1} 步，共 3 步 — ${stepLabels[step]}`
                : `Step ${step + 1} of 3 — ${stepLabels[step]}`}
            </Text>
          </View>

          {/* Animated step content */}
          <Animated.View
            style={{
              flex: 1,
              transform: [{ translateX: slideAnim }],
            }}
          >
            {step === 0 && (
              <PhotoCaptureStep
                side="front"
                photo={frontPhoto}
                colors={colors}
                isDark={isDark}
                isFr={isFr}
                isZh={isZh}
                onCamera={() => launchCamera("front")}
                onGallery={() => launchGallery("front")}
                onDocument={() => launchDocument("front")}
                onRetake={() => setFrontPhoto(null)}
                onNext={() => animateToStep(1)}
                progressPhoto={null}
              />
            )}
            {step === 1 && (
              <PhotoCaptureStep
                side="back"
                photo={backPhoto}
                colors={colors}
                isDark={isDark}
                isFr={isFr}
                isZh={isZh}
                onCamera={() => launchCamera("back")}
                onGallery={() => launchGallery("back")}
                onDocument={() => launchDocument("back")}
                onRetake={() => setBackPhoto(null)}
                onNext={() => animateToStep(2)}
                progressPhoto={frontPhoto}
              />
            )}
            {step === 2 && (
              <ReviewStep
                frontPhoto={frontPhoto}
                backPhoto={backPhoto}
                colors={colors}
                isDark={isDark}
                isFr={isFr}
                isZh={isZh}
                isBusy={isBusy}
                uploading={uploading}
                onSubmit={handleSubmit}
                onEditFront={() => animateToStep(0)}
                onEditBack={() => animateToStep(1)}
              />
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface ThemeProps {
  colors: ThemeColors;
  isDark: boolean;
  isFr: boolean;
  isZh: boolean;
}

function VerifiedState({ colors, isDark, isFr, isZh }: ThemeProps) {
  return (
    <View
      style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}
      testID="verified-state"
    >
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: isDark ? "rgba(74,222,128,0.15)" : "#DCFCE7",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <CheckCircle size={52} color="#22C55E" strokeWidth={1.5} />
      </View>
      <Text style={{ fontSize: 26, fontWeight: "800", color: isDark ? "#4ADE80" : "#16A34A", textAlign: "center" }}>
        {isFr ? "Identité vérifiée !" : isZh ? "身份已验证！" : "Identity Verified!"}
      </Text>
      <Text style={{ fontSize: 15, color: isDark ? "#86EFAC" : "#15803D", textAlign: "center", lineHeight: 22 }}>
        {isFr
          ? "Votre identité a été vérifiée avec succès. Votre profil affiche maintenant le badge de vérification."
          : isZh
          ? "您的身份已成功验证。您的个人资料现在显示验证徽章。"
          : "Your identity has been successfully verified. Your profile now displays the verification badge."}
      </Text>
      <View
        style={{
          backgroundColor: isDark ? "rgba(22,163,74,0.18)" : "#DCFCE7",
          borderRadius: 16,
          padding: 16,
          width: "100%",
          borderWidth: 1,
          borderColor: isDark ? "rgba(74,222,128,0.25)" : "#BBF7D0",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginTop: 8,
        }}
      >
        <Shield size={22} color="#22C55E" />
        <Text style={{ fontSize: 13, color: isDark ? "#86EFAC" : "#15803D", flex: 1, lineHeight: 18 }}>
          {isFr
            ? "Votre profil est maintenant certifié et inspire plus confiance aux recruteurs."
            : isZh
            ? "您的个人资料现已认证，更能赢得招聘者的信任。"
            : "Your profile is now certified and builds more trust with recruiters."}
        </Text>
      </View>
    </View>
  );
}

function PendingState({ colors, isDark, isFr, isZh }: ThemeProps) {
  return (
    <View
      style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}
      testID="pending-state"
    >
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <Clock size={52} color="#F59E0B" strokeWidth={1.5} />
      </View>
      <Text style={{ fontSize: 26, fontWeight: "800", color: isDark ? "#FCD34D" : "#D97706", textAlign: "center" }}>
        {isFr ? "En cours d'examen" : isZh ? "审核中" : "Under Review"}
      </Text>
      <Text style={{ fontSize: 15, color: isDark ? "#FDE68A" : "#B45309", textAlign: "center", lineHeight: 22 }}>
        {isFr
          ? "Votre pièce d'identité est en cours de vérification. Cela prend généralement 1 à 2 jours ouvrables."
          : isZh
          ? "您的身份证明文件正在审核中。这通常需要 1-2 个工作日。"
          : "Your ID is under review. This typically takes 1-2 business days."}
      </Text>
      <View
        style={{
          backgroundColor: isDark ? "rgba(217,119,6,0.18)" : "#FEF3C7",
          borderRadius: 16,
          padding: 16,
          width: "100%",
          borderWidth: 1,
          borderColor: isDark ? "rgba(252,211,77,0.25)" : "#FDE68A",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginTop: 8,
        }}
      >
        <Shield size={22} color="#F59E0B" />
        <Text style={{ fontSize: 13, color: isDark ? "#FDE68A" : "#B45309", flex: 1, lineHeight: 18 }}>
          {isFr
            ? "Vous recevrez une notification dès que votre identité sera vérifiée."
            : isZh
            ? "一旦您的身份得到验证，您将收到通知。"
            : "You'll receive a notification once your identity is verified."}
        </Text>
      </View>
    </View>
  );
}

interface PhotoCaptureStepProps extends ThemeProps {
  side: "front" | "back";
  photo: PhotoState | null;
  onCamera: () => void;
  onGallery: () => void;
  onDocument: () => void;
  onRetake: () => void;
  onNext: () => void;
  progressPhoto: PhotoState | null;
}

function PhotoCaptureStep({
  side,
  photo,
  colors,
  isDark,
  isFr,
  isZh,
  onCamera,
  onGallery,
  onDocument,
  onRetake,
  onNext,
  progressPhoto,
}: PhotoCaptureStepProps) {
  const title =
    side === "front"
      ? isFr
        ? "Recto de votre pièce d'identité"
        : isZh
        ? "身份证正面"
        : "Front of your ID"
      : isFr
      ? "Verso de votre pièce d'identité"
      : isZh
      ? "身份证背面"
      : "Back of your ID";

  const instruction =
    side === "front"
      ? isFr
        ? "Placez le RECTO de votre pièce d'identité dans le cadre"
        : isZh
        ? "将您的身份证正面放入框架中"
        : "Place the FRONT of your ID in the frame"
      : isFr
      ? "Placez le VERSO de votre pièce d'identité dans le cadre"
      : isZh
      ? "将您的身份证背面放入框架中"
      : "Place the BACK of your ID in the frame";

  const nextLabel =
    side === "front"
      ? isFr
        ? "Continuer avec le verso"
        : isZh
        ? "继续拍背面"
        : "Continue to Back"
      : isFr
      ? "Vérifier les photos"
      : isZh
      ? "查看照片"
      : "Review Photos";

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 20 }}>
      {/* Title */}
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>{title}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, lineHeight: 20 }}>{instruction}</Text>
      </View>

      {/* ID frame area */}
      {photo ? (
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: photo.uri }}
            style={{
              width: "100%",
              height: 220,
              borderRadius: 16,
              backgroundColor: colors.toggleBg,
            }}
            resizeMode="cover"
          />
          {/* Green checkmark overlay */}
          <View
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: GREEN,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <CheckCircle size={20} color="#fff" strokeWidth={2.5} />
          </View>
          {/* Retake button */}
          <Pressable
            testID={`retake-${side}-button`}
            onPress={onRetake}
            style={({ pressed }) => ({
              position: "absolute",
              bottom: 12,
              right: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(0,0,0,0.6)",
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 7,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <RefreshCw size={13} color="#fff" />
            <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>
              {isFr ? "Reprendre" : isZh ? "重拍" : "Retake"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={{
            width: "100%",
            height: 220,
            borderRadius: 16,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Camera size={30} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "500" }}>
            {isFr ? "Aucune photo sélectionnée" : isZh ? "未选择照片" : "No photo selected"}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      {!photo && (
        <>
          <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            testID={`camera-${side}-button`}
            onPress={onCamera}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 18,
              borderRadius: 16,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.card,
              borderWidth: 1.5,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Camera size={26} color={colors.accent ?? "#0066CC"} strokeWidth={1.8} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
              {isFr ? "Prendre une photo" : isZh ? "拍照" : "Take Photo"}
            </Text>
          </Pressable>

          <Pressable
            testID={`gallery-${side}-button`}
            onPress={onGallery}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 18,
              borderRadius: 16,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.card,
              borderWidth: 1.5,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Upload size={26} color={colors.accent ?? "#0066CC"} strokeWidth={1.8} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
              {isFr ? "Depuis la galerie" : isZh ? "从相册选择" : "Upload from Library"}
            </Text>
          </Pressable>
        </View>

        {/* PDF / document upload */}
        <Pressable
          testID={`document-${side}-button`}
          onPress={onDocument}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 14,
            borderRadius: 16,
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.background,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: colors.border,
            marginTop: 10,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <FileText size={18} color={colors.textMuted} strokeWidth={1.8} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>
            {isFr ? "Télécharger PDF" : isZh ? "上传 PDF" : "Upload PDF"}
          </Text>
        </Pressable>
        </>
      )}

      {/* Progress thumbnail (step 2 shows front photo) */}
      {progressPhoto ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: isDark ? "rgba(59,173,78,0.12)" : "#F0FFF4",
            borderRadius: 12,
            padding: 10,
            borderWidth: 1,
            borderColor: GREEN + "40",
          }}
        >
          <Image
            source={{ uri: progressPhoto.uri }}
            style={{ width: 52, height: 36, borderRadius: 6, backgroundColor: colors.toggleBg }}
            resizeMode="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: GREEN }}>
              {isFr ? "Recto enregistré" : isZh ? "正面已保存" : "Front captured"}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              {isFr ? "Maintenant, capturez le verso" : isZh ? "现在，拍摄背面" : "Now capture the back"}
            </Text>
          </View>
          <CheckCircle size={18} color={GREEN} />
        </View>
      ) : null}

      {/* Tips */}
      <View
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.card,
          borderRadius: 12,
          padding: 14,
          gap: 6,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
          {isFr ? "Conseils pour une bonne photo" : isZh ? "拍摄建议" : "Tips for a good photo"}
        </Text>
        {[
          isFr ? "Bonne luminosité, pas de reflets" : isZh ? "光线充足，无反光" : "Good lighting, no glare",
          isFr ? "Toute la carte visible dans le cadre" : isZh ? "卡片完整显示" : "Entire card visible in frame",
          isFr ? "Texte net et lisible" : isZh ? "文字清晰可读" : "Text is sharp and readable",
        ].map((tip, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: GREEN,
                marginTop: 1,
              }}
            />
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* Next button (only shown when photo is captured) */}
      {photo ? (
        <Pressable
          testID={`next-step-button`}
          onPress={onNext}
          style={({ pressed }) => ({
            backgroundColor: GREEN,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: pressed ? 0.85 : 1,
            shadowColor: GREEN,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
            marginTop: "auto",
          })}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{nextLabel}</Text>
          <ChevronRight size={18} color="#fff" strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

interface ReviewStepProps extends ThemeProps {
  frontPhoto: PhotoState | null;
  backPhoto: PhotoState | null;
  isBusy: boolean;
  uploading: boolean;
  onSubmit: () => void;
  onEditFront: () => void;
  onEditBack: () => void;
}

function ReviewStep({
  frontPhoto,
  backPhoto,
  colors,
  isDark,
  isFr,
  isZh,
  isBusy,
  uploading,
  onSubmit,
  onEditFront,
  onEditBack,
}: ReviewStepProps) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
          {isFr ? "Vérifiez vos photos" : isZh ? "检查您的照片" : "Review Your Photos"}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, lineHeight: 20 }}>
          {isFr
            ? "Assurez-vous que les deux côtés sont nets et lisibles."
            : isZh
            ? "确保两面清晰可读。"
            : "Make sure both sides are clear and readable."}
        </Text>
      </View>

      {/* Side-by-side thumbnails */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {/* Front */}
        <Pressable
          testID="edit-front-button"
          onPress={onEditFront}
          style={{ flex: 1, gap: 8 }}
        >
          <View style={{ position: "relative" }}>
            {frontPhoto ? (
              <Image
                source={{ uri: frontPhoto.uri }}
                style={{
                  width: "100%",
                  height: 130,
                  borderRadius: 14,
                  backgroundColor: colors.toggleBg,
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: 130,
                  borderRadius: 14,
                  backgroundColor: colors.toggleBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Camera size={28} color={colors.textMuted} />
              </View>
            )}
            <View
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                backgroundColor: "rgba(0,0,0,0.55)",
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 10, color: "#fff", fontWeight: "700" }}>
                {isFr ? "RECTO" : isZh ? "正面" : "FRONT"}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "center" }}>
            {isFr ? "Appuyer pour modifier" : isZh ? "点击修改" : "Tap to edit"}
          </Text>
        </Pressable>

        {/* Back */}
        <Pressable
          testID="edit-back-button"
          onPress={onEditBack}
          style={{ flex: 1, gap: 8 }}
        >
          <View style={{ position: "relative" }}>
            {backPhoto ? (
              <Image
                source={{ uri: backPhoto.uri }}
                style={{
                  width: "100%",
                  height: 130,
                  borderRadius: 14,
                  backgroundColor: colors.toggleBg,
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: 130,
                  borderRadius: 14,
                  backgroundColor: colors.toggleBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Camera size={28} color={colors.textMuted} />
              </View>
            )}
            <View
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                backgroundColor: "rgba(0,0,0,0.55)",
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 10, color: "#fff", fontWeight: "700" }}>
                {isFr ? "VERSO" : isZh ? "背面" : "BACK"}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "center" }}>
            {isFr ? "Appuyer pour modifier" : isZh ? "点击修改" : "Tap to edit"}
          </Text>
        </Pressable>
      </View>

      {/* Status checklist */}
      <View
        style={{
          backgroundColor: isDark ? "rgba(59,173,78,0.1)" : "#F0FFF4",
          borderRadius: 16,
          padding: 16,
          gap: 10,
          borderWidth: 1,
          borderColor: GREEN + "30",
        }}
      >
        {[
          {
            label: isFr ? "Recto de la pièce d'identité" : isZh ? "身份证正面" : "Front of ID",
            done: !!frontPhoto,
          },
          {
            label: isFr ? "Verso de la pièce d'identité" : isZh ? "身份证背面" : "Back of ID",
            done: !!backPhoto,
          },
        ].map((item, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: item.done ? GREEN : isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.done ? <CheckCircle size={14} color="#fff" strokeWidth={2.5} /> : null}
            </View>
            <Text
              style={{
                fontSize: 14,
                color: item.done ? colors.text : colors.textMuted,
                fontWeight: item.done ? "600" : "400",
              }}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Privacy note */}
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "flex-start",
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.card,
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Shield size={16} color={colors.textMuted} style={{ marginTop: 1 }} />
        <Text style={{ fontSize: 12, color: colors.textMuted, flex: 1, lineHeight: 17 }}>
          {isFr
            ? "Vos documents sont chiffrés et utilisés uniquement pour vérifier votre identité."
            : isZh
            ? "您的文件已加密，仅用于身份验证。"
            : "Your documents are encrypted and used only to verify your identity."}
        </Text>
      </View>

      {/* Submit button */}
      <Pressable
        testID="submit-id-button"
        onPress={onSubmit}
        disabled={isBusy || !frontPhoto || !backPhoto}
        style={({ pressed }) => ({
          backgroundColor: frontPhoto && backPhoto ? GREEN : isDark ? "rgba(255,255,255,0.1)" : "#D1D5DB",
          borderRadius: 16,
          paddingVertical: 17,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed || isBusy ? 0.8 : 1,
          shadowColor: GREEN,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: frontPhoto && backPhoto ? 0.3 : 0,
          shadowRadius: 8,
          elevation: frontPhoto && backPhoto ? 4 : 0,
          marginTop: "auto",
        })}
      >
        {isBusy ? (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <ActivityIndicator color="#fff" />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
              {uploading
                ? isFr
                  ? "Téléchargement..."
                  : isZh
                  ? "上传中..."
                  : "Uploading..."
                : isFr
                ? "Envoi en cours..."
                : isZh
                ? "提交中..."
                : "Submitting..."}
            </Text>
          </View>
        ) : (
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: frontPhoto && backPhoto ? "#fff" : colors.textMuted,
            }}
          >
            {isFr ? "Soumettre pour vérification" : isZh ? "提交验证" : "Submit for Verification"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
