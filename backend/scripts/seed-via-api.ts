/**
 * Seed the HOSTED backend with sample content via its public API.
 * No DB access needed — signs up users, posts, likes, comments, follows over HTTP.
 * Usage: bun scripts/seed-via-api.ts https://jobe-backend-xxxx.onrender.com
 */
const BASE = process.argv[2];
if (!BASE) { console.error("Pass the backend URL as arg."); process.exit(1); }

const USERS = [
  { username: "awa_ndiaye", name: "Awa Ndiaye", accountType: "candidate", bio: "Fondatrice de Teranga Cosmetics 🌿 · Beauté naturelle made in Sénégal" },
  { username: "moussa_ba", name: "Moussa Ba", accountType: "candidate", bio: "Dev & co-fondateur d'une startup fintech à Dakar 💳 · On code pour l'Afrique" },
  { username: "fatou_sarr", name: "Fatou Sarr", accountType: "recruiter", bio: "Je connecte les artisans de Dakar au monde 🧵 · E-commerce" },
  { username: "cheikh_diop", name: "Cheikh Diop", accountType: "candidate", bio: "Agritech · On aide les producteurs sénégalais à mieux vendre 🌾" },
  { username: "sokhna_mbaye", name: "Sokhna Mbaye", accountType: "recruiter", bio: "Coach business & mentor pour jeunes entrepreneurs 🚀 · Dakar" },
];

const POSTS: { by: string; content: string }[] = [
  { by: "awa_ndiaye", content: "Premier lot de nos savons naturels prêt à partir 🌿 Six mois de travail… et on y est enfin. Merci à toute l'équipe 🙏" },
  { by: "moussa_ba", content: "Question aux devs de Dakar : vous codez plutôt tôt le matin ou tard le soir ? Moi c'est 5h, avant que la ville se réveille ☕️" },
  { by: "sokhna_mbaye", content: "Rappel du jour pour les jeunes entrepreneurs : votre premier client ne viendra pas d'une pub. Il viendra d'une relation. Sortez, parlez aux gens." },
  { by: "fatou_sarr", content: "On vient d'expédier nos premiers colis de tissus artisanaux vers l'Europe 📦 Fière de porter le savoir-faire sénégalais plus loin." },
  { by: "cheikh_diop", content: "Sur le terrain à Thiès aujourd'hui avec des producteurs de mangues. Le potentiel est énorme — il manque juste les bons outils pour vendre." },
  { by: "moussa_ba", content: "On cherche un(e) designer produit passionné(e) pour rejoindre l'aventure. B2B/B2C, on construit pour les commerçants du Sénégal. DM ouverts 👇" },
  { by: "awa_ndiaye", content: "Petit conseil : ne pas attendre que le produit soit 'parfait'. Mon premier savon était moche 😅 mais les retours clients ont tout changé." },
  { by: "sokhna_mbaye", content: "Aujourd'hui j'ai mentoré 3 fondateurs. Le point commun de ceux qui réussissent ? Ils exécutent vite et écoutent leurs clients. C'est tout." },
  { by: "cheikh_diop", content: "Objectif de la semaine : connecter 10 producteurs à leurs premiers acheteurs en ligne. On avance pas à pas 🌾" },
  { by: "fatou_sarr", content: "Cherche des artisans (cuir, wax, bijoux) à Dakar qui veulent vendre en ligne. Je m'occupe de la boutique, vous du talent. Écrivez-moi 🤝" },
];

const COMMENTS: [string, number, string][] = [
  ["sokhna_mbaye", 0, "Bravo Awa 👏 la patience paie toujours."],
  ["moussa_ba", 0, "Félicitations ! Où peut-on commander ?"],
  ["cheikh_diop", 2, "Tellement vrai. Le terrain avant la pub 💯"],
  ["awa_ndiaye", 5, "Intéressant, je partage à mon réseau 🙌"],
  ["fatou_sarr", 7, "Merci pour le rappel Sokhna 🙏"],
];
const LIKES: [string, number][] = [
  ["moussa_ba",0],["sokhna_mbaye",0],["fatou_sarr",0],["cheikh_diop",0],["awa_ndiaye",1],["sokhna_mbaye",1],
  ["moussa_ba",2],["awa_ndiaye",2],["fatou_sarr",2],["cheikh_diop",2],["awa_ndiaye",3],["sokhna_mbaye",3],
  ["moussa_ba",4],["sokhna_mbaye",5],["awa_ndiaye",5],["moussa_ba",7],["fatou_sarr",7],["cheikh_diop",7],
];
const FOLLOWS: [string, string][] = [
  ["moussa_ba","awa_ndiaye"],["fatou_sarr","awa_ndiaye"],["cheikh_diop","awa_ndiaye"],["sokhna_mbaye","awa_ndiaye"],
  ["awa_ndiaye","sokhna_mbaye"],["moussa_ba","sokhna_mbaye"],["cheikh_diop","sokhna_mbaye"],
  ["awa_ndiaye","moussa_ba"],["fatou_sarr","moussa_ba"],["moussa_ba","fatou_sarr"],["awa_ndiaye","fatou_sarr"],
];

const cookieOf: Record<string, string> = {};
const idOf: Record<string, string> = {};

function cookieFrom(res: Response) {
  const sc = res.headers.get("set-cookie") ?? "";
  return sc.split(",").map((c) => c.split(";")[0].trim()).filter((c) => c.includes("=")).join("; ");
}
async function req(path: string, opts: { method?: string; body?: unknown; cookie?: string } = {}) {
  return fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers: { "Content-Type": "application/json", ...(opts.cookie ? { Cookie: opts.cookie } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

async function main() {
  const stamp = Date.now().toString().slice(-5);
  for (const u of USERS) {
    const res = await req("/api/auth/sign-up/email", {
      method: "POST",
      body: { name: u.name, username: u.username, email: `${u.username}.${stamp}@jobe.seed`, password: "Passw0rd!23", accountType: u.accountType, bio: u.bio },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { console.log(`signup ${u.username} → ${res.status}`, JSON.stringify(body).slice(0, 120)); continue; }
    cookieOf[u.username] = cookieFrom(res);
    idOf[u.username] = body?.user?.id;
    console.log(`✓ user ${u.username}`);
  }

  const postIds: string[] = [];
  for (const p of POSTS) {
    const res = await req("/api/posts", { method: "POST", cookie: cookieOf[p.by], body: { content: p.content } });
    const body = await res.json().catch(() => ({}));
    postIds.push(body?.data?.id ?? body?.id ?? "");
  }
  console.log(`✓ ${postIds.filter(Boolean).length} posts`);

  let likes = 0;
  for (const [u, i] of LIKES) { const r = await req(`/api/posts/${postIds[i]}/like`, { method: "POST", cookie: cookieOf[u], body: {} }); if (r.ok) likes++; }
  let comments = 0;
  for (const [u, i, text] of COMMENTS) { const r = await req(`/api/posts/${postIds[i]}/comments`, { method: "POST", cookie: cookieOf[u], body: { content: text } }); if (r.ok) comments++; }
  let follows = 0;
  for (const [a, b] of FOLLOWS) { const r = await req(`/api/follow/${idOf[b]}`, { method: "POST", cookie: cookieOf[a], body: {} }); if (r.ok) follows++; }
  console.log(`✓ ${likes} likes, ${comments} comments, ${follows} follows`);
  console.log("✅ Seed complete via API.");
}
main();
