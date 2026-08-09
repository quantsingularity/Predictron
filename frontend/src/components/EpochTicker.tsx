export type RoundOutcome = "up" | "down" | "tie" | "pending";

const COLOR: Record<RoundOutcome, string> = {
  up: "bg-up",
  down: "bg-down",
  tie: "bg-text-faint",
  pending: "bg-panel-raised",
};

/// A thin strip across the top of the app showing the last N round
/// outcomes in order, oldest to newest. This is the one place we take a
/// visual risk — but it's earned: for a prediction market, the sequence of
/// recent up/down closes *is* the information a returning user most wants
/// at a glance, the way a heart-rate strip or a stock sparkline would be.
export function EpochTicker({ outcomes }: { outcomes: RoundOutcome[] }) {
  return (
    <div className="flex h-8 w-full items-center gap-[3px] overflow-hidden border-b border-border bg-panel px-4">
      <span className="mr-3 shrink-0 font-mono text-[10px] uppercase tracking-widest text-text-faint">
        Recent rounds
      </span>
      {outcomes.map((o, i) => (
        <span
          key={i}
          className={`h-3 w-1.5 shrink-0 rounded-full ${COLOR[o]}`}
          title={o}
        />
      ))}
    </div>
  );
}
