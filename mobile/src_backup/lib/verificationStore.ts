import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type VerificationStatus = "none" | "pending" | "verified";

interface VerificationState {
  status: VerificationStatus;
  submittedAt: string | null;
  setStatus: (status: VerificationStatus) => void;
  submit: () => void;
  // Demo: manually mark as verified
  markVerified: () => void;
}

export const useVerificationStore = create<VerificationState>()(
  persist(
    (set) => ({
      status: "none",
      submittedAt: null,
      setStatus: (status) => set({ status }),
      submit: () => set({ status: "pending", submittedAt: new Date().toISOString() }),
      markVerified: () => set({ status: "verified" }),
    }),
    {
      name: "verification-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
