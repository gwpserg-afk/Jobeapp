import { useQuery } from "@tanstack/react-query";
import { api } from "../api/api";
import type { UserMe, CandidateProfile } from "@/types";

export const USER_ME_QUERY_KEY = ["user-me"] as const;
export const USER_PROFILE_QUERY_KEY = ["user-profile"] as const;

/**
 * Fetches the current user's basic info from /api/me
 */
export function useUserMe() {
  return useQuery({
    queryKey: USER_ME_QUERY_KEY,
    queryFn: () => api.get<UserMe>("/api/me"),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetches the current user's candidate profile from /api/profile
 * This includes the headline (professional title), bio, skills, etc.
 */
export function useUserProfile() {
  return useQuery({
    queryKey: USER_PROFILE_QUERY_KEY,
    queryFn: () => api.get<CandidateProfile>("/api/profile"),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Combined hook to get both user basic info and profile.
 * Useful for screens that need both the user name and professional title.
 */
export function useUserWithProfile() {
  const userQuery = useUserMe();
  const profileQuery = useUserProfile();

  return {
    user: userQuery.data,
    profile: profileQuery.data,
    isLoading: userQuery.isLoading || profileQuery.isLoading,
    isError: userQuery.isError || profileQuery.isError,
    refetch: async () => {
      await userQuery.refetch();
      await profileQuery.refetch();
    },
  };
}
