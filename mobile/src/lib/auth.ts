import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: `${BASE}/api/auth`,
  plugins: [
    expoClient({
      scheme: "jobe",
      storagePrefix: "jobe",
      storage: {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      },
    }),
  ],
});
