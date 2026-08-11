import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface CurrentUser {
  id: string;
  address: string;
  role: "USER" | "ADMIN";
  referralCode: string;
}

/// Single shared "who is signed in" query, backs RequireAuth and Admin.
/// A 401 means "not signed in", not an error to retry.
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
