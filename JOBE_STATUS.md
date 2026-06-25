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

## Repos & deploy
- **Marketing site** — standalone dev copy: `~/Desktop/jobe-marketing/` (serve: `python3 -m http.server 3001`).
  Deploy copy: `~/Desktop/jobe/marketing/`. Flow: edit standalone → preview localhost:3001 → copy into
  `marketing/` → `git push origin main` (GitHub gwpserg-afk/Jobeapp) → Vercel auto-publishes **jobeapp.com**.
- **Dashboard** — `~/Desktop/jobe/web/` → its own Vercel project → **admin.jobeapp.com** (verify localhost:4321).
- Push to `main` directly; do NOT branch (auto-deploy depends on main). No secrets in frontend (static = public).

## Done so far on marketing site (good but "need more")
1. Emoji → ~75 inline SVG icons (both pages). Avatars → gradient initials. Kept only real content emoji (🇸🇳/🚀/✓).
2. Contact emails consolidated to one: **support@jobeapp.com** (form mailto updated).
3. Theme toggle rebuilt with sun/moon SVGs (light + dark both work).
4. **Interactive phone teaser**: tap any tab/button/story → animates → "Continue in the app → Download" sheet
   scrolls to download section. Translated FR/EN/中文.
5. Store buttons colorized: App Store = blue gradient, Google Play = green gradient (Web stays neutral).

Dropped by Serg: "one price / change format", teaser "less naggy" tweak.

## Standing working rules (Serg)
- **Push the needle**, not maintenance. Actively CHECK Serg if a task is low-leverage; propose higher-impact work.
- Preview locally + open in browser before any deploy; **ask before pushing**, push only on explicit "yes".
- Persist important info to repo files (this file) so it survives across chats / compaction.

## Candidate high-leverage next moves (not yet done)
- Email/waitlist capture (pre-launch list = the real asset) — needs a no-backend form endpoint (e.g. Formspree)
  or Vercel function; currently CTAs just scroll/`mailto`.
- SEO/discoverability: meta/OG tags, social share image, sitemap, favicon polish, Lighthouse pass.
- Analytics (Vercel Analytics / Plausible) to measure CTA conversion.
- Real proof/content to replace placeholder testimonials (honest, no fake numbers).
- Performance/accessibility polish; reduced-motion; mobile QA.
