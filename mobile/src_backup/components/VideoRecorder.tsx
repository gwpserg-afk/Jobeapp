import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { Video, ResizeMode } from "expo-av";
import { Circle, RotateCcw, Check, X, RefreshCw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";

interface VideoRecorderProps {
  maxDuration?: number;
  onSave: (videoUri: string) => void;
  onCancel: () => void;
}

type RecorderState = "idle" | "recording" | "preview";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function VideoRecorder({
  maxDuration = 30,
  onSave,
  onCancel,
}: VideoRecorderProps) {
  const colors = useTheme((s) => s.colors);
  const t = useLang((s) => s.t);
  const insets = useSafeAreaInsets();

  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  const [state, setState] = useState<RecorderState>("idle");
  const [facing, setFacing] = useState<CameraType>("front");
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(maxDuration);
  const [isLoading, setIsLoading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Start countdown timer when recording
  useEffect(() => {
    if (state === "recording") {
      setTimeLeft(maxDuration);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state, maxDuration]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      setState("recording");
      const video = await cameraRef.current.recordAsync({
        maxDuration,
      });

      if (video?.uri) {
        setRecordedUri(video.uri);
        setState("preview");
      } else {
        setState("idle");
      }
    } catch (error) {
      console.error("Error recording video:", error);
      setState("idle");
    }
  }, [maxDuration]);

  const stopRecording = useCallback(() => {
    if (cameraRef.current && state === "recording") {
      cameraRef.current.stopRecording();
    }
  }, [state]);

  const handleReRecord = useCallback(() => {
    setRecordedUri(null);
    setState("idle");
    setTimeLeft(maxDuration);
  }, [maxDuration]);

  const handleSave = useCallback(() => {
    if (recordedUri) {
      onSave(recordedUri);
    }
  }, [recordedUri, onSave]);

  const toggleCameraFacing = useCallback(() => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }, []);

  const requestPermissions = useCallback(async () => {
    setIsLoading(true);
    await requestCameraPermission();
    await requestMicrophonePermission();
    setIsLoading(false);
  }, [requestCameraPermission, requestMicrophonePermission]);

  // Progress bar width calculation
  const progressWidth = ((maxDuration - timeLeft) / maxDuration) * 100;

  // Permission handling
  if (!cameraPermission || !microphonePermission) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "600",
            color: colors.text,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          {t("video_camera_permission")}
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          {t("video_camera_permission_desc")}
        </Text>
        <Pressable
          onPress={requestPermissions}
          disabled={isLoading}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 12,
            opacity: isLoading ? 0.7 : 1,
          }}
          testID="grant-permission-button"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
              {t("video_grant_permission")}
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  // Preview state
  if (state === "preview" && recordedUri) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <Video
          source={{ uri: recordedUri }}
          style={{
            flex: 1,
            borderRadius: 16,
            margin: 8,
          }}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          useNativeControls={false}
        />

        {/* Preview label */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 16,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "500" }}>
              {t("video_preview")}
            </Text>
          </View>
        </View>

        {/* Bottom controls */}
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 24,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 24,
          }}
        >
          {/* Re-record button */}
          <Pressable
            onPress={handleReRecord}
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              width: 56,
              height: 56,
              borderRadius: 28,
              justifyContent: "center",
              alignItems: "center",
            }}
            testID="rerecord-button"
          >
            <RotateCcw size={24} color="#FFFFFF" />
          </Pressable>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            style={{
              backgroundColor: colors.accent,
              width: 72,
              height: 72,
              borderRadius: 36,
              justifyContent: "center",
              alignItems: "center",
            }}
            testID="save-button"
          >
            <Check size={32} color="#FFFFFF" />
          </Pressable>

          {/* Cancel button */}
          <Pressable
            onPress={onCancel}
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              width: 56,
              height: 56,
              borderRadius: 28,
              justifyContent: "center",
              alignItems: "center",
            }}
            testID="cancel-button"
          >
            <X size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    );
  }

  // Camera/Recording state
  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <CameraView
        ref={cameraRef}
        style={{
          flex: 1,
          borderRadius: 16,
          margin: 8,
          overflow: "hidden",
        }}
        facing={facing}
        mode="video"
      >
        {/* Progress bar */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            right: 16,
            height: 4,
            backgroundColor: "rgba(255,255,255,0.3)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${progressWidth}%`,
              backgroundColor: state === "recording" ? "#EF4444" : "transparent",
              borderRadius: 2,
            }}
          />
        </View>

        {/* Timer and recording indicator */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 24,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          {state === "recording" ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.6)",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                gap: 8,
              }}
            >
              {/* Recording indicator dot */}
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "#EF4444",
                }}
              />
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                {timeLeft} {t("video_seconds_left")}
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "500" }}>
                {t("video_tap_to_record")}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom controls */}
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 24,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 48,
          }}
        >
          {/* Cancel button */}
          <Pressable
            onPress={onCancel}
            disabled={state === "recording"}
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              width: 48,
              height: 48,
              borderRadius: 24,
              justifyContent: "center",
              alignItems: "center",
              opacity: state === "recording" ? 0.5 : 1,
            }}
            testID="cancel-button"
          >
            <X size={22} color="#FFFFFF" />
          </Pressable>

          {/* Record/Stop button */}
          <Pressable
            onPress={state === "recording" ? stopRecording : startRecording}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              borderWidth: 4,
              borderColor: "#FFFFFF",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: state === "recording" ? "transparent" : "transparent",
            }}
            testID="record-button"
          >
            {state === "recording" ? (
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: "#EF4444",
                }}
              />
            ) : (
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#EF4444",
                }}
              />
            )}
          </Pressable>

          {/* Flip camera button */}
          <Pressable
            onPress={toggleCameraFacing}
            disabled={state === "recording"}
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              width: 48,
              height: 48,
              borderRadius: 24,
              justifyContent: "center",
              alignItems: "center",
              opacity: state === "recording" ? 0.5 : 1,
            }}
            testID="flip-camera-button"
          >
            <RefreshCw size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}
