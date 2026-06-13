import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useToastStore } from "../lib/toast";
import { CheckCircle, XCircle, Info } from "lucide-react-native";

function ToastItem({ toast }: { toast: { id: string; message: string; type: "success" | "error" | "info" } }) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }),
    ]).start();
    return () => {};
  }, []);

  const bgColor = toast.type === "success" ? "#27AE60" : toast.type === "error" ? "#E74C3C" : "#3498DB";
  const Icon = toast.type === "success" ? CheckCircle : toast.type === "error" ? XCircle : Info;

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: bgColor, opacity, transform: [{ translateY }] },
      ]}
    >
      <Icon size={18} color="#fff" />
      <Text style={styles.text}>{toast.message}</Text>
    </Animated.View>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: "center",
    gap: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 200,
    maxWidth: 340,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});
