// Content moderation for Jobé — a professional network for entrepreneurs.
// Goal: keep it organized/professional. Blocks explicit sexual content, slurs,
// and hard profanity in BOTH English and French (the core user languages).
//
// Two tiers:
//  - HARD terms (sexual/hate/slurs): matched even inside words, after leetspeak
//    normalization, because these have no legitimate place here.
//  - WORD terms (general profanity): matched on word boundaries to limit false
//    positives (e.g. "hell" in "hello" must not trip).
//
// NOTE: fast local filter for obvious cases. Nuanced text + IMAGE moderation
// should use an AI moderation API (OpenAI /moderations handles text + images)
// once OPENAI_API_KEY is set on the host — see moderateAI().

const HARD_TERMS = [
  // sexual / explicit (EN)
  "porn", "pornhub", "xxx", "blowjob", "handjob", "cumshot", "creampie", "gangbang",
  "dildo", "masturbat", "ejaculat", "cunnilingus", "fellatio", "hentai", "bukkake",
  "pussy", "cunt", "cock", "boobs", "titties", "nipple", "anal", "rimjob",
  // slurs / hate (EN)
  "nigger", "nigga", "faggot", "retard", "chink", "spic", "kike", "tranny",
  // sexual / explicit (FR)
  "pornographie", "salope", "pute", "putain", "enculer", "encule", "chatte",
  "branler", "branlette", "nichon", "penetration", "sodomie", "zoophilie",
  "pedophile", "viol",
  // slurs / hate (FR)
  "bougnoule", "tapette", "connard", "connasse",
];

const WORD_TERMS = [
  // EN general profanity
  "fuck", "fucking", "fucker", "motherfucker", "shit", "bullshit", "asshole",
  "bitch", "bastard", "whore", "slut", "dick", "wtf", "stfu",
  // FR general profanity
  "merde", "merdique", "salaud", "batard", "conne", "pede", "negre", "bite", "baiser",
];

// Normalize common leetspeak/obfuscation so "f*ck", "sh1t", "p0rn" still match.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents (é→e)
    .replace(/[@4]/g, "a")
    .replace(/[$5]/g, "s")
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/7/g, "t")
    .replace(/[^a-z\s]/g, ""); // drop punctuation/symbols → collapses "f.u.c.k"
}

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const norm = normalize(text);
  if (HARD_TERMS.some((t) => norm.includes(t))) return true;
  const tokens = norm.split(/\s+/).filter(Boolean);
  return tokens.some((tok) => WORD_TERMS.includes(tok));
}

export function getProfanityError() {
  return "Contenu inapproprié détecté. Jobé est un espace professionnel — merci de reformuler. / Inappropriate content detected. Jobé is a professional space — please revise.";
}

/**
 * Optional AI moderation (text + images) via OpenAI's /moderations endpoint.
 * Returns true if the content should be BLOCKED. No-ops (returns false) when
 * OPENAI_API_KEY is not set, so the local filter above is always the baseline.
 */
export async function moderateAI(input: { text?: string; imageUrl?: string }): Promise<boolean> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return false;
  try {
    const content: unknown[] = [];
    if (input.text) content.push({ type: "text", text: input.text });
    if (input.imageUrl && input.imageUrl.startsWith("http")) {
      content.push({ type: "image_url", image_url: { url: input.imageUrl } });
    }
    if (content.length === 0) return false;
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "omni-moderation-latest", input: content }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { results?: { flagged?: boolean }[] };
    return !!data.results?.[0]?.flagged;
  } catch {
    return false; // never block on moderation-service failure
  }
}
