import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Send, X, ImageIcon, Camera } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useLang } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { showToast } from "../../lib/toast";
import { useUserWithProfile } from "../../lib/hooks/useUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import { uploadFile } from "@/lib/upload";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_SKILLS = [
  "React Native",
  "JavaScript",
  "Design",
  "Marketing",
  "Finance",
  "Comptabilite",
  "Vente",
  "Transport",
];

const MAX_IMAGES = 4;

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CreatePostScreen() {
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const t = useLang((s) => s.t);
  const { colors, isDark } = useTheme((s) => s);
  const { user, profile } = useUserWithProfile();
  const queryClient = useQueryClient();

  const createPostMutation = useMutation({
    mutationFn: (data: { content: string; imageUrl: string | null }) =>
      api.post("/api/posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      showToast(isFr ? "Publication créée !" : isZh ? "发布成功！" : "Post created!", "success");
      router.back();
    },
    onError: (error: unknown) => {
      const code = (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      if (code === "PROFANITY") {
        showToast(isFr ? "Votre post contient des mots inappropriés" : isZh ? "您的帖子包含不当词语" : "Your post contains inappropriate words", "error");
      } else {
        showToast(isFr ? "Erreur lors de la publication" : isZh ? "发布失败" : "Error publishing post", "error");
      }
    },
  });

  const [caption, setCaption] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const isUploadingRef = useRef(false);

  const isFr = lang === "fr";
  const isZh = lang === "zh";
  const charCount = caption.length;
  const MAX_CHARS = 500;
  const canPost = caption.trim().length > 0 || selectedImages.length > 0;

  // User display info
  const displayName = user?.name ?? "";
  const firstName = displayName.trim().split(" ")[0] ?? "";
  const userInitials = firstName
    .substring(0, 2)
    .toUpperCase() || "UN";
  const userHeadline = profile?.headline ?? "";

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills((prev) => [...prev, trimmed]);
      setCustomSkill("");
    }
  };

  const pickImageFromGallery = async () => {
    if (selectedImages.length >= MAX_IMAGES) {
      showToast(
        isFr
          ? `Maximum ${MAX_IMAGES} images autorisees`
          : isZh
          ? `最多 ${MAX_IMAGES} 张图片`
          : `Maximum ${MAX_IMAGES} images allowed`,
        "error"
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast(
        isFr
          ? "Permission requise pour acceder a la galerie"
          : isZh
          ? "需要相册访问权限"
          : "Permission required to access gallery",
        "error"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - selectedImages.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset) => asset.uri);
      setSelectedImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGES));
    }
  };

  const takePhoto = async () => {
    if (selectedImages.length >= MAX_IMAGES) {
      showToast(
        isFr
          ? `Maximum ${MAX_IMAGES} images autorisees`
          : isZh
          ? `最多 ${MAX_IMAGES} 张图片`
          : `Maximum ${MAX_IMAGES} images allowed`,
        "error"
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showToast(
        isFr
          ? "Permission requise pour acceder a la camera"
          : isZh
          ? "需要相机访问权限"
          : "Permission required to access camera",
        "error"
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImages((prev) => [...prev, result.assets[0].uri].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!canPost || createPostMutation.isPending || isUploadingRef.current) return;
    isUploadingRef.current = true;
    try {
      let imageUrl: string | null = null;
      if (selectedImages.length > 0) {
        const uri = selectedImages[0];
        if (uri.startsWith("http")) {
          imageUrl = uri;
        } else {
          const filename = `post-${Date.now()}.jpg`;
          const uploaded = await uploadFile(uri, filename, "image/jpeg");
          imageUrl = uploaded.url;
        }
      }
      createPostMutation.mutate({ content: caption.trim(), imageUrl });
    } catch {
      isUploadingRef.current = false;
      showToast(
        isFr ? "Erreur lors du chargement de l'image" :
        isZh ? "图片上传失败" : "Failed to upload image",
        "error"
      );
    }
  };

  // Tips section adapts to dark/light
  const tipsBg = isDark ? colors.card : "#EFF6FF";
  const tipsBorder = isDark ? colors.border : "#BFDBFE";
  const tipsTextColor = isDark ? colors.textSecondary : "#1D4ED8";
  const tipsHeadingColor = isDark ? colors.text : "#1D4ED8";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View testID="create-post-screen" style={{ flex: 1, backgroundColor: colors.background }}>
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
              testID="back-button"
              onPress={() => router.back()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.toggleBg,
              }}
            >
              <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
            </Pressable>
            <Text style={{
              flex: 1,
              textAlign: "center",
              fontSize: 17,
              fontWeight: "700",
              color: colors.text,
            }}>
              {isFr ? "Nouvelle publication" : isZh ? "新帖子" : "New post"}
            </Text>
            <Pressable
              testID="post-button"
              onPress={handlePost}
              disabled={!canPost || createPostMutation.isPending}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: canPost ? colors.accent : colors.toggleBg,
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 8,
                minHeight: 44,
                justifyContent: "center",
              }}
            >
              <Send size={15} color={canPost ? "#FFFFFF" : colors.textMuted} strokeWidth={2.5} />
              <Text style={{
                fontSize: 13,
                fontWeight: "700",
                color: canPost ? "#FFFFFF" : colors.textMuted,
              }}>
                {isFr ? "Publier" : isZh ? "发布" : "Post"}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16 }}
        >
          {/* Author row */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 14,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Text style={{
                fontSize: 15,
                fontWeight: "800",
                color: isDark ? "#1B2F6E" : "#FFFFFF",
              }}>
                {userInitials}
              </Text>
            </View>
            <View>
              <Text style={{
                fontSize: 15,
                fontWeight: "700",
                color: colors.text,
              }}>
                {displayName}
              </Text>
              <Text style={{
                fontSize: 12,
                color: colors.textMuted,
                marginTop: 2,
              }}>
                {userHeadline || (isFr ? "Partagez vos réussites" : isZh ? "分享您的成就" : "Share your achievements")}
              </Text>
            </View>
          </View>

          {/* Text input */}
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}>
            <TextInput
              testID="caption-input"
              style={{
                fontSize: 15,
                color: colors.text,
                minHeight: 120,
                lineHeight: 22,
              }}
              placeholder={
                isFr
                  ? "Partagez une reussite, un projet ou une nouvelle..."
                  : isZh
                  ? "分享您的成就、项目或动态..."
                  : "Share a success, project or update..."
              }
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={MAX_CHARS}
              value={caption}
              onChangeText={setCaption}
              textAlignVertical="top"
              selectionColor={colors.accent}
              cursorColor={colors.accent}
            />
            <Text style={{
              fontSize: 11,
              color: charCount > MAX_CHARS * 0.85 ? "#EA580C" : colors.textMuted,
              textAlign: "right",
              marginTop: 8,
            }}>
              {charCount}/{MAX_CHARS}
            </Text>
          </View>

          {/* Image Preview Grid */}
          {selectedImages.length > 0 ? (
            <View style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 14,
              marginBottom: 14,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}>
              <Text style={{
                fontSize: 14,
                fontWeight: "700",
                color: colors.text,
                marginBottom: 12,
              }}>
                {isFr ? "Images jointes" : isZh ? "已附加图片" : "Attached images"} ({selectedImages.length}/{MAX_IMAGES})
              </Text>
              <View style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
              }}>
                {selectedImages.map((uri, index) => (
                  <View key={index} style={{
                    position: "relative",
                    width: "47%",
                    aspectRatio: 1,
                  }}>
                    <Image source={{ uri }} style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 12,
                      backgroundColor: colors.toggleBg,
                    }} />
                    <Pressable
                      testID={`remove-image-${index}`}
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 28,
                        height: 28,
                        borderRadius: 12,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onPress={() => removeImage(index)}
                    >
                      <X size={14} color="#FFFFFF" strokeWidth={2.5} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}>
            <Text style={{
              fontSize: 14,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 12,
            }}>
              {isFr ? "Ajouter a votre publication" : isZh ? "添加到帖子" : "Add to your post"}
            </Text>
            <View style={{
              flexDirection: "row",
              gap: 10,
            }}>
              <Pressable
                testID="pick-image-button"
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.background,
                  minHeight: 44,
                }}
                onPress={pickImageFromGallery}
                disabled={selectedImages.length >= MAX_IMAGES}
              >
                <ImageIcon
                  size={20}
                  color={selectedImages.length >= MAX_IMAGES ? colors.textMuted : colors.accent}
                  strokeWidth={2}
                />
                <Text style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: selectedImages.length >= MAX_IMAGES ? colors.textMuted : colors.text,
                }}>
                  {isFr ? "Galerie" : isZh ? "相册" : "Gallery"}
                </Text>
              </Pressable>
              <Pressable
                testID="take-photo-button"
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.background,
                  minHeight: 44,
                }}
                onPress={takePhoto}
                disabled={selectedImages.length >= MAX_IMAGES}
              >
                <Camera
                  size={20}
                  color={selectedImages.length >= MAX_IMAGES ? colors.textMuted : colors.accent}
                  strokeWidth={2}
                />
                <Text style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: selectedImages.length >= MAX_IMAGES ? colors.textMuted : colors.text,
                }}>
                  {isFr ? "Photo" : "Photo"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Skills / Tags */}
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}>
            <Text style={{
              fontSize: 14,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 2,
            }}>
              {isFr ? "Competences liees" : isZh ? "相关技能" : "Related skills"}
            </Text>
            <Text style={{
              fontSize: 12,
              color: colors.textMuted,
              marginBottom: 12,
            }}>
              {isFr ? "Optionnel - taguez des competences" : isZh ? "可选 - 标记技能" : "Optional - tag skills"}
            </Text>
            <View style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}>
              {PRESET_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <Pressable
                    key={skill}
                    testID={`skill-chip-${skill}`}
                    onPress={() => toggleSkill(skill)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      backgroundColor: isSelected ? colors.accent : colors.background,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.accent : colors.border,
                    }}
                  >
                    {isSelected ? (
                      <X size={11} color="#FFFFFF" strokeWidth={2.5} />
                    ) : null}
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isSelected ? "#FFFFFF" : colors.textSecondary,
                      }}
                    >
                      {skill}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom Skill Input */}
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
            }}>
              <TextInput
                style={{
                  flex: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13,
                  borderRadius: 10,
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text,
                  minHeight: 44,
                }}
                placeholder={isFr ? "Ajouter une competence..." : isZh ? "添加技能..." : "Add a skill..."}
                placeholderTextColor={colors.textMuted}
                value={customSkill}
                onChangeText={setCustomSkill}
                onSubmitEditing={addCustomSkill}
                selectionColor={colors.accent}
                cursorColor={colors.accent}
              />
              <Pressable
                onPress={addCustomSkill}
                disabled={!customSkill.trim()}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: colors.accent,
                  borderRadius: 10,
                  opacity: !customSkill.trim() ? 0.4 : 1,
                  minHeight: 44,
                  justifyContent: "center",
                }}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#FFFFFF",
                }}>
                  {isFr ? "Ajouter" : isZh ? "添加" : "Add"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Selected skills preview */}
          {selectedSkills.length > 0 ? (
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 4,
              marginBottom: 14,
            }}>
              <Text style={{
                fontSize: 13,
                color: colors.accent,
                fontWeight: "600",
              }}>
                {isFr
                  ? `${selectedSkills.length} competence${selectedSkills.length > 1 ? "s" : ""} selectionnee${selectedSkills.length > 1 ? "s" : ""}`
                  : isZh
                  ? `已选择 ${selectedSkills.length} 个技能`
                  : `${selectedSkills.length} skill${selectedSkills.length > 1 ? "s" : ""} selected`}
              </Text>
              <Pressable onPress={() => setSelectedSkills([])}>
                <Text style={{
                  fontSize: 13,
                  color: colors.textMuted,
                  fontWeight: "500",
                }}>
                  {isFr ? "Effacer" : isZh ? "清除" : "Clear"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Tips */}
          <View style={{
            backgroundColor: tipsBg,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: tipsBorder,
          }}>
            <Text style={{
              fontSize: 13,
              fontWeight: "700",
              color: tipsHeadingColor,
              marginBottom: 8,
            }}>
              {isFr ? "Conseils de publication" : isZh ? "发帖技巧" : "Posting tips"}
            </Text>
            <Text style={{
              fontSize: 13,
              color: tipsTextColor,
              lineHeight: 20,
              opacity: 0.85,
            }}>
              {isFr
                ? "- Partagez vos reussites professionnelles"
                : isZh
                ? "- 分享您的职业成就"
                : "- Share your professional achievements"}
            </Text>
            <Text style={{
              fontSize: 13,
              color: tipsTextColor,
              lineHeight: 20,
              opacity: 0.85,
            }}>
              {isFr
                ? "- Ajoutez des photos pour plus d'engagement"
                : isZh
                ? "- 添加照片以增加互动"
                : "- Add photos for more engagement"}
            </Text>
            <Text style={{
              fontSize: 13,
              color: tipsTextColor,
              lineHeight: 20,
              opacity: 0.85,
            }}>
              {isFr
                ? "- Connectez-vous avec votre reseau"
                : isZh
                ? "- 与您的人脉互动"
                : "- Connect with your network"}
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
