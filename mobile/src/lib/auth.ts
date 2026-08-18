import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { parseSetCookieHeader } from "better-auth/cookies";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";

// Required so the in-app browser closes and hands control back after an OAuth redirect.
WebBrowser.maybeCompleteAuthSession();

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:3000";
const SCHEME = "jobe";
const STORAGE_PREFIX = "jobe";
const COOKIE_NAME = `${STORAGE_PREFIX}_cookie`;

// Shared synchronous storage (SecureStore v15 exposes sync getItem/setItem).
// @better-auth/expo's getCookie() reads storage synchronously to attach the session
// cookie to every request, so these MUST be sync (not the *Async variants).
const storage = {
  getItem: (key: string) => SecureStore.getItem(key),
  setItem: (key: string, value: string) => SecureStore.setItem(key, value),
};

export const authClient = createAuthClient({
  baseURL: `${BASE}/api/auth`,
  plugins: [
    expoClient({
      scheme: SCHEME,
      storagePrefix: STORAGE_PREFIX,
      storage,
    }),
  ],
});

// ── Google OAuth (self-driven browser) ───────────────────────────────────────
// @better-auth/expo's client opens the OAuth browser via a runtime
// `await import("expo-web-browser")` buried inside node_modules. Metro does NOT
// trace that dynamic import, so it crashes with "Requiring unknown module
// 'expo-web-browser'". We avoid that path entirely: ask Better Auth for the OAuth
// URL with `disableRedirect: true` (so its client never tries to open a browser),
// then open the auth session ourselves with the statically-imported WebBrowser and
// persist the returned session cookie exactly like the expo client would.

function getOAuthStateValue(cookieJson: string | null): string | null {
  if (!cookieJson) return null;
  let parsed: Record<string, { value?: string } | null> | null = null;
  try {
    parsed = JSON.parse(cookieJson);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const names = ["__Secure-better-auth.oauth_state", "better-auth.oauth_state"];
  for (const name of names) {
    const value = parsed[name]?.value;
    if (value) return value;
  }
  return null;
}

function mergeSetCookie(header: string, prev?: string): string {
  const parsed = parseSetCookieHeader(header);
  let store: Record<string, { value: string; expires: string | null }> = {};
  if (prev) {
    try {
      store = JSON.parse(prev) ?? {};
    } catch {
      store = {};
    }
  }
  parsed.forEach((cookie, key) => {
    const maxAge = cookie["max-age"];
    const expiresAt = cookie["expires"];
    if (maxAge !== undefined && Number(maxAge) <= 0) {
      delete store[key];
      return;
    }
    const expires = maxAge
      ? new Date(Date.now() + Number(maxAge) * 1000)
      : expiresAt
        ? new Date(String(expiresAt))
        : null;
    if (expires && expires.getTime() <= Date.now()) {
      delete store[key];
      return;
    }
    store[key] = { value: String(cookie["value"] ?? ""), expires: expires ? expires.toISOString() : null };
  });
  return JSON.stringify(store);
}

function extractCookieParam(redirectUrl: string): string | null {
  try {
    return new URL(redirectUrl).searchParams.get("cookie");
  } catch {
    const m = redirectUrl.match(/[?&]cookie=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
}

// Sign in with Google via the backend's Better Auth OAuth flow.
// Opens the system browser, then returns to the app via the `jobe://` scheme.
// Throws if Google isn't configured on the backend yet.
export async function signInWithGoogle() {
  const res = await authClient.signIn.social({
    provider: "google",
    callbackURL: `${SCHEME}://`,
    disableRedirect: true,
  });

  if (res.error) {
    throw new Error(res.error.message ?? "Google sign-in is unavailable right now.");
  }
  const authorizationURL = res.data?.url;
  if (!authorizationURL) {
    throw new Error("Google sign-in is unavailable right now.");
  }

  // Route through Better Auth's Expo authorization proxy so the session cookie is
  // handed back to the app on the `jobe://` redirect.
  const params = new URLSearchParams({ authorizationURL });
  const oauthState = getOAuthStateValue(storage.getItem(COOKIE_NAME));
  if (oauthState) params.append("oauthState", oauthState);
  const proxyURL = `${BASE}/api/auth/expo-authorization-proxy?${params.toString()}`;

  const result = await WebBrowser.openAuthSessionAsync(proxyURL, `${SCHEME}://`);
  if (result.type !== "success") return result;

  const cookie = extractCookieParam(result.url);
  if (!cookie) return result;
  storage.setItem(COOKIE_NAME, mergeSetCookie(cookie, storage.getItem(COOKIE_NAME) ?? undefined));
  return result;
}
