import { create } from "zustand";

export type Lang = "fr" | "en" | "zh";

const t = {
  fr: {
    // welcome
    tagline: "Éducation · Travail · Réussite",
    hero: "Votre carrière\ncommence ici",
    sub: "La plateforme emploi de l'Afrique de l'Ouest",
    candidate: "Je cherche du travail",
    recruiter: "Je recrute",
    login: "Déjà un compte ?",
    signin: "Se connecter",
    // tabs
    feed: "Accueil",
    jobs: "Emplois",
    messages: "Messages",
    profile: "Profil",
    // feed
    greeting: "Bonjour",
    available: "offres disponibles",
    search: "Titre, entreprise, lieu...",
    aiMatch: "emplois pour vous",
    aiSub: "Basé sur votre profil",
    see: "Voir",
    feedSection: "Fil · Sénégal",
    // jobs filters
    all: "Tous",
    permanent: "CDI",
    fixedTerm: "CDD",
    internship: "Stage",
    remote: "Télétravail",
    // profile
    editProfile: "Modifier le profil",
    experience: "Expériences & Diplômes",
    identity: "Vérification d'identité",
    premium: "Passer Premium",
    notifications: "Notifications",
    language: "Langue",
    security: "Sécurité",
    darkMode: "Mode sombre",
    lightMode: "Mode clair",
    profileComplete: "Profil complété à",
    cvHint: "Ajoutez votre CV pour augmenter vos chances",
    logout: "Se déconnecter",
    yourName: "Votre nom",
    views: "Vues",
    applications: "Candidatures",
    connections: "Connexions",
    // messages
    newMessage: "+",
    // auth
    emailPlaceholder: "votre@email.com",
    namePlaceholder: "Votre nom complet",
    passwordPlaceholder: "Mot de passe",
    sendCode: "Envoyer le code",
    verifyCode: "Vérifier",
    createAccount: "Créer un compte",
    iAmCandidate: "Je cherche un emploi",
    iAmRecruiter: "Je recrute",
    otpSent: "Code envoyé à",
    enterOtp: "Entrez le code à 6 chiffres",
  },
  en: {
    // welcome
    tagline: "Education · Work · Success",
    hero: "Your career\nstarts here",
    sub: "West Africa's leading job platform",
    candidate: "I'm looking for work",
    recruiter: "I'm hiring",
    login: "Already have an account?",
    signin: "Sign in",
    // tabs
    feed: "Feed",
    jobs: "Jobs",
    messages: "Messages",
    profile: "Profile",
    // feed
    greeting: "Hello",
    available: "jobs available",
    search: "Title, company, location...",
    aiMatch: "jobs for you",
    aiSub: "Based on your profile",
    see: "View",
    feedSection: "Feed · Senegal",
    // jobs filters
    all: "All",
    permanent: "Permanent",
    fixedTerm: "Fixed-term",
    internship: "Internship",
    remote: "Remote",
    // profile
    editProfile: "Edit profile",
    experience: "Experience & Education",
    identity: "Identity verification",
    premium: "Go Premium",
    notifications: "Notifications",
    language: "Language",
    security: "Security",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    profileComplete: "Profile completed at",
    cvHint: "Add your CV to boost your chances",
    logout: "Sign out",
    yourName: "Your name",
    views: "Views",
    applications: "Applications",
    connections: "Connections",
    // messages
    newMessage: "+",
    // auth
    emailPlaceholder: "your@email.com",
    namePlaceholder: "Your full name",
    passwordPlaceholder: "Password",
    sendCode: "Send code",
    verifyCode: "Verify",
    createAccount: "Create account",
    iAmCandidate: "I'm looking for a job",
    iAmRecruiter: "I'm hiring",
    otpSent: "Code sent to",
    enterOtp: "Enter the 6-digit code",
  },
  zh: {
    // welcome
    tagline: "教育 · 工作 · 成功",
    hero: "您的职业生涯\n从这里开始",
    sub: "西非领先的求职平台",
    candidate: "我在找工作",
    recruiter: "我在招聘",
    login: "已有账号？",
    signin: "登录",
    // tabs
    feed: "动态",
    jobs: "职位",
    messages: "消息",
    profile: "个人",
    // feed
    greeting: "你好",
    available: "个职位",
    search: "职位、公司、地点...",
    aiMatch: "个推荐职位",
    aiSub: "基于您的资料",
    see: "查看",
    feedSection: "动态 · 塞内加尔",
    // jobs filters
    all: "全部",
    permanent: "正式",
    fixedTerm: "合同",
    internship: "实习",
    remote: "远程",
    // profile
    editProfile: "编辑资料",
    experience: "经历与教育",
    identity: "身份验证",
    premium: "升级高级版",
    notifications: "通知",
    language: "语言",
    security: "安全",
    darkMode: "深色模式",
    lightMode: "浅色模式",
    profileComplete: "资料完成度",
    cvHint: "添加简历以提高机会",
    logout: "退出登录",
    yourName: "您的姓名",
    views: "浏览",
    applications: "申请",
    connections: "联系",
    // messages
    newMessage: "+",
    // auth
    emailPlaceholder: "您的邮箱",
    namePlaceholder: "您的全名",
    passwordPlaceholder: "密码",
    sendCode: "发送验证码",
    verifyCode: "验证",
    createAccount: "创建账户",
    iAmCandidate: "我在找工作",
    iAmRecruiter: "我在招聘",
    otpSent: "验证码已发送至",
    enterOtp: "输入6位验证码",
  },
};

interface I18nStore {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: typeof t.fr;
}

export const useI18n = create<I18nStore>((set) => ({
  lang: "fr",
  t: t.fr,
  setLang: (lang) => set({ lang, t: t[lang] }),
}));
