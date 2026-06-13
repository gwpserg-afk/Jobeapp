import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // ─── Idempotency check ─────────────────────────────────────────────────────
  const existing = await prisma.user.findUnique({
    where: { email: "recruiter@orange.sn" },
  });
  if (existing) {
    console.log("Seed already ran (recruiter@orange.sn exists). Skipping.");
    return;
  }

  // ─── A. Recruiter user ─────────────────────────────────────────────────────
  console.log("Creating recruiter user...");
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const recruiter = await prisma.user.create({
    data: {
      id: "seed-recruiter-orange",
      name: "Aminata Diallo",
      email: "recruiter@orange.sn",
      emailVerified: true,
      accountType: "recruiter",
      isVerified: true,
      isGoldVerified: true,
    },
  });

  // Create Better Auth account record for email/password login
  await prisma.account.create({
    data: {
      id: "seed-account-orange",
      accountId: recruiter.id,
      providerId: "credential",
      userId: recruiter.id,
      password: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // ─── B. Company profile ────────────────────────────────────────────────────
  console.log("Creating Orange Sénégal company...");
  const company = await prisma.company.create({
    data: {
      userId: recruiter.id,
      companyName: "Orange Sénégal",
      logoUrl: "https://api.dicebear.com/7.x/initials/png?seed=OS&backgroundColor=FF6600&textColor=ffffff",
      bannerUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop",
      sector: "Télécommunications",
      description:
        "Leader des télécommunications au Sénégal. Nous recrutons des talents passionnés pour construire l'avenir numérique.",
      website: "https://www.orange.sn",
      isVerified: true,
      location: "Dakar, Sénégal",
      sizeRange: "200+",
      contactName: "Aminata Diallo",
    },
  });

  // ─── C. Team members ───────────────────────────────────────────────────────
  console.log("Creating team members...");
  await prisma.companyTeamMember.createMany({
    data: [
      {
        companyId: company.id,
        name: "Aminata Diallo",
        role: "DRH",
        photoUrl: "https://api.dicebear.com/7.x/personas/png?seed=Aminata_Diallo",
        isPinned: true,
        order: 1,
        linkedUserId: recruiter.id,
      },
      {
        companyId: company.id,
        name: "Pape Demba Fall",
        role: "Directeur Commercial",
        photoUrl: "https://api.dicebear.com/7.x/personas/png?seed=Pape_Demba_Fall",
        isPinned: true,
        order: 2,
      },
      {
        companyId: company.id,
        name: "Ndéye Sarr",
        role: "Responsable Marketing",
        photoUrl: "https://api.dicebear.com/7.x/personas/png?seed=Ndeye_Sarr",
        isPinned: true,
        order: 3,
      },
    ],
  });

  // ─── D. All job listings ───────────────────────────────────────────────────
  console.log("Creating job listings...");

  // Map workMode from demo values to DB enum values
  function mapWorkMode(w: string): string {
    if (w === "hybrid") return "hybride";
    if (w === "onsite") return "presentiel";
    if (w === "remote") return "teletravail";
    return "presentiel";
  }

  // Map contractType from demo values to DB enum values
  function mapContractType(c: string): string {
    const map: Record<string, string> = {
      CDI: "cdi",
      CDD: "cdd",
      Stage: "stage",
      Freelance: "freelance",
      Interim: "cdd",
      Temps_Partiel: "temps_partiel",
      FREELANCE: "freelance",
    };
    return map[c] ?? "cdd";
  }

  const jobDefs = [
    {
      title: "Chauffeur Livreur",
      contractType: "cdi",
      workMode: "presentiel",
      salaryMin: 150000,
      salaryMax: 200000,
      salaryNegotiable: false,
      isUrgent: false,
      description:
        "Nous recherchons un chauffeur livreur sérieux pour effectuer des livraisons quotidiennes sur Dakar et sa banlieue. Permis B obligatoire.",
      skills: ["Permis B", "Conduite"],
      viewCount: 54,
    },
    {
      title: "Agent de Sécurité",
      contractType: "cdi",
      workMode: "presentiel",
      salaryMin: 120000,
      salaryMax: 150000,
      salaryNegotiable: false,
      isUrgent: false,
      description:
        "Recrutement d'agents de sécurité pour nos sites à Dakar. Formation assurée à l'embauche.",
      skills: ["Sécurité", "Surveillance"],
      viewCount: 31,
    },
    {
      title: "Développeur Web Full-Stack",
      contractType: "cdi",
      workMode: "hybride",
      salaryMin: 500000,
      salaryMax: 800000,
      salaryNegotiable: false,
      isUrgent: false,
      description:
        "Rejoignez notre équipe tech pour développer et maintenir nos plateformes numériques. Stack technique : React, Node.js, PostgreSQL.",
      skills: ["React", "Node.js", "PostgreSQL"],
      viewCount: 198,
    },
    {
      title: "Technicien Informatique",
      contractType: "cdd",
      workMode: "presentiel",
      salaryMin: 180000,
      salaryMax: 250000,
      salaryNegotiable: false,
      isUrgent: true,
      description:
        "Support technique et maintenance des équipements informatiques de nos agences à travers Dakar.",
      skills: ["Réseaux", "Maintenance", "Windows"],
      viewCount: 47,
    },
    {
      title: "Menuisier Qualifié",
      contractType: "freelance",
      workMode: "presentiel",
      salaryMin: null,
      salaryMax: null,
      salaryNegotiable: true,
      isUrgent: false,
      description:
        "Recherche d'un menuisier pour des travaux d'agencement dans nos showrooms. Mission de 3 mois renouvelable.",
      skills: ["Menuiserie", "Ébénisterie"],
      viewCount: 22,
    },
    {
      title: "Comptable Sénior",
      contractType: "cdi",
      workMode: "presentiel",
      salaryMin: 400000,
      salaryMax: 600000,
      salaryNegotiable: false,
      isUrgent: false,
      description:
        "Poste de comptable sénior pour superviser la comptabilité générale et analytique. Expérience bancaire souhaitée.",
      skills: ["Comptabilité", "Sage", "Excel"],
      viewCount: 112,
    },
    {
      title: "Commercial Terrain",
      contractType: "cdi",
      workMode: "presentiel",
      salaryMin: 200000,
      salaryMax: null,
      salaryNegotiable: true,
      isUrgent: false,
      description:
        "Développement du portefeuille clients particuliers et entreprises. Véhicule de fonction fourni.",
      skills: ["Vente B2B", "Négociation", "CRM"],
      viewCount: 201,
    },
    {
      title: "Assistant(e) Administratif(ve)",
      contractType: "cdi",
      workMode: "presentiel",
      salaryMin: 150000,
      salaryMax: 200000,
      salaryNegotiable: false,
      isUrgent: false,
      description:
        "Gestion administrative, accueil, courriers et coordination des équipes. Maîtrise du français obligatoire.",
      skills: ["Administration", "Word", "Excel", "Accueil"],
      viewCount: 134,
    },
    {
      title: "Responsable Marketing Digital",
      contractType: "cdi",
      workMode: "hybride",
      salaryMin: 450000,
      salaryMax: 650000,
      salaryNegotiable: false,
      isUrgent: false,
      description:
        "Pilotage de la stratégie marketing digital d'Orange Sénégal. Gestion des réseaux sociaux, campagnes SEA/SEO et analyse des performances.",
      skills: ["Marketing Digital", "SEO", "Réseaux sociaux", "Analytics"],
      viewCount: 88,
    },
    {
      title: "Chargé de Clientèle",
      contractType: "cdi",
      workMode: "presentiel",
      salaryMin: 180000,
      salaryMax: 280000,
      salaryNegotiable: false,
      isUrgent: false,
      description:
        "Accueil et conseil clientèle dans nos agences Orange. Gestion des réclamations et fidélisation de la clientèle.",
      skills: ["Service client", "Vente", "Communication"],
      viewCount: 76,
    },
    {
      title: "Ingénieur Réseaux Télécoms",
      contractType: "cdi",
      workMode: "presentiel",
      salaryMin: 700000,
      salaryMax: 1000000,
      salaryNegotiable: false,
      isUrgent: false,
      description:
        "Conception, déploiement et maintenance des infrastructures réseau 4G/5G. Expérience en télécommunications mobile requise.",
      skills: ["Télécommunications", "Réseaux", "4G/5G", "Fibres optiques"],
      viewCount: 63,
    },
    {
      title: "Stagiaire RH",
      contractType: "stage",
      workMode: "presentiel",
      salaryMin: 80000,
      salaryMax: 120000,
      salaryNegotiable: false,
      isUrgent: false,
      description:
        "Stage de 6 mois au sein de notre Direction des Ressources Humaines. Participation au recrutement et à la gestion administrative du personnel.",
      skills: ["Ressources Humaines", "Recrutement", "Administration"],
      viewCount: 45,
    },
    {
      title: "Analyste Financier",
      contractType: "cdi",
      workMode: "presentiel",
      salaryMin: 550000,
      salaryMax: 750000,
      salaryNegotiable: false,
      isUrgent: false,
      description:
        "Analyse des performances financières, élaboration des budgets prévisionnels et reporting mensuel. Maîtrise d'Excel et des outils BI.",
      skills: ["Finance", "Excel", "Analyse financière", "BI"],
      viewCount: 57,
    },
    {
      title: "Technicien de Maintenance",
      contractType: "cdi",
      workMode: "presentiel",
      salaryMin: 200000,
      salaryMax: 300000,
      salaryNegotiable: false,
      isUrgent: true,
      description:
        "Maintenance préventive et curative des équipements électroniques et des installations techniques de nos sites.",
      skills: ["Électronique", "Maintenance", "Dépannage"],
      viewCount: 39,
    },
    {
      title: "Chef de Projet Digital",
      contractType: "cdi",
      workMode: "hybride",
      salaryMin: 600000,
      salaryMax: 900000,
      salaryNegotiable: false,
      isUrgent: false,
      description:
        "Pilotage de projets de transformation digitale. Coordination des équipes techniques et métiers. Expérience agile requise.",
      skills: ["Gestion de projet", "Agile", "Digital", "Communication"],
      viewCount: 94,
    },
  ];

  const createdJobs: { id: string; title: string }[] = [];

  for (const job of jobDefs) {
    const { skills, ...jobData } = job;
    const created = await prisma.jobListing.create({
      data: {
        ...jobData,
        companyId: company.id,
        locationCity: "Dakar",
        isActive: true,
        requiredSkills: {
          create: skills.map((s) => ({ skillName: s, isRequired: true })),
        },
      },
    });
    createdJobs.push({ id: created.id, title: created.title });
  }

  console.log(`Created ${createdJobs.length} job listings.`);

  // ─── E. Candidate users ────────────────────────────────────────────────────
  console.log("Creating candidate users...");

  const candidateDefs = [
    {
      userId: "seed-cand-mamadou-bah",
      email: "mamadou.bah@email.sn",
      name: "Mamadou Bah",
      fullName: "Mamadou Bah",
      headline: "Chauffeur Professionnel | Dakar, Sénégal",
      city: "Dakar",
      bio: "Chauffeur professionnel titulaire du permis B et C. 8 ans d'expérience en transport de personnes et en livraison.",
      avatarUrl: "https://api.dicebear.com/7.x/personas/png?seed=Mamadou_Bah",
      skills: [
        { skillName: "Conduite", skillLevel: "expert" },
        { skillName: "Logistique", skillLevel: "intermediate" },
        { skillName: "Permis B et C", skillLevel: "expert" },
      ],
    },
    {
      userId: "seed-cand-modou-gueye",
      email: "modou.gueye@email.sn",
      name: "Modou Gueye",
      fullName: "Modou Gueye",
      headline: "Agent de Sécurité | Dakar, Sénégal",
      city: "Dakar",
      bio: "Agent de sécurité certifié avec 7 ans d'expérience en entreprise et en événementiel. Sérieux et professionnel.",
      avatarUrl: "https://api.dicebear.com/7.x/personas/png?seed=Modou_Gueye",
      skills: [
        { skillName: "Surveillance", skillLevel: "expert" },
        { skillName: "Sécurité", skillLevel: "expert" },
        { skillName: "Gestion des risques", skillLevel: "intermediate" },
      ],
    },
    {
      userId: "seed-cand-lamine-konate",
      email: "lamine.konate@email.sn",
      name: "Lamine Konaté",
      fullName: "Lamine Konaté",
      headline: "Maçon Qualifié | Dakar, Sénégal",
      city: "Dakar",
      bio: "Maçon qualifié avec expérience en construction résidentielle et commerciale. Travail soigné et dans les délais.",
      avatarUrl: "https://api.dicebear.com/7.x/personas/png?seed=Lamine_Konate",
      skills: [
        { skillName: "Maçonnerie", skillLevel: "expert" },
        { skillName: "Construction", skillLevel: "expert" },
        { skillName: "Béton", skillLevel: "intermediate" },
      ],
    },
    {
      userId: "seed-cand-serigne-mboup",
      email: "serigne.mboup@email.sn",
      name: "Serigne Mboup",
      fullName: "Serigne Mboup",
      headline: "Plombier Certifié | Dakar, Sénégal",
      city: "Dakar",
      bio: "Plombier certifié, interventions rapides à domicile et en entreprise. Disponible 7 jours sur 7.",
      avatarUrl: "https://api.dicebear.com/7.x/personas/png?seed=Serigne_Mboup",
      skills: [
        { skillName: "Plomberie", skillLevel: "expert" },
        { skillName: "Sanitaire", skillLevel: "expert" },
        { skillName: "Dépannage", skillLevel: "intermediate" },
      ],
    },
    {
      userId: "seed-cand-boubacar-diallo",
      email: "boubacar.diallo@email.sn",
      name: "Boubacar Diallo",
      fullName: "Boubacar Diallo",
      headline: "Menuisier Qualifié | Dakar, Sénégal",
      city: "Dakar",
      bio: "Menuisier qualifié spécialisé en mobilier sur mesure et en agencement intérieur. Bois massif et dérivés.",
      avatarUrl: "https://api.dicebear.com/7.x/personas/png?seed=Boubacar_Diallo",
      skills: [
        { skillName: "Menuiserie", skillLevel: "expert" },
        { skillName: "Ébénisterie", skillLevel: "expert" },
        { skillName: "Fabrication", skillLevel: "intermediate" },
      ],
    },
    // Extra candidate for conversation 2 (Oumar Ndiaye)
    {
      userId: "seed-cand-oumar-ndiaye",
      email: "oumar.ndiaye@email.sn",
      name: "Oumar Ndiaye",
      fullName: "Oumar Ndiaye",
      headline: "Développeur Full-Stack | Dakar, Sénégal",
      city: "Dakar",
      bio: "Développeur full-stack avec 3 ans d'expérience dans la création d'applications web et mobiles. Ouvert aux opportunités à distance.",
      avatarUrl: "https://api.dicebear.com/7.x/personas/png?seed=Oumar_Ndiaye",
      skills: [
        { skillName: "React", skillLevel: "expert" },
        { skillName: "Node.js", skillLevel: "expert" },
        { skillName: "PostgreSQL", skillLevel: "intermediate" },
        { skillName: "JavaScript", skillLevel: "expert" },
      ],
    },
  ];

  const candidatePasswordHash = await bcrypt.hash("demo1234", 10);
  const createdCandidateProfiles: Record<string, string> = {}; // userId -> profileId

  for (const cand of candidateDefs) {
    const { userId, email, name, fullName, headline, city, bio, avatarUrl, skills } = cand;

    const user = await prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        emailVerified: true,
        accountType: "candidate",
        credits: 10,
      },
    });

    await prisma.account.create({
      data: {
        id: `account-${userId}`,
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: candidatePasswordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const profile = await prisma.candidateProfile.create({
      data: {
        userId: user.id,
        fullName,
        headline,
        city,
        bio,
        profilePhotoUrl: avatarUrl,
        availabilityStatus: "available",
        profileVisibility: "public",
        profileCompletePct: 70,
        skills: {
          create: skills.map((s) => ({
            skillName: s.skillName,
            skillLevel: s.skillLevel,
          })),
        },
      },
    });

    createdCandidateProfiles[userId] = profile.id;
  }

  console.log(`Created ${candidateDefs.length} candidate users.`);

  // ─── F. Applications for "Chauffeur Livreur" ──────────────────────────────
  console.log("Creating applications...");

  const chauffeurJob = createdJobs.find((j) =>
    j.title.toLowerCase().includes("chauffeur")
  );

  if (chauffeurJob) {
    const applicationDefs = [
      {
        candidateUserId: "seed-cand-mamadou-bah",
        status: "pending",
        coverMessage: "Bonjour, je suis très intéressé par le poste de Chauffeur Livreur. J'ai 8 ans d'expérience en conduite professionnelle et je possède les permis B et C.",
      },
      {
        candidateUserId: "seed-cand-modou-gueye",
        status: "pending",
        coverMessage: "Bonjour, je candidate pour le poste de Chauffeur Livreur. Je suis disponible immédiatement et je connais parfaitement les routes de Dakar.",
      },
      {
        candidateUserId: "seed-cand-lamine-konate",
        status: "viewed",
        coverMessage: "Je souhaite postuler pour le poste de Chauffeur Livreur. Permis B valide, bonne connaissance de la ville.",
      },
      {
        candidateUserId: "seed-cand-serigne-mboup",
        status: "interview",
        coverMessage: "Très motivé pour rejoindre Orange Sénégal en tant que Chauffeur Livreur. Sérieux, ponctuel et professionnel.",
      },
      {
        candidateUserId: "seed-cand-boubacar-diallo",
        status: "accepted",
        coverMessage: "Je postule avec enthousiasme pour le poste de Chauffeur Livreur. Je suis fiable, disponible et prêt à commencer immédiatement.",
      },
    ];

    for (const appDef of applicationDefs) {
      const profileId = createdCandidateProfiles[appDef.candidateUserId];
      if (profileId) {
        await prisma.application.create({
          data: {
            jobId: chauffeurJob.id,
            candidateId: profileId,
            status: appDef.status,
            coverMessage: appDef.coverMessage,
          },
        });
      }
    }
    console.log("Created 5 applications for Chauffeur Livreur.");
  }

  // ─── G. Demo conversations ─────────────────────────────────────────────────
  console.log("Creating demo conversations...");

  const now = Date.now();

  // Conversation 1: Recruiter ↔ Mamadou Bah
  const mamadouUser = await prisma.user.findUnique({
    where: { id: "seed-cand-mamadou-bah" },
  });
  if (mamadouUser) {
    const conv1Messages = [
      {
        senderId: recruiter.id,
        receiverId: mamadouUser.id,
        content: "Bonjour, votre profil nous a vraiment impressionnés. Êtes-vous disponible pour un entretien ?",
        isRead: true,
        sentAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      },
      {
        senderId: mamadouUser.id,
        receiverId: recruiter.id,
        content: "Merci beaucoup ! Oui, je suis disponible cette semaine.",
        isRead: true,
        sentAt: new Date(now - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      },
      {
        senderId: recruiter.id,
        receiverId: mamadouUser.id,
        content: "Parfait. Nous pouvons vous proposer mardi à 14h00 ?",
        isRead: true,
        sentAt: new Date(now - 24 * 60 * 60 * 1000),
      },
      {
        senderId: mamadouUser.id,
        receiverId: recruiter.id,
        content: "Mardi à 14h c'est parfait pour moi. Je serai là.",
        isRead: false,
        sentAt: new Date(now - 20 * 60 * 1000),
      },
    ];
    for (const msg of conv1Messages) {
      await prisma.message.create({ data: msg });
    }
  }

  // Conversation 2: Recruiter ↔ Oumar Ndiaye
  const oumarUser = await prisma.user.findUnique({
    where: { id: "seed-cand-oumar-ndiaye" },
  });
  if (oumarUser) {
    const conv2Messages = [
      {
        senderId: recruiter.id,
        receiverId: oumarUser.id,
        content: "Nous avons bien reçu votre candidature pour le poste de Développeur Full Stack.",
        isRead: true,
        sentAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      },
      {
        senderId: oumarUser.id,
        receiverId: recruiter.id,
        content: "Bonjour, merci de me contacter. Je suis très intéressé par ce poste.",
        isRead: true,
        sentAt: new Date(now - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      },
      {
        senderId: recruiter.id,
        receiverId: oumarUser.id,
        content: "Pouvez-vous nous envoyer votre portfolio ou des exemples de projets ?",
        isRead: false,
        sentAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      },
    ];
    for (const msg of conv2Messages) {
      await prisma.message.create({ data: msg });
    }
  }

  // Conversation 3: Recruiter ↔ Modou Gueye
  const modouUser = await prisma.user.findUnique({
    where: { id: "seed-cand-modou-gueye" },
  });
  if (modouUser) {
    const conv3Messages = [
      {
        senderId: modouUser.id,
        receiverId: recruiter.id,
        content: "Bonjour, je voulais me renseigner sur les horaires de travail pour le poste de Chauffeur Livreur.",
        isRead: true,
        sentAt: new Date(now - 24 * 60 * 60 * 1000),
      },
      {
        senderId: recruiter.id,
        receiverId: modouUser.id,
        content: "Les horaires sont de 7h à 16h, du lundi au samedi. Un véhicule de service est fourni.",
        isRead: true,
        sentAt: new Date(now - 23 * 60 * 60 * 1000),
      },
      {
        senderId: modouUser.id,
        receiverId: recruiter.id,
        content: "C'est tout à fait compatible avec mes disponibilités. Merci !",
        isRead: false,
        sentAt: new Date(now - 45 * 60 * 1000),
      },
    ];
    for (const msg of conv3Messages) {
      await prisma.message.create({ data: msg });
    }
  }

  console.log("Created 3 demo conversations.");

  // ─── H. Company posts ──────────────────────────────────────────────────────
  console.log("Creating company posts...");

  await prisma.post.createMany({
    data: [
      {
        userId: recruiter.id,
        content:
          "Orange Sénégal est fier d'annoncer le lancement de notre nouveau programme de formation digitale pour nos employés ! 🚀 #Innovation #DigitalSenegal",
        createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
      },
      {
        userId: recruiter.id,
        content:
          "Nous recrutons ! 15 postes ouverts dans nos différentes directions. Visitez notre profil pour plus de détails. #Emploi #Dakar",
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("Created 2 company posts.");
  console.log("\nSeed completed successfully!");
  console.log("  Recruiter: recruiter@orange.sn / demo1234");
  console.log(`  Company: Orange Sénégal (id: ${company.id})`);
  console.log(`  Jobs: ${createdJobs.length} listings`);
  console.log("  Candidates: 6 users with profiles");
  console.log("  Applications: 5 for Chauffeur Livreur");
  console.log("  Messages: 3 conversation threads");
  console.log("  Posts: 2 company posts");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
