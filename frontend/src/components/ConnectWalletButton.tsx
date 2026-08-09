import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useAuth } from "../hooks/useAuth";

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { isAuthenticated, isSigningIn, signIn, signOut, error } = useAuth();

  if (!isConnected) {
    return (
      <div className="flex gap-2">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            className="rounded-panel bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dim transition-colors"
          >
            Connect {connector.name}
          </button>
        ))}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-text-muted">
          {shortAddress(address!)}
        </span>
        <button
          onClick={() => signIn()}
          disabled={isSigningIn}
          className="rounded-panel bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dim transition-colors disabled:opacity-50"
        >
          {isSigningIn ? "Check your wallet…" : "Sign in"}
        </button>
        {error && <span className="text-sm text-down">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-sm text-text-muted">
        {shortAddress(address!)}
      </span>
      <button
        onClick={() => {
          void signOut().then(() => disconnect());
        }}
        className="rounded-panel border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
