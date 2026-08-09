import { Navigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { ConnectWalletButton } from "../components/ConnectWalletButton";
import { useCurrentUser } from "../hooks/useCurrentUser";

const FEATURES = [
  {
    title: "Prediction rounds",
    body: "Round-by-round up/down calls on live price, locked and closed by an on-chain Chainlink read — not a backend clock.",
  },
  {
    title: "Non-custodial staking",
    body: "Stake straight into the vault contract. Your funds sit in the contract, not a hot wallet, until you unstake them yourself.",
  },
  {
    title: "Referrals",
    body: "Register a referrer once, on-chain. Every time they win a prediction, a share of the house fee accrues to you automatically — claimable any time, paid directly from the contract.",
  },
];

export default function Home() {
  const { isConnected } = useAccount();
  const { data: me, isLoading } = useCurrentUser();

  // Already signed in? Skip the landing page entirely.
  if (!isLoading && me) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-base">
      <header className="flex items-center justify-between px-6 py-5">
        <span className="font-display text-lg font-semibold tracking-tight">
          Predictron
        </span>
        <ConnectWalletButton />
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-start gap-6 px-6 pb-20 pt-16">
        <span className="rounded-full border border-border px-3 py-1 font-mono text-xs uppercase tracking-widest text-text-muted">
          Settled entirely by smart contract
        </span>
        <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Predict price moves. Stake and earn. No backend ever holds your keys.
        </h1>
        <p className="max-w-xl text-text-muted">
          Every payout — a winning prediction, a staking reward, an unstake — is
          a transaction you sign yourself. Connect a wallet and sign in to get
          started; there&apos;s nothing else to fill out.
        </p>
        {!isConnected && (
          <div className="pt-2">
            <ConnectWalletButton />
          </div>
        )}
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-panel border border-border bg-panel p-6"
          >
            <h2 className="mb-2 font-display text-lg font-semibold">
              {f.title}
            </h2>
            <p className="text-sm text-text-muted">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
