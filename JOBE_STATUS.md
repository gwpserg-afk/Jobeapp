# Jobé — Working Status & Notes

> Persistent cross-chat notes. Not served on the site (Vercel roots are `marketing/` and `web/`).
> Last updated: 2026-06-23

## What Jobé is
Mobile-app-first **professional social network** for Senegal's youth (~75% social / 25% jobs).
Positioning rules (honest, pre-launch): **social-first**, **Senegal-only** ("built in Dakar"), **no fabricated
numbers/stats**, keep AI off the home screen. Languages: FR (default) / EN / 中文. Brand: green `#1DB954`,
blue `#2D7DD2`. IG: instagram.com/jobeapp (other socials "soon").

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
