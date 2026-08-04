import { useState } from "react";
import { View, Text, Pressable, StyleSheet, type StyleProp, type TextStyle } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Languages } from "lucide-react-native";
import { api } from "@/lib/api";
import { useTheme, fonts, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

/**
 * Renders post text auto-translated into the reader's chosen language.
 * If the post is already in that language, it just shows the original (no toggle).
 * A small "See original / See translation" link lets the reader switch.
 * Translations are cached per (post, language) so each is fetched at most once.
 */
export function PostText({
  id,
  text,
  style,
}: {
  id: string;
  text: string;
  style?: StyleProp<TextStyle>;
}) {
  const colors = useTheme((s) => s.colors);
  const { t, lang } = useI18n();
  const [showOriginal, setShowOriginal] = useState(false);

  const q = useQuery({
    queryKey: ["translate", id, lang],
    queryFn: () => api.post<{ translated: string; changed: boolean }>("/api/translate", { text, targetLang: lang }),
    enabled: text.trim().length > 1,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  const changed = q.data?.changed ?? false;
  const translated = q.data?.translated ?? text;
  const display = !changed || showOriginal ? text : translated;

  return (
    <View>
      <Text style={style}>{display}</Text>
      {changed ? (
        <Pressable onPress={() => setShowOriginal((o) => !o)} hitSlop={6} style={styles.row} testID={`translate-toggle-${id}`}>
          <Languages size={12} color={colors.textMuted} strokeWidth={2} />
          <Text style={[styles.link, { color: colors.textMuted }]}>
            {showOriginal ? t.tr_see_translation : t.tr_see_original}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm, alignSelf: "flex-start" },
  link: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
});
