"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Zap, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { fetchROI } from "../lib/api";
import { lookupRetailer, bestRateForCategory } from "../lib/retailers";
import type { Card, ROIResult, SpendingProfile } from "../lib/types";

interface Props {
  selectedCards: Card[];
  selectedCardIds: string[];
  spending: SpendingProfile;
  onSpendingChange: (s: SpendingProfile) => void;
  autoOpenROI?: boolean;
}

const SPEND_CATEGORIES = [
  { key: "dining", label: "Dining", icon: "🍽️" },
  { key: "groceries", label: "Groceries", icon: "🛒" },
  { key: "travel_other", label: "Travel", icon: "✈️" },
  { key: "flights_direct", label: "Flights", icon: "🛫" },
  { key: "hotels", label: "Hotels", icon: "🏨" },
  { key: "gas", label: "Gas", icon: "⛽" },
  { key: "streaming", label: "Streaming", icon: "📺" },
  { key: "entertainment", label: "Entertainment", icon: "🎬" },
  { key: "other", label: "Everything Else", icon: "🛍️" },
] as const;

const ROI_INPUTS = [
  { key: "dining", label: "Dining" },
  { key: "groceries", label: "Groceries" },
  { key: "travel", label: "Travel" },
  { key: "gas", label: "Gas" },
  { key: "other", label: "Other" },
] as const;

interface LookupResult {
  query: string;
  icon: string;
  categoryLabel: string;
  category: string;
  rankings: { card: Card; rate: number; rateKey: string }[];
}

function shortName(name: string) {
  const map: Record<string, string> = {
    "American Express Gold Card": "Amex Gold",
    "American Express Platinum Card": "Amex Platinum",
    "Chase Sapphire Reserve": "CSR",
    "Chase Sapphire Preferred": "CSP",
    "Capital One Venture X": "Venture X",
    "Citi Strata Premier Card": "Citi Premier",
    "Chase Freedom Unlimited": "Freedom Unltd",
    "Citi Double Cash Card": "Double Cash",
    "Capital One SavorOne": "SavorOne",
    "Wells Fargo Active Cash": "Active Cash",
    "Discover it Cash Back": "Discover it",
    "Apple Card": "Apple Card",
  };
  return map[name] || name.split(" ").slice(-2).join(" ");
}

