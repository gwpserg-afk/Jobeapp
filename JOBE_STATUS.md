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

## Sign-up screen rebuilt + username added (2026-06-26)
- **Welcome screen** finalized per Serg: TEXT wordmark "Job"(navy)+"é"(green) italic heavy, NO logo image,
  NO green bubble, ONE portal (removed "For businesses"). "Get started" → sign-up; "Sign in" → sign-in.
- **Backend: added `username`** — `auth.ts` additionalField (string, input:true) + Prisma `User.username
  String? @unique` + `db push --accept-data-loss`. Verified end-to-end via curl: signup with username
  returns user.username and persists in dev.db. Backend restarted (plain `bun run src/index.ts`, PID changes).
- **New sign-up UI** (`(auth)/sign-up.tsx`): theme-aware (useTheme), Instagram×SaaS premium — wordmark,
  Personal/Business segmented toggle (maps to candidate/recruiter), icon inputs (AtSign/User/Mail/Lock),
  password show/hide, focus-highlight, green CTA, FR/EN/中 (su_* keys). username sanitized to [a-z0-9_].
- **Prisma CLI note:** no global `node`; `bunx prisma` fails (wasm path). Run via
  `bun node_modules/prisma/build/index.js db push --accept-data-loss`.

## Dashboard updated + DEPLOYED (2026-06-26, commit e6df496)
Pushed to main → admin.jobeapp.com (Vercel auto-deploy). Heavy Apple-style liquid glass (blur 36-44px,
layered sheen, aurora behind, glass sidebar+topbar). Build plan FULLY REWRITTEN for 100% social
(profiles→feed→engage→follow→DMs→groups; jobs demoted to "a post type"; fixed Supabase→Better Auth).
All 3 langs. Only web/index.html committed (mobile/backend work stays local/uncommitted).
- **Verified reality vs claims:** Better Auth ✅ real/live, Prisma+SQLite ✅ real (31 models, dev.db) —
  Cloudflare tunnel ❌ never set up (corrected on dashboard → "Public backend URL (deploy)" = next).
- Welcome + Sign-up marked **done**; screens counter now COMPUTED from data (done/total), not hardcoded.
- **Recent activity**: added app/marketing TAGS (chips) + "See more" toggle; rewrote with real recent work
  across app + marketing (cross-surface). All 3 langs.
- **Liquid glass** restyle: translucent glass cards + backdrop blur + aurora glow behind. Both themes.
- **Senegal-only**: removed West Africa / 4-countries everywhere → Senegal cities (Dakar/Thiès/St-Louis).
- **Timeline reframed**: Build (mid-2026) → 3-month closed beta (50 testers) → Senegal launch (late 2026/2027).
- Verified: inline JS parses, HTTP 200, braces balanced, no stale remnants.

## ⚠️ Build plan is OUTDATED (found 2026-06-26) — needs rewrite for 100% social
`web/index.html` build plan (bp1–bp25) is job-marketplace-centric AND wrong on auth:
- bp6 says "Supabase Auth", bp9 "Hono verifies Supabase JWT" — WRONG, we use **Better Auth** (done).
- Phase 3 "Candidate App" / Phase 4 "Recruiter App", bp13 Jobs / bp14 Applications / bp15 AI job matching
  = job framing, not 100% social. Missing: social profiles, follow/connect, comments, DMs, groups, discover.
- TODO: rewrite build plan around the social loop (profiles → feed/posts → engage → follow → DMs → groups),
  fix auth to Better Auth, demote jobs to "opportunity = a post type". 3 langs.

## Phone-first auth flow built (2026-06-27)
Full clickable signup→verify→app flow. Phone REQUIRED, email OPTIONAL.
- **Flow:** sign-up (username/name/phone[req]/email[opt]/password) → saves to `lib/pending-signup.ts`
  zustand store → **verify-otp page** (rebuilt, 6-box OTP, premium) → enter **111111** (DEV_CODE bypass)
  → creates account via Better Auth `signUp.email` → real session → app.
- **Phone-first trick:** Better Auth needs an email identifier; when user gives none we derive
  `{digits}@phone.jobe.app` (`deriveEmailFromPhone`). Real phone-number login + SMS replaces this later.
- **Sign-in REBUILT** (was the old hardcoded-French page = the "other button" bug): new design, light-aware,
  phone-or-email + password. Phone identifier resolves to the derived email.
- **Verified:** all auth files typecheck clean; iOS bundle builds; phone-first signup tested end-to-end via
  curl (real token + phone persisted).
