import { create } from "zustand";

export interface PendingSignup {
  username: string;
  name: string;
  phone: string;
  email: string; // optional from user; derived from phone if empty
  password: string;
  accountType: "candidate" | "recruiter";
}

interface PendingStore {
  data: PendingSignup | null;
  set: (d: PendingSignup) => void;
  clear: () => void;
}

export const usePendingSignup = create<PendingStore>((set) => ({
  data: null,
  set: (d) => set({ data: d }),
  clear: () => set({ data: null }),
}));

// Phone-first accounts: Better Auth needs an email identifier. When the user gives
// no email we derive a deterministic placeholder from the phone digits. Real
// phone-number login replaces this once SMS verification is wired.
export function deriveEmailFromPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@phone.jobe.app`;
}
