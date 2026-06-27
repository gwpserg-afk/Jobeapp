// Vercel serverless function (CommonJS) — Jobé waitlist
// Flow: store the signup (forward to Formspree) + send a custom welcome email (Resend).
// Degrades gracefully: if RESEND_API_KEY isn't set, the signup is still stored.
// Env vars (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   (required for the welcome email)   — https://resend.com/api-keys
//   WAITLIST_FROM    (optional) e.g. "Jobé <hello@jobeapp.com>"  (needs a verified domain in Resend)
//   FORMSPREE_ID     (optional) defaults to xeebeyzn

const FORMSPREE_ID = process.env.FORMSPREE_ID || 'xeebeyzn';

function welcomeEmail(lang) {
  const fr = lang !== 'en';
  const subject = fr ? 'Bienvenue dans la communauté Jobé 🇸🇳' : 'Welcome to the Jobé community 🇸🇳';
  const t = fr ? {
    h: "Tu es sur la liste. 🎉",
    p1: "Merci de rejoindre <b>Jobé</b> — le réseau social des entrepreneurs du Sénégal. Tu fais maintenant partie des <b>membres fondateurs</b>.",
    p2: "Ça veut dire : tu seras prévenu·e <b>en avant-première</b> au lancement, et ton avis compte pour façonner l'app.",
    p3: "On construit ça à Dakar, pour toi. À très vite. 🇸🇳",
    foot: "Tu reçois cet email car tu t'es inscrit·e sur jobeapp.com"
  } : {
    h: "You're on the list. 🎉",
    p1: "Thanks for joining <b>Jobé</b> — the social network for Senegal's entrepreneurs. You're now a <b>founding member</b>.",
    p2: "That means: you'll be notified <b>first</b> at launch, and your feedback helps shape the app.",
    p3: "We're building this in Dakar, for you. Talk soon. 🇸🇳",
    foot: "You're receiving this because you signed up at jobeapp.com"
  };
  const html = `<!doctype html><html><body style="margin:0;background:#F4F1E9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:40px 28px">
    <div style="font-size:30px;font-weight:800;letter-spacing:-.5px;color:#15140F">Job<span style="color:#15803D">é</span></div>
    <div style="height:3px;width:54px;background:#15803D;border-radius:2px;margin:8px 0 28px"></div>
    <h1 style="font-size:26px;color:#15140F;margin:0 0 16px">${t.h}</h1>
    <p style="font-size:15px;line-height:1.7;color:#3f3a30;margin:0 0 14px">${t.p1}</p>
    <p style="font-size:15px;line-height:1.7;color:#3f3a30;margin:0 0 14px">${t.p2}</p>
    <p style="font-size:15px;line-height:1.7;color:#3f3a30;margin:0 0 28px">${t.p3}</p>
    <a href="https://jobeapp.com" style="display:inline-block;background:#15803D;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:12px">jobeapp.com</a>
    <p style="font-size:12px;color:#948E7E;margin:34px 0 0">${t.foot} · <a href="https://instagram.com/jobeapp" style="color:#15803D">@jobeapp</a></p>
  </div></body></html>`;
  return { subject, html };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  if (body._gotcha) return res.status(200).json({ ok: true }); // honeypot → pretend success
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const lang = String(body.lang || 'fr');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  // 1) Store the signup (Formspree = list of record). Never block the user if this hiccups.
  try {
    await fetch('https://formspree.io/f/' + FORMSPREE_ID, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, phone, _subject: 'Nouvelle inscription waitlist Jobé' }),
    });
  } catch (e) { /* non-fatal */ }

  // 2) Custom welcome email via Resend (only if configured).
  const KEY = process.env.RESEND_API_KEY;
  if (KEY) {
    const from = process.env.WAITLIST_FROM || 'Jobé <onboarding@resend.dev>';
    const { subject, html } = welcomeEmail(lang);
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: email, subject, html }),
      });
    } catch (e) { /* non-fatal — signup already stored */ }
  }

  return res.status(200).json({ ok: true });
};