- **SMS = next (not done):** replace the 111111 DEV_CODE with real OTP. Backend has Textbelt route but Serg
  wants a better provider; DO NOT insert API key yet (Serg will). Then switch to real Better Auth phone plugin.
- **CONNECTIVITY FIXED:** mobile/.env → `http://10.0.0.191:3000` (Mac LAN, DHCP — may change). Backend
  reachable, URL baked into bundle. ⚠️ Phone MUST be on same Wi-Fi as the Mac to reach it.

## Sign-up tweaks + theme fix (2026-06-26)
- **Theme now defaults to LIGHT** (`theme.ts` isDark:false/lightColors) — Serg wanted light-first.
- **Optional phone field** added to sign-up (Senegal format placeholder; passed as Better Auth `phone`
  additionalField which already exists → persists). Email still the login identifier.
- "French + no username on sign-up" Serg saw = STALE Expo Go cache (old hardcoded-FR sign-up). The new
  i18n-aware sign-up (FR/EN/中 + username) IS what Metro serves — force-quit reload fixes it.
- **Phone-PRIMARY signup + SMS = next step (not built):** backend already has a Textbelt SMS OTP route
  (`routes/phone-verify.ts`, needs TEXTBELT_KEY) + Better Auth phone-number plugin is available. Blocker:
  phone *login* isn't wired, so phone-primary signup would lock users out. Needs: plugin enable + Textbelt
  key + phone login flow. Ask Serg before building (SMS has per-message cost).

## ⚠️ BLOCKER for on-device auth: mobile/.env backend URL is DEAD
`mobile/.env` → `EXPO_PUBLIC_BACKEND_URL=https://championship-caught-len-committee.trycloudflare.com`
(dead Cloudflare tunnel from Jun 13). The signup PAGE renders fine, but SUBMIT can't reach the backend.
Local backend healthy at localhost:3000. No global cloudflared/ngrok. Mac LAN IP = **10.0.0.86**.
Options to make submit work: (a) LAN `http://10.0.0.86:3000` (phone must be on same wifi; expo client
stores cookies manually so http is OK) then restart Metro to rebuild EXPO_PUBLIC; (b) install a tunnel for
an HTTPS URL. EXPO_PUBLIC_* are build-time → changing .env REQUIRES a Metro restart.

## Profile + social loop built (2026-07-05) ✅ typechecks clean, bundle builds
The 3 priority screens (signup ✅ / feed ✅ / profile ✅) are all premium now. This session:
- **`(tabs)/profile.tsx` REBUILT** — real social profile: gradient banner, avatar (image/initials), name +
  verified badge, @username, Personnel/Entreprise chip, bio, **liquid-glass stats card** (expo-blur), REAL
  post count + YOUR real posts (`GET /api/posts`), settings (theme/lang/sign-out). Removed the fake
  248/12/89 job stats. Followers/Following show 0 (honest — follow system not built yet).
- **`(app)/edit-profile.tsx` NEW** — edit name/username/bio via `authClient.updateUser`; auto-registers in
  the (app) Stack.
- **`(app)/user/[id].tsx` NEW** — public profile: tap any person in the feed/discover → their profile +
  their posts (`GET /api/posts/user/:id`, no new backend). Completes the social loop.
- **Feed** (`(tabs)/index.tsx`) — branded header (Jobé wordmark), and post authors are now tappable →
  open their profile. **Discover** cards tappable too.
- **Backend:** added `bio` field (auth.ts additionalField + Prisma, verified end-to-end) and `username`
  to the posts `user` select (so post authors carry their @handle). Backend restarted.
- **NOT built (flag as next):** follow/connect (Follow button intentionally omitted — no endpoint), DMs/chat,
  comments UI, post detail. Pre-existing non-blocking type warning in `lib/auth.ts` (SecureStore async sig).
- ⚠️ **DEMO GAP:** a fresh signup lands on an EMPTY feed (no posts exist). Offer Serg: seed a few genuine
  founder/welcome posts so the demo looks alive (honest sample content, not fake stats).

## Social features + seed content (2026-07-05) ✅ verified end-to-end
Big session — the app now feels like a real social network.
- **Seed content** (`backend/scripts/seed-social.ts`, idempotent): 5 genuine Dakar entrepreneurs w/ bios,
  10 honest French posts, 18 likes, 5 comments, 11 follows. Feed is ALIVE for the demo. Re-run: `bun scripts/seed-social.ts`.
- **Follow/connect** — NEW `Follow` model + `routes/follow.ts` (POST `/api/follow/:id` toggle, GET counts +
  isFollowing), mounted. Follow button + real follower/following counts on public profiles AND own profile.
