import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import { api } from "../lib/api";
import { useCurrentUser } from "./useCurrentUser";

/// The login flow: request a nonce, sign a SIWE message with the wallet,
/// then send it to the backend, which sets an httpOnly session cookie.
export function useAuth() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = Boolean(currentUser);

  const signIn = useCallback(
    async (referralCode?: string) => {
      if (!address || !chainId) {
        setError("Connect a wallet first");
        return;
      }
      setIsSigningIn(true);
      setError(null);
      try {
        const { data: nonceRes } = await api.post("/api/auth/nonce", {
          address,
        });

        const siweMessage = new SiweMessage({
          domain: window.location.host,
          address,
          statement:
            "Sign in to Predictron. This request will not trigger a blockchain transaction or cost any gas.",
          uri: window.location.origin,
          version: "1",
          chainId,
          nonce: nonceRes.nonce,
        });
        const message = siweMessage.prepareMessage();
        const signature = await signMessageAsync({ message });

        await api.post("/api/auth/verify", {
          message,
          signature,
          referralCode,
        });
        // Refetch "who am I" so useCurrentUser picks up the new session.
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        navigate("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign-in failed");
        throw err;
      } finally {
        setIsSigningIn(false);
      }
    },
    [address, chainId, signMessageAsync, queryClient, navigate],
  );

  const signOut = useCallback(async () => {
    await api.post("/api/auth/logout");
    queryClient.setQueryData(["me"], null);
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    navigate("/");
  }, [queryClient, navigate]);

  return {
    isAuthenticated,
    isLoadingUser,
    isSigningIn,
    error,
    signIn,
    signOut,
  };
}
