import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface CurrentUser {
  id: string;
  address: string;
  role: "USER" | "ADMIN";
  referralCode: string;
}

/// A single shared query for "who is signed in" — backs both RequireAuth
/// (redirect to the homepage if this comes back empty) and the Admin page
/// (show admin data only if role === 'ADMIN'), so there's one source of
/// truth instead of two components independently deciding who's logged in.
///
/// There's no local token to check before firing this request — the
/// session lives in an httpOnly cookie the frontend can't read — so this
/// always asks the backend, and a 401 (no cookie, or an expired/invalid
/// one) is simply "not signed in", not an error to retry.
export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get<{ data: CurrentUser }>("/api/auth/me");
      return data.data;
    },
    retry: false,
    staleTime: 60_000,
  });
}