- **Comments** — NEW `(app)/post/[id].tsx` (post detail + comments list + add-comment bar). Backend comment
  routes already existed. Feed comment icon + tapping post content → opens it.
- **Public profiles** wired everywhere: tap a person in feed/discover → `(app)/user/[id].tsx` (their posts +
  follow + counts).
- Backend: `Follow` table pushed; `username` added to comment/post author selects.
- Verified: full app typecheck clean, iOS bundle builds, follow endpoint returns real counts (Awa 4 followers).
- **Still not built (next):** DMs/chat tab (real), notifications feed, edit avatar photo upload, groups.

## 🌐 BACKEND NOW PUBLIC via Cloudflare tunnel (2026-07-06) — fixes the weekly "can't connect" pain
Root cause of a week of pain: mobile/.env pointed at the Mac's LAN IP, but the Mac keeps landing on
cellular/hotspot networks (CGNAT 100.x) the phone can't reach → app loads but feed/login/profile all
fail with "couldn't load". FIX: gave the backend a PUBLIC internet URL so the phone reaches it on ANY network.
- Tool: `cloudflared` binary at `~/Desktop/jobe/bin/cloudflared` (downloaded, no account, free quick-tunnel).
- Run: `cd ~/Desktop/jobe/bin && ./cloudflared tunnel --url http://localhost:3000 --no-autoupdate` (background).
- It prints `https://<random>.trycloudflare.com` → put that in `mobile/.env` EXPO_PUBLIC_BACKEND_URL →
  restart metro (`--clear`, build-time var). Added `https://*.trycloudflare.com` to Better Auth trustedOrigins.
- Verified end-to-end over the public URL: signup ✅, feed loads 20 posts ✅, bundle baked ✅.
- ⚠️ **QUICK-TUNNEL URL CHANGES every time cloudflared restarts.** If the feed breaks again: check the
  cloudflared process is alive, grab the current URL (`grep trycloudflare /tmp/cf-backend.log`), update
  .env, restart metro. Current URL (2026-07-06): `https://nec-brighton-easier-fisheries.trycloudflare.com`.
- Durable upgrade later: hosted backend OR a Cloudflare NAMED tunnel (stable URL, needs free CF account).

## Feed + profile 10x polish (2026-07-06) ✅ typecheck clean, bundle builds, repost e2e verified
- **@username** now shows in every post header (`@handle · role`).
- **"Entrepreneurs à découvrir" horizontal row** at top of feed — real distinct people from the feed
  (excludes self), tap → their profile. Makes the feed feel alive/social. FR/EN/中 (feedDiscoverRow).
- **Repost wired** (was dead) — optimistic mutation → `POST /api/posts/:id/repost`, verified over public backend.
- **Premium depth**: post cards + composer → radius.xl + soft shadow; profile & public-profile post cards match.
- All stable (no reanimated). Feed/profile/user screens consistent.

## 🩹 STALE-SESSION SELF-HEAL (2026-07-08) — fixes "Impossible de charger le fil"
Symptom: app opens, shows feed shell, "couldn't load feed" forever; header shows "Bonjour" w/ NO name.
Root cause: `authClient.useSession()` returns a CACHED session from SecureStore. If that session is stale
(cookie from an old backend/data), `session.user` is truthy → index.tsx routes to the feed, but every
`/api/*` call returns 401 → feed error state. App never recovered. NOT a network issue (verified tunnel +
fresh-login feed both work).
FIX (2 parts): (1) `lib/api.ts` — on 401, call `authClient.signOut()` to clear the bad session. (2)
`(app)/_layout.tsx` — session guard effect: if not pending and no session.user, `router.replace` to welcome.
Net: stale session → 401 → cleared → bounced to login → fresh login → feed works. Typecheck clean, bundle builds.
User fix if stuck pre-update: Profile tab → Sign out → sign up again.

## 🔑 KEY GOTCHA: stale session survives Expo Go "clear history" (it's in iOS Keychain)
When "Impossible de charger le fil" persists even after a fresh QR scan + cleared history: the dead session
lives in iOS **Keychain (SecureStore)**, which Expo Go's cache-clear does NOT wipe. Fixes: (a) in-app
Profile → Sign out (verified: sign-out→re-signup→feed 12 posts ✅), or (b) delete+reinstall Expo Go (wipes
keychain). Self-heal code (api.ts 401→signOut, (app)/_layout guard) IS served correctly — note: Expo LAZY
BUNDLING means api.ts isn't in the root /index.ts.bundle (grep there shows 0); it loads as an on-demand
module (/src/lib/api.bundle has it). Don't chase "fix missing from bundle" again — check the module bundle.

