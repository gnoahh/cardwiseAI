"use client";

import { useState } from "react";
import { Check, Star, Zap } from "lucide-react";
import type { Card } from "../lib/types";

import { PLAID_DETECTED_CARD_IDS } from "./Dashboard";

interface Props {
  cards: Card[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  plaidConnected?: boolean;
}

export default function CardPicker({ cards, selectedIds, onToggle, plaidConnected }: Props) {
  const [filter, setFilter] = useState<"all" | "premium" | "no_fee">("all");

  const premiumCards = cards.filter((c) => !c.no_annual_fee);
  const noFeeCards = cards.filter((c) => c.no_annual_fee);
  const displayCards = filter === "premium" ? premiumCards : filter === "no_fee" ? noFeeCards : cards;

  const noFeeSelected = noFeeCards.filter((c) => selectedIds.includes(c.id));

  const plaidDetectedCards = plaidConnected
    ? cards.filter((c) => PLAID_DETECTED_CARD_IDS.includes(c.id))
    : [];

  return (
    <div className="space-y-6">
      {/* Plaid-detected banner */}
      {plaidConnected && plaidDetectedCards.length > 0 && (
        <div
          className="glass rounded-2xl p-4 flex items-start gap-3"
          style={{ borderColor: "rgba(82,217,160,0.2)" }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(82,217,160,0.12)" }}>
            <Zap size={15} style={{ color: "#52d9a0" }} />
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold mb-0.5">Cards detected from your account</p>
            <p className="text-[#666] text-xs mb-2">
              We found {plaidDetectedCards.length} cards linked to your bank — they've been added to your wallet automatically.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {plaidDetectedCards.map((c) => (
                <span key={c.id} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(82,217,160,0.08)", color: "#52d9a0", border: "1px solid rgba(82,217,160,0.15)" }}>
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "premium", "no_fee"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f
                ? "gradient-bg text-white"
                : "glass text-[#999] hover:text-white"
            }`}
          >
            {f === "all" ? "All Cards" : f === "premium" ? "Premium" : "No Annual Fee"}
          </button>
        ))}
      </div>

      {/* No-fee value prop banner */}
      {filter === "no_fee" && (
        <div className="glass rounded-2xl p-5" style={{ borderColor: "rgba(143,143,191,0.2)" }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(143,143,191,0.15)" }}>
              <Zap size={16} style={{ color: "#8f8fbf" }} />
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-1">Maximize cashback — zero cost</p>
              <p className="text-[#999] text-xs leading-relaxed">
                No annual fee cards can still earn $400–$800/year in cashback based on your spending.
                The right combination beats a single premium card after fees. We'll find your optimal stack.
              </p>
            </div>
          </div>

          {/* Cashback optimizer preview */}
          {noFeeSelected.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-[#999] text-xs uppercase tracking-widest mb-3">Your No-Fee Stack</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#ccc]">Dining (best card)</span>
                  <span style={{ color: "#c36dbb" }} className="font-semibold">
                    {noFeeSelected.reduce((best, c) => Math.max(best, c.earning_rates.dining || c.earning_rates.other || 1), 0)}% back
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#ccc]">Groceries (best card)</span>
                  <span style={{ color: "#8f8fbf" }} className="font-semibold">
                    {noFeeSelected.reduce((best, c) => Math.max(best, c.earning_rates.groceries || c.earning_rates.other || 1), 0)}% back
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#ccc]">Everything else (best card)</span>
                  <span style={{ color: "#52d9a0" }} className="font-semibold">
                    {noFeeSelected.reduce((best, c) => Math.max(best, c.earning_rates.other || 1), 0)}% back
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayCards.map((card) => {
          const selected = selectedIds.includes(card.id);
          return (
            <button
              key={card.id}
              onClick={() => onToggle(card.id)}
              className={`relative rounded-2xl p-5 text-left transition-all glow-hover ${
                selected
                  ? "border border-[rgba(195,109,187,0.5)] shadow-lg"
                  : "glass hover:border-[rgba(255,255,255,0.12)]"
              }`}
              style={
                selected
                  ? { background: "rgba(195,109,187,0.06)", boxShadow: "0 0 0 1px rgba(195,109,187,0.3), 0 8px 32px rgba(195,109,187,0.08)" }
                  : {}
              }
            >
              {selected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center gradient-bg">
                  <Check size={11} className="text-white" />
                </div>
              )}

              {card.no_annual_fee && (
                <div className="absolute top-3 right-3">
                  {!selected && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(82,217,160,0.12)", color: "#52d9a0", border: "1px solid rgba(82,217,160,0.2)" }}>
                      Free
                    </span>
                  )}
                </div>
              )}

              {/* Card art */}
              <div
                className="w-full h-12 rounded-xl mb-4 flex items-center px-3 gap-2"
                style={{ background: `linear-gradient(135deg, ${card.color}cc, ${card.color}66)` }}
              >
                <div className="w-7 h-5 rounded-sm bg-white/20 border border-white/10" />
                <span className="text-white/70 text-xs font-medium ml-auto">{card.network}</span>
              </div>

              <p className="text-white font-semibold text-sm leading-snug mb-1">{card.name}</p>

              {card.no_annual_fee ? (
                <>
                  <p className="text-[#52d9a0] text-xs font-medium mb-2">No annual fee</p>
                  <p className="text-[#777] text-xs leading-relaxed">{card.cashback_highlight}</p>
                </>
              ) : (
                <>
                  <p className="text-[#666] text-xs mb-2">${card.annual_fee}/yr</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: "#c36dbb" }}>
                      ${card.total_annual_credits.toLocaleString()} credits
                    </span>
                    {card.total_annual_credits > card.annual_fee && (
                      <Star size={12} style={{ color: "#f59e6b" }} fill="#f59e6b" />
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
