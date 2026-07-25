"use client";
import { useState } from "react";
import { Market } from "@/lib/api";
import { MarketList } from "@/components/MarketList";

type HomeTab = "Active" | "Upcoming" | "Resolved";
const TABS: HomeTab[] = ["Active", "Upcoming", "Resolved"];

function filterMarkets(markets: Market[], tab: HomeTab): Market[] {
  switch (tab) {
    case "Active":
      return markets.filter((m) => m.status === "Open" || m.status === "Locked");
    case "Upcoming":
      return markets.filter((m) => m.status === "Open");
    case "Resolved":
      return markets.filter((m) => m.status === "Resolved");
  }
}

export interface HomePageContentProps {
  initialMarkets: Market[];
}

export function HomePageContent({ initialMarkets }: HomePageContentProps): JSX.Element {
  const [tab, setTab] = useState<HomeTab>("Active");

  const filtered = filterMarkets(initialMarkets, tab);

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Hero */}
      <section className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3">
          BOXMEOUT - Bet on Boxing
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Decentralized prediction markets for boxing. Place XLM bets on-chain — no middlemen,
          no custody.
        </p>
      </section>

      {/* Tab bar */}
      <div className="overflow-x-auto mb-6">
        <div className="flex gap-1 rounded-lg bg-gray-800 p-1 w-max min-w-full sm:min-w-0" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 sm:flex-none px-5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t
                  ? "bg-amber-500 text-black shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <MarketList markets={filtered} isLoading={false} />
    </main>
  );
}
