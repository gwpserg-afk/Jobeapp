import { create } from "zustand";

type Lang = "fr" | "en" | "zh";

interface AppStore {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  lang: "fr",
  setLang: (lang) => set({ lang }),
}));
