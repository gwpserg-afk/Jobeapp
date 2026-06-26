# Jobé — Working Status & Notes

> Persistent cross-chat notes. Not served on the site (Vercel roots are `marketing/` and `web/`).
> Last updated: 2026-06-25

## What Jobé is  ⭐ DIRECTION UPDATED 2026-06-25
Mobile-app-first **professional social network** for Senegal — now **100% social** (the job
finding/applying side is de-emphasized; the schema/routes stay but are NOT the foreground).

**Core thesis:** bring **entrepreneurs closer to each other**, and **entrepreneurs to businesses**.
Every interaction direction is first-class and welcome:
- **B2B** — business ↔ business
- **B2C** — business ↔ individual/customer
- **C2B** — individual ↔ business
- **C2C** — individual ↔ individual

Think "LinkedIn energy, Instagram feel — built for and in Dakar, centered on entrepreneurs."
The product is the **social loop**: profiles, posts/feed, follow/connect, comments, reposts,
DMs, groups/communities. Jobs become just *one more kind of post*, not a separate destination.

Positioning rules (honest, pre-launch): **social-first (100%)**, **Senegal-first** ("built in
Dakar"), **no fabricated numbers/stats**, keep AI off the home screen. Languages: FR (default) /
EN / 中文. Brand: green `#1DB954`, blue `#2D7DD2`. IG: instagram.com/jobeapp (other socials "soon").

## App build state (audited 2026-06-25)
- **Backend (`backend/`)** = real & substantial. ~30 Hono routes + 30+ Prisma models covering the
  full social graph (Post/Like/Comment/Repost/ProfileView), DMs (messages/chat), profiles,
  search, notifications, onboarding, companies, phone/identity verify, plus the jobs side.
  **This is the asset — the 100% social pivot makes it MORE relevant, not less. Do not rewrite it.**
- **Mobile app (`mobile/`)** = thin prototype shell. Auth (sign-in/up/verify-otp) is wired to the
  backend, but the core tabs render **hardcoded mock data and never call the API**:
  `(tabs)/index.tsx` → `MOCK_POSTS`, `jobs.tsx` → `MOCK_JOBS`, `messages.tsx` → `MOCK_CONVOS`.
  **No post-composer screen exists.** This is the layer to (re)build on top of the live backend.
- Net: "start fresh" = **rebuild the mobile app around the entrepreneur-social loop**, reusing the
  existing backend. Reframe copy/onboarding around entrepreneurs & B2B/B2C/C2B/C2C networking.

## Mobile rebuild — Sprint 1 (2026-06-25) ✅ built + typechecks clean
New IA (confirmed by Serg): **Feed · Discover · ➕ Create · Chat · Profile** (Jobs tab removed via
`href:null`, route kept). AI card + mock data removed from home.
- **`src/lib/api.ts`** — FIXED the auth bug: RN has no cookie jar, so `credentials:"include"` never
  sent the Better Auth session. Now attaches `authClient.getCookie()` as a `Cookie` header — unblocks
  every protected call.
- **`src/lib/types.ts`** — new `Post`/`PostUser`/`FeedResponse` types matching backend enriched shapes.
- **`(tabs)/_layout.tsx`** — rebuilt 5-tab nav, lucide icons, center Create button.
- **`(tabs)/index.tsx`** — real feed: React Query `GET /api/posts/feed`, optimistic like
  (`POST /api/posts/:id/like`), pull-to-refresh, loading/empty/error states, composer prompt. No mocks.
- **`(tabs)/create.tsx`** — NEW post composer → `POST /api/posts`, invalidates feed, profanity-aware.
- **`(tabs)/discover.tsx`** — real: derives distinct people from the live feed (no fake data).
- **i18n** — added FR/EN/中 keys for the social/entrepreneur framing.
- Verified: `tsc` clean on all new files. NOT yet verified on-device (needs Expo + a real auth session;
  OTP can't be scripted). Backend contracts confirmed by reading the handlers.

### Sprint 2 candidates (next)
- Post detail + real comments (`GET/POST /api/posts/:id/comments`); wire the repost button.
- Profiles + follow/connect (find/confirm a follow endpoint); Discover "See" → open a profile.
- Chat tab → real conversations (`/api/messages`, `/api/chat`). Onboarding copy → entrepreneur framing.

## ✅ MILESTONE (2026-06-26): app runs on a real device
New welcome screen confirmed loading on Serg's iPhone via Expo Go after fixing 3 stacked crashes
(stale server → reanimated → expo-network). Preview pipeline proven end-to-end. Next: elevate the
feed/home to the same premium language, then verify the sign-in → feed → post loop on device.

## ⚠️ Build/run gotchas (learned the hard way 2026-06-25)
- **expo-network crash (FIXED in node_modules, NOT yet durable):** `@better-auth/expo`'s
  `ExpoOnlineManager.setup()` does `__require("expo-network")` — a string require Metro can't bundle;
  the `unknownModuleError` escapes its try/catch and crashes the app the moment `authClient.useSession()`
  runs (every screen). FIX: edited `node_modules/@better-auth/expo/dist/client.js` → `setup()` just calls
  `this.setOnline(true)` (online-manager is non-essential). Verified Metro serves the patched module.
  ⚠️ TODO durability: this is a raw node_modules edit — will vanish on reinstall. Persist via
  `bun patch --commit @better-auth/expo` (project uses bun `patchedDependencies`, not patch-package
  postinstall) when Metro is NOT running on node_modules. Same class of bug may exist for the
  `__require("expo-web-browser")` call (only fires on social sign-in — not hit yet).
- **DO NOT import `react-native-reanimated` in any screen.** It's installed (v4.3.0) + babel plugin set,
  but v4 needs New-Arch/worklets that aren't working here → the module throws on load → Expo Router shows
  "Route … missing the required default export" → app dead-ends on **Unmatched Route**. Use plain `View`/
  `Text` (or RN's built-in `Animated`/`LayoutAnimation`). The changelog's "reanimated removed" = this.
- **Two files map to `/`**: `src/app/index.tsx` (splash→redirect) and `(app)/(tabs)/index.tsx` (feed, via
  groups). Works because index.tsx redirects, but don't add a third `/`.
- **Welcome CTAs reframed** for the social pivot: 🚀 "Je me lance" (`type=candidate`) / 🏢 "Pour les
  entreprises" (`type=recruiter`). FR/EN/中. Added `navy` theme token (light #1E2A5C, dark #4C6FFF).

## 📱 Preview / Expo tunnel (how to let Serg view on device)
- Canonical app dir = **`~/Desktop/jobe/mobile`** (NOT the old `~/Downloads/019cb103…` copy — a stale
  metro was serving that since Jun 14; killed it).
- **No global `node`** on PATH here; run Expo via bun: `bun node_modules/.bin/expo start --tunnel --port 8081`.
- Tunnel subdomain is **stable**: `exp://0jfi-_q-anonymous-8081.exp.direct` — already hardcoded in the admin
  dashboard QR (`web/index.html`), so it needs NO dashboard edit/redeploy. Just keep metro running.
- Verify a build with: `curl http://localhost:8081/index.ts.bundle?platform=ios&dev=true` → expect HTTP 200.

## Repos & deploy
- **Marketing site** — standalone dev copy: `~/Desktop/jobe-marketing/` (serve: `python3 -m http.server 3001`).
  Deploy copy: `~/Desktop/jobe/marketing/`. Flow: edit standalone → preview localhost:3001 → copy into
  `marketing/` → `git push origin main` (GitHub gwpserg-afk/Jobeapp) → Vercel auto-publishes **jobeapp.com**.
- **Dashboard** — `~/Desktop/jobe/web/` → its own Vercel project → **admin.jobeapp.com** (verify localhost:4321).
- Push to `main` directly; do NOT branch (auto-deploy depends on main). No secrets in frontend (static = public).

## Marketing site — SHIPPED & LIVE on jobeapp.com (milestone 2026-06-26)
All 4 needle-pusher tracks done + deployed. Pages: `index.html`, `contact.html`, `download.html`.
- **Design = WHITE / clean skinny sans (Inter), no cursive** — chosen over beige+serif (white reads as a
  credible tech/app product, converts better, matches the app UI). **Beige+Fraunces alt preserved in
  `~/Desktop/jobe-marketing/editorial/`** if we ever want the "premium/distinctive" bet. Decision can revisit.
- Icons = inline SVG; avatars = gradient initials; real store badges (black + white Apple + multicolor Google Play).
- **Repositioned social-first / entrepreneur** (B2B/B2C/C2B/C2C); jobs kept secondary. FR (default)/EN/中文,
  language persists across pages. Honest pre-launch tone — **removed fabricated "n°1" claim + fake testimonials.**
- **Waitlist** via Formspree (form id `xeebeyzn`) on download.html + homepage; AJAX success state.
- **SEO**: OG share image (`og-image.png`, generated w/ Pillow), full OG+Twitter meta, canonical, JSON-LD,
  `sitemap.xml`, `robots.txt` (blocks AI scrapers, allows Google). Vercel Analytics script in place (enable in dash).
- **Conversion**: hero primary CTA → waitlist; honest "founding member / be first" section.
- **Custom animations**: blur scroll-reveal, button sheen, 3D phone tilt + idle float, nav underline (reduced-motion safe).
- Contact page = exon-style editorial layout (eyebrow/headline/underline inputs) in white. Navs unified across pages.

## Standing working rules (Serg)
- **Push the needle**, not maintenance. Actively CHECK Serg if a task is low-leverage; propose higher-impact work.
- Preview locally + open in browser before any deploy; **ask before pushing**, push only on explicit "yes".
- Persist important info to repo files (this file) so it survives across chats / compaction.

## Installed tooling
- **ui-ux-pro-max skill bundle** copied into `~/.claude/skills/` (banner-design, brand, design, design-system,
  slides, ui-styling, ui-ux-pro-max). Installed by copying files (NOT via their `npx` installer). Image-gen
  features need the user's own `GEMINI_API_KEY` (env var only). Useful for the IG flyer + slideshow.

## NEXT: marketing site is at diminishing returns — pivot to TRAFFIC
The site converts; now it needs visitors. Going all-in on **Instagram (@jobeapp)**:
- Write IG **bio**.
- **First post / flyer** (generate via GPT/Gemini image tools — use banner-design/design skills) showing what Jobé is.
- A clean **explainer slideshow/carousel** (use slides skill).
- (The app itself is being built in a separate Claude tab — not this workstream.)
