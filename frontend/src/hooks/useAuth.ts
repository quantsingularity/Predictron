import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import { api } from "../lib/api";
import { useCurrentUser } from "./useCurrentUser";

/// The entire login flow, end to end:
/// 1. Ask the backend for a nonce tied to the connected address.
/// 2. Build a standard SIWE message and ask the wallet to sign it.
/// MetaMask/WalletConnect show the human-readable message, the user
/// approves, and the private key never leaves the wallet extension/app.
/// 3. Send the signed message to the backend, which verifies the
/// signature and sets an httpOnly session cookie scoped to this
/// backend's own data, it cannot authorize any on-chain action, and
/// the frontend never sees the token itself, only a plain "signed in
/// as this address" confirmation.
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
        // The cookie is already set by the browser from the response's
        // Set-Cookie header, nothing for this code to store. Refetch
        // "who am I" so every consumer of useCurrentUser picks up the
        // new session, then navigate without a full page reload.
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
