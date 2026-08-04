import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { X, ImagePlus, AlertTriangle } from "lucide-react-native";
import { api } from "@/lib/api";
import { pickImageAsDataUri } from "@/lib/pick-image";
import type { Post } from "@/lib/types";
import { authClient } from "@/lib/auth";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const MAX = 2000;

export default function Create() {
  const { data: session } = authClient.useSession();
  const colors = useTheme((s) => s.colors);
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firstName = session?.user?.name?.split(" ")[0] ?? "";
  const trimmed = content.trim();
  const canPost = (trimmed.length > 0 || !!image) && trimmed.length <= MAX;

  async function addPhoto() {
    Haptics.selectionAsync();
    const uri = await pickImageAsDataUri();
    if (uri) setImage(uri);
  }

  const createMutation = useMutation({
    mutationFn: (body: { content: string; imageUrl?: string | null }) => api.post<Post>("/api/posts", body),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["my-posts"] });
      setContent("");
      setImage(null);
      setError(null);
      router.replace("/(app)/(tabs)");
    },
    onError: (e: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e.message);
    },
  });

  const onPublish = () => {
    if (!canPost || createMutation.isPending) return;
    setError(null);
    createMutation.mutate({ content: trimmed || " ", imageUrl: image });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]} testID="create-screen">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10} testID="create-close">
            <X size={24} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t.create}</Text>
          <Pressable
            testID="create-publish"
            onPress={onPublish}
            disabled={!canPost || createMutation.isPending}
            style={[
              styles.publishBtn,
              { backgroundColor: canPost ? colors.primary : colors.bgElevated },
            ]}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={[
                  styles.publishText,
                  { color: canPost ? "#fff" : colors.textMuted },
                ]}
              >
                {t.publish}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Composer */}
        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[styles.prompt, { color: colors.textMuted }]}>
            {t.composerHint.replace("entrepreneur", firstName || "entrepreneur")}
          </Text>
          <TextInput
            testID="create-input"
            value={content}
            onChangeText={(v) => v.length <= MAX && setContent(v)}
            placeholder={t.composerPlaceholder}
            placeholderTextColor={colors.textMuted}
            multiline
            autoFocus
            style={[styles.input, { color: colors.textPrimary }]}
            textAlignVertical="top"
          />

          {image ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: image }} style={styles.preview} resizeMode="cover" />
              <Pressable onPress={() => setImage(null)} style={styles.removeImg} hitSlop={8} testID="create-remove-image">
                <X size={16} color="#fff" strokeWidth={2.6} />
              </Pressable>
            </View>
          ) : null}

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.error + "18", borderColor: colors.error + "40" }]} testID="create-error">
              <AlertTriangle size={18} color={colors.error} strokeWidth={2.2} style={{ marginTop: 1 }} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Footer: add photo + counter */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Pressable onPress={addPhoto} style={styles.photoBtn} hitSlop={8} testID="create-add-photo">
            <ImagePlus size={22} color={colors.primary} strokeWidth={2.2} />
            <Text style={[styles.photoBtnText, { color: colors.primary }]}>{t.c_photo}</Text>
          </Pressable>
          <Text
            style={[
              styles.count,
              { color: trimmed.length > MAX ? colors.error : colors.textMuted },
            ]}
          >
            {trimmed.length} / {MAX}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  publishBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, minWidth: 72, alignItems: "center" },
  publishText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  body: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  prompt: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, marginBottom: spacing.sm },
  input: { fontSize: fonts.sizes.md, lineHeight: 24, minHeight: 120 },
  error: { fontSize: fonts.sizes.sm, marginTop: spacing.md },
  errorBanner: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  errorText: { flex: 1, fontSize: fonts.sizes.sm, lineHeight: 19, fontWeight: fonts.weights.medium },
  previewWrap: { marginTop: spacing.lg, borderRadius: radius.lg, overflow: "hidden", position: "relative" },
  preview: { width: "100%", height: 320, borderRadius: radius.lg },
  removeImg: { position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 7 },
  photoBtnText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  count: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium },
});