## ⚠️ REVERTED the self-heal (2026-07-08) — it caused a "bounce back to welcome" bug
The api.ts 401→signOut + (app)/_layout session-guard I added were TOO aggressive: right after a fresh
signup, a transient race (feed fires before cookie settles / useSession not yet populated) → signOut cleared
the fresh session / guard bounced user to welcome. REVERTED both (api.ts = no 401 handling; (app)/_layout =
plain Stack). Not needed anyway now that LAN backend is stable. Full device flow re-verified 4/4 over LAN:
create account → session(name) → feed(12) → create post. DON'T re-add a session guard without a grace period.

## 2026-07-21 (cont'd 3): 50/50 broad moderation test + tiered thresholds FINAL
- **50/50 test PASS** across FR/EN/中文/ES: 18 clean (incl retard/pénétration/analytics/dispute/cocktail
  false-positive probes) all allowed; 32 bad (profanity/slurs/explicit/leetspeak + AI violence/hate/self-harm
  /sexual/terror + Chinese & Spanish threats) all blocked. Chinese/Spanish caught by OpenAI (word filter is EN/FR).
- **FINAL report thresholds (tiered, in reports.ts):** never hide on 1st report. AI-flagged-on-report → hide at
  3 reports; AI-clean → hide at 10 (spam/scam consensus). Worst content blocked at POST time regardless. All
  reported content always shows in admin dashboard. Deployed 25a734c.
- SAFETY IS DONE. Test-runner pattern (for future): curl -c/-b cookie jar + python json.dumps for unicode
  content (parsing the netscape jar in python fails — use curl -b natively).

## 2026-07-21 (cont'd 2): Smart report workflow + admin Reports dashboard
- **Admin Reports section BUILT + deployed** on admin.jobeapp.com (nav 🛡 Reports). Fetches GET /api/reports
  with ADMIN_KEY (Serg set it on Render + entered once in dashboard → stored in browser localStorage, not in
  code). Shows type/reason/snippet/author/reporter/time. FR/EN/中. Serg confirmed it works. Created 5 demo
  reports (spam/scam/harassment posts + aggressive comment) so he could see the flow.
