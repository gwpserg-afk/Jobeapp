import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";

// Required so the in-app browser closes and hands control back after an OAuth redirect.
WebBrowser.maybeCompleteAuthSession();

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: `${BASE}/api/auth`,
  plugins: [
    expoClient({
      scheme: "jobe",
      storagePrefix: "jobe",
      storage: {
        // MUST be synchronous: @better-auth/expo's getCookie() reads storage.getItem
        // synchronously to attach the session cookie to every request. Using the async
        // SecureStore.*Async methods here returns a Promise → getCookie can't parse it →
        // no cookie is attached → all authed requests 401. SecureStore v15 has sync APIs.
        getItem: (key: string) => SecureStore.getItem(key),
        setItem: (key: string, value: string) => SecureStore.setItem(key, value),
      },
    }),
  ],
});

// Sign in with Google via the backend's Better Auth OAuth flow.
// Opens the system browser, then returns to the app via the `jobe://` scheme.
// Throws if Google isn't configured on the backend yet.
export async function signInWithGoogle() {
  return authClient.signIn.social({ provider: "google", callbackURL: "jobe://" });
}
