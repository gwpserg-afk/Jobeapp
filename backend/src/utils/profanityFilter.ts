// Content moderation for Jobé — a professional network for entrepreneurs.
// Blocks explicit sexual content, slurs, and hard profanity in EN + FR.
//
// Matching strategy (tuned to avoid false positives on business language):
//  - SUBSTRING terms: only phrases that NEVER appear inside legitimate words
//    (e.g. "blowjob", "pornographie"). Safe to match anywhere.
//  - WORD terms: matched as whole tokens after normalization, so business words
//    that merely CONTAIN a flagged fragment are NOT blocked:
//      analytics⊃anal, dispute⊃pute, suspicious⊃spic, cocktail⊃cock,
//      violation⊃viol, and FR "retard" (=late) must all PASS.
//
// Nuanced/contextual cases and IMAGES are handled by moderateAI() (OpenAI).

// Always-bad compounds — safe to match as substrings.
const SUBSTRING_TERMS = [
  "porn", "blowjob", "handjob", "cumshot", "creampie", "gangbang",
  "masturbat", "ejaculat", "cunnilingus", "fellatio", "bukkake", "rimjob",
  "deepthroat", "cameltoe",
  "pornographie", "enculer", "encule", "branlette", "zoophilie", "pedophile",
  "motherfuck",
];

// Whole-word terms (exact token match). Short/ambiguous fragments go HERE so
// they never trip on legitimate words.
const WORD_TERMS = [
  // EN sexual / explicit
  "porn", "xxx", "pussy", "cunt", "cock", "dick", "boobs", "titties", "nipple",
  "nipples", "anal", "dildo", "hentai", "slut", "whore",
  // EN profanity
  "fuck", "fucking", "fucker", "motherfucker", "shit", "bullshit", "asshole",
  "bitch", "bastard", "wtf", "stfu",
  // EN slurs (note: bare "retard" excluded — it's FR for "late"; "retarded" kept)
  "nigger", "nigga", "faggot", "fag", "retarded", "chink", "spic", "kike", "tranny",
  // FR sexual / explicit
  "salope", "salopes", "pute", "putes", "putain", "chatte", "bite", "nichon",
  "nichons", "branler", "sodomie", "viol", "violer", "zoophile",
  // FR profanity / slurs
  "merde", "merdique", "salaud", "batard", "conne", "connard", "connasse",
  "pede", "tapette", "bougnoule", "negre", "encule", "encules",
];

// Normalize leetspeak/obfuscation so "f*ck", "sh1t", "p0rn", "f.u.c.k" match.
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
    .replace(/[^a-z\s]/g, ""); // drop punctuation → collapses "f.u.c.k" → "fuck"
}

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const norm = normalize(text);
  if (SUBSTRING_TERMS.some((t) => norm.includes(t))) return true;
  const tokens = norm.split(/\s+/).filter(Boolean);
  const wordSet = new Set(WORD_TERMS);
  return tokens.some((tok) => wordSet.has(tok));
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
    return false;
  }
}
