# Jobé Waitlist + custom autoreply — setup

## What's built (live in code)
- **`marketing/api/waitlist.js`** — Vercel serverless function. On signup it:
  1. **Stores** the signup by forwarding to Formspree (`xeebeyzn`) — email + phone.
  2. **Sends a custom welcome email** via Resend (FR/EN, "founding member" message).
  - **Degrades gracefully:** if `RESEND_API_KEY` isn't set yet, signups are STILL stored (no email sent).
- **Forms** (homepage `#download` + `download.html`) now collect **email (required) + phone (optional)**,
  and POST JSON to `/api/waitlist`.

## Activate the welcome email (Resend — free tier: 3,000/mo, 100/day)
1. Sign up at **resend.com**.
2. **API key:** resend.com → API Keys → Create → copy (starts `re_…`).
3. **Verify the domain** (needed to email real signups): Resend → Domains → Add `jobeapp.com` →
   add the SPF/DKIM DNS records it gives you to your DNS (Vercel domains or your registrar).
   - ⏳ Until verified, Resend only delivers to **your own account email** — which is perfect for testing now.
4. **Vercel env vars:** Vercel → the marketing project → Settings → Environment Variables:
   - `RESEND_API_KEY` = `re_…`
   - `WAITLIST_FROM` = `Jobé <hello@jobeapp.com>`  ← only AFTER domain verified. Before that, leave it
     unset (function falls back to `onboarding@resend.dev`, which can only reach your own email).
   - Redeploy (Vercel applies env vars on the next deploy).

## Test
- Submit the waitlist with **your own email**.
- Check: (a) welcome email arrives, (b) the signup (email + phone) shows in the Formspree dashboard.
- ⚠️ Local `python -m http.server` can't run `/api/*` (serverless) — test on the deployed Vercel URL, not localhost.

## Phone → SMS (later, at launch)
- Phone numbers are **captured now** (stored via Formspree). When ready, send SMS via **Africa's Talking**
  (built for Senegalese/African numbers — better & cheaper than Twilio). No rebuild needed; just export the list.

## Files
- `marketing/api/waitlist.js` — the function
- `marketing/index.html`, `marketing/download.html` — forms (email + phone → /api/waitlist)