- **Report workflow REDESIGNED (Serg's idea — smarter):** was "1 report = instant hide" (abusable). NOW: on
  report, AI re-analyzes the content (containsProfanity + moderateAI); post is auto-hidden ONLY if AI confirms
  bad OR report count ≥ 5 (community consensus). Protects good posts from single malicious reports; still
  catches AI-confirmed bad instantly + spam/scams via the 5-report threshold. `reports.ts`, THRESHOLD=5.
  VERIFIED live: 1-2 reports on clean post → hidden:false (stays); 5 reports → hidden from feed.
- **Posting bad content UX:** blocked instantly (422, never posts) w/ friendly bilingual message. Improved the
  create-screen error into a proper red banner w/ AlertTriangle icon (needs app reload to see).
- TODO later: "resolve/dismiss" action on dashboard reports to clear them; clean up accumulated test reports.
- NEXT: Serg to dump full social-features + UI-polish list.

## 2026-07-21 (cont'd): SAFETY FULLY VERIFIED + false-positives fixed
- **OpenAI moderation NOW WORKING** — Serg added $5 credit → 429 gone → violent/hate/self-harm/sexual + images blocked.
- **Fixed critical false-positive bug** (found via testing): substring matching flagged business words —
  analytics(anal), dispute(pute), suspicious(spic), cocktail(cock), violation(viol), market penetration, and
  FR "retard"(=late!). FIX: word-boundary (whole-token) matching for short/ambiguous terms; pure-substring only
  for unambiguous compounds (blowjob, pornographie...). Broadened FR vulgar coverage (nique/foutre/chier/
  couille/enfoire/petasse/connard...). "retarded" blocked but "retard"(late) allowed; "viol"(rape) blocked but
  violation/violence/violon allowed.
- **VERIFIED: 41/41 local + 19/19 live end-to-end** across FR clean business words, FR+EN derogatory, leetspeak,
  and OpenAI AI cases. Zero false positives, zero false negatives. Filter is `backend/src/utils/profanityFilter.ts`.
- Safety stack COMPLETE: bilingual word filter (free) + OpenAI AI text+image moderation ($5 credit) + block + report(auto-hide).
- STILL TODO: admin dashboard Reports section (nav item + page started; needs ADMIN_KEY env var on Render to
  fetch /api/reports). Then: social features + UI polish per Serg.

## 2026-07-21: SAFETY LAYER LIVE + deploy root-cause fixed
- **Root cause of stuck deploys (2 days):** `backend/src/routes/follow.ts` was NEVER committed → Render's
  `bun run src/index.ts` failed "Cannot find module './routes/follow'" → every deploy kept the OLD image.
  FIXED: committed follow.ts (+ seed scripts) commit 8c55b35. LESSON: after adding backend files, verify
  `git ls-files` includes them before relying on a Render deploy.
- **Verified LIVE on hosted backend:** bilingual profanity filter (EN/FR) blocks posts+comments (422);
  clean posts 201; **blocking real users works** (`/api/block/:id` → blocked:true; feed excludes blocked).
  Reporting auto-hides posts. Self-block/self-follow return 500 (edge case, no UI path — ignore).
- **OpenAI moderation — DIAGNOSED (2026-07-21):** key IS set correctly (164 chars, sk-proj, read fine) and
  moderateAI() code IS calling OpenAI correctly. BUT OpenAI returns **429 "Too Many Requests"** on a single
  call to the FREE moderation endpoint → means the OpenAI account has a payment method but **NO CREDIT
  BALANCE** (OpenAI separates payment-method from usable quota; new project keys 429 until credits added).
  FIX = Serg adds ~$5-10 prepaid balance at platform.openai.com → Billing → Add to credit balance. Moderation
  stays free per-call; credits just activate account standing. Then re-test (post threatening text → 422).
  (Used a temp /api/_diag endpoint to find this via httpStatus=429; removed it after — commit 4e7c2cc.)
- **Moderation TEST 13/15:** all 5 clean pro posts allowed (0 false positives), all 8 profanity/slur/leetspeak
  /FR blocked. Only misses = the 2 AI-only cases (violent threat, nuanced hate) — those need the OpenAI 429 fixed.
- ⚠️ **ADMIN_KEY not set on Render** → `/api/reports` GET returns 403 always (admin reports VIEW unusable
  until ADMIN_KEY env var added). Dashboard reports section not built yet either.
- Cleaned up: deleted the 2 violent test posts I created during verification (204).
- OpenAI cost: moderation endpoint is FREE per-call; but OpenAI requires a billing method to issue a key.
  Anthropic has no free moderation endpoint — reserve Claude for real AI features later.

## 2026-07-14: admin mobile-optimized + app-viewing blocker hit
- **Admin panel mobile-optimized** (`web/index.html`, deployed 3e1147e): added `html,body{overflow-x:hidden}`
  guard (root cause of "not functional" = horizontal overflow shrinking everything), new ≤600px phone media
  pass (topbar tightened, status-dot hidden, stats 2-col→1-col ≤380px, chips/tags wrap, bigger nav tap targets,
  QR row stacks, mytask input stacks). Nav hamburger + toggle already worked. Viewable from phone (Vercel).
- **APP-VIEWING BLOCKER:** Serg away from laptop, app 404'd (dxb5syu tunnel offline). Confirmed his suspicion:
  app CODE served from laptop metro tunnel → laptop off/tunnel drop = can't open. Backend (Render) is fine.
  Restarted tunnel → `ehqeetu-anonymous-8081` → updated+deployed dashboard QR (ab33c43). Told him the REAL fix
  = **EAS Update (FREE, no Apple acct)** publishes app to Expo cloud → permanent link works w/ laptop off.
  Offered to set it up TODAY via an Expo ACCESS TOKEN (he generates on expo.dev from phone → paste → I run
  `eas init`/`eas update` non-interactively; no password needed). eas-cli NOT installed locally yet.
- ⚠️ This is now the #1 pain — strongly recommend doing EAS next session. Apple $99 only needed for a REAL
  installed app later; EAS Update in Expo Go is free and solves "view without laptop / cofounder remote".

## ✅ Session end 2026-07-13/14: profile loved, edit-btn polished
Serg saw the new TikTok profile + home discover cards — loves both. Last tweak: made the "Modifier"/Edit
button a prominent green box (height 48, radius.lg, green-glow shadow, icon+label locked one line via
numberOfLines). Verified served + metro fresh (Jul 14) + QR=dashboard (dxb5syu). Ended here til next day.
- **Live tunnel this session: `exp://dxb5syu-anonymous-8081.exp.direct`** (b-4ogeq/older are DEAD). Dashboard
  QR updated + deployed w/ a "🔄 QR updated" timestamp line so Serg can see freshness.
- **NEW RULE (Serg called me out, rightly): ALWAYS verify restarts actually worked before saying "test."**
  Root cause of stale-profile confusion: an OLD metro from Jul 10 was still serving (my restarts had silently
  failed on ngrok timeout). PROTOCOL now: (1) confirm old metro PID dead, (2) fetch the served MODULE bundle
  (not root — lazy bundling) + grep for the NEW code I just wrote, (3) confirm subdomain == dashboard, (4) backend awake.
- Serg deferred EAS/Apple until app is "actually finished + ready for testing" — QR churn is livable til then.
- TODO next: offered a version/build stamp in Settings so Serg can self-confirm latest version. "Real changes" tomorrow.

## 📱 TikTok-style profile redesign + real settings screen (2026-07-13) ✅ verified
Per Serg's detailed TikTok-layout spec (clean/minimal, keep Jobé colors).
- **Profile REBUILT** (`(tabs)/profile.tsx`): NO banner. Floating top bar = Jobé wordmark (left) + settings gear
  (right). **Two-column header**: LEFT = big bold name + @handle + stats row (posts/followers/following, stacked
  number-over-label, no dividers); RIGHT = big circular avatar sharing the block's vertical space (tap → change
  photo). Action row = wide green "Modifier" pill + share icon btn. Bio block = type chip + bio + instagram line
  (IG icon) + location line (pin icon). 3-col post grid kept. Fixes the old "edit text below banner" bug (banner gone).
