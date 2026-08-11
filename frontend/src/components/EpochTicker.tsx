export type RoundOutcome = "up" | "down" | "tie" | "pending";

const COLOR: Record<RoundOutcome, string> = {
  up: "bg-up",
  down: "bg-down",
  tie: "bg-text-faint",
  pending: "bg-panel-raised",
};

/// A strip showing the last N round outcomes, oldest to newest.
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
