import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL! as string,
  plugins: [
    ...(Platform.OS !== "web"
      ? [
          expoClient({
            scheme: "jobe",
            storagePrefix: "jobe",
            storage: SecureStore,
          }),
        ]
      : []),
    emailOTPClient(),
  ],
});
