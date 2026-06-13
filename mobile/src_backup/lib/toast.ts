import { create } from "zustand";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastStore {
  toasts: Toast[];
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  showToast: (message, type = "success") => {
    const id = `toast-${Date.now()}`;
    set({ toasts: [...get().toasts, { id, message, type }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 2500);
  },
  removeToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
  useToastStore.getState().showToast(message, type);
};