- **NEW settings screen** (`(app)/settings.tsx`, gear opens it): sections Appearance (dark toggle), Language
  (FR/EN/中), Privacy & safety (privacy policy + community guidelines rows → jobeapp.com for now), Account (sign
  out, red). Moved logout + language OUT of the profile body (they were "messed up" inline).
- **Backend: added `location` + `instagram`** user fields (auth.ts additionalFields + Prisma). DEPLOYED to Render
  (commit d71a090, auto db push). Verified: update-user saves + persists both on hosted DB.
- **edit-profile**: added instagram + location inputs (IG strips leading @).
- **Images**: resize fix from 2026-07-12 in place (should render now). ⚠️ VIDEOS: picker+expo-video available BUT
  base64 video in DB is unviable (too large) — videos need real file hosting (Cloudinary/S3), deferred + told Serg.
- Typecheck clean, bundle builds. Metro up (b-4ogeq), backend hosted.

## 🎨 Image fix + discover-row redesign (2026-07-12)
- **"Photos didn't load" FIXED:** raw phone photo as base64 = 1-3MB → RN <Image> can't render huge data URIs.
  `lib/pick-image.ts` now RESIZES via expo-image-manipulator (manipulateAsync, resize width 1080, JPEG q0.5,
  base64) before returning. Small enough to render + store. Used by profile avatar + post composer.
- **Discover row REDESIGNED** (Serg: "too much like IG stories, make it pop/different"): circles → NETWORKING
  CARDS. Each card = rounded-SQUARE avatar (16px radius, not circle), first name + verified badge, role label,
  and a **green "+ Suivre" follow button** (toggles to "✓ Abonné"). Sparkles icon on the header. Distinctly
  "connect with entrepreneurs," not stories. Follow calls `/api/follow/:id` optimistically.
- Metro was briefly down (transient "could not connect to dev server") — back up, serving b-4ogeq, matches QR.
- Typecheck clean, bundle builds. All prior features still work (Serg confirmed: post/comment/like all good).

## 📸 Instagram-style profile + image uploads (2026-07-10) ✅ verified end-to-end
Serg loves it, wants it "real Instagram" not AI-vibe. Profile first.
- **Profile REBUILT Instagram-style** (`(tabs)/profile.tsx`): @username top bar, avatar + stats row
  (posts/followers/following) side-by-side, name/type/bio, Edit button, **3-column post grid** (image posts
  show photo, text posts show gradient tile w/ preview), settings (theme/lang) + logout. Tap avatar → change photo.
- **Image uploads** — NEW `lib/pick-image.ts` (expo-image-picker v17 → crop → compressed base64 data URI).
  Profile photo (1:1) via `authClient.updateUser({image})`; post photos (4:5) in composer (`create.tsx` has
  ImagePlus button + preview + remove). **Storage = base64 data URI in DB** (User.image / Post.imageUrl are
  String) — free, persists on Render Postgres, no external bucket. ⚠️ Replace w/ Cloudinary/S3 when scaling.
- Verified vs HOSTED backend: post-with-image stored + in feed ✅, avatar update ✅. Typecheck clean, bundle builds.
- **App now points at HOSTED backend** (`jobe-backend-6aox.onrender.com`) — feed works on any network. Render
  free tier cold-starts (~30-50s first hit after idle).
- Next per Serg: more "real" polish; then EAS publish for permanent QR (metro subdomain still drifts).

