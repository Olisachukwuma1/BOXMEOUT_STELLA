import Link from "next/link";
import { Market } from "@/lib/api";
import { MarketStatusBadge } from "./MarketStatusBadge";
import { MarketOddsBar } from "./MarketOddsBar";

export interface MarketCardProps {
  market: Market;
  showOdds: boolean;
}

export default function MarketCard({ market, showOdds }: MarketCardProps): JSX.Element {
  const poolA = BigInt(market.poolA);
  const poolB = BigInt(market.poolB);

  return (
    <Link
      href={`/markets/${market.id}`}
      aria-label={`${market.fighterA.name} versus ${market.fighterB.name}, ${market.status}`}
      className="block bg-gray-800 hover:bg-gray-750 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-white text-sm leading-tight">
          {market.fighterA.name} vs {market.fighterB.name}
        </h3>
        <MarketStatusBadge status={market.status} />
      </div>
      <p className="text-xs text-gray-500 mb-3">
        {market.fighterA.weightClass} · <time dateTime={market.scheduledAt}>{new Date(market.scheduledAt).toLocaleDateString()}</time>
      </p>
      {showOdds && (
        <MarketOddsBar
          poolA={poolA}
          poolB={poolB}
          fighterAName={market.fighterA.name}
          fighterBName={market.fighterB.name}
        />
      )}
    </Link>
  );
}
