import { Navigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { ConnectWalletButton } from "../components/ConnectWalletButton";
import { RoundGlyph } from "../components/RoundGlyph";
import { useCurrentUser } from "../hooks/useCurrentUser";

const LIFECYCLE = [
  {
    step: "01",
    label: "Start",
    body: "A new round opens on-chain. Pick up or down before the price locks.",
  },
  {
    step: "02",
    label: "Lock",
    body: "At lock, the contract reads the live Chainlink price and freezes it as the line to beat.",
  },
  {
    step: "03",
    label: "Close",
    body: "At close, the contract reads the price again. Above the lock price wins up, below wins down.",
  },
  {
    step: "04",
    label: "Claim",
    body: "Winners withdraw their own payout in one transaction, whenever they choose.",
  },
];

const BEYOND = [
  {
    title: "Non-custodial staking",
    body: "Stake straight into the vault contract. Your funds sit on-chain, not in a hot wallet, until you unstake them yourself.",
  },
  {
    title: "On-chain referrals",
    body: "Register a referrer once, on-chain. Every winning claim they make sends a share of the house fee your way, claimable any time.",
  },
];

export default function Home() {
  const { isConnected } = useAccount();
  const { data: me, isLoading } = useCurrentUser();

  // Already signed in? Skip the landing page entirely.
  if (!isLoading && me) return <Navigate to="/dashboard" replace />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-base font-dmsans">
      {/* Ambient background glow. Two slow-drifting radial fields in the
          brand and up colors, kept faint so they read as atmosphere
          rather than decoration competing with the content. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] animate-drift rounded-full bg-brand/20 blur-[120px]" />
        <div className="absolute -right-32 top-40 h-[28rem] w-[28rem] animate-drift rounded-full bg-up/10 blur-[120px] [animation-delay:4s]" />
      </div>

      <div className="relative">
        <header className="sticky top-0 z-10 border-b border-border/60 bg-base/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
            <span className="font-editorial text-2xl font-semibold italic tracking-tight">
              Predictron
            </span>
            <ConnectWalletButton />
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 pb-24 pt-20 lg:grid-cols-2 lg:pt-28">
          <div className="flex flex-col items-start gap-7">
            <span className="animate-fade-up rounded-full border border-border px-3 py-1 font-mono text-xs uppercase tracking-widest text-text-muted">
              Settled by smart contract
            </span>
            <h1 className="animate-fade-up font-editorial text-5xl font-medium leading-[1.05] sm:text-6xl [animation-delay:80ms]">
              Up or down. The chain decides,{" "}
              <em className="italic text-brand">not us</em>.
            </h1>
            <p className="animate-fade-up max-w-md text-base leading-relaxed text-text-muted [animation-delay:160ms]">
              Predictron settles every round from a live on-chain price feed
              alone. A win, a stake, a referral reward: every payout is a
              transaction you sign yourself, not a balance a backend hands you.
            </p>
            <div className="animate-fade-up pt-2 [animation-delay:240ms]">
              {!isConnected && <ConnectWalletButton />}
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:200ms]">
            <div className="relative rounded-panel border border-border bg-panel/60 p-6 backdrop-blur-sm">
              <div className="mb-2 flex flex-col gap-0.5 font-mono text-[11px] uppercase tracking-widest text-text-faint">
                <span>Round #1284</span>
                <span className="text-text-muted">Locked at $612.40</span>
              </div>
              <RoundGlyph />
            </div>
          </div>
        </section>

        {/* Lifecycle: a real, ordered sequence, so numbering carries
            information here rather than just decorating four cards. */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mb-10 flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-text-faint">
              The lifecycle of a round
            </span>
            <h2 className="font-editorial text-3xl font-medium">
              Four steps. No exceptions.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {LIFECYCLE.map((item) => (
              <div
                key={item.step}
                className="flex flex-col gap-3 bg-panel p-6 transition-colors hover:bg-panel-raised"
              >
                <span className="font-mono text-xs text-text-faint">
                  {item.step}
                </span>
                <h3 className="font-editorial text-xl font-medium">
                  {item.label}
                </h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Beyond the round: two parallel, optional features, so a plain
            duo of cards is honest here rather than a forced sequence. */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mb-10 flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-text-faint">
              Beyond the round
            </span>
            <h2 className="font-editorial text-3xl font-medium">
              Stake it. Share it.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {BEYOND.map((f) => (
              <div
                key={f.title}
                className="rounded-panel border border-border bg-panel/60 p-7 backdrop-blur-sm transition-colors hover:border-brand/40"
              >
                <h3 className="mb-2 font-editorial text-xl font-medium">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="rounded-panel border border-border bg-panel/60 p-10 text-center backdrop-blur-sm sm:p-14">
            <h2 className="font-editorial text-3xl font-medium sm:text-4xl">
              Connect a wallet. That&apos;s the whole account system.
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm text-text-muted">
              No email, no password, no form. Sign a message and you&apos;re in.
            </p>
            <div className="mt-6 flex justify-center">
              <ConnectWalletButton />
            </div>
          </div>
        </section>

        <footer className="mx-auto max-w-6xl px-6 pb-10">
          <p className="font-mono text-xs text-text-faint">
            Predictron settles on-chain. Nothing here is financial advice.
          </p>
        </footer>
      </div>
    </div>
  );
}
