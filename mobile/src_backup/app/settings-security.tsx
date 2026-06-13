import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Eye, EyeOff, Smartphone } from "lucide-react-native";
import { useLang } from "../lib/i18n";
import { useTheme, type ThemeColors } from "../lib/theme";
import { showToast } from "../lib/toast";

function SectionHeader({ title, colors }: { title: string; colors: ThemeColors }) {
  return (
    <View style={{
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 8,
    }}>
      <Text style={{
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.8,
        color: colors.textMuted,
      }}>
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

export default function SettingsSecurityScreen() {
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const { colors, isDark } = useTheme();
  const isFr = lang === "fr";
  const isZh = lang === "zh";

  const [current, setCurrent] = useState<string>("");
  const [next, setNext] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [showCurrent, setShowCurrent] = useState<boolean>(false);
  const [showNext, setShowNext] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  function handleSave() {
    setError("");
    if (!current || !next || !confirm) {
      setError(isFr ? "Tous les champs sont requis." : isZh ? "所有字段均为必填项。" : "All fields are required.");
      return;
    }
    if (next.length < 8) {
      setError(
        isFr
          ? "Le nouveau mot de passe doit contenir au moins 8 caractères."
          : isZh
          ? "新密码至少需要8个字符。"
          : "New password must be at least 8 characters."
      );
      return;
    }
    if (next !== confirm) {
      setError(
        isFr
          ? "Les mots de passe ne correspondent pas."
          : isZh
          ? "两次密码不一致。"
          : "Passwords do not match."
      );
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    showToast(isFr ? "Mot de passe modifié !" : isZh ? "密码已修改！" : "Password changed!", "success");
  }

  return (
    <View testID="settings-security-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.card }}>
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={22} color={colors.primary} strokeWidth={2} />
          </Pressable>
          <Text style={{
            flex: 1,
            textAlign: "center",
            fontSize: 17,
            fontWeight: "700",
            color: colors.primary,
          }}>
            {isFr ? "Sécurité" : isZh ? "安全" : "Security"}
          </Text>
          <View style={{
            width: 36,
            height: 36,
          }} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader
          title={isFr ? "Changer le mot de passe" : isZh ? "修改密码" : "Change password"}
          colors={colors}
        />
        <View style={{
          marginHorizontal: 16,
          backgroundColor: colors.card,
          borderRadius: 16,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 1,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
          <View style={{ paddingVertical: 6 }}>
            <Text style={{
              fontSize: 12,
              fontWeight: "600",
              color: colors.textSecondary,
              marginBottom: 6,
            }}>
              {isFr ? "Mot de passe actuel" : isZh ? "当前密码" : "Current password"}
            </Text>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.toggleBg,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
            }}>
              <TextInput
                testID="input-current-password"
                style={{
                  flex: 1,
                  height: 44,
                  fontSize: 14,
                  color: colors.text,
                }}
                value={current}
                onChangeText={setCurrent}
                secureTextEntry={!showCurrent}
                placeholder={isFr ? "Mot de passe actuel" : isZh ? "当前密码" : "Current password"}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                selectionColor={colors.accent}
                cursorColor={colors.accent}
              />
              <Pressable
                onPress={() => setShowCurrent((v) => !v)}
                style={{ padding: 4 }}
                testID="toggle-current-password"
              >
                {showCurrent ? (
                  <EyeOff size={18} color={colors.textMuted} strokeWidth={2} />
                ) : (
                  <Eye size={18} color={colors.textMuted} strokeWidth={2} />
                )}
              </Pressable>
            </View>
          </View>

          <View style={{
            height: 1,
            backgroundColor: colors.border,
            marginVertical: 4,
          }} />

          <View style={{ paddingVertical: 6 }}>
            <Text style={{
              fontSize: 12,
              fontWeight: "600",
              color: colors.textSecondary,
              marginBottom: 6,
            }}>
              {isFr ? "Nouveau mot de passe" : isZh ? "新密码" : "New password"}
            </Text>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.toggleBg,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
            }}>
              <TextInput
                testID="input-new-password"
                style={{
                  flex: 1,
                  height: 44,
                  fontSize: 14,
                  color: colors.text,
                }}
                value={next}
                onChangeText={setNext}
                secureTextEntry={!showNext}
                placeholder={isFr ? "Minimum 8 caractères" : isZh ? "最少8个字符" : "Minimum 8 characters"}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                selectionColor={colors.accent}
                cursorColor={colors.accent}
              />
              <Pressable
                onPress={() => setShowNext((v) => !v)}
                style={{ padding: 4 }}
                testID="toggle-new-password"
              >
                {showNext ? (
                  <EyeOff size={18} color={colors.textMuted} strokeWidth={2} />
                ) : (
                  <Eye size={18} color={colors.textMuted} strokeWidth={2} />
                )}
              </Pressable>
            </View>
          </View>

          <View style={{
            height: 1,
            backgroundColor: colors.border,
            marginVertical: 4,
          }} />

          <View style={{ paddingVertical: 6 }}>
            <Text style={{
              fontSize: 12,
              fontWeight: "600",
              color: colors.textSecondary,
              marginBottom: 6,
            }}>
              {isFr ? "Confirmer" : isZh ? "确认密码" : "Confirm"}
            </Text>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.toggleBg,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
            }}>
              <TextInput
                testID="input-confirm-password"
                style={{
                  flex: 1,
                  height: 44,
                  fontSize: 14,
                  color: colors.text,
                }}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showConfirm}
                placeholder={isFr ? "Répétez le mot de passe" : isZh ? "重复密码" : "Repeat password"}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                selectionColor={colors.accent}
                cursorColor={colors.accent}
              />
              <Pressable
                onPress={() => setShowConfirm((v) => !v)}
                style={{ padding: 4 }}
                testID="toggle-confirm-password"
              >
                {showConfirm ? (
                  <EyeOff size={18} color={colors.textMuted} strokeWidth={2} />
                ) : (
                  <Eye size={18} color={colors.textMuted} strokeWidth={2} />
                )}
              </Pressable>
            </View>
          </View>

          {error ? (
            <Text style={{
              fontSize: 12,
              color: "#DC2626",
              marginTop: 8,
              marginBottom: 2,
            }}>
              {error}
            </Text>
          ) : null}

          <Pressable
            testID="save-password-btn"
            onPress={handleSave}
            style={{
              marginTop: 16,
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#FFFFFF",
            }}>
              {isFr ? "Enregistrer" : isZh ? "保存" : "Save"}
            </Text>
          </Pressable>
        </View>

        <SectionHeader
          title={isFr ? "Sessions actives" : isZh ? "活跃会话" : "Active sessions"}
          colors={colors}
        />
        <View style={{
          marginHorizontal: 16,
          backgroundColor: colors.card,
          borderRadius: 16,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 1,
        }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 8,
            paddingHorizontal: 16,
          }}>
            <View style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: colors.toggleBg,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}>
              <Smartphone size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.text,
              }}>
                iPhone 15 Pro
              </Text>
              <Text style={{
                fontSize: 12,
                color: colors.textMuted,
                marginTop: 2,
              }}>
                {isFr
                  ? "Dakar, Sénégal · Maintenant"
                  : isZh
                  ? "达喀尔，塞内加尔 · 现在"
                  : "Dakar, Senegal · Now"}
              </Text>
            </View>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isDark ? "rgba(22, 163, 74, 0.2)" : "#F0FDF4",
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}>
              <View style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#16A34A",
                marginRight: 5,
              }} />
              <Text style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#16A34A",
              }}>
                {isFr ? "Actif" : isZh ? "活跃" : "Active"}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