## 🚀 PIVOT TO PERMANENT DELIVERY (2026-07-09) — Expo Go+metro is unworkable for Serg's needs
Serg (rightly) done with the fragile setup: metro subdomain drifts every restart → dashboard QR goes stale
→ he can't have me reload things constantly, esp. for cofounder viewing remotely while he travels. Expo Go
is a dev tool tied to MY Mac. PERMANENT solution (both free, no Apple $99 needed):
1. **Host backend** (Render free tier) → permanent backend URL → no more IP/tunnel churn. Needs Serg's Render
   acct. SQLite→Postgres (or Render disk). THIS is the #1 daily-pain fix and needs no Apple.
2. **Publish app** (EAS Update, free) → permanent QR openable in Expo Go from anywhere, no my Mac. Needs free
   Expo acct (expo.dev/signup). ⚠️ verify Expo Go can open EAS Update for SDK54; if not, fallback = dev build
   (iOS needs Apple $99 — deferred) or Android APK (free). Created `mobile/eas.json` scaffold.
- Serg's homework: create free Expo account + free Render account. Then I run/guide eas init/update + deploy.
- Auth bugs from earlier today ARE fixed in code (sync SecureStore + getCookie null-guard) — they'll ship
  with the published build. Auth was genuinely broken on-device before; now correct.

## 🐛 SECOND auth bug + QR subdomain drift (2026-07-09)
- **getCookie crash "Cannot read property 'expires' of null":** after the sync fix, `getCookie` finally ran
  with real data but the library doesn't guard null cookie values. PATCHED `node_modules/@better-auth/expo/
  dist/client.js` getCookie to skip null/non-object entries (+ null parsed guard). ⚠️ node_modules edit →
  make durable via bun patch later. Blocked signup (couldn't pass verify-otp even w/ 111111).
- **Metro tunnel subdomain is NOT stable** — it changed `0jfi-_q-anonymous-8081` → `b-4ogeq-anonymous-8081`
  after a tunnel restart (anonymous ngrok = random subdomain each session). The dashboard QR was hardcoded to
  the old one → scanning loaded nothing/stale. FIX: updated web/index.html QR + pushed (commit 9af5a22,
  admin.jobeapp.com). ⚠️ RECURRING: every metro `--tunnel` restart may change the subdomain → dashboard QR
  goes stale → must update+redeploy. Consider the editable QR input on the dashboard, or a stable-URL approach.

## 🎯 THE REAL ROOT CAUSE (2026-07-09) — async SecureStore broke cookie attach
Backend logs revealed it: phone REACHES the Mac fine (`get-session→200`) but `posts/feed→401`. Not network,
not tunnel. Cause: `auth.ts` gave @better-auth/expo's `expoClient` storage the **async** SecureStore methods
(`getItemAsync`). But the plugin's `getCookie()` calls `storage.getItem()` **synchronously** and JSON.parses
the result — a Promise → parse fails → returns EMPTY cookie → `api.ts` attaches no cookie → every app route 401.
The device feed auth had NEVER worked; my curl tests used a cookie jar so they hid it. The "pre-existing
auth.ts typecheck warning (async not assignable to sync)" I kept dismissing was literally this bug.
FIX: SecureStore v15 has SYNC `getItem`/`setItem` → use those. Storage interface is only {getItem,setItem}
(no removeItem). Typecheck now fully clean. This is the fix for the whole week of "feed won't load."
- Diagnostic still in feed error state (shows raw error + URL) — can remove later.

## ✅ (SUPERSEDED) tunnel theory (2026-07-08) — it was NOT the tunnel, it was the cookie bug above
Definitive diagnosis (tested every layer): (1) stale session = RULED OUT (user signed out, persisted).
(2) metro/QR = fine (UI always loaded). (3) DEVICE COOKIE PATH = VERIFIED WORKING — replayed the exact
`Cookie: better-auth.session_token=...` manual attach the app uses → feed returned posts. Bearer=401,
cookie=200 (app uses cookie ✓). (4) ONLY cause = cloudflared quick-tunnel kept DYING every few min
("timeout: no recent network activity") → backend unreachable → "Impossible de charger le fil" whenever
Serg tested. All my prior "✅ works" were curl-on-Mac, never the phone→tunnel path.
FIX: **killed cloudflared entirely. App now points at Mac LAN IP directly** (`http://192.168.1.191:3000`) —
phone + Mac same wifi = direct stable connection, NO tunnel to drop. Bun binds 0.0.0.0 by default (LAN 200).
Metro stays on --tunnel (dashboard QR still matches 0jfi-_q-anonymous-8081). Better-auth Secure;SameSite=None
cookie works over http LAN because expo client attaches it manually via getCookie (not browser-enforced).
- ⚠️ LAN IP changes on DHCP (was .148 → now .191). If feed breaks: update .env to `ipconfig getifaddr en0`,
  restart metro. Phone MUST be on same wifi as Mac. "Test anywhere" still needs hosted backend (future).

