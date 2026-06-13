import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, Save, Sparkles, CheckCircle2, Camera } from "lucide-react-native";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import type { CandidateProfile } from "@/types";
import { USER_ME_QUERY_KEY, USER_PROFILE_QUERY_KEY } from "@/lib/hooks/useUser";
import { showToast } from "@/lib/toast";
import * as ImagePicker from "expo-image-picker";
import { UserAvatar } from "@/components/UserAvatar";
import { uploadFile } from "@/lib/upload";
import { useTheme } from "@/lib/theme";

const AVAILABILITY_OPTIONS = [
  { key: "available", label: "Available", color: "#3BAD4E", bg: "#DCFCE7", activeBg: "#3BAD4E" },
  { key: "available_soon", label: "Available Soon", color: "#D97706", bg: "#FEF3C7", activeBg: "#D97706" },
  { key: "unavailable", label: "Unavailable", color: "#8E8E93", bg: "#F3F4F6", activeBg: "#8E8E93" },
] as const;

type AvailabilityKey = (typeof AVAILABILITY_OPTIONS)[number]["key"];

const MY_PROFILE_QUERY_KEY = ["my-profile"] as const;

const GREEN = "#3BAD4E";

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();

  // Form state
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [bio, setBio] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityKey>("unavailable");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  // Focus state
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // AI suggestion state
  const [suggestions, setSuggestions] = useState<{ titles: string[]; categories: string[] } | null>(null);
  const [appliedTitle, setAppliedTitle] = useState<string | null>(null);
  const suggestionsOpacity = useRef(new Animated.Value(0)).current;
  const chipAppliedOpacity = useRef<{ [key: string]: Animated.Value }>({});

  // Error state
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: MY_PROFILE_QUERY_KEY,
    queryFn: () => api.get<CandidateProfile>("/api/profile"),
  });

  // Initialize form from profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setHeadline(profile.headline ?? "");
      setCity(profile.city ?? "");
      setNeighborhood(profile.neighborhood ?? "");
      setBio(profile.bio ?? "");
      setProfilePhotoUrl(profile.profilePhotoUrl ?? null);
      // Map backend value "soon" to UI key "available_soon"
      const rawStatus = profile.availabilityStatus === "soon" ? "available_soon" : profile.availabilityStatus;
      const status = rawStatus as AvailabilityKey;
      const validStatuses: AvailabilityKey[] = ["available", "available_soon", "unavailable"];
      setAvailabilityStatus(validStatuses.includes(status) ? status : "unavailable");
    }
  }, [profile]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: {
      fullName: string;
      headline: string;
      city: string;
      neighborhood: string;
      bio: string;
      availabilityStatus: string;
      profilePhotoUrl?: string | null;
    }) => api.put<CandidateProfile>("/api/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_PROFILE_QUERY_KEY });
      showToast("Profile saved!", "success");
      router.back();
    },
    onError: () => {
      setSaveError("Failed to save profile. Please try again.");
    },
  });

  // Photo upload mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error("permission_denied");
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) throw new Error("cancelled");
      const asset = result.assets[0];
      const filename = asset.fileName ?? `photo_${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? "image/jpeg";
      const uploaded = await uploadFile(asset.uri, filename, mimeType);
      return uploaded.url;
    },
    onSuccess: async (url) => {
      setProfilePhotoUrl(url);
      // Save photo URL to both the candidate profile and the user record
      try {
        const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
        await Promise.all([
          fetch(`${baseUrl}/api/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ profilePhotoUrl: url }),
          }),
          fetch(`${baseUrl}/api/me`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ image: url }),
          }),
        ]);
        queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: USER_PROFILE_QUERY_KEY });
      } catch (saveErr) {
        console.error("[EditProfile] Failed to auto-save photo URL:", saveErr);
      }
      showToast("Photo updated!", "success");
    },
    onError: (err: Error) => {
      if (err.message === "permission_denied") {
        showToast("Photo library access is required");
      } else if (err.message !== "cancelled") {
        showToast("Upload failed. Please try again.");
      }
    },
  });

  // AI suggest mutation
  const suggestMutation = useMutation({
    mutationFn: (skills: string[]) =>
      api.post<{ titles: string[]; categories: string[] }>("/api/profile/suggest", { skills }),
    onSuccess: (data) => {
      setSuggestions(data);
      if (data?.titles) {
        data.titles.forEach((title) => {
          if (!chipAppliedOpacity.current[title]) {
            chipAppliedOpacity.current[title] = new Animated.Value(0);
          }
        });
      }
      Animated.timing(suggestionsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    },
  });

  const handleGetSuggestions = () => {
    if (!profile?.skills?.length) return;
    const skillNames = profile.skills.map((s) => s.skillName);
    suggestionsOpacity.setValue(0);
    setSuggestions(null);
    suggestMutation.mutate(skillNames);
  };

  const handleApplyTitle = (title: string) => {
    setHeadline(title);
    setAppliedTitle(title);

    if (!chipAppliedOpacity.current[title]) {
      chipAppliedOpacity.current[title] = new Animated.Value(0);
    }
    const anim = chipAppliedOpacity.current[title];
    anim.setValue(1);
    setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        setAppliedTitle(null);
      });
    }, 1000);
  };

  const handleSave = () => {
    setSaveError(null);
    // Map UI key "available_soon" to backend value "soon"
    const backendStatus = availabilityStatus === "available_soon" ? "soon" : availabilityStatus;
    saveMutation.mutate({
      fullName: fullName.trim(),
      headline: headline.trim(),
      city: city.trim(),
      neighborhood: neighborhood.trim(),
      bio: bio.trim(),
      availabilityStatus: backendStatus,
      profilePhotoUrl,
    });
  };

  const bioCharCount = bio.length;
  const MAX_BIO = 500;
  const hasSkills = (profile?.skills?.length ?? 0) > 0;

  // Dynamic styles that depend on theme
  const inputStyle = {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  };

  const inputFocusedStyle = {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  };

  const cardStyle = {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 6,
    elevation: isDark ? 0 : 1,
  };

  if (isLoading) {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={{ flex: 1, backgroundColor: colors.background }}
        testID="edit-profile-loading"
      >
        {/* Header skeleton */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 12,
        }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.toggleBg, opacity: 0.4 }} />
          <View style={{ flex: 1, height: 18, borderRadius: 6, backgroundColor: colors.toggleBg, opacity: 0.4 }} />
          <View style={{ width: 60, height: 32, borderRadius: 8, backgroundColor: colors.toggleBg, opacity: 0.4 }} />
        </View>
        <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ ...cardStyle }}>
              <View style={{ width: 80, height: 11, borderRadius: 6, marginBottom: 14, backgroundColor: colors.toggleBg, opacity: 0.4 }} />
              {[1, 2].map((j) => (
                <View key={j} style={{ height: 44, borderRadius: 12, marginBottom: 10, backgroundColor: colors.toggleBg, opacity: 0.3 }} />
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="edit-profile-screen"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        {/* Header */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <Pressable
            testID="close-button"
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.toggleBg,
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={4}
          >
            <X size={20} color={colors.text} strokeWidth={2.5} />
          </Pressable>
          <Text style={{
            flex: 1,
            textAlign: "center",
            fontSize: 17,
            fontWeight: "700",
            color: colors.text,
          }}>
            Edit Profile
          </Text>
          <Pressable
            testID="save-button-header"
            onPress={handleSave}
            disabled={saveMutation.isPending}
            style={{
              backgroundColor: saveMutation.isPending ? colors.textMuted : colors.primary,
              paddingVertical: 8,
              minWidth: 60,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
          testID="edit-profile-scroll"
        >
          {/* Save error */}
          {saveError ? (
            <View style={{
              marginHorizontal: 16,
              marginBottom: 12,
              backgroundColor: isDark ? "#4a2626" : "#FEE2E2",
              borderRadius: 12,
              padding: 12,
            }} testID="save-error">
              <Text style={{ fontSize: 13, fontWeight: "500", color: isDark ? "#FF6B6B" : "#DC2626" }}>
                {saveError}
              </Text>
            </View>
          ) : null}

          {/* Photo Section */}
          <View style={cardStyle}>
            <Text style={{
              fontSize: 11, fontWeight: "700", color: colors.textMuted,
              letterSpacing: 0.8, marginBottom: 14, textTransform: "uppercase",
            }}>
              PROFILE PHOTO
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View style={{ position: "relative" }}>
                <View style={{
                  width: 72, height: 72, borderRadius: 36,
                  overflow: "hidden",
                  borderWidth: 2.5,
                  borderColor: profilePhotoUrl ? GREEN : colors.border,
                }}>
                  <UserAvatar
                    name={fullName || "User"}
                    imageUrl={profilePhotoUrl}
                    size={72}
                    backgroundColor="#1B2F6E"
                  />
                </View>
                {uploadPhotoMutation.isPending ? (
                  <View style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 36, backgroundColor: "rgba(0,0,0,0.45)",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 4 }}>
                  {profilePhotoUrl ? "Change photo" : "Add a profile photo"}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10, lineHeight: 17 }}>
                  {profilePhotoUrl
                    ? "Tap the button to upload a new photo"
                    : "Help recruiters recognize you with a clear headshot"}
                </Text>
                <Pressable
                  testID="upload-photo-button"
                  onPress={() => uploadPhotoMutation.mutate()}
                  disabled={uploadPhotoMutation.isPending}
                  style={{
                    flexDirection: "row", alignItems: "center", justifyContent: "center",
                    gap: 6, paddingVertical: 8, paddingHorizontal: 14,
                    borderRadius: 10, borderWidth: 1.5,
                    borderColor: GREEN,
                    backgroundColor: uploadPhotoMutation.isPending ? colors.toggleBg : (GREEN + "15"),
                    alignSelf: "flex-start",
                  }}
                >
                  <Camera size={14} color={uploadPhotoMutation.isPending ? colors.textMuted : GREEN} />
                  <Text style={{
                    fontSize: 13, fontWeight: "600",
                    color: uploadPhotoMutation.isPending ? colors.textMuted : GREEN,
                  }}>
                    {uploadPhotoMutation.isPending ? "Uploading..." : profilePhotoUrl ? "Change" : "Upload photo"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Basic Info Section */}
          <View style={cardStyle}>
            <Text style={{
              fontSize: 11, fontWeight: "700", color: colors.textMuted,
              letterSpacing: 0.8, marginBottom: 14, textTransform: "uppercase",
            }}>
              BASIC INFO
            </Text>

            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
              Full Name
            </Text>
            <TextInput
              testID="full-name-input"
              style={[inputStyle, focusedField === "fullName" && inputFocusedStyle]}
              placeholder="Your full name"
              placeholderTextColor={colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              onFocus={() => setFocusedField("fullName")}
              onBlur={() => setFocusedField(null)}
              returnKeyType="next"
              selectionColor={colors.accent}
              cursorColor={colors.accent}
            />

            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6, marginTop: 14 }}>
              Professional Title
            </Text>
            <TextInput
              testID="headline-input"
              style={[inputStyle, focusedField === "headline" && inputFocusedStyle]}
              placeholder="e.g. Software Engineer, Accountant"
              placeholderTextColor={colors.textMuted}
              value={headline}
              onChangeText={setHeadline}
              onFocus={() => setFocusedField("headline")}
              onBlur={() => setFocusedField(null)}
              returnKeyType="next"
              selectionColor={colors.accent}
              cursorColor={colors.accent}
            />

            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6, marginTop: 14 }}>
              City
            </Text>
            <TextInput
              testID="city-input"
              style={[inputStyle, focusedField === "city" && inputFocusedStyle]}
              placeholder="e.g. Dakar"
              placeholderTextColor={colors.textMuted}
              value={city}
              onChangeText={setCity}
              onFocus={() => setFocusedField("city")}
              onBlur={() => setFocusedField(null)}
              returnKeyType="next"
              selectionColor={colors.accent}
              cursorColor={colors.accent}
            />

            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6, marginTop: 14 }}>
              Neighborhood{" "}
              <Text style={{ fontSize: 12, fontWeight: "400", color: colors.textMuted }}>(optional)</Text>
            </Text>
            <TextInput
              testID="neighborhood-input"
              style={[inputStyle, focusedField === "neighborhood" && inputFocusedStyle]}
              placeholder="e.g. Plateau"
              placeholderTextColor={colors.textMuted}
              value={neighborhood}
              onChangeText={setNeighborhood}
              onFocus={() => setFocusedField("neighborhood")}
              onBlur={() => setFocusedField(null)}
              returnKeyType="next"
              selectionColor={colors.accent}
              cursorColor={colors.accent}
            />

            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6, marginTop: 14 }}>
              Bio
            </Text>
            <TextInput
              testID="bio-input"
              style={[
                inputStyle,
                { minHeight: 110 },
                focusedField === "bio" && inputFocusedStyle,
              ]}
              placeholder="Tell employers about yourself, your experience, and what you're looking for..."
              placeholderTextColor={colors.textMuted}
              value={bio}
              onChangeText={(t) => setBio(t.slice(0, MAX_BIO))}
              onFocus={() => setFocusedField("bio")}
              onBlur={() => setFocusedField(null)}
              multiline
              textAlignVertical="top"
              maxLength={MAX_BIO}
              selectionColor={colors.accent}
              cursorColor={colors.accent}
            />
            <Text style={{
              fontSize: 11,
              color: bioCharCount > MAX_BIO * 0.85 ? "#EA580C" : colors.textMuted,
              textAlign: "right",
              marginTop: 6,
            }}>
              {bioCharCount}/{MAX_BIO}
            </Text>
          </View>

          {/* Availability Section */}
          <View style={cardStyle}>
            <Text style={{
              fontSize: 11, fontWeight: "700", color: colors.textMuted,
              letterSpacing: 0.8, marginBottom: 14, textTransform: "uppercase",
            }}>
              AVAILABILITY
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {AVAILABILITY_OPTIONS.map((opt) => {
                const isActive = availabilityStatus === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    testID={`availability-chip-${opt.key}`}
                    onPress={() => setAvailabilityStatus(opt.key)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      backgroundColor: isActive ? opt.activeBg : (isDark ? colors.toggleBg : opt.bg),
                      borderColor: isActive ? opt.activeBg : "transparent",
                    }}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: isActive ? "#FFFFFF" : (isDark ? colors.textSecondary : opt.color),
                    }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* AI Suggestions Section */}
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Sparkles size={16} color={GREEN} strokeWidth={2} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                AI Title Suggestions
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 14, lineHeight: 18 }}>
              Based on your skills, AI suggests these titles. Tap to apply.
            </Text>

            {hasSkills ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {profile!.skills.map((skill) => (
                  <View key={skill.id} style={{
                    backgroundColor: isDark ? "rgba(59,173,78,0.15)" : "#EBF8EE",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: GREEN }}>
                      {skill.skillName}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {hasSkills ? (
              <Pressable
                testID="get-suggestions-button"
                onPress={handleGetSuggestions}
                disabled={suggestMutation.isPending}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  backgroundColor: suggestMutation.isPending ? colors.textMuted : colors.primary,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  alignSelf: "flex-start",
                  minWidth: 160,
                  justifyContent: "center",
                }}
              >
                {suggestMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Sparkles size={15} color="#FFFFFF" strokeWidth={2} />
                )}
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
                  {suggestMutation.isPending ? "Thinking..." : "Get Suggestions"}
                </Text>
              </Pressable>
            ) : (
              <View style={{
                backgroundColor: colors.background,
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: "dashed",
              }} testID="no-skills-note">
                <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: "center" }}>
                  Add skills to your profile to get AI suggestions
                </Text>
              </View>
            )}

            {/* AI Results */}
            {suggestions ? (
              <Animated.View style={{ opacity: suggestionsOpacity }} testID="ai-suggestions-results">
                {suggestions.titles.length > 0 ? (
                  <View style={{ marginTop: 16 }}>
                    <Text style={{
                      fontSize: 10, fontWeight: "700", color: colors.textMuted,
                      letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase",
                    }}>
                      TITLES
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {suggestions.titles.map((title) => {
                        const animVal = chipAppliedOpacity.current[title];
                        return (
                          <Pressable
                            key={title}
                            testID={`title-chip-${title}`}
                            onPress={() => handleApplyTitle(title)}
                            style={{
                              position: "relative",
                              backgroundColor: isDark ? "rgba(27,47,110,0.3)" : "#EFF6FF",
                              borderRadius: 20,
                              paddingHorizontal: 13,
                              paddingVertical: 8,
                              borderWidth: 1.5,
                              borderColor: isDark ? colors.border : "#BFDBFE",
                              overflow: "hidden",
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#93B4FF" : "#1D4ED8" }}>
                              {title}
                            </Text>
                            {animVal ? (
                              <Animated.View
                                style={{
                                  position: "absolute",
                                  top: 0, left: 0, right: 0, bottom: 0,
                                  backgroundColor: "#3BAD4E",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexDirection: "row",
                                  gap: 4,
                                  borderRadius: 20,
                                  opacity: animVal,
                                }}
                                pointerEvents="none"
                              >
                                <CheckCircle2 size={12} color="#FFFFFF" strokeWidth={2.5} />
                                <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>Applied</Text>
                              </Animated.View>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {suggestions.categories.length > 0 ? (
                  <View style={{ marginTop: 16 }}>
                    <Text style={{
                      fontSize: 10, fontWeight: "700", color: colors.textMuted,
                      letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase",
                    }}>
                      CATEGORIES
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {suggestions.categories.map((cat) => (
                        <View key={cat} style={{
                          backgroundColor: isDark ? "rgba(59,173,78,0.15)" : "#F0FDF4",
                          borderRadius: 20,
                          paddingHorizontal: 13,
                          paddingVertical: 8,
                          borderWidth: 1.5,
                          borderColor: isDark ? colors.border : "#BBF7D0",
                        }} testID={`category-chip-${cat}`}>
                          <Text style={{ fontSize: 13, fontWeight: "600", color: GREEN }}>
                            {cat}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </Animated.View>
            ) : null}

            {suggestMutation.isError ? (
              <Text style={{ fontSize: 13, color: isDark ? "#FF6B6B" : "#DC2626", marginTop: 10 }} testID="suggest-error">
                Could not fetch suggestions. Please try again.
              </Text>
            ) : null}
          </View>

          {/* Bottom save button */}
          <Pressable
            testID="save-button-bottom"
            onPress={handleSave}
            disabled={saveMutation.isPending}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: saveMutation.isPending ? colors.textMuted : GREEN,
              borderRadius: 16,
              paddingVertical: 15,
              marginHorizontal: 16,
              marginTop: 4,
              shadowColor: GREEN,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: saveMutation.isPending ? 0 : 0.25,
              shadowRadius: 10,
              elevation: saveMutation.isPending ? 0 : 4,
            }}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={17} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                  Save Profile
                </Text>
              </>
            )}
          </Pressable>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