export default function SpendGuide({ selectedCards, selectedCardIds, spending, onSpendingChange, autoOpenROI }: Props) {
  const [query, setQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [unknownQuery, setUnknownQuery] = useState("");
  const [roiResults, setRoiResults] = useState<ROIResult[]>([]);
  const [roiLoading, setRoiLoading] = useState(false);
  const [roiCalculated, setRoiCalculated] = useState(false);
  const [roiOpen, setRoiOpen] = useState(!!autoOpenROI);
  const inputRef = useRef<HTMLInputElement>(null);

  function runLookup(q: string) {
    const trimmed = q.trim();
    if (!trimmed || selectedCards.length === 0) return;

    const match = lookupRetailer(trimmed);
    const category = match?.category ?? "other";
    const categoryLabel = match?.categoryLabel ?? "General Purchase";
    const icon = match?.icon ?? "🛍️";

    const rankings = selectedCards
      .map((card) => {
        const { rate, key } = bestRateForCategory(card.earning_rates, category);
        return { card, rate, rateKey: key };
      })
      .sort((a, b) => b.rate - a.rate);

    setLookupResult({ query: trimmed, icon, categoryLabel, category, rankings });
    if (!match) setUnknownQuery(trimmed);
    else setUnknownQuery("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") runLookup(query);
  }

  async function handleROI() {
    if (selectedCardIds.length === 0) return;
    setRoiLoading(true);
    try {
      const data = await fetchROI(spending, selectedCardIds);
      setRoiResults(data.results);
      setRoiCalculated(true);
      setRoiOpen(true);
    } finally {
      setRoiLoading(false);
    }
  }

  // Best card per category across user's wallet
  const categoryGuide = SPEND_CATEGORIES.map(({ key, label, icon }) => {
    const ranked = selectedCards
      .map((card) => {
        const { rate } = bestRateForCategory(card.earning_rates, key);
        return { card, rate };
      })
      .sort((a, b) => b.rate - a.rate);
    return { key, label, icon, ranked };
  }).filter((c) => c.ranked.length > 0 && c.ranked[0].rate > 1);

  const best = roiResults[0];

  return (
    <div className="space-y-5">

      {/* ── Purchase Lookup ─────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={15} style={{ color: "#c36dbb" }} />
          <p className="text-white font-semibold text-sm">Purchase Lookup</p>
        </div>
        <p className="text-[#666] text-xs mb-4">
          Type any retailer, airline, restaurant, or purchase type — we'll tell you which card to swipe.
        </p>

        {/* Search bar */}
        <div className="flex gap-2">
          <div
            className="flex-1 flex items-center gap-2 rounded-xl px-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Search size={15} className="text-[#555] shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. Whole Foods, Delta, Apple, Starbucks, Hotel..."
              className="flex-1 bg-transparent py-3 text-white text-sm placeholder-[#444] focus:outline-none"
            />
          </div>
          <button
            onClick={() => runLookup(query)}
            disabled={!query.trim() || selectedCards.length === 0}
            className="gradient-bg text-white text-sm font-semibold px-5 rounded-xl disabled:opacity-30 transition-opacity"
          >
            Check
          </button>
        </div>

        {selectedCards.length === 0 && (
          <p className="text-[#555] text-xs mt-2">Add your cards from My Cards first.</p>
        )}

        {/* Quick category chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {["Starbucks", "Whole Foods", "Delta", "Apple Store", "Uber", "Netflix", "Shell"].map((s) => (
            <button
              key={s}
              onClick={() => { setQuery(s); runLookup(s); }}
              className="text-xs px-3 py-1 rounded-full transition-colors glass text-[#777] hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Result */}
        {lookupResult && (
          <div className="mt-5 border-t pt-5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{lookupResult.icon}</span>
              <div>
                <p className="text-white font-semibold">{lookupResult.query}</p>
                <p className="text-[#666] text-xs">{lookupResult.categoryLabel}</p>
              </div>
              {unknownQuery && (
                <span
                  className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(245,158,107,0.1)", color: "#f59e6b", border: "1px solid rgba(245,158,107,0.2)" }}
                >
                  Estimated — ask AI for specifics
                </span>
              )}
            </div>

            {/* Card rankings */}
            <div className="space-y-2">
              {lookupResult.rankings.map(({ card, rate }, i) => {
                const isTop = i === 0;
                const cashbackOrPoints = card.no_annual_fee
                  ? `${rate}% cashback`
                  : `${rate}x points`;
                const dollarPer100 = card.no_annual_fee
                  ? `$${rate} back per $100`
                  : `$${(rate * 0.015 * 100).toFixed(0)} value per $100`;

                return (
                  <div
                    key={card.id}
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{
                      background: isTop
                        ? "linear-gradient(135deg, rgba(195,109,187,0.08), rgba(143,143,191,0.08))"
                        : "rgba(255,255,255,0.02)",
                      border: isTop
                        ? "1px solid rgba(195,109,187,0.2)"
                        : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {/* Rank */}
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: isTop ? "linear-gradient(135deg, #c36dbb, #8f8fbf)" : "rgba(255,255,255,0.06)",
                        color: isTop ? "white" : "#666",
                      }}
                    >
                      {i + 1}
                    </div>

                    {/* Card color swatch */}
                    <div
                      className="w-8 h-5 rounded shrink-0"
                      style={{ background: `linear-gradient(135deg, ${card.color}cc, ${card.color}55)` }}
                    />

                    {/* Name + reward */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isTop ? "text-white" : "text-[#999]"}`}>
                        {shortName(card.name)}
                      </p>
                      <p className="text-[#666] text-xs">{dollarPer100}</p>
                    </div>

                    {/* Rate badge */}
                    <div
                      className="text-sm font-bold shrink-0"
                      style={{ color: isTop ? "#c36dbb" : "#555" }}
                    >
                      {cashbackOrPoints}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Best card callout */}
            {lookupResult.rankings[0] && (
              <div
                className="mt-3 rounded-xl p-3 flex items-center gap-2"
                style={{ background: "rgba(82,217,160,0.06)", border: "1px solid rgba(82,217,160,0.12)" }}
              >
                <span className="text-sm">💳</span>
                <p className="text-xs text-[#aaa]">
                  <span style={{ color: "#52d9a0" }} className="font-semibold">Use {shortName(lookupResult.rankings[0].card.name)}</span>
                  {" "}for this purchase
                  {lookupResult.rankings[1] &&
                    lookupResult.rankings[0].rate > lookupResult.rankings[1].rate
                    ? ` — earns ${lookupResult.rankings[0].rate - lookupResult.rankings[1].rate}x more than your next best card.`
                    : "."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Category Swipe Guide ────────────────────────────────────────── */}
      {selectedCards.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <p className="text-[#999] text-xs uppercase tracking-widest mb-1">Your Swipe Guide</p>
          <p className="text-[#555] text-xs mb-5">Best card from your wallet for each category</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categoryGuide.map(({ key, label, icon, ranked }) => {
              const top = ranked[0];
              const runner = ranked[1];
              const isPoints = !top.card.no_annual_fee;

              return (
                <div
                  key={key}
                  className="rounded-xl p-4"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{icon}</span>
                      <span className="text-[#999] text-xs font-medium">{label}</span>
                    </div>
                    <span
                      className="text-xs font-bold"
                      style={{ color: "#c36dbb" }}
                    >
                      {top.rate}{isPoints ? "x" : "%"}
                    </span>
                  </div>

                  {/* Top card */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-9 h-6 rounded"
                      style={{ background: `linear-gradient(135deg, ${top.card.color}cc, ${top.card.color}55)` }}
                    />
                    <div className="flex-1">
                      <p className="text-white text-xs font-semibold">{shortName(top.card.name)}</p>
                      <p className="text-[#555] text-[10px]">
                        {isPoints ? `${top.rate}x pts = ~$${(top.rate * 1.5).toFixed(0)} per $100` : `$${top.rate} back per $100`}
                      </p>
                    </div>
                  </div>

                  {/* Rate bar */}
                  <div className="mt-2 space-y-1">
                    {ranked.slice(0, 3).map(({ card, rate }, i) => (
                      <div key={card.id} className="flex items-center gap-2">
                        <div className="w-14 text-[10px] text-[#555] truncate">{shortName(card.name)}</div>
                        <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(rate / (ranked[0].rate || 1)) * 100}%`,
                              background: i === 0
                                ? "linear-gradient(90deg, #c36dbb, #8f8fbf)"
                                : "rgba(255,255,255,0.1)",
                            }}
                          />
                        </div>
                        <div className="text-[10px] w-6 text-right text-[#555]">{rate}{isPoints ? "x" : "%"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {categoryGuide.length === 0 && (
            <p className="text-[#444] text-sm text-center py-4">
              All your selected cards earn 1x on these categories. Consider adding a premium card for higher rewards.
            </p>
          )}
        </div>
      )}

      {/* ── Return on Spend (collapsible) ───────────────────────────────── */}
      <div className="glass rounded-2xl overflow-hidden">
        <button
          onClick={() => setRoiOpen((o) => !o)}
          className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={15} style={{ color: "#8f8fbf" }} />
            <p className="text-white font-semibold text-sm">Return on Spend</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[#555] text-xs">Annual value after fees, based on your spending</p>
            {roiOpen ? <ChevronUp size={16} className="text-[#555]" /> : <ChevronDown size={16} className="text-[#555]" />}
          </div>
        </button>

        {roiOpen && (
          <div className="px-6 pb-6 border-t space-y-5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {/* Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-5">
              {ROI_INPUTS.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[#666] text-xs block mb-1.5">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">$</span>
                    <input
                      type="number"
                      value={spending[key as keyof SpendingProfile]}
                      onChange={(e) => onSpendingChange({ ...spending, [key]: Number(e.target.value) })}
                      className="w-full rounded-xl pl-7 pr-3 py-2 text-white text-sm focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                  </div>
                  <p className="text-[#444] text-[10px] mt-1">${((spending[key as keyof SpendingProfile] || 0) * 12).toLocaleString()}/yr</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleROI}
              disabled={roiLoading || selectedCardIds.length === 0}
              className="gradient-bg text-white font-semibold px-5 py-2 rounded-xl text-sm disabled:opacity-40 transition-opacity"
            >
              {roiLoading ? "Calculating..." : "Calculate"}
            </button>

            {/* Results */}
            {roiCalculated && roiResults.length > 0 && (
              <>
                {best && (
                  <div
                    className="rounded-xl p-4"
                    style={{ background: "linear-gradient(135deg, rgba(195,109,187,0.07), rgba(143,143,191,0.07))", border: "1px solid rgba(195,109,187,0.15)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#999] text-xs mb-1">Best Card for Your Spending</p>
                        <p className="text-white font-bold">{best.card_name}</p>
                        <p className="text-[#666] text-xs mt-0.5">
                          ${best.points_value.toFixed(0)} rewards + ${best.total_credits} credits − ${best.annual_fee} fee
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#999] text-xs mb-1">Annual Return</p>
                        <p className="text-2xl font-bold gradient-text">+${best.net_roi.toFixed(0)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={roiResults} barSize={32}>
                    <XAxis dataKey="card_name" tick={{ fill: "#555", fontSize: 9 }} tickFormatter={(v) => shortName(v)} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#555", fontSize: 9 }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#101114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 11 }}
                      formatter={(v: unknown) => [`$${Number(v ?? 0).toFixed(0)}`, "Annual Return"]}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />
                    <Bar dataKey="net_roi" radius={[5, 5, 0, 0]}>
                      {roiResults.map((r, i) => (
                        <Cell key={i} fill={r.net_roi >= 0 ? (i === 0 ? "#c36dbb" : "#8f8fbf") : "#333"} fillOpacity={i === 0 ? 1 : 0.65} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  {roiResults.map((r, i) => (
                    <div key={r.card_id} className="flex items-center gap-4 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <span className="text-[#555] text-xs w-4">{i + 1}</span>
                      <span className="text-[#ccc] text-sm flex-1">{r.card_name}</span>
                      <span className="text-[#666] text-xs">${r.annual_fee}/yr fee</span>
                      <span className={`text-sm font-bold ${r.net_roi >= 0 ? "gradient-text" : "text-[#666]"}`}>
                        {r.net_roi >= 0 ? "+" : ""}${r.net_roi.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
