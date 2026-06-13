// Simple profanity filter with common offensive words
const BLOCKED_WORDS = [
  "fuck", "shit", "asshole", "bitch", "cunt", "dick", "pussy", "cock",
  "bastard", "motherfucker", "faggot", "nigger", "nigga", "retard",
  "whore", "slut", "damn", "hell", "ass", "piss", "crap",
  "wtf", "stfu", "fck", "sh1t", "b1tch", "a$$", "fuk"
];

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = lower.split(/\s+/);
  return words.some(word => BLOCKED_WORDS.includes(word));
}

export function getProfanityError() {
  return "Your message contains inappropriate language. Please revise and try again.";
}
