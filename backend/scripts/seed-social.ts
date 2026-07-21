/**
 * Seed genuine sample content so the feed looks alive for the cofounder demo.
 * Honest pre-launch content — entrepreneurs in Dakar. No fabricated stats/claims.
 * Idempotent: bails if the seed users already exist.
 * Run: bun scripts/seed-social.ts
 */
import { randomUUID } from "crypto";
import { prisma } from "../src/prisma";

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000);

const USERS = [
  { username: "awa_ndiaye", name: "Awa Ndiaye", accountType: "candidate", isVerified: true,
    bio: "Fondatrice de Teranga Cosmetics 🌿 · Beauté naturelle made in Sénégal" },
  { username: "moussa_ba", name: "Moussa Ba", accountType: "candidate", isVerified: false,
    bio: "Dev & co-fondateur d'une startup fintech à Dakar 💳 · On code pour l'Afrique" },
  { username: "fatou_sarr", name: "Fatou Sarr", accountType: "recruiter", isVerified: true,
    bio: "Je connecte les artisans de Dakar au monde 🧵 · E-commerce" },
  { username: "cheikh_diop", name: "Cheikh Diop", accountType: "candidate", isVerified: false,
    bio: "Agritech · On aide les producteurs sénégalais à mieux vendre 🌾" },
  { username: "sokhna_mbaye", name: "Sokhna Mbaye", accountType: "recruiter", isVerified: true,
    bio: "Coach business & mentor pour jeunes entrepreneurs 🚀 · Dakar" },
];

const POSTS: { by: string; content: string; h: number }[] = [
  { by: "awa_ndiaye", h: 2, content: "Premier lot de nos savons naturels prêt à partir 🌿 Six mois de travail… et on y est enfin. Merci à toute l'équipe 🙏" },
  { by: "moussa_ba", h: 4, content: "Question aux devs de Dakar : vous codez plutôt tôt le matin ou tard le soir ? Moi c'est 5h, avant que la ville se réveille ☕️" },
  { by: "sokhna_mbaye", h: 6, content: "Rappel du jour pour les jeunes entrepreneurs : votre premier client ne viendra pas d'une pub. Il viendra d'une relation. Sortez, parlez aux gens." },
  { by: "fatou_sarr", h: 9, content: "On vient d'expédier nos premiers colis de tissus artisanaux vers l'Europe 📦 Fière de porter le savoir-faire sénégalais plus loin." },
  { by: "cheikh_diop", h: 12, content: "Sur le terrain à Thiès aujourd'hui avec des producteurs de mangues. Le potentiel est énorme — il manque juste les bons outils pour vendre." },
  { by: "moussa_ba", h: 20, content: "On cherche un(e) designer produit passionné(e) pour rejoindre l'aventure. B2B/B2C, on construit pour les commerçants du Sénégal. DM ouverts 👇" },
  { by: "awa_ndiaye", h: 28, content: "Petit conseil : ne pas attendre que le produit soit 'parfait'. Mon premier savon était moche 😅 mais les retours clients ont tout changé." },
  { by: "sokhna_mbaye", h: 34, content: "Aujourd'hui j'ai mentoré 3 fondateurs. Le point commun de ceux qui réussissent ? Ils exécutent vite et écoutent leurs clients. C'est tout." },
  { by: "cheikh_diop", h: 46, content: "Objectif de la semaine : connecter 10 producteurs à leurs premiers acheteurs en ligne. On avance pas à pas 🌾" },
  { by: "fatou_sarr", h: 54, content: "Cherche des artisans (cuir, wax, bijoux) à Dakar qui veulent vendre en ligne. Je m'occupe de la boutique, vous du talent. Écrivez-moi 🤝" },
];

// (commenterUsername, postIndex, text)
const COMMENTS: [string, number, string][] = [
  ["sokhna_mbaye", 0, "Bravo Awa 👏 la patience paie toujours."],
  ["moussa_ba", 0, "Félicitations ! Où peut-on commander ?"],
  ["cheikh_diop", 2, "Tellement vrai. Le terrain avant la pub 💯"],
  ["awa_ndiaye", 5, "Intéressant, je partage à mon réseau 🙌"],
  ["fatou_sarr", 7, "Merci pour le rappel Sokhna 🙏"],
];

// (likerUsername, postIndex)
const LIKES: [string, number][] = [
  ["moussa_ba", 0], ["sokhna_mbaye", 0], ["fatou_sarr", 0], ["cheikh_diop", 0],
  ["awa_ndiaye", 1], ["sokhna_mbaye", 1],
  ["moussa_ba", 2], ["awa_ndiaye", 2], ["fatou_sarr", 2], ["cheikh_diop", 2],
  ["awa_ndiaye", 3], ["sokhna_mbaye", 3],
  ["moussa_ba", 4],
  ["sokhna_mbaye", 5], ["awa_ndiaye", 5],
  ["moussa_ba", 7], ["fatou_sarr", 7], ["cheikh_diop", 7],
];

// followerUsername follows followingUsername
const FOLLOWS: [string, string][] = [
  ["moussa_ba", "awa_ndiaye"], ["fatou_sarr", "awa_ndiaye"], ["cheikh_diop", "awa_ndiaye"], ["sokhna_mbaye", "awa_ndiaye"],
  ["awa_ndiaye", "sokhna_mbaye"], ["moussa_ba", "sokhna_mbaye"], ["cheikh_diop", "sokhna_mbaye"],
  ["awa_ndiaye", "moussa_ba"], ["fatou_sarr", "moussa_ba"],
  ["moussa_ba", "fatou_sarr"], ["awa_ndiaye", "fatou_sarr"],
];

async function main() {
  const exists = await prisma.user.findFirst({ where: { username: "awa_ndiaye" } });
  if (exists) {
    console.log("Seed users already exist — skipping (idempotent).");
    return;
  }

  const idByUsername: Record<string, string> = {};
  for (const u of USERS) {
    const id = randomUUID();
    idByUsername[u.username] = id;
    await prisma.user.create({
      data: {
        id, name: u.name, username: u.username, bio: u.bio,
        email: `${u.username}@jobe.seed`, emailVerified: true,
        accountType: u.accountType, isVerified: u.isVerified,
        createdAt: hoursAgo(72), updatedAt: hoursAgo(72),
      },
    });
  }
  console.log(`Created ${USERS.length} users.`);

  const postIds: string[] = [];
  for (const p of POSTS) {
    const post = await prisma.post.create({
      data: { userId: idByUsername[p.by], content: p.content, createdAt: hoursAgo(p.h), updatedAt: hoursAgo(p.h) },
    });
    postIds.push(post.id);
  }
  console.log(`Created ${POSTS.length} posts.`);

  for (const [u, i] of LIKES) {
    await prisma.postLike.create({ data: { userId: idByUsername[u], postId: postIds[i] } }).catch(() => {});
  }
  for (const [u, i, text] of COMMENTS) {
    await prisma.postComment.create({ data: { userId: idByUsername[u], postId: postIds[i], content: text } });
  }
  for (const [a, b] of FOLLOWS) {
    await prisma.follow.create({ data: { followerId: idByUsername[a], followingId: idByUsername[b] } }).catch(() => {});
  }
  console.log(`Created ${LIKES.length} likes, ${COMMENTS.length} comments, ${FOLLOWS.length} follows.`);
  console.log("✅ Seed complete.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