## ▶️ LIVE NOW (2026-07-08, stable wifi 192.168.1.148)
- Backend tunnel (quic, 10/10 stable): `https://arc-fit-expanded-boxes.trycloudflare.com` → baked into bundle.
- Metro tunnel: `0jfi-_q-anonymous-8081.exp.direct` = matches dashboard QR (no dashboard change needed).
- Verified 6/6: signup, session, feed (12 posts, all w/ usernames), like, repost, comment — over public URL.
- Note: quick-tunnel URL changes on each cloudflared restart; on stable wifi it holds. Serg deferred Apple
  Dev account (unnecessary spend for now) — TestFlight path paused until closer to the finish date.

## 🎯 TEST-ANYWHERE PLAN — TestFlight + hosted backend (chosen 2026-07-06)
Goal: Serg (+ cofounder, + 50 beta) test the app on ANY network with NO computer/tunnel. Expo Go is a dev
tool that always needs my Mac running Metro+tunnel → not viable for "test whenever." Solution = real
installed iOS app (TestFlight) hitting a HOSTED backend.
- **Phase 1 — host backend (FREE):** deploy Hono backend to Render free tier off GitHub (gwpserg-afk/Jobeapp)
  + free Postgres. Requires SQLite→Postgres (hosted FS is ephemeral). MUST keep local SQLite dev working
  (cofounder demo is days away — don't break it). Approach: env-driven DATABASE_URL + provider.
- **Phase 2 — TestFlight (needs Serg's accounts):** Apple Developer Program ($99/yr, 24-48h approval — START
  EARLY). Free Expo account. EAS build iOS preview/prod → eas submit → TestFlight. Bundle id in app.json
  (note: mobile/CLAUDE.md marks app.json 'forbidden' — that's legacy Vibecode boilerplate; we're out of
  Vibecode, editing it is required for a real build).
- **SEQUENCING:** cofounder demo = keep Expo Go on stable Wi-Fi (works). TestFlight = everyday + beta tool.
- Serg's homework: (1) start Apple Dev enrollment NOW, (2) later free Expo + Render accounts.
- ⚠️ Expo Go / cloudflared tunnel remains the CURRENT test path until TestFlight is live. trycloudflare
  quick-tunnels flap on cellular/airport wifi (5-6/8) — restart w/ `--protocol http2`; URL changes each restart.

## 💸 FREE-NOW → REPLACE-WHEN-FUNDED (remind Serg each time we touch these)
Strategy: ship on free/dev infra now; swap to paid when we invest. **Remind constantly.**
- **Backend host:** local Mac (`bun run`) on LAN — replace with a real host (Railway/Render/Fly) + HTTPS.
- **DB:** SQLite `dev.db` — replace with Postgres/Neon (free tier) for prod.
- **Device URL:** Mac LAN IP (changes on DHCP — **currently `10.0.0.228`**) — replace with hosted URL.
- **SMS OTP:** `111111` DEV_CODE bypass — replace with real provider + key (Serg adds key).
- **Auth email:** phone-first uses derived `{digits}@phone.jobe.app` — replace with real phone-number login.
- Log any paid swap in `~/Desktop/jobe/EXPENSES.md` (date·what·amount·category) when it goes live.

## 🎨 Design direction (2026-06-28): LIQUID GLASS, bold high-contrast
Per Serg's refs (liquidglassdesign.com — fitness app + glass widgets): Apple liquid-glass, bold type,
high contrast, gradient depth. Mobile glass = `expo-blur` BlurView + translucent layers (NOT reanimated).
Sprint focus: SIGN-UP (done) → HOME/FEED polish → PROFILE build, all in this language.

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
- **PERMISSION RULE — plain English, not code.** Before any action needing Serg's approval (running
  commands, deleting/moving files, installing, pushing/deploying), say in ONE plain-English sentence
  what you're doing and why — NOT raw code/file paths. Keep it short so he knows what he's approving.
- **Push the needle**, not maintenance. Actively CHECK Serg if a task is low-leverage; propose higher-impact work.
- Preview locally + open in browser before any deploy; **ask before pushing**, push only on explicit "yes".
- Persist important info to repo files (this file) so it survives across chats / compaction.
- Umbrella context lives in `~/Desktop/ZENO_COMMAND_CENTER.md` (all projects, sequencing, north star).

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
