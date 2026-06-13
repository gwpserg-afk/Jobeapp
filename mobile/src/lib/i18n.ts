import { create } from "zustand";

export type Lang = "fr" | "en" | "zh";

const t = {
  fr: {
    tagline: "Éducation · Travail · Réussite",
    hero: "Votre carrière\ncommence ici",
    sub: "La plateforme emploi de l'Afrique de l'Ouest",
    candidate: "Je cherche du travail",
    recruiter: "Je recrute",
    login: "Déjà un compte ?",
    signin: "Se connecter",
    greeting: "Bonjour",
    feed: "Fil d'actualité",
    jobs: "Emplois",
    messages: "Messages",
    profile: "Profil",
    available: "offres disponibles",
    search: "Titre, entreprise, lieu...",
    aiMatch: "emplois pour vous",
    aiSub: "Basé sur votre profil",
    see: "Voir",
  },
  en: {
    tagline: "Education · Work · Success",
    hero: "Your career\nstarts here",
    sub: "West Africa's leading job platform",
    candidate: "I'm looking for work",
    recruiter: "I'm hiring",
    login: "Already have an account?",
    signin: "Sign in",
    greeting: "Hello",
    feed: "Feed",
    jobs: "Jobs",
    messages: "Messages",
    profile: "Profile",
    available: "jobs available",
    search: "Title, company, location...",
    aiMatch: "jobs for you",
    aiSub: "Based on your profile",
    see: "View",
  },
  zh: {
    tagline: "教育 · 工作 · 成功",
    hero: "您的职业生涯\n从这里开始",
    sub: "西非领先的求职平台",
    candidate: "我在找工作",
    recruiter: "我在招聘",
    login: "已有账号？",
    signin: "登录",
    greeting: "你好",
    feed: "动态",
    jobs: "职位",
    messages: "消息",
    profile: "个人",
    available: "个职位",
    search: "职位、公司、地点...",
    aiMatch: "个推荐职位",
    aiSub: "基于您的资料",
    see: "查看",
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
